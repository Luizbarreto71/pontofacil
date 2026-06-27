import { supabase } from "./client";
import { workedMinutes } from "./punchesService";
import type { Database } from "./types";
import type { PunchType } from "@/types";

type RegistroRow = Database["public"]["Tables"]["registros_ponto"]["Row"];

const LATE_TOLERANCE_MIN = 5; // minutos de tolerância sobre o horário de entrada

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface TodayStats {
  total: number;
  presentes: number;
  atrasados: number;
  ausentes: number;
  horasHojeMin: number;
}

export interface WeeklyPoint {
  day: string;
  hours: number;
}

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dayStart(offsetDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Agrupa registros por funcionário+dia e devolve os horários por tipo. */
function groupByUserDay(rows: RegistroRow[]) {
  const map = new Map<string, Record<PunchType, string | null>>();
  for (const r of rows) {
    const key = `${r.funcionario_id}|${r.registrado_em.slice(0, 10)}`;
    const cur =
      map.get(key) ?? { entrada: null, intervalo: null, retorno: null, saida: null };
    cur[r.tipo] = r.hora;
    map.set(key, cur);
  }
  return map;
}

export const statsService = {
  async today(empresaId: string, totalFuncionarios: number): Promise<TodayStats> {
    if (!supabase)
      return { total: totalFuncionarios, presentes: 0, atrasados: 0, ausentes: totalFuncionarios, horasHojeMin: 0 };

    const [{ data }, { data: us }] = await Promise.all([
      supabase
        .from("registros_ponto")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("registrado_em", dayStart(0).toISOString()),
      supabase.from("usuarios").select("id, hora_entrada").eq("empresa_id", empresaId),
    ]);

    const rows = (data ?? []) as RegistroRow[];
    const schedule = new Map<string, string>(
      ((us ?? []) as { id: string; hora_entrada: string | null }[]).map((u) => [
        u.id,
        u.hora_entrada ?? "08:00",
      ])
    );
    const grouped = groupByUserDay(rows);

    const presentesSet = new Set<string>();
    let atrasados = 0;
    let horas = 0;
    for (const [key, times] of grouped) {
      const userId = key.split("|")[0];
      if (times.entrada) {
        presentesSet.add(userId);
        // atrasado = entrou após o horário previsto + tolerância
        const limite = addMinutes(schedule.get(userId) ?? "08:00", LATE_TOLERANCE_MIN);
        if (times.entrada > limite) atrasados++;
      }
      horas += workedMinutes(times);
    }
    const presentes = presentesSet.size;
    return {
      total: totalFuncionarios,
      presentes,
      atrasados,
      ausentes: Math.max(0, totalFuncionarios - presentes),
      horasHojeMin: horas,
    };
  },

  async weekly(empresaId: string): Promise<WeeklyPoint[]> {
    const base: WeeklyPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      base.push({ day: WEEK[dayStart(i).getDay()], hours: 0 });
    }
    if (!supabase) return base;

    const { data } = await supabase
      .from("registros_ponto")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("registrado_em", dayStart(6).toISOString());

    const rows = (data ?? []) as RegistroRow[];
    const grouped = groupByUserDay(rows);

    // minutos por dia (chave = YYYY-MM-DD)
    const minutesByDay = new Map<string, number>();
    for (const [key, times] of grouped) {
      const day = key.split("|")[1];
      minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + workedMinutes(times));
    }

    const out: WeeklyPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayStart(i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ day: WEEK[d.getDay()], hours: Math.round((minutesByDay.get(iso) ?? 0) / 60) });
    }
    return out;
  },
};
