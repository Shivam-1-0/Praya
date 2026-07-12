-- Praya — initial schema
-- Idempotent: safe to re-run.

------------------------------------------------------------
-- Extensions
------------------------------------------------------------
create extension if not exists "pgcrypto";

------------------------------------------------------------
-- shared: updated_at trigger fn
------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

------------------------------------------------------------
-- profiles: 1:1 with auth.users
------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_select" on public.profiles;
drop policy if exists "profiles_owner_insert" on public.profiles;
drop policy if exists "profiles_owner_update" on public.profiles;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_owner_insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row the moment a user signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- habits: recurring commitments
------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  frequency_type text not null check (frequency_type in ('daily', 'weekly', 'custom_days')),
  custom_days smallint[],
  is_important boolean not null default false,
  archived_at timestamptz,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_archived_idx
  on public.habits (user_id, archived_at);

alter table public.habits enable row level security;

drop policy if exists "habits_owner_select" on public.habits;
drop policy if exists "habits_owner_insert" on public.habits;
drop policy if exists "habits_owner_update" on public.habits;
drop policy if exists "habits_owner_delete" on public.habits;

create policy "habits_owner_select" on public.habits
  for select using (auth.uid() = user_id);
create policy "habits_owner_insert" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "habits_owner_update" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_owner_delete" on public.habits
  for delete using (auth.uid() = user_id);

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

-- Max 3 active "important" habits per user, enforced at the DB level so no
-- write path (UI, automation API) can bypass it.
create or replace function public.enforce_important_habit_limit() returns trigger
language plpgsql as $$
declare
  active_important_count integer;
begin
  if new.is_important and new.archived_at is null then
    select count(*) into active_important_count
    from public.habits
    where user_id = new.user_id
      and is_important = true
      and archived_at is null
      and id <> new.id;

    if active_important_count >= 3 then
      raise exception 'Cannot have more than 3 active important habits';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists habits_important_limit on public.habits;
create trigger habits_important_limit
  before insert or update on public.habits
  for each row execute function public.enforce_important_habit_limit();

------------------------------------------------------------
-- tasks: one-off, date-specific
------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date not null,
  priority text check (priority in ('low', 'medium', 'high')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_date_idx
  on public.tasks (user_id, due_date);

alter table public.tasks enable row level security;

drop policy if exists "tasks_owner_select" on public.tasks;
drop policy if exists "tasks_owner_insert" on public.tasks;
drop policy if exists "tasks_owner_update" on public.tasks;
drop policy if exists "tasks_owner_delete" on public.tasks;

create policy "tasks_owner_select" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_owner_insert" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_owner_update" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_owner_delete" on public.tasks
  for delete using (auth.uid() = user_id);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- completions: single source of truth for "done today"
-- Row existence = complete. Toggling off deletes the row.
------------------------------------------------------------
create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('habit', 'task')),
  item_id uuid not null,
  completion_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, item_type, item_id, completion_date)
);

create index if not exists completions_user_date_idx
  on public.completions (user_id, completion_date);
create index if not exists completions_user_item_idx
  on public.completions (user_id, item_type, item_id);

alter table public.completions enable row level security;

drop policy if exists "completions_owner_select" on public.completions;
drop policy if exists "completions_owner_insert" on public.completions;
drop policy if exists "completions_owner_delete" on public.completions;

create policy "completions_owner_select" on public.completions
  for select using (auth.uid() = user_id);
create policy "completions_owner_insert" on public.completions
  for insert with check (auth.uid() = user_id);
create policy "completions_owner_delete" on public.completions
  for delete using (auth.uid() = user_id);

------------------------------------------------------------
-- day_reviews: End-of-Day Review, one per user per day
------------------------------------------------------------
create table if not exists public.day_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  satisfaction_rating smallint check (satisfaction_rating between 1 and 5),
  reflection_text text,
  day_score numeric(5, 2),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

alter table public.day_reviews enable row level security;

drop policy if exists "day_reviews_owner_select" on public.day_reviews;
drop policy if exists "day_reviews_owner_insert" on public.day_reviews;
drop policy if exists "day_reviews_owner_update" on public.day_reviews;

create policy "day_reviews_owner_select" on public.day_reviews
  for select using (auth.uid() = user_id);
