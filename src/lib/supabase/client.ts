import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True quando o projeto Supabase está configurado no .env. */
export const isSupabaseEnabled =
  !!url && !!anonKey && url.startsWith("http") && anonKey.length > 20;

/**
 * Cliente Supabase (ou null quando rodando em modo local/mock).
 * Todo acesso deve verificar `isSupabaseEnabled` antes de usar.
 * Usamos o client sem o generic Database para não depender dos tipos
 * gerados; o mapeamento de linhas é feito explicitamente nos serviços
 * (ver src/lib/supabase/types.ts).
 */
export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
