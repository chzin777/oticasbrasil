# Publicação isolada

A stack deste diretório usa containers e volumes próprios. Ela não altera nem reinicia os serviços do CRM.

## Configuração inicial

Na máquina do servidor, copie o projeto para um diretório dedicado e crie o arquivo `.env` na raiz:

```sh
cp deploy/.env.example .env
```

Gere credenciais fortes sem gravá-las no repositório:

```sh
ADMIN_EMAIL=admin@exemplo.com sh deploy/generate-env.sh
```

O script cria `.env` com permissão `600`, sem sobrescrever um arquivo existente. Para obter a senha inicial do painel diretamente no servidor, use `grep '^ADMIN_PASSWORD=' .env` e guarde-a em um gerenciador de senhas. O PgBouncer e o Redis ficam somente na rede interna do Docker; apenas a porta indicada por `SITE_PORT` é publicada. A porta padrão é `8080`.

## Inicialização e verificações

Na raiz do projeto:

```sh
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
docker compose --env-file .env -f deploy/docker-compose.yml ps
curl http://127.0.0.1:8080/api/health
```

O endpoint de saúde verifica PostgreSQL e Redis. O esquema é aplicado automaticamente na inicialização, e o catálogo inicial é gerado durante o build.

O checkout requer cadastro ou login. No primeiro deploy, os pedidos são gravados com pagamento pendente demonstrativo: nenhuma cobrança é feita e nenhum QR Code Pix é emitido. A entrega continua simulada. Não configure `COOKIE_SECURE=false` em uma publicação exposta à internet sem proteger o acesso com HTTPS; quando houver TLS no proxy reverso, altere a opção para `true`.

O servidor não usa as instâncias de PgBouncer, Redis ou PostgreSQL do CRM. Não use `docker compose down -v` em outros projetos Compose.

## Integração com o CRM

O e-commerce e o CRM continuam com bancos e volumes independentes e se comunicam somente por HTTPS/API. Configure `CRM_API_URL` e o mesmo `INTEGRATION_SHARED_SECRET` no `.env` deste projeto e no `.env` do CRM (`ECOMMERCE_API_URL` aponta para a URL pública da loja). Gere o segredo no servidor, por exemplo com `openssl rand -hex 32`; nunca o coloque no repositório, no navegador ou em mensagens.

O e-commerce mantém uma fila durável de eventos e tenta novamente quando o CRM estiver indisponível. Clientes e carrinhos atualizados, pedidos criados/atualizados e cupons/políticas são enviados ao CRM. Alterações de contatos originadas no CRM atualizam o cadastro da loja; campanhas promocionais do CRM podem criar cupons, que ficam inativos até a campanha ser ativada. Senhas, sessões e dados de pagamento não são sincronizados. Os eventos recebidos pelo CRM são idempotentes.

Para carregar o histórico existente, abra **Painel → Clientes → Sincronizar CRM** após configurar os dois servidores. A operação enfileira clientes, carrinhos, pedidos e promoções existentes; pode ser repetida sem duplicar os registros no CRM.

No CRM, inclua as duas variáveis no `.env` de produção e aplique o novo schema com `npm run db:sync` usando o acesso direto ao PostgreSQL (`DIRECT_DB_HOST`/`DIRECT_DB_PORT`). Depois, recrie os dois serviços de aplicação para carregar as variáveis e o schema. O endpoint e-commerce do CRM requer a sessão administrativa para operações disparadas pelo painel; os webhooks entre servidores usam o segredo compartilhado.
