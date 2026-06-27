import { supabase, isSupabaseEnabled } from "./client";
import type { User } from "@/types";

export interface SignUpInput {
  name: string;
  role: string;
  email: string;
  password: string;
  company: string;
  segment: string;
}

function requireClient() {
  if (!supabase) throw new Error("Supabase não configurado. Defina o .env e reinicie.");
  return supabase;
}

/** Mapeia a linha de `usuarios` (+empresa) para o User do app. */
async function loadProfile(userId: string, fallbackEmail: string): Promise<User> {
  const client = requireClient();
  const { data } = await client
    .from("usuarios")
    .select("id, nome, email, cargo, role, avatar_url, empresa_id, empresas(nome)")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    // usuário autenticado mas sem perfil ainda (ex.: confirmou e-mail depois)
    return {
      id: userId,
      name: fallbackEmail.split("@")[0],
      email: fallbackEmail,
      role: "Funcionário",
      company: "",
      isAdmin: false,
    };
  }
  const empresaNome =
    (data as unknown as { empresas?: { nome?: string } }).empresas?.nome ?? "";
  return {
    id: data.id,
    name: data.nome,
    email: data.email,
    role: data.cargo ?? "Funcionário",
    company: empresaNome,
    avatarUrl: data.avatar_url ?? undefined,
    isAdmin: ["admin", "gestor", "rh", "supervisor"].includes(data.role),
    empresaId: data.empresa_id ?? undefined,
  };
}

export const authService = {
  enabled: isSupabaseEnabled,

  async getSession(): Promise<User | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const sUser = data.session?.user;
    if (!sUser) return null;
    return loadProfile(sUser.id, sUser.email ?? "");
  },

  async signIn(email: string, password: string): Promise<User> {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return loadProfile(data.user.id, email);
  },

  async signInWithGoogle(): Promise<void> {
    const client = requireClient();
    await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
  },

  /** Cria conta + empresa + perfil (admin). */
  async signUp(input: SignUpInput): Promise<User> {
    const client = requireClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name } },
    });
    if (error) throw new Error(error.message);
    const userId = data.user?.id;
    if (!userId) throw new Error("Falha ao criar usuário");
    if (!data.session) {
      throw new Error(
        "Conta criada! Confirme o e-mail para entrar. (Para fluxo direto, desative 'Confirm email' em Authentication → Providers → Email no Supabase.)"
      );
    }

    const { data: empresa, error: empErr } = await client
      .from("empresas")
      .insert({ nome: input.company, segmento: input.segment, owner_id: userId })
      .select("id, nome")
      .single();
    if (empErr) throw new Error(empErr.message);

    const { error: usrErr } = await client.from("usuarios").insert({
      id: userId,
      empresa_id: empresa.id,
      nome: input.name,
      email: input.email,
      cargo: input.role,
      role: "admin",
    });
    if (usrErr) throw new Error(usrErr.message);

    return {
      id: userId,
      name: input.name,
      email: input.email,
      role: input.role,
      company: empresa.nome,
      isAdmin: true,
      empresaId: empresa.id,
    };
  },

  async updatePassword(newPassword: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async updateAvatar(userId: string, url: string): Promise<void> {
    const client = requireClient();
    await client.from("usuarios").update({ avatar_url: url }).eq("id", userId);
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    // scope local: limpa a sessão do dispositivo sem o revoke global (que pode dar 403)
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignora — a sessão local já foi limpa */
    }
  },

  onAuthChange(cb: (user: User | null) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) cb(await loadProfile(session.user.id, session.user.email ?? ""));
      else cb(null);
    });
    return () => data.subscription.unsubscribe();
  },
};
