-- Knowledge Notes for Todos
-- Run this once in the Supabase SQL editor for this project
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- Mirrors the existing `planner_state` table's access model: this app has
-- no auth/login flow and talks to Supabase with the public/publishable key,
-- so policies here are intentionally permissive (open to the anon role) —
-- consistent with how `planner_state` is already accessed.

-- ── Table ────────────────────────────────────────────────────────────────
create table if not exists public.todo_notes (
  id uuid primary key default gen_random_uuid(),
  -- References TodoItem.id (todos live inside the planner_state JSON blob,
  -- not a SQL table, so this is a plain text foreign key with no FK
  -- constraint — cleanup on todo deletion is handled in application code).
  todo_id text not null unique,
  title text not null default '',
  -- BlockNote document: an array of Block objects, stored as-is.
  content jsonb not null default '[]'::jsonb,
  -- Flattened plain text of `content`, kept in sync on every save so the
  -- centralized Knowledge page can search titles + body without shipping
  -- BlockNote's parser to a server context.
  plain_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todo_notes_todo_id_idx on public.todo_notes (todo_id);
create index if not exists todo_notes_updated_at_idx on public.todo_notes (updated_at desc);
-- Simple search index over title + plain_text.
create index if not exists todo_notes_search_idx on public.todo_notes
  using gin (to_tsvector('simple', title || ' ' || plain_text));

alter table public.todo_notes enable row level security;

drop policy if exists "todo_notes_anon_all" on public.todo_notes;
create policy "todo_notes_anon_all"
  on public.todo_notes
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ── Storage bucket for note images ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('todo-note-images', 'todo-note-images', true)
on conflict (id) do nothing;

drop policy if exists "todo_note_images_public_read" on storage.objects;
create policy "todo_note_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'todo-note-images');

drop policy if exists "todo_note_images_anon_write" on storage.objects;
create policy "todo_note_images_anon_write"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'todo-note-images');

drop policy if exists "todo_note_images_anon_update" on storage.objects;
create policy "todo_note_images_anon_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'todo-note-images');

drop policy if exists "todo_note_images_anon_delete" on storage.objects;
create policy "todo_note_images_anon_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'todo-note-images');
