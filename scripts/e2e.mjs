// E2E de integração contra o Supabase real (anon key + RLS).
// Rode da raiz do projeto:  node scripts/e2e.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SUPA_URL = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
const tag = `pf-e2e-${Date.now()}`;
const pass = [], fail = [];
const ok = (n) => { pass.push(n); console.log("  ✅", n); };
const no = (n, e) => { fail.push(n); console.log("  ❌", n, "→", e?.message || e); };
const mk = () => createClient(SUPA_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

console.log("== E2E Ponto Fácil ==  tag:", tag, "\n");
await main();
async function main(){


// 1) Admin signup + empresa + perfil
const admin = mk();
const adminEmail = `${tag}-admin@pontofacil.test`;
let empresaId, adminId;
{
  const { data, error } = await admin.auth.signUp({ email: adminEmail, password: "senha123", options: { data: { name: "Admin E2E" } } });
  if (error) return finish(no("admin signUp", error));
  if (!data.session) return finish(no("admin signUp", "SEM SESSÃO → 'Confirm email' está LIGADO no Supabase. Desative em Authentication → Providers → Email."));
  adminId = data.user.id; ok("admin signUp (sessão criada)");
  const { data: emp, error: e2 } = await admin.from("empresas").insert({ nome: `E2E ${tag}`, segmento: "Teste", owner_id: adminId }).select("id").single();
  if (e2) return finish(no("criar empresa", e2));
  empresaId = emp.id; ok("criar empresa (RLS insert)");
  const { error: e3 } = await admin.from("usuarios").insert({ id: adminId, empresa_id: empresaId, nome: "Admin E2E", email: adminEmail, cargo: "Gerente", role: "admin" });
  e3 ? no("criar perfil admin", e3) : ok("criar perfil admin");
}

// 2) Admin configura localização da empresa
{
  const { error } = await admin.from("empresas").update({ endereco: "Av. Paulista, 1000", lat: -23.5614, lng: -46.6559, raio_gps: 150 }).eq("id", empresaId);
  error ? no("update localização (RLS empresas_update)", error) : ok("update localização da empresa");
}

// 3) Criar funcionário via client temporário (sem deslogar admin)
const empEmail = `${tag}-func@pontofacil.test`;
let funcId;
{
  const temp = mk();
  const { data, error } = await temp.auth.signUp({ email: empEmail, password: "func123", options: { data: { name: "Func E2E" } } });
  if (error) return finish(no("criar funcionário (signUp)", error));
  if (!data.session) return finish(no("criar funcionário", "sem sessão (confirm email ligado)"));
  funcId = data.user.id;
  const { error: e2 } = await temp.from("usuarios").insert({ id: funcId, empresa_id: empresaId, nome: "Func E2E", email: empEmail, cargo: "Caixa", role: "funcionario" });
  e2 ? no("inserir perfil funcionário", e2) : ok("criar funcionário (temp client + perfil)");
  // sessão do admin permanece?
  const { data: s } = await admin.auth.getSession();
  s.session?.user?.id === adminId ? ok("sessão do admin preservada") : no("sessão do admin preservada", "admin foi deslogado");
  await temp.auth.signOut();
}

// 4) Funcionário bate ponto + face_embedding (logado como funcionário)
const func = mk();
{
  const { error: le } = await func.auth.signInWithPassword({ email: empEmail, password: "func123" });
  if (le) return finish(no("login funcionário", le));
  ok("login funcionário");
  const { error: pe } = await func.from("registros_ponto").insert({
    empresa_id: empresaId, funcionario_id: funcId, nome: "Func E2E", cargo: "Caixa",
    tipo: "entrada", hora: "08:02", localizacao: "Av. Paulista, 1000", lat: -23.5614, lng: -46.6559,
    face_confidence: 0.91, gps_confirmado: true,
  });
  pe ? no("inserir registro de ponto", pe) : ok("inserir registro de ponto");
  const { error: fe } = await func.from("face_embeddings").upsert({ funcionario_id: funcId, empresa_id: empresaId, descriptor: Array.from({ length: 128 }, () => Math.random()) }, { onConflict: "funcionario_id" });
  fe ? no("salvar face_embedding", fe) : ok("salvar face_embedding");
  // funcionário NÃO deve conseguir ler funcionários de outra forma indevida: lê só o próprio perfil
  const { data: others } = await func.from("usuarios").select("id");
  (others && others.length === 1) ? ok("RLS: funcionário vê só o próprio perfil") : no("RLS funcionário", `viu ${others?.length} perfis`);
  await func.auth.signOut();
}

// 5) Admin vê o ponto do funcionário (RLS select por empresa) + notificação + lista equipe
{
  const { data: regs, error } = await admin.from("registros_ponto").select("*").eq("empresa_id", empresaId);
  if (error) no("admin lê registros da empresa", error);
  else (regs.length >= 1) ? ok(`admin lê registros da empresa (${regs.length})`) : no("admin lê registros", "0 registros");

  const { error: ne } = await admin.from("notificacoes").insert({ empresa_id: empresaId, funcionario_id: funcId, mensagem: "Func E2E registrou entrada às 08:02", tipo: "entrada", canal: "whatsapp" });
  ne ? no("criar notificação", ne) : ok("criar notificação");

  const { data: team } = await admin.from("usuarios").select("id").eq("empresa_id", empresaId);
  (team && team.length === 2) ? ok(`admin lista equipe (${team.length})`) : no("admin lista equipe", `viu ${team?.length}`);

  const { data: faces } = await admin.from("face_embeddings").select("funcionario_id").eq("empresa_id", empresaId);
  (faces && faces.length === 1) ? ok("admin vê biometria cadastrada da equipe") : no("admin vê biometria", `viu ${faces?.length}`);
}

// 6) Realtime: admin assina e recebe um novo INSERT
{
  await new Promise(async (resolve) => {
    let got = false;
    const ch = admin.channel("e2e-rt").on("postgres_changes", { event: "INSERT", schema: "public", table: "registros_ponto" }, () => { got = true; });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const f2 = mk();
        await f2.auth.signInWithPassword({ email: empEmail, password: "func123" });
        await f2.from("registros_ponto").insert({ empresa_id: empresaId, funcionario_id: funcId, nome: "Func E2E", tipo: "intervalo", hora: "12:01", gps_confirmado: true, face_confidence: 0.9 });
        await f2.auth.signOut();
        setTimeout(() => { got ? ok("realtime: INSERT recebido ao vivo") : no("realtime", "evento não chegou em 4s"); admin.removeChannel(ch); resolve(); }, 4000);
      }
    });
  });
}

}
finish();
function finish(_) {
  console.log(`\n== Resultado: ${pass.length} passaram, ${fail.length} falharam ==`);
  console.log("\n-- SQL de limpeza (rode no SQL Editor) --");
  console.log(`delete from auth.users where email like '${tag}-%';`);
  console.log(`delete from public.empresas where nome = 'E2E ${tag}';`);
  process.exit(fail.length ? 1 : 0);
}
