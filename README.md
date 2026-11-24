# Óticas Brasil — Loja virtual

E-commerce da **Óticas Brasil**: catálogo de armações, óculos de sol, lentes de grau e Ray-Ban Meta, com carrinho, lista de desejos, checkout, conta do cliente e um **painel administrativo** completo (pedidos, clientes, produtos, tags, políticas de desconto, banners e editor de páginas). O catálogo e o estoque são sincronizados com o ERP via serviço de integração, e eventos de clientes/pedidos são enviados ao CRM.

## Stack

- **Front-end:** React 19 + Vite + TypeScript, React Router, Tailwind CSS 4, GSAP/Motion, Three.js/OGL (efeitos), Puck (editor visual de páginas)
- **Back-end:** Node + Express (`server/`), PostgreSQL (`pg`, via PgBouncer) e Redis (sessões/cache)
- **Serviços:** Google Gemini (`@google/genai`), Resend (e-mails/OTP), login com Google (OAuth)
- **Infra:** Docker Compose (`deploy/docker-compose.yml`)

## Como rodar localmente

Pré-requisitos: Node.js 20+, PostgreSQL e Redis acessíveis (ou suba a stack Docker).

```bash
npm install
cp .env.example .env         # preencha as variáveis
npm run dev                  # front (Vite) em http://localhost:3000
npm run build && npm start   # build + servidor Express (API + site)
```

Outros scripts: `build`, `start`, `preview`, `lint`, `clean`.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `APP_URL` | URL pública da loja |
| `SITE_PORT` | Porta publicada pelo container (padrão `8080`) |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD` | Credenciais do banco e do Redis |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Usuário inicial do painel `/admin` |
| `COOKIE_SECURE` | Cookies apenas em HTTPS |
| `INTEGRATION_API_URL`, `INTEGRATION_API_KEY` | Serviço de integração com o ERP (catálogo/estoque) |
| `INTEGRATION_SHARED_SECRET` | Assinatura dos eventos trocados com integração/CRM |
| `CRM_API_URL` | Endpoint do CRM que recebe eventos da loja |
| `GEMINI_API_KEY` | Recursos de IA |
| `RESEND_API_KEY` | Envio de e-mails (código de verificação no cadastro) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Login com Google |

Para gerar um `.env` com senhas fortes no servidor: `ADMIN_EMAIL=... sh deploy/generate-env.sh`.

## Páginas da loja

| Rota | Página |
|------|--------|
| `/` | Home |
| `/armacoes`, `/oculos-de-sol`, `/lentes-de-grau`, `/rayban-meta`, `/todos-os-produtos` | Catálogo |
| `/produto/:slug` | Produto |
| `/lista-de-desejos`, `/checkout` | Desejos e compra |
| `/login`, `/minha-conta` | Conta do cliente |
| `/quem-somos`, `/taxas` | Institucional e taxas de parcelamento |
| `/admin` | Painel administrativo |

## API (`server/`)

| Grupo | Rotas |
|-------|-------|
| Loja | `/api/store/products`, `/api/store/promotions`, `/api/store/settings`, `/api/store/state`, `/api/stores` |
| Cliente | `/api/auth/*` (cadastro com OTP, login, Google), `/api/cart`, `/api/orders`, `/api/customer/status` |
| Admin | `/api/admin/*` (login, dashboard, pedidos, clientes, tags, políticas de desconto, usuários, configurações, auditoria, sincronização) |
| Integração | `/api/integration/products`, `/api/integrations/crm/events` |
| Saúde | `/api/health` |

Esquema do banco em `server/schema.sql`; carga inicial do catálogo em `server/catalog-seed.json` (gerada por `scripts/create-catalog-seed.ts`).

## Estrutura

```
src/
  pages/            páginas da loja
  pages/admin/      abas do painel administrativo
  components/       componentes de interface
  lib/, data/, types/
server/
  index.js          servidor Express e rotas da loja/cliente
  admin.js          rotas do painel
  integration.js    sincronização com ERP e eventos do CRM
  settings.js       configurações da loja
  schema.sql        esquema PostgreSQL
deploy/             docker-compose, .env de exemplo e gerador de credenciais
```

## Deploy

Produção em servidor próprio com Docker Compose (container `oticas-site-app`, PostgreSQL, PgBouncer e Redis isolados do CRM). Cada push na `main` dispara o deploy automático via webhook. Instruções de instalação e verificação em [`deploy/README.md`](deploy/README.md).
