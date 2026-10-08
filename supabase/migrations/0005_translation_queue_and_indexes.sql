-- The API marks a deck as 'queued' before the background worker picks it up.
alter table public.deck drop constraint if exists deck_translation_status_check;
alter table public.deck
  add constraint deck_translation_status_check
  check (translation_status in ('pending', 'queued', 'processing', 'ready', 'failed')) not valid;

-- PostgreSQL does not index foreign keys automatically.
create index if not exists question_deck_id_idx on public.question(deck_id);
create index if not exists answer_question_id_idx on public.answer(question_id);
create index if not exists quizsession_deck_id_idx on public.quizsession(deck_id);

comment on column public.deck.translation_status is 'PL to EN translation state: pending, queued, processing, ready or failed';
