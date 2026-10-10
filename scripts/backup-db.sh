#!/usr/bin/env bash
# Kopia bazy Webownika z kontenera `db` (deploy/compose.yaml).
# Obejmuje schematy `public` (dane aplikacji) i `auth` (konta) — jedno bez drugiego
# nie da się sensownie odtworzyć, bo public."user" wskazuje na auth.users.
#
# Uruchamiaj jako zadanie cron na TrueNAS, np. codziennie o 3:00:
#   BACKUP_DIR=/mnt/tank/backups/webownik /ścieżka/do/webownik_again/scripts/backup-db.sh
set -euo pipefail

# TrueNAS nazywa kontenery ix-<nazwa aplikacji>-<serwis>-1 (aplikacja „webownik”).
DB_CONTAINER="${DB_CONTAINER:-ix-webownik-db-1}"
# Superuser obrazu supabase/postgres; hasło bierze z PGPASSWORD w środowisku kontenera.
DB_USER="${DB_USER:-supabase_admin}"
DB_NAME="${DB_NAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:?Ustaw BACKUP_DIR, np. /mnt/tank/backups/webownik}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

umask 077
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/webownik-$timestamp.dump"
partial="$target.partial"
trap 'rm -f "$partial"' EXIT

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --schema=public --schema=auth > "$partial"

# Uszkodzony zrzut nie może wyglądać jak udana kopia.
docker exec -i "$DB_CONTAINER" pg_restore --list > /dev/null < "$partial"
mv "$partial" "$target"

find "$BACKUP_DIR" -name 'webownik-*.dump' -type f -mtime +"$RETENTION_DAYS" -delete
echo "Backup zapisany: $target"
