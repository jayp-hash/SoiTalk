-- =====================================================================
-- 009: memory over time (12 Oct 2026)
-- Words are now checked over growing gaps instead of counting as learned
-- after one "Got it" tap. Each word keeps a memory strength (stability, in
-- days) and difficulty: see app/lib/memory.js.
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
--
-- NOTE: this clears the old one-tap progress in word_progress (it can't be
-- converted honestly). Streak days (study_days) and Say it taps (said_it)
-- are kept.
-- =====================================================================

alter table word_progress add column if not exists stability   real;     -- days until recall drops to 90%
alter table word_progress add column if not exists difficulty  real;     -- 1 (easy) to 10 (hard)
alter table word_progress add column if not exists last_check  timestamptz;
alter table word_progress add column if not exists checks      integer not null default 0; -- right checks
alter table word_progress add column if not exists lapses      integer not null default 0; -- wrong checks
alter table word_progress add column if not exists longest_gap real    not null default 0; -- longest gap (days) before a right answer

-- Old rows have no memory strength: start everyone fresh
delete from word_progress where stability is null;
