'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audioVersion } from '../lib/audioVersion';
import { readStore, writeStore, dayKey } from '../lib/progress';
import { getRegister, particleFor } from '../lib/register';
import { soundRight, soundWrong, soundDone } from '../lib/sfx';
import { track } from '../lib/analytics';
import { CLASSIFIERS, NOUNS, NUMBERS, MEASURE_LEVELS, PROMPT, classifierOf, nounsFor, phrase } from '../lib/classifiers';

// Counting words (classifiers), Jay 23 Oct 2026. Spec: project doc claude/classifiers-spec.md.
//   Learn    - the 10 classifiers you'll use this week, each with its pictures and an example
//   Practice - Measure: put every picture that takes this classifier in the circle (L1 4 classifiers, L2 8, L3 all 10)
//            - Build what you see: set the reels to say what's in the picture (thing + number + classifier)
// Labels follow the Aa settings; on Auto they fade as the level goes up (Jay):
//   L1 romanization + English, L2 romanization blurred, L3 romanization hidden and English blurred.

const STORE = 'tsc-classifiers';
const ROUND = 3;      // circles per Measure round (panel: 3 x 8 pictures, not 5 x 10)
const PICS = 8;
const SLOT_ROUND = 5;
const img = (n) => `/classifiers/${n.img}.webp`;
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, k) => shuffle(a).slice(0, k);

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const Up = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>;
const Down = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

// Plays one or more clips in a row (a noun, then its classifier)
function useAudio() {
  const ref = useRef(null); const token = useRef(0);
  const stop = () => { ++token.current; ref.current?.pause(); };
  const play = (texts) => {
    const list = [].concat(texts); const my = ++token.current;
    const next = (i) => {
      if (i >= list.length || token.current !== my) return;
      try {
        ref.current?.pause();
        const voice = readStore('tsc-help', {}).voice || 'female';
        const a = new Audio(`/api/speak?text=${encodeURIComponent(list[i])}&voice=${voice}&v=${audioVersion(list[i], false)}`);
        ref.current = a; a.onended = () => next(i + 1); a.play().catch(() => {});
      } catch { /* no audio */ }
    };
    next(0);
  };
  useEffect(() => () => ref.current?.pause(), []);
  return { play, stop };
}

// The Aa settings (word cards): roman auto|show|tap|hide, english auto|show|tap
function useLabels(level) {
  const [s, setS] = useState({ roman: 'auto', english: 'auto' });
  useEffect(() => { const h = readStore('tsc-help', {}); setS({ roman: h.roman || 'auto', english: h.english || 'auto' }); }, []);
  const roman = s.roman === 'auto' ? (level >= 3 ? 'hide' : level === 2 ? 'tap' : 'show') : s.roman;
  const english = s.english === 'auto' ? (level >= 3 ? 'tap' : 'show') : s.english;
  return { roman, english };
}

function Reveal({ text, mode, className }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [text]);
  if (mode === 'hide' || !text) return null;
  if (mode === 'show' || open) return <span className={className}>{text}</span>;
  return (
    <button type="button" className={`${className} cl-blur`} aria-label="Show" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
      <span aria-hidden="true">{text}</span>
    </button>
  );
}

const stats = () => readStore(STORE, {});
function saveRound(activity, level, clean, total) {
  const all = stats(); const key = `${activity}:${level}`; const e = all[key] || { rounds: 0, best: 0, days: [] };
  const day = dayKey();
  all[key] = { rounds: e.rounds + 1, best: Math.max(e.best, clean), total, days: e.days.includes(day) ? e.days : [...e.days, day].slice(-30) };
  writeStore(STORE, all);
  track('classifiers_round', { activity, level, clean, total });
}

