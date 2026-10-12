'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from './supabase-browser';
import { useUser } from './useUser';
import { introduce, afterCheck, meterWeight, isKnown } from './memory';

// ---------------------------------------------------------------------
// Learning progress, shared by the Today session and the full deck.
//
// Always saved in this browser (works without an account). When signed
// in, also saved to the account so it follows you to other devices.
//
// progress = { "ที่": { s, d, last, seen, due, intro, checks, lapses, longest, got }, ... }
//   s, d    = memory stability (days) and difficulty: see lib/memory.js
//   last    = last time it was checked (or first met)
//   due     = when the next check is due
//   intro   = the first time you met it (used to count new words per day)
//   checks / lapses = right / wrong checks; longest = longest gap (days) before a right answer
//   got     = right checks in a row (drives the fading help on cards)
// days = { "2026-10-07": { reviewed: 14, done: true }, ... }
// ---------------------------------------------------------------------

// 'tsc-memory' replaced 'tsc-progress' (12 Oct 2026) when words started being
// checked over time; the old one-tap progress is not carried over.
export const PROGRESS_KEY = 'tsc-memory';
const DAYS_KEY = 'tsc-days';
const GOAL_KEY = 'tsc-goal';
export const GOAL_OPTIONS = [5, 10, 15, 20, 30];
export const DEFAULT_GOAL = 5; // eager learners can raise it on the Today screen

const DAY = 24 * 60 * 60 * 1000;

export const readStore = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
export const writeStore = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

// "2026-10-07" in the learner's own time zone
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Keep only entries in the memory format (old one-tap rows have no stability)
const normalise = (v) => (v && v.s > 0 ? {
  s: v.s, d: v.d || 5, last: v.last || v.seen, seen: v.seen || v.last, due: v.due, intro: v.intro || v.seen,
  checks: v.checks || 0, lapses: v.lapses || 0, longest: v.longest || 0, got: v.got || 0,
} : null);
const normaliseAll = (p) => Object.fromEntries(Object.entries(p || {}).map(([k, v]) => [k, normalise(v)]).filter(([, v]) => v));

const iso = (t) => new Date(t).toISOString();
const toRow = (userId, thai, v) => ({
  user_id: userId, thai, got: v.got, seen: iso(v.seen), due: iso(v.due), introduced_at: iso(v.intro),
  stability: v.s, difficulty: v.d, last_check: iso(v.last), checks: v.checks, lapses: v.lapses, longest_gap: v.longest,
});
const fromRow = (r) => normalise({
  s: r.stability, d: r.difficulty, last: r.last_check ? Date.parse(r.last_check) : undefined, seen: Date.parse(r.seen),
  due: r.due ? Date.parse(r.due) : undefined, intro: r.introduced_at ? Date.parse(r.introduced_at) : undefined,
  checks: r.checks, lapses: r.lapses, longest: r.longest_gap, got: r.got,
});

async function loadAll(db, table, select) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

// --- Streak: days in a row with the daily review finished -------------
export function streakFrom(days) {
  let t = Date.now();
  if (!days[dayKey(t)]?.done) t -= DAY; // today not finished yet: count up to yesterday
  let n = 0;
  while (days[dayKey(t)]?.done) { n++; t -= DAY; }
  return n;
}

// --- "Everyday Thai you understand" (an estimate) ---------------------
// Word use follows Zipf's law: the word at frequency rank r turns up about
// 1/r as often as the most common word. So the share of everyday Thai you
// can follow ≈ sum of 1/rank for the words you know, divided by the same
// sum over an everyday vocabulary of ~10,000 words.
// Each word counts by the chance you'd recognise it right now (memory.js),
// so the meter reflects real memory, not taps.
const EVERYDAY_VOCAB = 10000;
let H = 0; for (let r = 1; r <= EVERYDAY_VOCAB; r++) H += 1 / r;
export function coverage(words, progress, extraKnown) {
  let sum = 0;
  for (const w of words) {
    const weight = extraKnown?.has(w.thai) ? 1 : meterWeight(progress[w.thai]);
    if (!weight) continue;
    const rank = w.frequencyRank > 0 ? w.frequencyRank : 2000 + w.position; // unranked words count as rare
    sum += weight / rank;
  }
  return Math.min(sum / H, 0.99);
}

// Words that count as Known (checked over time), and words in progress
export const countKnown = (words, progress) => words.filter((w) => isKnown(progress[w.thai])).length;
export const countLearning = (words, progress) => words.filter((w) => progress[w.thai] && !isKnown(progress[w.thai])).length;

