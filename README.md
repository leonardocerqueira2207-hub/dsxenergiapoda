# Energisa – EMS & ESS (Protótipo)

## Comandos locais
```bash
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # gera dist
npm run preview    # pré-visualiza a build
```

## Deploy rápido (Vercel)
1. Faça login em https://vercel.com e clique **Add New > Project**.
2. Importe este repositório (ou suba o zip e conecte ao GitHub).
3. Framework: **Vite**, comando de build: `npm run build`, diretório: `dist/`.
4. Deploy.

## Deploy (Netlify)
- **New site from Git** → Repo do projeto → Build command: `npm run build` → Publish directory: `dist`.

## Deploy (GitHub Pages)
1. `npm run build`
2. Suba a pasta `dist/` para um branch `gh-pages` ou use `vite-plugin-gh-pages`.

---

## CI (GitHub Actions)

- `ci-build.yml`: compila o projeto em cada push/PR para `main` e publica o artefato de build.
- `gh-pages.yml`: publica automaticamente o conteúdo de `dist/` no GitHub Pages (branch gerenciado pela action).

> Se for usar **Vercel**, a integração via GitHub já faz o deploy a cada push — a action de Pages é opcional.

## Domínio personalizado

### Vercel
1. Em **Settings > Domains**, adicione `app.seudominio.com`.
2. Vercel mostrará os **DNS (CNAME/A)**. Configure no seu provedor de domínio.
3. Aplique HTTPS automático (Let's Encrypt).

### Netlify
1. Em **Site settings > Domain management**, adicione o domínio.
2. Configure os **DNS** conforme instruções do painel.

### GitHub Pages
- Aponte um **CNAME** para o domínio do Pages (ou use Cloudflare). Crie um arquivo `CNAME` dentro de `dist/` com seu domínio se quiser forçar o hostname — no Pages gerenciado pela action, o CNAME deve ser configurado no repositório em **Settings > Pages > Custom domain**.

## Backend (server/)

### Rodar local
```bash
cd server
npm install
npm run dev   # http://localhost:8787
```

### Endpoints
- `GET /health`
- `GET /records/:company` → lista registros da empresa (`EMS` ou `ESS`)
- `POST /records/:company` → cria/atualiza registro (body: `{ id, date, type, qty, notes? }`)
- `DELETE /records/:company/:id` → remove registro
- `DELETE /records/:company` → apaga todos os registros

> Obs.: armazenamento em memória (para demo). Em produção troque por banco (Supabase, Postgres, etc.).

### Deploy sugerido (Render/Railway/Fly)
- Criar serviço **Node** apontando para `server/` com `npm run start` (após `npm run build`).
- Setar variável `ORIGIN` com a URL do front (ex.: `https://app.seudominio.com`).

