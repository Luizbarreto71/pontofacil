import { supabase } from "./client";
import type { Database } from "./types";

export type RegistroRow = Database["public"]["Tables"]["registros_ponto"]["Row"];

let seq = 0;

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1).toISOString(),
    end: new Date(y, m, 1).toISOString(),
  };
}

export const registrosService = {
  /** Todos os registros da empresa no mês ("YYYY-MM"), mais recentes primeiro. */
  async list(empresaId: string, month: string): Promise<RegistroRow[]> {
    if (!supabase) return [];
    const { start, end } = monthRange(month);
    const { data } = await supabase
      .from("registros_ponto")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("registrado_em", start)
      .lt("registrado_em", end)
      .order("registrado_em", { ascending: false })
      .limit(1000);
    return (data ?? []) as RegistroRow[];
  },

  /** Tempo real: chama cb a cada novo registro inserido na empresa. */
  subscribe(empresaId: string, cb: () => void): () => void {
    if (!supabase) return () => {};
    const client = supabase;
    const channel = client
      .channel(`registros-admin-${empresaId}-${++seq}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registros_ponto", filter: `empresa_id=eq.${empresaId}` },
        () => cb()
      )
      .subscribe();
    return () => client.removeChannel(channel);
  },
};