export default function Classifiers() {
  const [mode, setMode] = useState('learn');
  const [act, setAct] = useState('measure');
  const [lvl, setLvl] = useState(1);
  const audio = useAudio();
  const setM = (m) => { audio.stop(); setMode(m); };
  const modeSwitch = (cls) => (
    <div className={`pm-mode ${cls}`} role="group" aria-label="Mode">
      {[['learn', 'Learn'], ['practice', 'Practice']].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'on' : ''} onClick={() => setM(id)}>{label}</button>
      ))}
    </div>
  );
  const ACTS = [['measure', 'Find the matches'], ['build', 'Say what you see']];
  const levelPick = act === 'measure' && (
    <label className="pm-pick">
      <span className="sr-only">Level</span>
      <select value={lvl} onChange={(e) => setLvl(Number(e.target.value))}>
        {MEASURE_LEVELS.map((l) => <option key={l.n} value={l.n}>{l.name}</option>)}
      </select>
    </label>
  );

  return (
    <div className="pm-layout cl">
      <nav className="pm-side" aria-label="Counting words">
        <p className="pm-side-h">Mode</p>
        {modeSwitch('is-side')}
        {mode === 'practice' && (
          <>
            <p className="pm-side-h pm-side-h2">Activity</p>
            {ACTS.map(([id, label]) => (
              <button key={id} type="button" className={`pm-side-i${act === id ? ' on' : ''}`} aria-current={act === id} onClick={() => { audio.stop(); setAct(id); }}>{label}</button>
            ))}
            {act === 'measure' && (<><p className="pm-side-h pm-side-h2">Level</p><div className="pm-side-level">{levelPick}</div></>)}
          </>
        )}
      </nav>

      <div className="pm-wrap cl-wrap">
        <header className="pm-head">
          <h1>Counting words</h1>
          <p className="cl-sub">Thai counts things with a counting word: thing, number, counting word.</p>
        </header>
        {modeSwitch('is-top')}
        {mode === 'practice' && (
          <div className="pm-pickers cl-pickers">
            <label className="pm-pick">
              <span className="sr-only">Activity</span>
              <select value={act} onChange={(e) => { audio.stop(); setAct(e.target.value); }}>
                {ACTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            {levelPick}
          </div>
        )}
        {mode === 'learn' && <Learn audio={audio} />}
        {mode === 'practice' && act === 'measure' && <Measure key={`m${lvl}`} level={MEASURE_LEVELS.find((l) => l.n === lvl)} audio={audio} />}
        {mode === 'practice' && act === 'build' && <Build key="b1" audio={audio} />}
      </div>
    </div>
  );
}

function Learn({ audio }) {
  const [tip, setTip] = useState(false);
  useEffect(() => { setTip(!readStore('tsc-hint-classifiers', false)); }, []);
  const close = () => { setTip(false); writeStore('tsc-hint-classifiers', true); };
  const L = useLabels(1);
  return (
    <div className="cl-learn">
      {tip && (
        <div className="cl-tip" role="note">
          <p><b>Thai doesn&apos;t say &quot;two dogs&quot;.</b> It says &quot;dog two <i>animal-word</i>&quot;.</p>
          <p className="cl-ex"><span lang="th">หมาสองตัว</span> <i>mǎa sǎawng dtuaa</i> <span>two dogs</span></p>
          <p>Learn these 10 and you can count most things you buy, order or see this week.</p>
          <button type="button" className="cl-tip-x" onClick={close} aria-label="Close tip">Got it</button>
        </div>
      )}
      {CLASSIFIERS.map((c) => {
        const ns = nounsFor(c.th); const ex = phrase(ns[0], NUMBERS[0]);
        return (
          <section key={c.th} className="cl-card">
            <div className="cl-card-h">
              <button type="button" className="cl-cls" onClick={() => audio.play(c.th)} aria-label={`Play ${c.rom}`}>
                <span lang="th">{c.th}</span><PlayIcon />
              </button>
              <div className="cl-card-t">
                <Reveal text={c.rom} mode={L.roman} className="cl-rom" />
                <span className="cl-for">{c.for}</span>
              </div>
            </div>
            <div className="cl-nouns">
              {ns.map((n) => (
                <button key={n.th} type="button" className="cl-noun" onClick={() => audio.play(n.th)} aria-label={`Play ${n.en}`}>
                  <img src={img(n)} alt={n.en} width="160" height="160" loading="lazy" />
                  <span lang="th">{n.th}</span>
                  <Reveal text={n.rom} mode={L.roman} className="cl-rom" />
                </button>
              ))}
            </div>
            <button type="button" className="cl-example" onClick={() => audio.play(ex.th)}>
              <PlayIcon /><span lang="th">{ex.th}</span> <Reveal text={ex.rom} mode={L.roman} className="cl-rom" /> <span className="cl-en">{c.ex}</span>
            </button>
            {c.also && <p className="cl-also">{c.also}</p>}
          </section>
        );
      })}
    </div>
  );
}

// One circle: a classifier and 8 pictures, 3 or 4 of which take it
function makeCircle(level, used) {
  const pool = level.cls.filter((c) => !used.includes(c));
  const target = pick(pool.length ? pool : level.cls, 1)[0];
  const right = pick(nounsFor(target), Math.min(nounsFor(target).length, Math.random() < 0.5 ? 3 : 4));
  const wrong = pick(NOUNS.filter((n) => n.cls !== target && level.cls.includes(n.cls)), PICS - right.length);
  return { target, items: shuffle([...right, ...wrong]) };
}

