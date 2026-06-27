# Ponto Fácil — Setup

App PWA de controle de jornada (React + TS + Tailwind + Framer Motion), com
**GPS real**, **biometria facial real** (TensorFlow.js no navegador) e
**tempo real** via Supabase (com fallback local).

## Rodar localmente (modo LOCAL, sem backend)

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Já funciona tudo:
- Login pré-preenchido → **Entrar**
- GPS real, biometria facial real (modelos em `public/models`)
- Tempo real **entre abas** do mesmo navegador (BroadcastChannel)
- Painel do gestor em `/admin` (ou pelo card "Painel do gestor" na Home)

> No modo local o badge no topo do dashboard mostra **"Local"**.

---

## Ativar multi-dispositivo (modo SUPABASE)

### 1. Criar o projeto
- Acesse https://supabase.com → **New project**
- Em **Settings → API**, copie a **Project URL** e a **anon public key**

### 2. Configurar variáveis
```bash
cp .env.example .env
```
Preencha o `.env`:
```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Aplicar o banco (DUAS migrations, em ordem)
No painel: **SQL Editor → New query**, cole e rode **cada** arquivo:
1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tabelas, RLS, Realtime, bucket de selfies
2. [`supabase/migrations/0002_company_location_and_roles.sql`](supabase/migrations/0002_company_location_and_roles.sql) — localização da loja, bucket `avatars`, políticas de gestão de equipe

### 4. ⚠️ Desativar confirmação de e-mail (OBRIGATÓRIO)
**Authentication → Providers → Email** → desative **"Confirm email"** → **Save**.
Sem isso, o cadastro do admin e a criação de funcionários falham (não há sessão
para criar empresa/perfil sob a RLS), e o Supabase bloqueia por *email rate limit*.

### 5. (Opcional) Login Google
**Authentication → Providers → Google** → habilite e configure o OAuth.

### 6. Validar a integração (opcional, recomendado)
Com o `.env` preenchido e os passos 3–4 feitos:
```bash
npm run test:e2e
```
Roda o fluxo completo (admin → empresa → localização → funcionário → ponto →
realtime → notificação → biometria) contra o seu Supabase e imprime um SQL de
limpeza dos dados de teste ao final.

### 7. Reiniciar
```bash
npm run dev
```
O badge passa a mostrar **"Supabase"**. Agora:
- **Cadastro** cria empresa + usuário admin de verdade
- Cada ponto é gravado em `registros_ponto` e aparece **ao vivo em qualquer
  dispositivo** logado na mesma empresa
- A **biometria** é salva em `face_embeddings` → o mesmo rosto é reconhecido
  em outro aparelho

---

## Arquitetura (feature-based)

```
src/
  components/   ui (shadcn-style), layout, brand, shared
  contexts/     Auth, Theme, Settings, Punch
  features/     splash, auth, home, punch, history, notifications, profile, settings, admin
  hooks/        useGeolocation, useRealtimePunches
  lib/
    face/       faceService (ML), faceStore (persistência DB/local)
    realtime/   store (BroadcastChannel), punchRealtime (Supabase/local)
    supabase/   client, authService, types
    geo.ts      Haversine, reverse geocode, work location
supabase/migrations/0001_init.sql
public/models/  pesos do face-api (servidos localmente)
```

A troca **local ⇄ Supabase** é automática: definida por `isSupabaseEnabled`
(presença das envs). Nenhuma tela precisa mudar.

## Build de produção
```bash
npm run build      # tsc + vite build (gera PWA: manifest + service worker)
npm run preview
```
