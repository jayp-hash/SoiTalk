// ---------------------------------------------------------------------
// Memory model: how well each word is remembered, tracked over time.
//
// Based on FSRS (Free Spaced Repetition Scheduler, the open algorithm Anki
// uses). Each word has:
//   s = stability, in days: how long until you'd probably forget it
//       (the chance of remembering drops to 90% after s days)
//   d = difficulty, 1 (easy) to 10 (hard) for you
//
// Why it isn't fooled by recency: a right answer only makes a word much
// stronger when some time has passed and forgetting was possible. Getting
// it right five times in a row on the same day barely changes anything.
//
// Rules on top of FSRS:
//   - Seeing a word on a flashcard and tapping "Got it" only sets a small
//     starting strength (1 day; "Still learning" = 0.4). Self-ratings never
//     make a word Known. Only checks (listen and choose) move it up.
//   - Known = you'd very likely still recognise it 3 weeks from now
//     (s >= 21) AND you've proved it at least once after a 7+ day gap.
//   - The street meter counts each word by how likely you are to remember
//     it right now, so it rises with practice and slowly drifts if you stop.
// ---------------------------------------------------------------------

// FSRS-4.5 default weights (published defaults, tuned on millions of Anki reviews)
const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
const FACTOR = 19 / 81;
const DECAY = -0.5;
const DAY = 24 * 60 * 60 * 1000;

export const KNOWN_STABILITY = 21; // days
export const KNOWN_PROOF_GAP = 7;  // days: at least one correct check after a gap this long
const MAX_INTERVAL = 180;          // days

const clampD = (d) => Math.min(10, Math.max(1, d));

// Chance of remembering after t days, given stability s
export const recall = (tDays, s) => (s > 0 ? Math.pow(1 + FACTOR * Math.max(0, tDays) / s, DECAY) : 0);

const daysSince = (t, now) => Math.max(0, (now - t) / DAY);

// Next check: when recall drops to 90% (which is after s days), at least tomorrow
function nextDue(s, now) {
  const days = Math.min(MAX_INTERVAL, Math.max(1, Math.round(s)));
  const d = new Date(now + days * DAY);
  d.setHours(4, 0, 0, 0); // due from early morning that day
  return d.getTime();
}

// First time you meet a word (flashcard, self-rated)
export function introduce(prev, knewIt, now = Date.now()) {
  if (prev && prev.checks > 0) return { ...prev, seen: now }; // already in the system: a flashcard can't change it
  const s = knewIt ? 1 : W[0];
  return {
    s, d: W[4], last: now, seen: now, intro: prev?.intro || now,
    due: nextDue(s, now), checks: 0, lapses: 0, longest: 0, got: 0,
  };
}

// A check (listen and choose). grade: 'good' (right), 'hard' (right after "Show the word"), 'again' (wrong)
// opts.proof = false when the check can't prove the word itself (a sentence check:
// other words in the sentence could give the answer away)
export function afterCheck(prev, grade, now = Date.now(), opts = {}) {
  const p = prev || introduce(null, false, now);
  // Right only after seeing the word written: that tested reading, not listening.
  // Keep the strength as it was and ask again tomorrow.
  if (grade === 'hard') return { ...p, seen: now, due: nextDue(1, now) };
  const gap = daysSince(p.last, now);
  const r = recall(gap, p.s);
  let { s, d } = p;
  if (grade === 'again') {
    s = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
    s = Math.min(s, p.s); // a miss never makes a word stronger
    d = clampD(d + 2 * W[6]);
  } else {
    s = s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) + 1);
  }
  d = clampD(W[7] * W[4] + (1 - W[7]) * d); // drift slowly back toward average
  s = Math.max(0.1, s);
  const right = grade !== 'again';
  return {
    ...p, s, d, last: now, seen: now, due: nextDue(s, now),
    checks: p.checks + (right ? 1 : 0),
    lapses: p.lapses + (right ? 0 : 1),
    longest: right && opts.proof !== false ? Math.max(p.longest || 0, gap) : p.longest || 0,
    got: right ? (p.got || 0) + 1 : 0, // drives the fading help on cards
  };
}

export const isKnown = (e) => !!e && e.s >= KNOWN_STABILITY && (e.longest || 0) >= KNOWN_PROOF_GAP;
export const recallNow = (e, now = Date.now()) => (e ? recall(daysSince(e.last, now), e.s) : 0);

// How much a word counts toward the street meter: only seen on a flashcard = 10%,
// so day 1 shows a little movement; it counts fully once a check proves it.
export const meterWeight = (e, now = Date.now()) => (!e ? 0 : (e.checks > 0 ? 1 : 0.1) * recallNow(e, now));

// 'new' | 'learning' | 'known'
export const stageOf = (e) => (!e ? 'new' : isKnown(e) ? 'known' : 'learning');