// --- The shared state --------------------------------------------------
const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState({});
  const [days, setDays] = useState({});
  const [goal, setGoalState] = useState(DEFAULT_GOAL);
  const [loaded, setLoaded] = useState(false);
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    setProgress(normaliseAll(readStore(PROGRESS_KEY, {})));
    setDays(readStore(DAYS_KEY, {}));
    setGoalState(readStore(GOAL_KEY, DEFAULT_GOAL));
    setLoaded(true);
  }, []);

  // Signed in: merge this browser with the account (most recent wins per word)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const db = supabaseBrowser();
      try {
        const rows = await loadAll(db, 'word_progress', 'thai, got, seen, due, introduced_at, stability, difficulty, last_check, checks, lapses, longest_gap');
        const remote = Object.fromEntries(rows.map((r) => [r.thai, fromRow(r)]).filter(([, v]) => v));
        const local = normaliseAll(readStore(PROGRESS_KEY, {}));
        const merged = { ...remote };
        const upload = [];
        for (const [thai, v] of Object.entries(local)) {
          if (!remote[thai] || v.seen > remote[thai].seen) { merged[thai] = v; upload.push(toRow(userId, thai, v)); }
        }
        for (let i = 0; i < upload.length; i += 500) {
          const { error } = await db.from('word_progress').upsert(upload.slice(i, i + 500));
          if (error) throw error;
        }

        const dayRows = await loadAll(db, 'study_days', 'day, reviewed, done');
        const localDays = readStore(DAYS_KEY, {});
        const mergedDays = { ...localDays };
        for (const r of dayRows) {
          const l = localDays[r.day];
          mergedDays[r.day] = { reviewed: Math.max(r.reviewed, l?.reviewed || 0), done: r.done || !!l?.done };
        }
        const dayUpload = Object.entries(mergedDays).map(([day, v]) => ({ user_id: userId, day, reviewed: v.reviewed || 0, done: !!v.done }));
        if (dayUpload.length) await db.from('study_days').upsert(dayUpload);

        const { data: profile } = await db.from('profiles').select('new_per_day, persona').eq('id', userId).maybeSingle();
        // Remember who they are (chosen on the home page) for tailoring the course later
        const persona = readStore('tsc-persona', null) ?? (() => { try { return localStorage.getItem('tsc-persona'); } catch { return null; } })();
        if (profile && !profile.persona && persona) await db.from('profiles').update({ persona }).eq('id', userId);

        if (!cancelled) {
          writeStore(PROGRESS_KEY, merged); setProgress(merged);
          writeStore(DAYS_KEY, mergedDays); setDays(mergedDays);
          if (profile?.new_per_day) { writeStore(GOAL_KEY, profile.new_per_day); setGoalState(profile.new_per_day); }
        }
      } catch (e) {
        console.warn('Could not sync progress', e);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const save = (table, row) => {
    if (!userId) return;
    supabaseBrowser().from(table).upsert(row).then(({ error }) => { if (error) console.warn(`Could not save ${table}`, error); });
  };

  const bumpDay = (patch) => setDays((d) => {
    const k = dayKey();
    const cur = d[k] || { reviewed: 0, done: false };
    const v = patch(cur);
    const next = { ...d, [k]: v };
    writeStore(DAYS_KEY, next);
    save('study_days', { user_id: userId, day: k, reviewed: v.reviewed, done: v.done });
    return next;
  });

  const update = (thai, fn) => {
    setProgress((p) => {
      const entry = fn(p[thai]);
      const next = { ...p, [thai]: entry };
      writeStore(PROGRESS_KEY, next);
      save('word_progress', toRow(userId, thai, entry));
      return next;
    });
    bumpDay((cur) => ({ ...cur, reviewed: cur.reviewed + 1 }));
  };
  // First time you meet a word (flashcard in Today). Self-rated, so it only sets a small starting strength.
  const learn = (thai, knewIt) => update(thai, (prev) => introduce(prev, knewIt));
  // A listen-and-choose check. grade: 'good' | 'hard' (used a hint) | 'again'
  const check = (thai, grade, opts) => update(thai, (prev) => afterCheck(prev, grade, Date.now(), opts));

  const finishToday = () => bumpDay((cur) => ({ ...cur, done: true }));

  const reset = () => {
    writeStore(PROGRESS_KEY, {}); setProgress({});
    if (userId) supabaseBrowser().from('word_progress').delete().eq('user_id', userId)
      .then(({ error }) => { if (error) console.warn('Could not reset progress', error); });
  };

  const setGoal = (n) => {
    writeStore(GOAL_KEY, n); setGoalState(n);
    if (userId) supabaseBrowser().from('profiles').update({ new_per_day: n }).eq('id', userId)
      .then(({ error }) => { if (error) console.warn('Could not save goal', error); });
  };

  const value = useMemo(() => ({
    progress, days, goal, loaded, learn, check, reset, finishToday, setGoal,
    streak: streakFrom(days),
    newToday: Object.values(progress).filter((v) => v.intro >= startOfToday()).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [progress, days, goal, loaded, userId]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgressStore() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgressStore must be inside <ProgressProvider>');
  return ctx;
}
