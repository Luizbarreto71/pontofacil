import { supabase } from "./client";
import type { Database } from "./types";
import type { PunchType, DayRecord, PunchEvent } from "@/types";

type RegistroRow = Database["public"]["Tables"]["registros_ponto"]["Row"];

const ORDER: PunchType[] = ["entrada", "intervalo", "retorno", "saida"];
const WEEKDAY = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function minutesBetween(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const [h1, m1] = a.split(":").map(Number);
  const [h2, m2] = b.split(":").map(Number);
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
}

/** Soma a jornada: (intervalo-entrada) + (saida-retorno). */
export function workedMinutes(times: Record<PunchType, string | null>): number {
  const manha = minutesBetween(times.entrada, times.intervalo);
  const tarde = minutesBetween(times.retorno, times.saida);
  // se não houve intervalo, conta entrada→saida direto
  if (!times.intervalo && times.entrada && times.saida)
    return minutesBetween(times.entrada, times.saida);
  return manha + tarde;
}

export const punchesService = {
  /** Jornada de hoje do usuário (4 etapas, com horas preenchidas). */
  async todayJourney(uid: string): Promise<{ type: PunchType; label: string; time: string | null }[]> {
    const labels: Record<PunchType, string> = {
      entrada: "Entrada",
      intervalo: "Intervalo",
      retorno: "Retorno",
      saida: "Saída",
    };
    const base = ORDER.map((t) => ({ type: t, label: labels[t], time: null as string | null }));
    if (!supabase) return base;

    const { data } = await supabase
      .from("registros_ponto")
      .select("tipo, hora, registrado_em")
      .eq("funcionario_id", uid)
      .gte("registrado_em", startOfToday())
      .order("registrado_em", { ascending: true });

    for (const r of (data ?? []) as Pick<RegistroRow, "tipo" | "hora">[]) {
      const step = base.find((s) => s.type === r.tipo);
      if (step) step.time = r.hora;
    }
    return base;
  },

  /** Histórico do usuário agrupado por dia (mês opcional: "YYYY-MM"). */
  async history(uid: string, month?: string): Promise<DayRecord[]> {
    if (!supabase) return [];
    let q = supabase
      .from("registros_ponto")
      .select("*")
      .eq("funcionario_id", uid)
      .order("registrado_em", { ascending: false });

    if (month) {
      const start = `${month}-01T00:00:00`;
      const [y, m] = month.split("-").map(Number);
      const end = new Date(y, m, 1).toISOString();
      q = q.gte("registrado_em", start).lt("registrado_em", end);
    }
    const { data } = await q;
    const rows = (data ?? []) as RegistroRow[];

    const byDay = new Map<string, RegistroRow[]>();
    for (const r of rows) {
      const day = r.registrado_em.slice(0, 10);
      (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(r);
    }

    const days: DayRecord[] = [];
    for (const [day, list] of byDay) {
      const times: Record<PunchType, string | null> = {
        entrada: null, intervalo: null, retorno: null, saida: null,
      };
      for (const r of list) times[r.tipo] = r.hora;
      const events: PunchEvent[] = ORDER.filter((t) => times[t]).map((t) => ({
        type: t,
        time: times[t],
      }));
      const date = new Date(day + "T12:00:00");
      const mins = workedMinutes(times);
      days.push({
        id: day,
        date: day,
        weekday: WEEKDAY[date.getDay()],
        events,
        workedMinutes: mins,
        status: times.saida ? "completo" : times.entrada ? "parcial" : "ausente",
      });
    }
    return days.sort((a, b) => (a.date < b.date ? 1 : -1));
  },
};
