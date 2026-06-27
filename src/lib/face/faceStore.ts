/**
 * Persistência da biometria facial, por usuário.
 * - Supabase ON: tabela `face_embeddings` (fonte da verdade) + cache local
 * - Supabase OFF: apenas localStorage
 *
 * O cache local permite que a verificação no momento do ponto seja síncrona
 * e rápida; a sincronização com o banco é feita ao abrir a tela.
 */
import { supabase } from "@/lib/supabase/client";

const keyFor = (uid: string) => `pf-face-descriptor:${uid}`;

function readCache(uid: string): Float32Array | null {
  const raw = localStorage.getItem(keyFor(uid));
  if (!raw) return null;
  try {
    return new Float32Array(JSON.parse(raw) as number[]);
  } catch {
    return null;
  }
}

function writeCache(uid: string, d: Float32Array) {
  localStorage.setItem(keyFor(uid), JSON.stringify(Array.from(d)));
}

export const faceStore = {
  hasEnrolled(uid: string): boolean {
    return !!localStorage.getItem(keyFor(uid));
  },

  getDescriptor(uid: string): Float32Array | null {
    return readCache(uid);
  },

  /** Busca o descritor do banco e atualiza o cache local. */
  async syncFromDb(uid: string): Promise<boolean> {
    if (!supabase) return this.hasEnrolled(uid);
    const { data } = await supabase
      .from("face_embeddings")
      .select("descriptor")
      .eq("funcionario_id", uid)
      .maybeSingle();
    if (data?.descriptor?.length) {
      writeCache(uid, new Float32Array(data.descriptor));
      return true;
    }
    return this.hasEnrolled(uid);
  },

  /** Salva o descritor no banco (upsert) e no cache. */
  async save(uid: string, empresaId: string | undefined, d: Float32Array): Promise<void> {
    writeCache(uid, d);
    if (!supabase) return;
    await supabase.from("face_embeddings").upsert(
      {
        funcionario_id: uid,
        empresa_id: empresaId ?? null,
        descriptor: Array.from(d),
      },
      { onConflict: "funcionario_id" }
    );
  },

  async clear(uid: string): Promise<void> {
    localStorage.removeItem(keyFor(uid));
    if (!supabase) return;
    await supabase.from("face_embeddings").delete().eq("funcionario_id", uid);
  },
};