create policy "day_reviews_owner_insert" on public.day_reviews
  for insert with check (auth.uid() = user_id);
create policy "day_reviews_owner_update" on public.day_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists day_reviews_set_updated_at on public.day_reviews;
create trigger day_reviews_set_updated_at
  before update on public.day_reviews
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- day_review_items: per-incomplete-item miss reason + valid/invalid
-- user_id denormalized (not just via day_review_id) so RLS is a direct
-- check, not a join — this table is hit hard by Analytics.
------------------------------------------------------------
create table if not exists public.day_review_items (
  id uuid primary key default gen_random_uuid(),
  day_review_id uuid not null references public.day_reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('habit', 'task')),
  item_id uuid not null,
  reason_text text,
  is_valid boolean,
  created_at timestamptz not null default now()
);

create index if not exists day_review_items_user_review_idx
  on public.day_review_items (user_id, day_review_id);

alter table public.day_review_items enable row level security;

drop policy if exists "day_review_items_owner_select" on public.day_review_items;
drop policy if exists "day_review_items_owner_insert" on public.day_review_items;
drop policy if exists "day_review_items_owner_update" on public.day_review_items;

create policy "day_review_items_owner_select" on public.day_review_items
  for select using (auth.uid() = user_id);
create policy "day_review_items_owner_insert" on public.day_review_items
  for insert with check (auth.uid() = user_id);
create policy "day_review_items_owner_update" on public.day_review_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- veyla_conversations / veyla_messages
------------------------------------------------------------
create table if not exists public.veyla_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.veyla_conversations enable row level security;

drop policy if exists "veyla_conversations_owner_select" on public.veyla_conversations;
drop policy if exists "veyla_conversations_owner_insert" on public.veyla_conversations;
drop policy if exists "veyla_conversations_owner_update" on public.veyla_conversations;
drop policy if exists "veyla_conversations_owner_delete" on public.veyla_conversations;

create policy "veyla_conversations_owner_select" on public.veyla_conversations
  for select using (auth.uid() = user_id);
create policy "veyla_conversations_owner_insert" on public.veyla_conversations
  for insert with check (auth.uid() = user_id);
create policy "veyla_conversations_owner_update" on public.veyla_conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "veyla_conversations_owner_delete" on public.veyla_conversations
  for delete using (auth.uid() = user_id);

drop trigger if exists veyla_conversations_set_updated_at on public.veyla_conversations;
create trigger veyla_conversations_set_updated_at
  before update on public.veyla_conversations
  for each row execute function public.set_updated_at();

create table if not exists public.veyla_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.veyla_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists veyla_messages_conversation_idx
  on public.veyla_messages (conversation_id, created_at);

alter table public.veyla_messages enable row level security;

drop policy if exists "veyla_messages_owner_select" on public.veyla_messages;
drop policy if exists "veyla_messages_owner_insert" on public.veyla_messages;
drop policy if exists "veyla_messages_owner_delete" on public.veyla_messages;

create policy "veyla_messages_owner_select" on public.veyla_messages
  for select using (auth.uid() = user_id);
create policy "veyla_messages_owner_insert" on public.veyla_messages
  for insert with check (auth.uid() = user_id);
create policy "veyla_messages_owner_delete" on public.veyla_messages
  for delete using (auth.uid() = user_id);

------------------------------------------------------------
-- api_keys: automation API auth (n8n etc.)
-- Owner manages via normal session (select/insert/revoke below).
-- The hash lookup during an automation request uses the service-role
-- client instead (see src/lib/automation/queries.ts) since external
-- callers have no Supabase session for RLS to key off.
------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{read:today}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists api_keys_key_hash_idx
  on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_owner_select" on public.api_keys;
drop policy if exists "api_keys_owner_insert" on public.api_keys;
drop policy if exists "api_keys_owner_update" on public.api_keys;

create policy "api_keys_owner_select" on public.api_keys
  for select using (auth.uid() = user_id);
create policy "api_keys_owner_insert" on public.api_keys
  for insert with check (auth.uid() = user_id);
create policy "api_keys_owner_update" on public.api_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- admin_audit_log: no owner-level policies on purpose.
-- RLS is enabled with zero grants for anon/authenticated — only the
-- service-role client (used exclusively by the admin surface) can
-- read or write this table.
------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
