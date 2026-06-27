-- ============================================================
-- Ponto Fácil · 0004 — Regras de jornada (intervalo + dias de trabalho)
-- Rode no SQL Editor depois da 0003.
-- ============================================================

-- Intervalo (almoço) em minutos — padrão 1 hora
alter table public.usuarios add column if not exists intervalo_min integer not null default 60;

-- Dias de trabalho (0=Dom, 1=Seg, ... 6=Sáb). Padrão: Seg a Sáb.
alter table public.usuarios add column if not exists dias_trabalho integer[] not null default '{1,2,3,4,5,6}';
