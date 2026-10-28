#!/bin/sh
set -eu

if [ -f .env ]; then
  echo "O arquivo .env já existe; não será sobrescrito." >&2
  exit 1
fi

if [ -z "${ADMIN_EMAIL:-}" ]; then
  echo "Defina ADMIN_EMAIL antes de gerar as credenciais." >&2
  exit 1
fi

command -v openssl >/dev/null 2>&1 || {
  echo "openssl é necessário para gerar os segredos." >&2
  exit 1
}

postgres_password="$(openssl rand -hex 32)"
redis_password="$(openssl rand -hex 32)"
admin_password="$(openssl rand -hex 32)"

umask 077
{
  printf 'SITE_PORT=%s\n' "${SITE_PORT:-8080}"
  printf 'POSTGRES_PASSWORD=%s\n' "$postgres_password"
  printf 'REDIS_PASSWORD=%s\n' "$redis_password"
  printf 'ADMIN_EMAIL=%s\n' "$ADMIN_EMAIL"
  printf 'ADMIN_PASSWORD=%s\n' "$admin_password"
  printf 'COOKIE_SECURE=%s\n' "${COOKIE_SECURE:-false}"
} > .env
chmod 600 .env
echo "Segredos gerados em .env (permissão 600)."
