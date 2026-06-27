-- ============================================================
-- Ponto Fácil · 0003 — Jornada do funcionário (hora de entrada/saída)
-- Rode no SQL Editor depois da 0002.
-- ============================================================

alter table public.usuarios add column if not exists hora_entrada text not null default '08:00';
alter table public.usuarios add column if not exists hora_saida   text not null default '18:00';
