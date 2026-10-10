# Jednorazowy kontener: migracje aplikacji + role bazy dla deploy/compose.yaml.
# Budowany z katalogu głównego repo: docker build -f deploy/migrate/Dockerfile .
FROM postgres:17-alpine

COPY supabase/migrations/ /migrations/
COPY deploy/migrate/migrate.sh deploy/migrate/roles.sql /opt/webownik/

USER postgres
ENTRYPOINT ["/bin/sh", "/opt/webownik/migrate.sh"]
