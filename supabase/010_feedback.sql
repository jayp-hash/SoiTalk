-- =====================================================================
-- 010: "Report a mistake" messages
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- Read the messages in Supabase → Table Editor → feedback.
-- =====================================================================

create table if not exists feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'other',          -- thai | audio | broken | idea | other
  message text check (char_length(message) <= 2000),
  email text check (char_length(email) <= 200), -- only if they typed it, for a reply
  page text,                                    -- e.g. /start/7eleven
  context jsonb,                                -- scene and step, or the word on the card
  anon_id text,                                 -- the random id from analytics (not a name)
  user_agent text,
  user_id uuid default auth.uid()               -- filled in if they're signed in
);

alter table feedback enable row level security;
-- Anyone (signed in or not) can send feedback. Nobody can read it through the app:
-- there is no select policy, so only the Supabase dashboard can see the messages.
drop policy if exists "anyone can send feedback" on feedback;
create policy "anyone can send feedback" on feedback
  for insert to anon, authenticated with check (true);
