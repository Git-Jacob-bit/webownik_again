alter table public.quizsession
    add column if not exists initial_question_count integer not null default 0,
    add column if not exists question_stats_json text not null default '{}',
    add column if not exists total_answers integer not null default 0,
    add column if not exists correct_answers integer not null default 0,
    add column if not exists incorrect_answers integer not null default 0,
    add column if not exists completed_at timestamp without time zone;

create index if not exists ix_quizsession_user_deck_active
    on public.quizsession (user_id, deck_id, is_active);
