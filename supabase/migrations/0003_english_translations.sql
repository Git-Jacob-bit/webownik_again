alter table deck add column if not exists title_en text;
alter table deck add column if not exists translation_status text not null default 'pending';
alter table deck add column if not exists translation_completed integer not null default 0;
alter table deck add column if not exists translation_total integer not null default 0;
alter table question add column if not exists content_en text;
alter table answer add column if not exists content_en text;

comment on column deck.title is 'Original Polish title';
comment on column deck.title_en is 'Cached English translation generated from title';
comment on column deck.translation_status is 'PL to EN translation state: pending, processing, ready or failed';
comment on column question.content is 'Original Polish question content';
comment on column question.content_en is 'Cached English translation generated from content';
comment on column answer.content is 'Original Polish answer content';
comment on column answer.content_en is 'Cached English translation generated from content';
