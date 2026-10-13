'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Deck from '../vocabulary/Deck';
import { useProgressStore, coverage, countKnown, countLearning, endOfToday, dayKey, GOAL_OPTIONS } from '../lib/progress';
import CheckSession from './Check';
import { TodayPattern, pickTodayPattern } from '../patterns/Patterns';
import { SCENES } from '../lib/scenes';
import { useUser } from '../lib/useUser';
import { SAY_IT, sayItFor } from '../lib/sayit';
import { supabaseBrowser } from '../lib/supabase-browser';
import { readStore, writeStore, dayKey as todayKey } from '../lib/progress';
import SoiSign from '../components/SoiSign';
import { renderSentence, getRegister, registerChosen, setRegister } from '../lib/register';

const REVIEW_CAP = 25;     // checks per day; any backlog rolls over, so a session stays ~5 minutes
                           // (and new words pause while more than this are waiting)
const EXTRA_NEW = 5;       // "Learn 5 more"
const MAX_REPEATS = 2;     // "Still learning" brings a card back at most twice per session

// Under 10% show one decimal, so the first few words visibly move the meter
// First days. Day 1 is the first session (/start/7eleven: ไม่ เอา ถุง ใบเสร็จ ช้อน
// + your polite ending). After that, each day is a small bundle of words that
// opens the next pattern, so every day ends with a pattern to practise. A
// bundle is learned whole, even if it's one more than the daily goal.
// "I" is ผม for men and ฉัน for women; the polite ending is ครับ / ค่ะ.
const FAST_TRACK = [
  ['ไม่', 'เอา', 'ถุง', 'ใบเสร็จ', 'ช้อน', 'ENDING'],          // day 1: the first session
  ['ขอ', 'ผัดกะเพรา', 'ต้มยำ', 'ส้มตำ', 'เผ็ด', 'นิดหน่อย'], // day 2: the restaurant scene (/start/restaurant)
  ['กาแฟ', 'ชา', 'เย็น', 'ร้อน', 'หวาน', 'น้อย'],            // day 3: the coffee shop scene (/start/cafe)
  ['น้ำเปล่า', 'เบียร์', 'ขวด', 'สอง', 'สาม'],              // day 4: ordering drinks opens (ขอ น้ำเปล่า สอง ขวด)
  ['ฉัน', 'คุณ', 'ชอบ', 'กิน', 'นอน'],                     // day 5: saying what you like
  ['กี่', 'สวัสดี', 'ขอบคุณ', 'ขอโทษ', 'ไม่เป็นไร'],          // day 6: the staff's question (เอากี่ขวด)
];
// The other gender's ending (to recognise it when you hear it) waits until later
const OTHER_ENDING_AFTER = 60;
function personal(t, reg) {
  if (t === 'ฉัน' && reg === 'male') return 'ผม';
  if (t === 'ENDING') return reg === 'male' ? 'ครับ' : 'ค่ะ';
  return t;
}
// The course order for this learner, plus the fast-track bundles (as Thai lists)
function fastTrack(words, reg) {
  const other = reg === 'male' ? 'ค่ะ' : 'ครับ';
  const byThai = new Map(words.map((w) => [w.thai, w]));
  const bundles = FAST_TRACK.map((b) => b.map((t) => personal(t, reg)).filter((t) => byThai.has(t)));
  const first = bundles.flat().map((t) => byThai.get(t));
  const inFirst = new Set(first.map((w) => w.thai));
  const out = [...first, ...words.filter((w) => !inFirst.has(w.thai) && w.thai !== other)];
  if (byThai.has(other)) out.splice(Math.min(OTHER_ENDING_AFTER, out.length), 0, byThai.get(other));
  return { order: out, bundles };
}

const pct = (x) => { const v = x * 100; return v > 0 && v < 10 ? `${(Math.round(v * 10) / 10).toFixed(1)}%` : `${Math.round(v)}%`; };
const width = (x) => `${Math.min(100, x * 100)}%`;

