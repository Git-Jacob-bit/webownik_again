-- Uruchom jako administrator Postgresa po wykonaniu migracji.
-- PRZED URUCHOMIENIEM zastąp CHANGE_ME_STRONG_DATABASE_PASSWORD losowym hasłem.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'webownik_app') THEN
    CREATE ROLE webownik_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
  END IF;
END
$$;

ALTER ROLE webownik_app PASSWORD 'CHANGE_ME_STRONG_DATABASE_PASSWORD';
GRANT CONNECT ON DATABASE postgres TO webownik_app;
GRANT USAGE ON SCHEMA public TO webownik_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."user", public.deck, public.question, public.answer,
  public.quizsession, public.todo, public.note, public.link
TO webownik_app;
GRANT USAGE, SELECT ON SEQUENCE
  public.deck_id_seq, public.question_id_seq, public.answer_id_seq,
  public.quizsession_id_seq, public.todo_id_seq, public.note_id_seq, public.link_id_seq
TO webownik_app;
