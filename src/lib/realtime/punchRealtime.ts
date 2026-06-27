/**
 * Camada de tempo real dos registros de ponto.
 * - Supabase ON: insere em `registros_ponto` e escuta `postgres_changes` (multi-dispositivo)
 * - Supabase OFF: usa o BroadcastChannel local (entre abas)
 */
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import type { LivePunch } from "@/types";
import type { Database } from "@/lib/supabase/types";

type RegistroRow = Database["public"]["Tables"]["registros_ponto"]["Row"];

function rowToLive(r: RegistroRow): LivePunch {
  return {
    id: r.id,
    employeeId: r.funcionario_id,
    employeeName: r.nome,
    role: r.cargo ?? "",
    avatarUrl: r.avatar_url ?? undefined,
    type: r.tipo,
    time: r.hora,
    timestamp: new Date(r.registrado_em).getTime(),
    location: r.localizacao ?? "",
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    faceConfidence: r.face_confidence ?? 0,
    gpsConfirmed: r.gps_confirmado,
  };
}

export interface PublishContext {
  empresaId?: string;
  funcionarioId: string;
}

let channelSeq = 0;

export const punchRealtime = {
  enabled: isSupabaseEnabled,

  /** Assina a lista ao vivo. Retorna função de unsubscribe. */
  subscribe(cb: (punches: LivePunch[]) => void): () => void {
    const client = supabase;
    if (!client) {
      cb([]);
      return () => {};
    }

    let list: LivePunch[] = [];
    // carga inicial (RLS limita à empresa do usuário)
    client
      .from("registros_ponto")
      .select("*")
      .order("registrado_em", { ascending: false })
      .limit(50)
      .then((res) => {
        const rows = (res.data ?? []) as RegistroRow[];
        list = rows.map(rowToLive);
        cb(list);
      });

    // nome único por assinatura: evita reuso de canal já subscrito (StrictMode/múltiplos consumidores)
    const channel = client
      .channel(`registros-ponto-live-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registros_ponto" },
        (payload) => {
          list = [rowToLive(payload.new as RegistroRow), ...list].slice(0, 100);
          cb(list);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  /** Publica um novo registro. */
  async publish(punch: LivePunch, ctx: PublishContext): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("registros_ponto").insert({
      empresa_id: ctx.empresaId ?? null,
      funcionario_id: ctx.funcionarioId,
      nome: punch.employeeName,
      cargo: punch.role,
      avatar_url: punch.avatarUrl ?? null,
      tipo: punch.type,
      hora: punch.time,
      localizacao: punch.location,
      lat: punch.lat ?? null,
      lng: punch.lng ?? null,
      face_confidence: punch.faceConfidence,
      gps_confirmado: punch.gpsConfirmed,
    });
    if (error) throw new Error(error.message);
    // o INSERT volta pelo realtime e atualiza a lista
  },
};
