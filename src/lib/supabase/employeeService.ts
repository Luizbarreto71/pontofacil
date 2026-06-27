import { createClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { Database } from "./types";

type UsuarioRow = Database["public"]["Tables"]["usuarios"]["Row"];

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface EmployeeInput {
  nome: string;
  email: string;
  cargo: string;
  senha: string;
  empresaId: string;
}

export interface EmployeeRow extends UsuarioRow {
  faceEnrolled?: boolean;
  lastPunch?: string | null;
}

export const employeeService = {
  /** Lista os funcionários da empresa (com status de biometria e último ponto). */
  async list(empresaId: string): Promise<EmployeeRow[]> {
    if (!supabase) return [];
    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: true });

    const rows = (usuarios ?? []) as UsuarioRow[];
    if (rows.length === 0) return [];

    const ids = rows.map((u) => u.id);
    const [{ data: faces }, { data: punches }] = await Promise.all([
      supabase.from("face_embeddings").select("funcionario_id").in("funcionario_id", ids),
      supabase
        .from("registros_ponto")
        .select("funcionario_id, hora, registrado_em")
        .in("funcionario_id", ids)
        .order("registrado_em", { ascending: false }),
    ]);

    const enrolled = new Set((faces ?? []).map((f: { funcionario_id: string }) => f.funcionario_id));
    const lastByUser = new Map<string, string>();
    for (const p of (punches ?? []) as { funcionario_id: string; hora: string }[]) {
      if (!lastByUser.has(p.funcionario_id)) lastByUser.set(p.funcionario_id, p.hora);
    }

    return rows.map((u) => ({
      ...u,
      faceEnrolled: enrolled.has(u.id),
      lastPunch: lastByUser.get(u.id) ?? null,
    }));
  },

  /**
   * Cria um funcionário SEM deslogar o admin.
   * Usa um client temporário (storage isolado, sem persistência) para fazer o
   * signUp do funcionário e inserir o próprio perfil (respeitando a RLS).
   * O admin repassa email+senha para o funcionário finalizar o cadastro facial.
   */
  async create(input: EmployeeInput): Promise<EmployeeRow> {
    const temp = createClient(url, anonKey, {
      auth: {
        storageKey: "pf-temp-signup",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await temp.auth.signUp({
      email: input.email,
      password: input.senha,
      options: { data: { name: input.nome } },
    });
    if (error) {
      if (/registered|already/i.test(error.message))
        throw new Error("Este e-mail já está cadastrado.");
      throw new Error(error.message);
    }
    if (!data.session || !data.user) {
      throw new Error(
        "Não foi possível criar a sessão do funcionário. Desative 'Confirm email' em Authentication → Providers → Email no Supabase."
      );
    }

    const userId = data.user.id;
    const { error: insErr } = await temp.from("usuarios").insert({
      id: userId,
      empresa_id: input.empresaId,
      nome: input.nome,
      email: input.email,
      cargo: input.cargo,
      role: "funcionario",
    });
    await temp.auth.signOut();

    if (insErr) throw new Error(insErr.message);

    return {
      id: userId,
      empresa_id: input.empresaId,
      nome: input.nome,
      email: input.email,
      cargo: input.cargo,
      role: "funcionario",
      avatar_url: null,
      ativo: true,
      created_at: new Date().toISOString(),
      faceEnrolled: false,
      lastPunch: null,
    };
  },

  async remove(funcionarioId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("usuarios").delete().eq("id", funcionarioId);
    if (error) throw new Error(error.message);
  },
};
