import { supabase } from "./client";
import type { Database } from "./types";
import type { PunchType } from "@/types";
import { workedMinutes } from "./punchesService";
import { LATE_TOLERANCE_MIN, toMinutes } from "@/lib/schedule";

type RegistroRow = Database["public"]["Tables"]["registros_ponto"]["Row"];
type UsuarioRow = Database["public"]["Tables"]["usuarios"]["Row"];

export interface EmployeeReport {
  id: string;
  nome: string;
  cargo: string | null;
  avatarUrl: string | null;
  diasTrabalhados: number;
  minutosTrabalhados: number;
  minutosEsperados: number;
  saldoMin: number; // banco de horas (positivo/negativo)
  atrasos: number;
}

/** Minutos esperados por dia (jornada - intervalo). */
export function expectedDailyMinutes(u: {
  hora_entrada?: string | null;
  hora_saida?: string | null;
  intervalo_min?: number | null;
}): number {
  const entrada = toMinutes(u.hora_entrada ?? "08:00");
  const saida = toMinutes(u.hora_saida ?? "18:00");
  const intervalo = u.intervalo_min ?? 60;
  return Math.max(0, saida - entrada - intervalo);
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1).toISOString(),
    end: new Date(y, m, 1).toISOString(),
  };
}

/** Agrupa registros por funcionário + dia, com as 4 horas. */
function groupByUserDay(rows: RegistroRow[]) {
  const map = new Map<string, Record<PunchType, string | null>>();
  for (const r of rows) {
    const key = `${r.funcionario_id}|${r.registrado_em.slice(0, 10)}`;
    const cur = map.get(key) ?? { entrada: null, intervalo: null, retorno: null, saida: null };
    cur[r.tipo] = r.hora;
    map.set(key, cur);
  }
  return map;
}

export const reportService = {
  /** Relatório consolidado por funcionário no mês ("YYYY-MM"). */
  async monthly(empresaId: string, month: string): Promise<EmployeeReport[]> {
    if (!supabase) return [];
    const { start, end } = monthRange(month);
    const [{ data: usuarios }, { data: registros }] = await Promise.all([
      supabase.from("usuarios").select("*").eq("empresa_id", empresaId),
      supabase
        .from("registros_ponto")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("registrado_em", start)
        .lt("registrado_em", end),
    ]);

    const users = (usuarios ?? []) as UsuarioRow[];
    const grouped = groupByUserDay((registros ?? []) as RegistroRow[]);

    const agg = new Map<string, { dias: number; trab: number; esper: number; atrasos: number }>();
    for (const [key, times] of grouped) {
      const uid = key.split("|")[0];
      const u = users.find((x) => x.id === uid);
      if (!times.entrada) continue; // dia sem entrada não conta
      const a = agg.get(uid) ?? { dias: 0, trab: 0, esper: 0, atrasos: 0 };
      a.dias += 1;
      a.trab += workedMinutes(times);
      a.esper += expectedDailyMinutes(u ?? {});
      const limite = toMinutes(u?.hora_entrada ?? "08:00") + LATE_TOLERANCE_MIN;
      if (toMinutes(times.entrada) > limite) a.atrasos += 1;
      agg.set(uid, a);
    }

    return users
      .filter((u) => u.role === "funcionario" || u.role === "admin")
      .map((u) => {
        const a = agg.get(u.id) ?? { dias: 0, trab: 0, esper: 0, atrasos: 0 };
        return {
          id: u.id,
          nome: u.nome,
          cargo: u.cargo,
          avatarUrl: u.avatar_url,
          diasTrabalhados: a.dias,
          minutosTrabalhados: a.trab,
          minutosEsperados: a.esper,
          saldoMin: a.trab - a.esper,
          atrasos: a.atrasos,
        };
      })
      .sort((x, y) => y.minutosTrabalhados - x.minutosTrabalhados);
  },

  /** Banco de horas do próprio funcionário no mês. */
  async myBalance(uid: string, month: string): Promise<{ saldoMin: number; trab: number; esper: number; dias: number }> {
    if (!supabase) return { saldoMin: 0, trab: 0, esper: 0, dias: 0 };
    const { start, end } = monthRange(month);
    const [{ data: u }, { data: registros }] = await Promise.all([
      supabase.from("usuarios").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("registros_ponto")
        .select("*")
        .eq("funcionario_id", uid)
        .gte("registrado_em", start)
        .lt("registrado_em", end),
    ]);
    const grouped = groupByUserDay((registros ?? []) as RegistroRow[]);
    let trab = 0, esper = 0, dias = 0;
    for (const [, times] of grouped) {
      if (!times.entrada) continue;
      dias += 1;
      trab += workedMinutes(times);
      esper += expectedDailyMinutes((u as UsuarioRow) ?? {});
    }
    return { saldoMin: trab - esper, trab, esper, dias };
  },
};

/** Formata saldo com sinal (ex.: "+2h30", "-1h05", "0h00"). */
export function formatSaldo(min: number): string {
  const sign = min > 0 ? "+" : min < 0 ? "-" : "";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}
