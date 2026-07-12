-- Weekly habit target count.
-- Only meaningful when frequency_type='weekly'. Default 1 preserves prior
-- semantics ("once a week"). Cap at 7: one completion per habit per day.
alter table public.habits
  add column if not exists target_count smallint not null default 1
    check (target_count between 1 and 7);