// Streak shown with Thailand's colours of the day (Sunday red, Monday
// yellow, Tuesday pink, Wednesday green, Thursday orange, Friday blue,
// Saturday purple). A finished day fills with its colour.
const THAI_DAY = [
  { en: 'Sun', full: 'Sunday', th: 'อา', rom: 'aa-thít', colour: 'red', color: '#E5383B' },
  { en: 'Mon', full: 'Monday', th: 'จ', rom: 'jan', colour: 'yellow', color: '#F2C200' },
  { en: 'Tue', full: 'Tuesday', th: 'อ', rom: 'ang-khaan', colour: 'pink', color: '#EC6AA8' },
  { en: 'Wed', full: 'Wednesday', th: 'พ', rom: 'phút', colour: 'green', color: '#2BA84A' },
  { en: 'Thu', full: 'Thursday', th: 'พฤ', rom: 'phá-rúe-hàt', colour: 'orange', color: '#F28C28' },
  { en: 'Fri', full: 'Friday', th: 'ศ', rom: 'sùk', colour: 'blue', color: '#3A8DDE' },
  { en: 'Sat', full: 'Saturday', th: 'ส', rom: 'sǎo', colour: 'purple', color: '#8E5CC9' },
];

// A day fills with its colour when the day's goal (the words) is done;
// a star means you also said that day's line out loud (the bonus).
function Week({ days, said = {} }) {
  // Tap a day to see how its Thai name is said (kept hidden for spacing)
  const [peek, setPeek] = useState(-1);
  const timer = useRef(0);
  const show = (back) => { clearTimeout(timer.current); setPeek(back); timer.current = setTimeout(() => setPeek(-1), 2500); };
  useEffect(() => () => clearTimeout(timer.current), []);
  const cells = [];
  for (let back = 6; back >= 0; back--) {
    const t = Date.now() - back * 864e5;
    const d = THAI_DAY[new Date(t).getDay()];
    const done = !!days[dayKey(t)]?.done;
    const star = said[dayKey(t)] != null;
    cells.push(
      <li key={back} className={`${done ? 'done' : ''}${back === 0 ? ' today' : ''}`} style={{ '--day': d.color }}>
        <button type="button" className="day" onClick={() => show(back)}
          aria-label={`${d.full}, ${d.rom}${back === 0 ? ', today' : ''}${done ? ', goal done' : ''}${star ? ', said it out loud' : ''}`}>
          {peek === back && <span className="day-peek" role="tooltip">{d.rom} · {d.full}</span>}
          <span className="dot" lang="th" aria-hidden="true">{d.th}{star && <span className="star">★</span>}</span>
          <span className="lbl" aria-hidden="true">{back === 0 ? 'Today' : d.en}</span>
        </button>
      </li>
    );
  }
  return <ol className="today-week" aria-label="This week">{cells}</ol>;
}

const todayColour = () => THAI_DAY[new Date().getDay()].color;

