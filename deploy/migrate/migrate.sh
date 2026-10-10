#!/bin/sh
# Uruchamiany przy każdym starcie aplikacji, przed `auth` i `api`. Idempotentny.
set -eu

: "${POSTGRES_PASSWORD:?}"
: "${APP_DB_PASSWORD:?}"
export PGHOST="${PGHOST:-db}" PGPORT="${PGPORT:-5432}" PGDATABASE="${PGDATABASE:-postgres}"
# supabase_admin to superuser obrazu supabase/postgres (trigger na auth.users, rola z BYPASSRLS).
export PGUSER=supabase_admin PGPASSWORD="$POSTGRES_PASSWORD"

echo "Czekam na bazę i schemat auth..."
attempt=0
until [ "$(psql -tAc "select to_regclass('auth.users') is not null" 2>/dev/null)" = "t" ]; do
  attempt=$((attempt + 1))
  [ "$attempt" -ge 90 ] && { echo "Baza niedostępna po 3 minutach" >&2; exit 1; }
  sleep 2
done

psql -v ON_ERROR_STOP=1 -q -c "create table if not exists public.webownik_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
)"

for file in /migrations/*.sql; do
  version="$(basename "$file" .sql)"
  if [ "$(psql -tAc "select 1 from public.webownik_schema_migrations where version = '$version'")" = "1" ]; then
    continue
  fi
  echo "Migracja $version"
  { cat "$file"; printf "\ninsert into public.webownik_schema_migrations (version) values ('%s');\n" "$version"; } \
    | psql -v ON_ERROR_STOP=1 -q --single-transaction
done

psql -v ON_ERROR_STOP=1 -q \
  -v auth_password="$POSTGRES_PASSWORD" \
  -v app_password="$APP_DB_PASSWORD" \
  -f /opt/webownik/roles.sql
echo "Migracje i role gotowe."