function Measure({ level, audio }) {
  const L = useLabels(level.n);
  const [circles, setCircles] = useState(null);
  const [i, setI] = useState(0);
  const [state, setState] = useState({});   // th -> 'in' | 'wrong'
  const [hint, setHint] = useState('');
  const [missed, setMissed] = useState(0);  // circles with at least one wrong pick
  const [done, setDone] = useState(false);
  const start = () => {
    const cs = []; for (let k = 0; k < ROUND; k++) cs.push(makeCircle(level, cs.map((c) => c.target)));
    setCircles(cs); setI(0); setState({}); setHint(''); setMissed(0); setDone(false);
  };
  useEffect(start, [level]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!circles) return null;
  if (done) {
    const clean = ROUND - missed;
    return (
      <div className="cl-done">
        <p className="cl-done-n">{clean} of {ROUND}</p>
        <p>{clean === ROUND ? 'Every circle right first time.' : 'circles right first time. Play again to lock them in.'}</p>
        <button type="button" className="auth-btn primary" onClick={start}>Play again</button>
      </div>
    );
  }
  const c = circles[i]; const cls = classifierOf(c.target);
  const rights = c.items.filter((n) => n.cls === c.target);
  const found = rights.filter((n) => state[n.th] === 'in').length;
  const complete = found === rights.length;
  const tap = (n) => {
    if (state[n.th] === 'in' || complete) return;
    if (n.cls === c.target) {
      soundRight(); audio.play([n.th, n.cls]);
      setState((s) => ({ ...s, [n.th]: 'in' })); setHint('');
    } else {
      soundWrong();
      if (!Object.values(state).includes('wrong')) setMissed((m) => m + 1);
      setState((s) => ({ ...s, [n.th]: 'wrong' }));
      setHint(takes(n));
    }
  };
  const next = () => {
    if (i + 1 >= ROUND) { soundDone(); saveRound('measure', level.n, ROUND - missed, ROUND); setDone(true); return; }
    setI(i + 1); setState({}); setHint('');
  };
  return (
    <div className="cl-measure">
      <p className="cl-count">{i + 1} / {ROUND}</p>
      <div className={`cl-circle${complete ? ' full' : ''}`} onClick={() => audio.play(c.target)}>
        <span className="cl-circle-th" lang="th">{c.target}</span>
        <Reveal text={cls.rom} mode={L.roman} className="cl-rom" />
        <span className="cl-circle-in" aria-live="polite">
          {rights.filter((n) => state[n.th] === 'in').map((n) => <img key={n.th} src={img(n)} alt={n.en} width="40" height="40" />)}
        </span>
        <span className="cl-circle-n">{found} of {rights.length}</span>
      </div>
      <p className="cl-ask">Tap everything that takes <b lang="th">{c.target}</b> ({cls.rom}).</p>
      <div className="cl-grid">
        {c.items.map((n) => (
          <button key={n.th} type="button" className={`cl-pic ${state[n.th] || ''}`} onClick={() => tap(n)} disabled={state[n.th] === 'in'} aria-label={n.en}>
            <img src={img(n)} alt="" width="160" height="160" />
            <span lang="th">{n.th}</span>
            <Reveal text={n.rom} mode={L.roman} className="cl-rom" />
            <Reveal text={n.en} mode={L.english} className="cl-en" />
          </button>
        ))}
      </div>
      {hint && <p className="cl-hint" role="status">{hint}</p>}
      {complete && <button type="button" className="auth-btn primary cl-next" onClick={next}>{i + 1 >= ROUND ? 'See how you did' : 'Next circle'}</button>}
    </div>
  );
}

// Say what you see, level 1: thing + number + classifier
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// English first, then Thai with romanization: "Cat, แมว (maaeo), takes ตัว (dtuaa)."
const takes = (n) => `${cap(n.en)}, ${n.th} (${n.rom}), takes ${n.cls} (${classifierOf(n.cls).rom}). ${classifierOf(n.cls).hint}`;

function makeQuestion() {
  const noun = pick(NOUNS, 1)[0]; const num = pick(NUMBERS, 1)[0];
  const nounOpts = shuffle([noun, ...pick(NOUNS.filter((n) => n.th !== noun.th && n.cls !== noun.cls), 3)]);
  const clsOpts = shuffle([classifierOf(noun.cls), ...pick(CLASSIFIERS.filter((c) => c.th !== noun.cls), 3)]);
  return { noun, num, nounOpts, clsOpts, numOpts: NUMBERS };
}

function Reel({ label, options, value, setValue, gold, state, render }) {
  const idx = options.findIndex((o) => o.th === value.th);
  const go = (d) => setValue(options[(idx + d + options.length) % options.length]);
  return (
    <div className={`cl-reel${gold ? ' gold' : ''} ${state || ''}`} role="group" aria-label={label}>
      <span className="cl-reel-l">{label}</span>
      <button type="button" className="cl-reel-b" onClick={() => go(-1)} aria-label={`Previous ${label}`}><Up /></button>
      <span className="cl-reel-v">{render(value)}</span>
      <button type="button" className="cl-reel-b" onClick={() => go(1)} aria-label={`Next ${label}`}><Down /></button>
    </div>
  );
}