// The street meter: your sign shows how much everyday Thai you understand.
// The bar is in the Thai flag's colours; milestones turn gold when reached.
function Meter({ value, from, milestones = {}, knownCount = 0, learningCount = 0 }) {
  const miles = Object.entries(milestones).map(([n, p]) => ({ n: Number(n), p }));
  const reached = miles.filter((m) => knownCount >= m.n);
  return (
    <div className="today-meter">
      <div className="today-meter-top">
        <SoiSign width={168} th="ซอย" en="Your street" number={pct(value)} tab={false} gold={reached.length > 0}
          title={`Street meter: ${pct(value)} of everyday Thai`} />
        <p className="today-meter-copy"><b>Your street meter</b>How much everyday Thai you'd understand right now. Words count more as they stick.
          <span className="today-counts"><span><b>{knownCount}</b> known</span><span><b>{learningCount}</b> in progress</span></span>
        </p>
      </div>
      <div className="today-bar flag" role="img" aria-label={`About ${pct(value)}`}>
        {from != null && <i className="was" style={{ width: width(from) }} />}
        <i style={{ width: width(value), minWidth: value > 0 ? 4 : 0 }} />
        {miles.map((m) => <span key={m.n} className={`tick${knownCount >= m.n ? ' on' : ''}`} style={{ left: `${m.p}%` }} />)}
      </div>
      {miles.length > 0 && (
        <ol className="today-miles" aria-label="Milestones: known words">
          {miles.map((m) => (
            <li key={m.n} className={knownCount >= m.n ? 'on' : ''}>
              <b>{knownCount >= m.n && <span aria-hidden="true">✓ </span>}{m.n.toLocaleString('en')}</b><em>{m.p}%</em>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// First Start: who's speaking? (a dialog, asked once) Picks the voice and the forms (ผม/ครับ or ฉัน/ค่ะ) everywhere.
function RegisterChooser({ onChoose, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);
  const sample = (reg) => {
    try { new Audio(`/api/speak?text=${encodeURIComponent(reg === 'male' ? 'สวัสดีครับ' : 'สวัสดีค่ะ')}&voice=${reg}&v=2`).play().catch(() => {}); } catch {}
  };
  return (
    <div className="reg-overlay" onClick={onClose}>
    <section className="reg reg-dialog" role="dialog" aria-modal="true" aria-labelledby="reg-q" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="reg-close" onClick={onClose} aria-label="Close">×</button>
      <p className="reg-q" id="reg-q">Before you start: who's speaking?</p>
      <p className="reg-sub">Thai changes a little depending on who's talking. You'll see the right words and hear a matching voice. You can change it later in Aa.</p>
      <div className="reg-opts">
        <button type="button" className="reg-opt" onClick={() => { sample('female'); onChoose('female'); }}>
          <b>Speak as a woman</b><span className="th" lang="th">สวัสดีค่ะ</span><span className="rom">sà-wàt-dii khâ · I = ฉัน chǎn</span>
        </button>
        <button type="button" className="reg-opt" onClick={() => { sample('male'); onChoose('male'); }}>
          <b>Speak as a man</b><span className="th" lang="th">สวัสดีครับ</span><span className="rom">sà-wàt-dii khráp · I = ผม phǒm</span>
        </button>
      </div>
    </section>
    </div>
  );
}

// The real-life mission from the first session: "Did you say it?" on the next visits.
// Yes = a star on today. Not yet = ask again another day. Never a penalty.
function Mission({ onSaid }) {
  const [m, setM] = useState(null);
  useEffect(() => { setM(readStore('tsc-mission', null)); }, []);
  if (!m || m.done || m.snooze === todayKey() || m.day === todayKey()) return null;
  const save = (patch) => { const next = { ...m, ...patch }; writeStore('tsc-mission', next); setM(next); };
  return (
    <section className="today-mission" aria-label="Your mission">
      <span className="lbl">Your mission</span>
      <span className="th" lang="th">{m.th}</span>
      {m.rom && <span className="rom">{m.rom}</span>}
      <span>{m.en} Did you get to say it?</span>
      <div className="row">
        <button type="button" className="yes" onClick={() => {
          writeStore(MISSION_DAYS_KEY, { ...readStore(MISSION_DAYS_KEY, {}), [todayKey()]: m.scene });
          save({ done: true }); onSaid?.();
        }}>Yes, I said it ★</button>
        <button type="button" className="no" onClick={() => save({ snooze: todayKey() })}>Not yet</button>
      </div>
    </section>
  );
}

// "Say it Today": one real-life line to use today, with an "I said it" tap.
// The line is fixed for the whole calendar day and only uses words studied
// before today. Taps are kept in this browser and, when signed in, in the
// account (said_it table).
const MISSION_DAYS_KEY = 'tsc-mission-days'; // { day: scene } days a mission was done (a star on the week)
const SAID_KEY = 'tsc-said';          // { "2026-10-09": 12 (line number), ... }
const TODAY_LINE_KEY = 'tsc-sayit-day'; // { day: "2026-10-09", line: 12 }
function SayIt({ studiedBeforeToday, bonus, onSaid }) {
  const { user } = useUser();
  const [said, setSaid] = useState({});
  const [lineNo, setLineNo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const today = todayKey();

  useEffect(() => {
    setSaid(readStore(SAID_KEY, {}));
    // Fixed for the day. If progress arrives later (e.g. synced from the
    // account), it can only move the line forward, never back.
    const saved = readStore(TODAY_LINE_KEY, null);
    const computed = sayItFor(studiedBeforeToday).day;
    const line = saved?.day === today ? Math.max(saved.line, computed) : computed;
    writeStore(TODAY_LINE_KEY, { day: today, line });
    setLineNo(line);
  }, [today, studiedBeforeToday]);

  // Signed in: merge taps from the account
  useEffect(() => {
    if (!user) return;
    supabaseBrowser().from('said_it').select('day, line').eq('kind', 'sayit').then(({ data, error }) => {
      if (error || !data) return;
      setSaid((cur) => {
        const merged = { ...Object.fromEntries(data.map((r) => [r.day, r.line])), ...cur };
        writeStore(SAID_KEY, merged);
        const missing = Object.entries(cur).filter(([d]) => !data.some((r) => r.day === d));
        if (missing.length) supabaseBrowser().from('said_it').upsert(missing.map(([day, line]) => ({ user_id: user.id, day, kind: 'sayit', line }))).then(() => {});
        return merged;
      });
    });
  }, [user]);

  const line = lineNo ? SAY_IT[lineNo - 1] : null;
  if (!line) return null;
  // The line in the learner's own register (ผม/ครับ or ฉัน/ค่ะ/คะ)
  const shown = renderSentence({ thai: line.thai, romanization: line.rom }, getRegister());
  const doneToday = said[today] != null;
  const total = Object.keys(said).length;
  const markSaid = () => {
    const next = { ...said, [today]: line.day };
    writeStore(SAID_KEY, next); setSaid(next); onSaid?.();
    if (user) supabaseBrowser().from('said_it').upsert({ user_id: user.id, day: today, kind: 'sayit', line: line.day })
      .then(({ error }) => { if (error) console.warn('Could not save said_it', error); });
  };
  // Tapped by mistake: tap again to untick (today only)
  const unmarkSaid = () => {
    const next = { ...said }; delete next[today];
    writeStore(SAID_KEY, next); setSaid(next); onSaid?.();
    if (user) supabaseBrowser().from('said_it').delete().eq('user_id', user.id).eq('day', today).eq('kind', 'sayit')
      .then(({ error }) => { if (error) console.warn('Could not remove said_it', error); });
  };
  const play = () => {
    try {
      const voice = readStore('tsc-help', {}).voice || 'female';
      const a = new Audio(`/api/speak?text=${encodeURIComponent(shown.thai)}&voice=${voice}&v=2`);
      setPlaying(true);
      a.onended = a.onerror = () => setPlaying(false);
      a.play().catch(() => setPlaying(false));
    } catch { setPlaying(false); }
  };
  return (
    <section className="sayit" aria-label="Say it today">
      <p className="sayit-eyebrow">{bonus && <span className="today-bonus">Bonus</span>}Say it out loud today</p>
      <div className="sayit-line">
        <button type="button" className={`sayit-play${playing ? ' on' : ''}`} onClick={play} aria-label={`Play ${shown.thai}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
        </button>
        <div className="sayit-text">
          <span className="sayit-th" lang="th">{shown.thai}</span>
          <span className="sayit-rom">{shown.romanization}</span>
          <span className="sayit-en">{line.en}</span>
        </div>
      </div>
      <p className="sayit-where">{line.where}</p>
      <button type="button" role="checkbox" aria-checked={doneToday} className={`sayit-check${doneToday ? ' is-on' : ''}`}
        onClick={() => (doneToday ? unmarkSaid() : markSaid())}>
        <span className="box" aria-hidden="true">{doneToday && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>
        <span className="txt">
          {doneToday
            ? <><b>Said it!</b> {total === 1 ? 'Day 1 of Thai out loud.' : `Thai out loud: ${total} days.`} <small className="undo">Tap again to undo.</small></>
            : <><b>I said it to someone</b> Tick this once you've used it for real. It adds a ★ to today.</>}
        </span>
      </button>
    </section>
  );
}

export default function Today({ words, milestones }) {
  const store = useProgressStore();
  const { progress, goal, setGoal, streak, newToday, loaded, finishToday, days, check } = store;
  const { user, ready } = useUser();
  // Items first studied before today (picks today's Say it line)
  const studiedBeforeToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return Object.values(progress).filter((v) => v.intro < start.getTime()).length;
  }, [progress]);
  const [mode, setMode] = useState('home'); // home | checks | session | done
  const [queue, setQueue] = useState([]);       // new words (flashcards)
  const [checkQueue, setCheckQueue] = useState([]); // words due for a check
  const [score, setScore] = useState(null);     // { right, total } from today's checks
  const [run, setRun] = useState(0);            // remounts the check session each time
  const [patternPick, setPatternPick] = useState(null); // today's pattern block
  const [patternScore, setPatternScore] = useState(null);
  const [chosen, setChosen] = useState(true);   // has the learner picked how they speak?
  const [reg, setReg] = useState('female');
  const [askReg, setAskReg] = useState(false);  // the "who's speaking?" dialog
  const [startAfterChoice, setStartAfterChoice] = useState(false);
  useEffect(() => { setChosen(registerChosen()); setReg(getRegister()); }, []);
  const lex = useMemo(() => Object.fromEntries(words.map((w) => [w.thai, { rom: w.romanization, en: w.english }])), [words]);
  const [before, setBefore] = useState(0);
  const repeats = useRef(new Map());
  const reviewedInSession = useRef(0);

  // What's waiting today
  const plan = useMemo(() => {
    const cutoff = endOfToday();
    const allDue = words
      .filter((w) => progress[w.thai] && progress[w.thai].due <= cutoff)
      .sort((a, b) => progress[a.thai].due - progress[b.thai].due);
    const due = allDue.slice(0, REVIEW_CAP);
    const { order, bundles } = fastTrack(words, reg);
    const fresh = order.filter((w) => !progress[w.thai]);
    const paused = allDue.length > REVIEW_CAP; // catch up before adding more
    const newLeft = paused ? 0 : Math.max(goal - newToday, 0);
    // In the first days, today's new words are the rest of the current bundle
    const bundle = fresh[0] && bundles.find((b) => b.includes(fresh[0].thai));
    const take = bundle && newLeft > 0 ? bundle.filter((t) => !progress[t]).length : newLeft;
    return { due, fresh, newLeft, paused, newCards: fresh.slice(0, take) };
  }, [words, progress, goal, newToday, reg]);

  const known = useMemo(() => coverage(words, progress), [words, progress]);
  const knownCount = useMemo(() => countKnown(words, progress), [words, progress]);
  const learningCount = useMemo(() => countLearning(words, progress), [words, progress]);
  // Days you said the line out loud (stars on the week); refreshed when you tick it
  const [said, setSaidDays] = useState({});
  const refreshSaid = () => setSaidDays({ ...readStore(MISSION_DAYS_KEY, {}), ...readStore(SAID_KEY, {}) });
  useEffect(refreshSaid, []);
  const day = THAI_DAY[new Date().getDay()];

  // Checks first (words you've met before), then today's new words
  const start = (checks, news) => {
    repeats.current = new Map();
    reviewedInSession.current = 0;
    setBefore(known);
    setScore(null);
    setCheckQueue(checks);
    setQueue(news);
    setRun((n) => n + 1);
    setMode(checks.length ? 'checks' : 'session');
    window.scrollTo(0, 0);
  };
  const afterChecks = (result) => {
    setScore(result);
    if (queue.length) { setMode('session'); window.scrollTo(0, 0); } else afterWords();
  };
  // Words done: today's pattern practice (if one is open), then the day is done
  // (picked in an effect below, once the last word's progress has been saved)
  const afterWords = () => setMode('picking');

  // "Still learning": the card comes back later in this session
  const onRated = (word, knewIt) => {
    reviewedInSession.current += 1;
    if (knewIt) return false;
    const n = repeats.current.get(word.thai) || 0;
    if (n >= MAX_REPEATS) return false;
    repeats.current.set(word.thai, n + 1);
    setQueue((q) => [...q, word]);
    return true;
  };

  const onDone = () => { finishToday(); setMode('done'); window.scrollTo(0, 0); };
  useEffect(() => {
    if (mode !== 'picking') return;
    const pick = pickTodayPattern(progress);
    if (pick) { setPatternPick(pick); setMode('pattern'); window.scrollTo(0, 0); } else onDone();
  }, [mode, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  // After the "who's speaking?" choice, start once the plan has the right words
  const beginRef = useRef(null);
  useEffect(() => {
    if (!startAfterChoice) return;
    setStartAfterChoice(false);
    beginRef.current?.();
  }, [startAfterChoice]);

  if (!loaded) return <div className="today-wrap"><p className="today-note">Loading…</p></div>;

  if (mode === 'picking') return <div className="today-wrap"><p className="today-note">Loading…</p></div>;

  if (mode === 'pattern' && patternPick) {
    return <TodayPattern key={run} pick={patternPick} lex={lex} onDone={(r) => { setPatternScore(r); onDone(); }} onQuit={() => setMode('home')} />;
  }

  if (mode === 'checks') {
    return (
      <CheckSession key={run} queue={checkQueue} allWords={words} progress={progress}
        onAnswer={(w, grade, opts) => check(w.thai, grade, opts)} onDone={afterChecks} onQuit={() => setMode('home')} />
    );
  }

  if (mode === 'session') {
    return (
      <>
        <div className="fc-page-title">
          <h1>Today</h1>
          <button type="button" className="today-quit" onClick={() => setMode('home')}>End session</button>
        </div>
        <Deck words={queue} session lex={lex} onRated={onRated} onDone={afterWords} />
      </>
    );
  }

  const todayPattern = pickTodayPattern(progress);
  const beginToday = () => (plan.due.length || plan.newCards.length
    ? start(plan.due, plan.newCards)
    : (setPatternPick(todayPattern), setRun((n) => n + 1), setMode('pattern')));
  beginRef.current = beginToday;
  // The goal line counts a pattern that today's new words will open
  const goalPattern = todayPattern || pickTodayPattern({ ...progress, ...Object.fromEntries(plan.newCards.map((w) => [w.thai, { s: 1 }])) });
  const nothingLeft = plan.due.length === 0 && plan.newCards.length === 0 && !todayPattern;
  const brandNew = studiedBeforeToday === 0 && plan.due.length === 0 && reviewedInSession.current === 0;
  const signedOut = ready && !user;
  // First days: no meter, milestones or goal picker yet (nothing to show, and too much to read)
  const early = Object.keys(days).length < 3;
  const firstDaysLine = <p className="today-note"><b>{learningCount} words</b> in progress. They count toward your street meter once they stick.</p>;

  // Day 2+: the next scene, if the first session was on an earlier day and it isn't done yet
  const firstSession = readStore('tsc-first-session', null);
  const scenesDone = readStore('tsc-scenes', {});
  // One new scene a day, in order, after the first session
  const SCENE_DAYS = ['restaurant', 'cafe'];
  const nextSceneId = firstSession && firstSession.day !== dayKey() && !Object.values(scenesDone).includes(dayKey())
    ? SCENE_DAYS.find((id) => !scenesDone[id]) || null : null;
  const sceneToday = nextSceneId && mode === 'home' ? SCENES[nextSceneId] : null;

  // Brand new (nothing learned, no first session yet): one thing only, the first session
  if (mode === 'home' && Object.keys(progress).length === 0 && !readStore('tsc-first-session', null)) {
    return (
      <div className="today-wrap">
        <div className="today-card">
          <div className="today-first">
            <h2>Your first Thai, in 2 minutes</h2>
            <p>Turn down a bag at 7-Eleven. Hear it, make your own sentences, use it today. No sign-up needed.</p>
            <a className="auth-btn primary" href="/start">Start</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="today-wrap">
      {mode === 'done' ? (
        <div className="today-card today-done">
          <p className="today-eyebrow">Session complete</p>
          <h1 className="today-title">Done for today</h1>
          <p className="today-goal-done"><i style={{ background: day.color }} />Today's goal is done. {day.full} lights up {day.colour} on your week.</p>
          {!early && <SayIt studiedBeforeToday={studiedBeforeToday} bonus onSaid={refreshSaid} />}
          <div className="today-stats">
            {score?.right > 0 && <div><b>{score.right}</b><span>word{score.right === 1 ? '' : 's'} remembered</span></div>}
            {patternScore?.right > 0 && <div><b>{patternScore.right}</b><span>sentence{patternScore.right === 1 ? '' : 's'} understood</span></div>}
            {reviewedInSession.current > 0 && <div><b>{new Set(queue.map((w) => w.thai)).size}</b><span>new words met</span></div>}
            <div><b>{streak}</b><span>day{streak === 1 ? '' : 's'} in a row</span></div>
          </div>
          <Week days={days} said={said} />
          {early ? firstDaysLine : <Meter value={known} from={before} milestones={milestones} knownCount={knownCount} learningCount={learningCount} />}
          <div className="today-actions">
            {plan.fresh.length > 0 && (
              <button type="button" className="today-more-link" onClick={() => start([], plan.fresh.slice(0, EXTRA_NEW))}>Want more? Learn {EXTRA_NEW} extra words</button>
            )}
            <a className="auth-btn google" href="/vocabulary">Browse all words</a>
          </div>
        </div>
      ) : (
        <div className="today-card">
          <div className="today-head">
            <h1 className="today-title">Today</h1>
            {streak > 0 && (
              <span className="today-streak" title="Days in a row you finished your review"><i style={{ background: todayColour() }} />{streak} day{streak === 1 ? '' : 's'} in a row</span>
            )}
          </div>

          {/* Step 1: the one thing to do first */}
          <Mission onSaid={refreshSaid} />

          {sceneToday ? (
            <section className="today-step today-scene" aria-label="Today's scene">
              <p className="today-step-label"><i className="today-daydot" style={{ background: day.color }} />Today</p>
              <div className="today-step-body">
                <div>
                  <strong>{sceneToday.promise}</strong>
                  <span>{sceneToday.place}. Yesterday's line first, then today's. About {sceneToday.minutes} minutes.</span>
                </div>
                <a className="auth-btn primary today-start" href={`/start/${sceneToday.id}`}>Start</a>
              </div>
            </section>
          ) : (
          <section className="today-step" aria-label="Learn">
            <p className="today-step-label"><i className="today-daydot" style={{ background: day.color }} />Today's goal</p>
            {nothingLeft ? (
              <div className="today-step-body">
                <div><strong>Goal done ✓</strong><span>{day.full} lights up {day.colour} on your week. See you tomorrow.</span></div>
                {plan.fresh.length > 0 && (
                  <button type="button" className="today-more-link" onClick={() => start([], plan.fresh.slice(0, EXTRA_NEW))}>Want more? Learn {EXTRA_NEW} extra words</button>
                )}
              </div>
            ) : (
              <div className="today-step-body">
                <div>
                  <strong>
                    {[
                      plan.due.length > 0 ? `Check ${plan.due.length} word${plan.due.length === 1 ? '' : 's'}` : null,
                      plan.newCards.length > 0 ? `${brandNew ? 'Learn your first' : 'learn'} ${plan.newCards.length} ${brandNew ? '' : 'new '}word${plan.newCards.length === 1 ? '' : 's'}` : null,
                      goalPattern ? `practise ${goalPattern.isNew ? 'a new pattern' : 'a pattern'}` : null,
                    ].filter(Boolean).join(', then ').replace(/^l/, 'L').replace(/^p/, 'P')}
                  </strong>
                  <span>
                    {brandNew && plan.newCards[0] ? <>Starting with <span lang="th">{plan.newCards[0].thai}</span> ({plan.newCards[0].romanization}). </> : null}
                    {plan.paused ? 'New words wait until you catch up. ' : ''}About {Math.max(1, Math.round((plan.due.length * 8 + plan.newCards.length * 25 + (goalPattern ? 60 : 0)) / 60))} minutes. Finish and {day.full} lights up {day.colour}.
                  </span>
                </div>
                <button type="button" className="auth-btn primary today-start"
                  onClick={() => (chosen ? beginToday() : setAskReg(true))}>Start</button>
              </div>
            )}
          </section>
          )}
          {askReg && (
            <RegisterChooser onClose={() => setAskReg(false)}
              onChoose={(r) => { setRegister(r); setReg(r); setChosen(true); setAskReg(false); setStartAfterChoice(true); }} />
          )}

          <section className="today-progress" aria-label="Your progress">
            <p className="today-section-label">Your week</p>
            <Week days={days} said={said} />
            {early ? firstDaysLine : <Meter value={known} milestones={milestones} knownCount={knownCount} learningCount={learningCount} />}
          </section>

          {!early && <div className="today-goal">
            <span id="goal-label">Learning goal: new words a day</span>
            <div className="fc-seg" role="radiogroup" aria-labelledby="goal-label">
              {GOAL_OPTIONS.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={goal === n} className={goal === n ? 'is-on' : ''} onClick={() => setGoal(n)}>{n}</button>
              ))}
            </div>
          </div>}

          {signedOut && (
            <p className="today-note">Your progress is saved in this browser. <a href="/signin?next=/today">Sign in</a> to keep it on every device.</p>
          )}

          {/* Bonus, last: take one line out into real life */}
          {!early && <SayIt studiedBeforeToday={studiedBeforeToday} bonus onSaid={refreshSaid} />}
        </div>
      )}
    </div>
  );
}
