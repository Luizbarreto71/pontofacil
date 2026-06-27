# Deploy — Ponto Fácil (produção)

App: SPA (Vite) + PWA. Backend: Supabase (já configurado). Deploy = hospedar a
pasta `dist/` como site estático com fallback de SPA. Abaixo, o caminho mais
simples (Vercel) e a alternativa (Netlify).

---

## Opção A — Vercel (recomendado)

### 1. Subir o código pro GitHub
```bash
git init && git add -A && git commit -m "Ponto Fácil"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ponto-facil.git
git push -u origin main
```

### 2. Importar na Vercel
- https://vercel.com/new → importe o repositório
- Framework: **Vite** (detectado automaticamente)
- Build: `npm run build` · Output: `dist` (já no `vercel.json`)

### 3. Variáveis de ambiente (Settings → Environment Variables)
| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | sua Project URL |
| `VITE_SUPABASE_ANON_KEY` | sua anon key |

> São embutidas no build (a anon key é pública por design — a segurança vem da RLS).

### 4. Deploy
Clique **Deploy**. Você recebe uma URL `https://seu-app.vercel.app`.

---

## Opção B — Netlify
- https://app.netlify.com → "Add new site" → importe o repo
- Config já está em `netlify.toml` (build `npm run build`, publish `dist`, SPA fallback)
- Em **Site settings → Environment variables**, adicione as duas `VITE_…` acima.

### Sem GitHub (deploy manual rápido)
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

---

## ⚠️ Passo obrigatório no Supabase (pós-deploy)

Em **Authentication → URL Configuration**:
- **Site URL**: `https://seu-app.vercel.app`
- **Redirect URLs**: adicione `https://seu-app.vercel.app/**`

Sem isso, login por link/Google e os redirecionamentos falham em produção.
(O login por e-mail/senha funciona mesmo sem ajustar, mas configure assim mesmo.)

---

## Checklist final de produção
- [ ] Migrations `0001` e `0002` aplicadas
- [ ] "Confirm email" **desligado** (ou um fluxo de confirmação implementado)
- [ ] Env vars `VITE_…` setadas no host
- [ ] Site URL + Redirect URLs no Supabase
- [ ] HTTPS (automático na Vercel/Netlify) — necessário para câmera e GPS
- [ ] Testar em celular real: login → cadastro facial → bater ponto → dashboard ao vivo

## Notas
- **HTTPS é obrigatório** para `getUserMedia` (câmera) e `geolocation` — Vercel/Netlify
  já entregam HTTPS, então a biometria e o GPS funcionam em produção.
- O PWA (instalável) e o service worker são gerados no build automaticamente.
- Os modelos de IA facial (`/models`, ~6.7 MB) são servidos estaticamente e
  carregados sob demanda só na tela de ponto.
