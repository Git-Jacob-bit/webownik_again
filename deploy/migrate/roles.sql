-- GoTrue łączy się jako supabase_auth_admin (tak jak w oficjalnym docker/volumes/db/roles.sql).
ALTER ROLE supabase_auth_admin WITH PASSWORD :'auth_password';

-- Rola aplikacji: tylko DML na tabelach Webownika, bez DDL.
SELECT 'CREATE ROLE webownik_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'webownik_app') \gexec
ALTER ROLE webownik_app WITH LOGIN BYPASSRLS PASSWORD :'app_password';

GRANT CONNECT ON DATABASE postgres TO webownik_app;
GRANT USAGE ON SCHEMA public TO webownik_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."user", public.deck, public.question, public.answer,
  public.quizsession, public.todo, public.note, public.link
TO webownik_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO webownik_app;
