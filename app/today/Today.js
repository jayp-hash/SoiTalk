'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Deck from '../vocabulary/Deck';
import { useProgressStore, coverage, endOfToday, dayKey, GOAL_OPTIONS } from '../lib/progress';
import { useUser } from '../lib/useUser';
import { SAY_IT, sayItFor } from '../lib/sayit';
import { supabaseBrowser } from '../lib/supabase-browser';
import { readStore, writeStore, dayKey as todayKey } from '../lib/progress';
import SoiSign from '../components/SoiSign';

const MAX_REVIEWS = 30;    // review cap per day; any backlog rolls over, so a session stays ~5-7 minutes
const EXTRA_NEW = 5;       // "Learn 5 more"
const MAX_REPEATS = 2;     // "Still learning" brings a card back at most twice per session

const pct = (x) => `${Math.round(x * 100)}%`;

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
  const cells = [];
  for (let back = 6; back >= 0; back--) {
    const t = Date.now() - back * 864e5;
    const d = THAI_DAY[new Date(t).getDay()];
    const done = !!days[dayKey(t)]?.done;
    const star = said[dayKey(t)] != null;
    cells.push(
      <li key={back} className={`${done ? 'done' : ''}${back === 0 ? ' today' : ''}`} style={{ '--day': d.color }}
        aria-label={`${d.en}${back === 0 ? ' (today)' : ''}${done ? ', goal done' : ''}${star ? ', said it out loud' : ''}`}>
        <span className="dot" lang="th" aria-hidden="true">{d.th}{star && <span className="star">★</span>}</span>
        <span className="rom" aria-hidden="true">{d.rom}</span>
        <span className="lbl" aria-hidden="true">{back === 0 ? 'Today' : d.en}</span>
      </li>
    );
  }
  return <ol className="today-week" aria-label="This week">{cells}</ol>;
}

const todayColour = () => THAI_DAY[new Date().getDay()].color;

