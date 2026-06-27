-- ============================================================
-- Ponto Fácil · Schema inicial (Supabase / PostgreSQL)
-- Rode no painel: SQL Editor → New query → cole tudo → Run
-- ============================================================

-- Extensões
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------
create table if not exists public.empresas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  segmento    text,
  owner_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete set null,
  nome        text not null,
  email       text not null,
  cargo       text,
  role        text not null default 'funcionario'
              check (role in ('admin','gestor','rh','supervisor','funcionario')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.registros_ponto (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid references public.empresas(id) on delete cascade,
  funcionario_id  uuid not null references public.usuarios(id) on delete cascade,
  nome            text not null,
  cargo           text,
  avatar_url      text,
  tipo            text not null check (tipo in ('entrada','intervalo','retorno','saida')),
  hora            text not null,
  localizacao     text,
  lat             double precision,
  lng             double precision,
  face_confidence real,
  gps_confirmado  boolean not null default false,
  registrado_em   timestamptz not null default now()
);
create index if not exists idx_registros_empresa_data
  on public.registros_ponto (empresa_id, registrado_em desc);

create table if not exists public.face_embeddings (
  id              uuid primary key default gen_random_uuid(),
  funcionario_id  uuid not null unique references public.usuarios(id) on delete cascade,
  empresa_id      uuid references public.empresas(id) on delete cascade,
  descriptor      double precision[] not null,  -- vetor de 128 dimensões
  created_at      timestamptz not null default now()
);

create table if not exists public.notificacoes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid references public.empresas(id) on delete cascade,
  funcionario_id  uuid references public.usuarios(id) on delete set null,
  mensagem        text not null,
  tipo            text not null default 'info',
  canal           text not null default 'whatsapp',
  lida            boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helpers (SECURITY DEFINER evita recursão de RLS)
-- ------------------------------------------------------------
create or replace function public.auth_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.usuarios where id = auth.uid()
$$;

create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.usuarios where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.empresas        enable row level security;
alter table public.usuarios        enable row level security;
alter table public.registros_ponto enable row level security;
alter table public.face_embeddings enable row level security;
alter table public.notificacoes    enable row level security;

-- empresas: dono cria; membros leem a própria empresa
drop policy if exists empresas_insert on public.empresas;
create policy empresas_insert on public.empresas
  for insert with check (owner_id = auth.uid());
drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select using (id = public.auth_empresa_id() or owner_id = auth.uid());

-- usuarios: cada um cria/lê/edita o próprio; gestor lê a equipe
drop policy if exists usuarios_insert_self on public.usuarios;
create policy usuarios_insert_self on public.usuarios
  for insert with check (id = auth.uid());
drop policy if exists usuarios_update_self on public.usuarios;
create policy usuarios_update_self on public.usuarios
  for update using (id = auth.uid());
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select using (
    id = auth.uid()
    or (empresa_id = public.auth_empresa_id()
        and public.auth_role() in ('admin','gestor','rh','supervisor'))
  );

-- registros_ponto: funcionário registra o próprio; empresa lê todos
drop policy if exists registros_insert on public.registros_ponto;
create policy registros_insert on public.registros_ponto
  for insert with check (funcionario_id = auth.uid());
drop policy if exists registros_select on public.registros_ponto;
create policy registros_select on public.registros_ponto
  for select using (
    funcionario_id = auth.uid()
    or empresa_id = public.auth_empresa_id()
  );

-- face_embeddings: dono gerencia a própria; gestor lê a empresa
drop policy if exists faces_upsert on public.face_embeddings;
create policy faces_upsert on public.face_embeddings
  for insert with check (funcionario_id = auth.uid());
drop policy if exists faces_update on public.face_embeddings;
create policy faces_update on public.face_embeddings
  for update using (funcionario_id = auth.uid());
drop policy if exists faces_select on public.face_embeddings;
create policy faces_select on public.face_embeddings
  for select using (
    funcionario_id = auth.uid()
    or (empresa_id = public.auth_empresa_id()
        and public.auth_role() in ('admin','gestor','rh','supervisor'))
  );

-- notificacoes: empresa lê; funcionário lê as suas
drop policy if exists notif_select on public.notificacoes;
create policy notif_select on public.notificacoes
  for select using (
    funcionario_id = auth.uid() or empresa_id = public.auth_empresa_id()
  );
drop policy if exists notif_insert on public.notificacoes;
create policy notif_insert on public.notificacoes
  for insert with check (empresa_id = public.auth_empresa_id());

-- ------------------------------------------------------------
-- Realtime: publica inserts de registros e notificações
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.registros_ponto;
alter publication supabase_realtime add table public.notificacoes;

-- ------------------------------------------------------------
-- Storage: selfies de liveness (opcional)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', false)
on conflict (id) do nothing;

drop policy if exists selfies_rw on storage.objects;
create policy selfies_rw on storage.objects
  for all using (bucket_id = 'selfies' and owner = auth.uid())
  with check (bucket_id = 'selfies' and owner = auth.uid());