function Build({ audio }) {
  const L = useLabels(1);
  const reg = useMemo(() => getRegister(), []);
  const prompt = PROMPT.th + particleFor(reg, true).th;
  const promptRom = `${PROMPT.rom} ${particleFor(reg, true).rom}`;
  const [n, setN] = useState(0);
  const [q, setQ] = useState(null);
  const [pickN, setPickN] = useState(null); const [pickNum, setPickNum] = useState(null); const [pickC, setPickC] = useState(null);
  const [checked, setChecked] = useState(null); // null | {noun, num, cls}
  const [firstTry, setFirstTry] = useState(0); const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const load = () => {
    const x = makeQuestion(); setQ(x);
    // Every reel starts on a wrong answer, so nothing is solved before the learner moves it
    setPickN(x.nounOpts.find((o) => o.th !== x.noun.th)); setPickNum(x.numOpts.find((o) => o.n !== x.num.n)); setPickC(x.clsOpts.find((o) => o.th !== x.noun.cls)); setChecked(null); setTries(0);
  };
  useEffect(load, []);
  useEffect(() => { if (q) audio.play(prompt); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return null;
  if (done) {
    return (
      <div className="cl-done">
        <p className="cl-done-n">{firstTry} of {SLOT_ROUND}</p>
        <p>right first time.</p>
        <button type="button" className="auth-btn primary" onClick={() => { setN(0); setFirstTry(0); setDone(false); load(); }}>Play again</button>
      </div>
    );
  }
  const ok = checked && checked.noun && checked.num && checked.cls;
  const check = () => {
    const r = { noun: pickN.th === q.noun.th, num: pickNum.th === q.num.th, cls: pickC.th === q.noun.cls };
    setChecked(r); setTries((t) => t + 1);
    if (r.noun && r.num && r.cls) { soundRight(); if (tries === 0) setFirstTry((f) => f + 1); audio.play(phrase(q.noun, q.num).th); } else soundWrong();
  };
  const next = () => {
    if (n + 1 >= SLOT_ROUND) { soundDone(); saveRound('build', 1, firstTry, SLOT_ROUND); setDone(true); return; }
    setN(n + 1); load();
  };
  const st = (k) => (checked ? (checked[k] ? 'right' : 'wrong') : '');
  const answer = phrase(q.noun, q.num);
  return (
    <div className="cl-build">
      <p className="cl-count">{n + 1} / {SLOT_ROUND}</p>
      <button type="button" className="cl-prompt" onClick={() => audio.play(prompt)}>
        <PlayIcon /><span lang="th">{prompt}</span> <Reveal text={promptRom} mode={L.roman} className="cl-rom" /> <Reveal text={PROMPT.en} mode={L.english} className="cl-en" />
      </button>
      <div className={`cl-scene n${q.num.n}`} aria-label={`${q.num.n} ${q.noun.en}`}>
        {Array.from({ length: q.num.n }, (_, k) => <img key={k} src={img(q.noun)} alt="" width="120" height="120" />)}
      </div>
      <div className="cl-reels" onClickCapture={() => checked && !ok && setChecked(null)}>
        <Reel label="Thing" options={q.nounOpts} value={pickN} setValue={setPickN} state={st('noun')}
          render={(v) => <><span lang="th">{v.th}</span><Reveal text={v.rom} mode={L.roman} className="cl-rom" /></>} />
        <Reel label="Number" options={q.numOpts} value={pickNum} setValue={setPickNum} state={st('num')}
          render={(v) => <><span lang="th">{v.th}</span><Reveal text={v.rom} mode={L.roman} className="cl-rom" /></>} />
        <Reel label="Counting word" gold options={q.clsOpts} value={pickC} setValue={setPickC} state={st('cls')}
          render={(v) => <><span lang="th">{v.th}</span><Reveal text={v.rom} mode={L.roman} className="cl-rom" /></>} />
      </div>
      {checked && !ok && (
        <p className="cl-hint" role="status">
          {!checked.noun ? 'Thing: look at the picture again. ' : ''}
          {!checked.num ? 'Number: count them again. ' : ''}
          {!checked.cls ? takes(q.noun) : ''}
        </p>
      )}
      {ok && (
        <button type="button" className="cl-answer" onClick={() => audio.play(answer.th)}>
          <PlayIcon /><span lang="th">{answer.th}</span> <span className="cl-rom">{answer.rom}</span>
        </button>
      )}
      {ok
        ? <button type="button" className="auth-btn primary cl-next" onClick={next}>{n + 1 >= SLOT_ROUND ? 'See how you did' : 'Next picture'}</button>
        : <button type="button" className="auth-btn primary cl-next" onClick={check}>Check</button>}
    </div>
  );
}