// The street meter: your sign shows how much everyday Thai you understand.
// The bar is in the Thai flag's colours; milestones turn gold when reached.
function Meter({ value, from, milestones = {}, knownCount = 0 }) {
  const miles = Object.entries(milestones).map(([n, p]) => ({ n: Number(n), p }));
  const reached = miles.filter((m) => knownCount >= m.n);
  return (
    <div className="today-meter">
      <div className="today-meter-top">
        <SoiSign width={168} th="ซอย" en="Your street" number={pct(value)} tab={false} gold={reached.length > 0}
          title={`Street meter: ${pct(value)} of everyday Thai`} />
        <p className="today-meter-copy"><b>Your street meter</b>How much everyday Thai you understand. Milestones below are words learned; each one turns gold.</p>
      </div>
      <div className="today-bar flag" role="img" aria-label={`About ${pct(value)}`}>
        {from != null && <i className="was" style={{ width: pct(from) }} />}
        <i style={{ width: pct(value) }} />
        {miles.map((m) => <span key={m.n} className={`tick${knownCount >= m.n ? ' on' : ''}`} style={{ left: `${m.p}%` }} />)}
      </div>
      {miles.length > 0 && (
        <ol className="today-miles" aria-label="Milestones: words learned">
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

// "Say it Today": one real-life line to use today, with an "I said it" tap.
// The line is fixed for the whole calendar day and only uses words studied
// before today. Taps are kept in this browser and, when signed in, in the
// account (said_it table).
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
  const doneToday = said[today] != null;
  const total = Object.keys(said).length;
  const markSaid = () => {
    const next = { ...said, [today]: line.day };
    writeStore(SAID_KEY, next); setSaid(next); onSaid?.();
    if (user) supabaseBrowser().from('said_it').upsert({ user_id: user.id, day: today, kind: 'sayit', line: line.day })
      .then(({ error }) => { if (error) console.warn('Could not save said_it', error); });
  };
  const play = () => {
    try {
      const voice = readStore('tsc-help', {}).voice || 'female';
      const a = new Audio(`/api/speak?text=${encodeURIComponent(line.thai)}&voice=${voice}&v=2`);
      setPlaying(true);
      a.onended = a.onerror = () => setPlaying(false);
      a.play().catch(() => setPlaying(false));
    } catch { setPlaying(false); }
  };
  return (
    <section className="sayit" aria-label="Say it today">
      <p className="sayit-eyebrow">{bonus && <span className="today-bonus">Bonus</span>}Say it out loud today</p>
      <div className="sayit-line">
        <button type="button" className={`sayit-play${playing ? ' on' : ''}`} onClick={play} aria-label={`Play ${line.thai}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
        </button>
        <div className="sayit-text">
          <span className="sayit-th" lang="th">{line.thai}</span>
          <span className="sayit-rom">{line.rom}</span>
          <span className="sayit-en">{line.en}</span>
        </div>
      </div>
      <p className="sayit-where">{line.where}</p>
      <button type="button" role="checkbox" aria-checked={doneToday} className={`sayit-check${doneToday ? ' is-on' : ''}`}
        onClick={() => { if (!doneToday) markSaid(); }} disabled={doneToday}>
        <span className="box" aria-hidden="true">{doneToday && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>
        <span className="txt">
          {doneToday
            ? <><b>Said it!</b> {total === 1 ? 'Day 1 of Thai out loud.' : `Thai out loud: ${total} days.`}</>
            : <><b>I said it to someone</b> Tick this once you've used it for real. It adds a ★ to today.</>}
        </span>
      </button>
    </section>
  );
}

export default function Today({ words, milestones }) {
  const store = useProgressStore();
  const { progress, goal, setGoal, streak, newToday, loaded, finishToday, days } = store;
  const { user, ready } = useUser();
  // Items first studied before today (picks today's Say it line)
  const studiedBeforeToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return Object.values(progress).filter((v) => v.intro < start.getTime()).length;
  }, [progress]);
  const [mode, setMode] = useState('home'); // home | session | done
  const [queue, setQueue] = useState([]);
  const [before, setBefore] = useState(0);
  const repeats = useRef(new Map());
  const reviewedInSession = useRef(0);

  // What's waiting today
  const plan = useMemo(() => {
    const cutoff = endOfToday();
    const due = words
      .filter((w) => progress[w.thai] && progress[w.thai].due <= cutoff)
      .sort((a, b) => progress[a.thai].due - progress[b.thai].due)
      .slice(0, MAX_REVIEWS);
    const fresh = words.filter((w) => !progress[w.thai]);
    const newLeft = Math.max(goal - newToday, 0);
    return { due, fresh, newLeft, newCards: fresh.slice(0, newLeft) };
  }, [words, progress, goal, newToday]);

  const known = useMemo(() => coverage(words, progress), [words, progress]);
  const knownCount = useMemo(() => words.filter((w) => (progress[w.thai]?.got || 0) >= 1).length, [words, progress]);
  // Days you said the line out loud (stars on the week); refreshed when you tick it
  const [said, setSaidDays] = useState({});
  const refreshSaid = () => setSaidDays(readStore(SAID_KEY, {}));
  useEffect(refreshSaid, []);
  const day = THAI_DAY[new Date().getDay()];

  const start = (cards) => {
    repeats.current = new Map();
    reviewedInSession.current = 0;
    setBefore(known);
    setQueue(cards);
    setMode('session');
    window.scrollTo(0, 0);
  };

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

  if (!loaded) return <div className="today-wrap"><p className="today-note">Loading…</p></div>;

  if (mode === 'session') {
    return (
      <>
        <div className="fc-page-title">
          <h1>Today</h1>
          <button type="button" className="today-quit" onClick={() => setMode('home')}>End session</button>
        </div>
        <Deck words={queue} session onRated={onRated} onDone={onDone} />
      </>
    );
  }

  const nothingLeft = plan.due.length === 0 && plan.newCards.length === 0;
  const brandNew = studiedBeforeToday === 0 && plan.due.length === 0 && reviewedInSession.current === 0;
  const signedOut = ready && !user;

  return (
    <div className="today-wrap">
      {mode === 'done' ? (
        <div className="today-card today-done">
          <p className="today-eyebrow">Session complete</p>
          <h1 className="today-title">Nice work!</h1>
          <p className="today-goal-done"><i style={{ background: day.color }} />Today's goal is done. {day.full} lights up {day.colour} on your week.</p>
          <SayIt studiedBeforeToday={studiedBeforeToday} bonus onSaid={refreshSaid} />
          <div className="today-stats">
            <div><b>{reviewedInSession.current}</b><span>cards studied</span></div>
            <div><b>{streak}</b><span>day{streak === 1 ? '' : 's'} in a row</span></div>
          </div>
          <Week days={days} said={said} />
          <Meter value={known} from={before} milestones={milestones} knownCount={knownCount} />
          <div className="today-actions">
            {plan.fresh.length > 0 && (
              <button type="button" className="auth-btn primary" onClick={() => start(plan.fresh.slice(0, EXTRA_NEW))}>Learn {EXTRA_NEW} more words</button>
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
          <section className="today-step" aria-label="Learn">
            <p className="today-step-label"><i className="today-daydot" style={{ background: day.color }} />Today's goal</p>
            {nothingLeft ? (
              <div className="today-step-body">
                <div><strong>Goal done ✓</strong><span>{day.full} lights up {day.colour} on your week. See you tomorrow.</span></div>
                {plan.fresh.length > 0 && (
                  <button type="button" className="auth-btn primary" onClick={() => start(plan.fresh.slice(0, EXTRA_NEW))}>Learn {EXTRA_NEW} more</button>
                )}
              </div>
            ) : (
              <div className="today-step-body">
                <div>
                  <strong>
                    {brandNew ? 'Learn your first ' : 'Learn '}{plan.newCards.length > 0 ? `${plan.newCards.length} ${brandNew ? '' : 'new '}word${plan.newCards.length === 1 ? '' : 's'}` : ''}
                    {plan.due.length > 0 ? `${plan.newCards.length > 0 ? ' and review ' : 'Review '}${plan.due.length}` : ''}
                  </strong>
                  <span>
                    {brandNew && plan.newCards[0] ? <>Starting with <span lang="th">{plan.newCards[0].thai}</span> ({plan.newCards[0].romanization}). </> : null}
                    About {Math.max(1, Math.round((plan.due.length * 10 + plan.newCards.length * 25) / 60))} minutes. Finish them and {day.full} lights up {day.colour}.
                  </span>
                </div>
                <button type="button" className="auth-btn primary today-start" onClick={() => start([...plan.due, ...plan.newCards])}>Start</button>
              </div>
            )}
          </section>

          <section className="today-progress" aria-label="Your progress">
            <p className="today-section-label">Your week</p>
            <Week days={days} said={said} />
            <Meter value={known} milestones={milestones} knownCount={knownCount} />
          </section>

          <div className="today-goal">
            <span id="goal-label">Learning goal: new words a day</span>
            <div className="fc-seg" role="radiogroup" aria-labelledby="goal-label">
              {GOAL_OPTIONS.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={goal === n} className={goal === n ? 'is-on' : ''} onClick={() => setGoal(n)}>{n}</button>
              ))}
            </div>
          </div>

          {signedOut && (
            <p className="today-note">Your progress is saved in this browser. <a href="/signin">Sign in</a> to keep your streak on every device.</p>
          )}

          {/* Bonus, last: take one line out into real life */}
          <SayIt studiedBeforeToday={studiedBeforeToday} bonus onSaid={refreshSaid} />
        </div>
      )}
    </div>
  );
}
