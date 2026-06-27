import { supabase } from "./client";
import type { Database } from "./types";
import type { PunchType } from "@/types";

type NotifRow = Database["public"]["Tables"]["notificacoes"]["Row"];

export interface AdminNotification {
  id: string;
  mensagem: string;
  tipo: string;
  canal: string;
  lida: boolean;
  created_at: string;
}

let notifSeq = 0;

const verbo: Record<PunchType, string> = {
  entrada: "registrou entrada",
  intervalo: "iniciou intervalo",
  retorno: "retornou do intervalo",
  saida: "encerrou o expediente",
};

export const notificationsService = {
  async list(empresaId: string): Promise<AdminNotification[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []) as NotifRow[];
  },

  /** Cria a notificação (gestor) a cada registro de ponto. */
  async createForPunch(args: {
    empresaId?: string;
    funcionarioId: string;
    nome: string;
    tipo: PunchType;
    hora: string;
    local: string;
  }): Promise<void> {
    if (!supabase || !args.empresaId) return;
    await supabase.from("notificacoes").insert({
      empresa_id: args.empresaId,
      funcionario_id: args.funcionarioId,
      mensagem: `${args.nome} ${verbo[args.tipo]} às ${args.hora} · ${args.local}`,
      tipo: args.tipo,
      canal: "whatsapp",
    });
  },

  /** Avisa o gestor que um funcionário está atrasado (1x por dia por funcionário). */
  async createLate(args: {
    empresaId?: string;
    funcionarioId: string;
    nome: string;
    horaEntrada: string;
  }): Promise<void> {
    if (!supabase || !args.empresaId) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    // evita duplicar o alerta no mesmo dia
    const { data: existing } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("funcionario_id", args.funcionarioId)
      .eq("tipo", "atraso")
      .gte("created_at", start.toISOString())
      .limit(1);
    if (existing && existing.length) return;

    await supabase.from("notificacoes").insert({
      empresa_id: args.empresaId,
      funcionario_id: args.funcionarioId,
      mensagem: `${args.nome} está atrasado (entrada prevista às ${args.horaEntrada}).`,
      tipo: "atraso",
      canal: "sistema",
    });
  },

  subscribe(empresaId: string, cb: () => void): () => void {
    if (!supabase) return () => {};
    const client = supabase;
    const channel = client
      .channel(`notif-${empresaId}-${++notifSeq}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `empresa_id=eq.${empresaId}` },
        () => cb()
      )
      .subscribe();
    return () => client.removeChannel(channel);
  },
};
