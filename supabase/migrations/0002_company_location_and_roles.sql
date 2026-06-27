-- ============================================================
-- Ponto Fácil · 0002 — Localização da empresa + gestão de funcionários
-- Rode no SQL Editor depois da 0001.
-- ============================================================

-- Localização da loja (configurada pelo admin) na própria empresa
alter table public.empresas add column if not exists endereco text;
alter table public.empresas add column if not exists lat double precision;
alter table public.empresas add column if not exists lng double precision;
alter table public.empresas add column if not exists raio_gps integer not null default 150;

-- Status do funcionário
alter table public.usuarios add column if not exists ativo boolean not null default true;

-- ------------------------------------------------------------
-- empresas: admin/dono pode ATUALIZAR a própria empresa (endereço, raio)
-- ------------------------------------------------------------
drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas
  for update using (
    owner_id = auth.uid()
    or (id = public.auth_empresa_id() and public.auth_role() = 'admin')
  );

-- ------------------------------------------------------------
-- usuarios: admin/gestor pode gerenciar (update/delete) a equipe
-- ------------------------------------------------------------
drop policy if exists usuarios_admin_update on public.usuarios;
create policy usuarios_admin_update on public.usuarios
  for update using (
    empresa_id = public.auth_empresa_id()
    and public.auth_role() in ('admin','gestor','rh')
  );

drop policy if exists usuarios_admin_delete on public.usuarios;
create policy usuarios_admin_delete on public.usuarios
  for delete using (
    empresa_id = public.auth_empresa_id()
    and public.auth_role() in ('admin','gestor')
    and id <> auth.uid()
  );

-- ------------------------------------------------------------
-- Bucket público de avatares (foto do funcionário capturada no cadastro facial)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for insert with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid());
