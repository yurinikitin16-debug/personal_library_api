alter table series
  add column if not exists is_enabled boolean not null default true;

alter table book
  add column if not exists is_enabled boolean not null default true;

alter table chapter
  add column if not exists is_enabled boolean not null default true;

alter table reading_progress
  add column if not exists is_enabled boolean not null default true;

create index if not exists idx_series_is_enabled
  on series (is_enabled);

create index if not exists idx_book_series_enabled
  on book (series_id, is_enabled);

create index if not exists idx_chapter_book_enabled
  on chapter (book_id, is_enabled);

create index if not exists idx_reading_progress_chapter_enabled
  on reading_progress (chapter_id, is_enabled);

create index if not exists idx_reading_progress_schedule_enabled
  on reading_progress (scheduled_date, is_enabled);
