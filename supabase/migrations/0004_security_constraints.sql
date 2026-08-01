-- Defense in depth: new writes must respect the same bounds as the API.
-- NOT VALID keeps deployment possible if old development data needs cleanup;
-- PostgreSQL still enforces every constraint for new and changed rows.
alter table public.deck
  add constraint deck_title_length_check check (char_length(title) between 1 and 120) not valid,
  add constraint deck_translation_status_check check (translation_status in ('pending', 'processing', 'ready', 'failed')) not valid,
  add constraint deck_translation_progress_check check (
    translation_completed >= 0 and translation_total >= 0 and translation_completed <= translation_total
  ) not valid;

alter table public.question
  add constraint question_content_length_check check (char_length(content) between 1 and 2000) not valid;

alter table public.answer
  add constraint answer_content_length_check check (char_length(content) between 1 and 2000) not valid;

alter table public.todo
  add constraint todo_text_length_check check (char_length(text) between 1 and 500) not valid;

alter table public.note
  add constraint note_title_length_check check (char_length(title) between 1 and 200) not valid,
  add constraint note_content_length_check check (char_length(content) <= 20000) not valid;

alter table public.link
  add constraint link_title_length_check check (char_length(title) between 1 and 200) not valid,
  add constraint link_url_length_check check (char_length(url) between 1 and 2048) not valid,
  add constraint link_url_scheme_check check (url ~* '^https?://') not valid,
  add constraint link_category_length_check check (char_length(category) between 1 and 50) not valid;
