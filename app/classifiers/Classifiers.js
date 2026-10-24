'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import BlurEn from '../components/BlurEn';
import { audioVersion, SLOW_RATE } from '../lib/audioVersion';
import { readStore, writeStore, dayKey } from '../lib/progress';
import { getRegister, particleFor } from '../lib/register';
import { soundRight, soundWrong, soundDone } from '../lib/sfx';
import { track } from '../lib/analytics';
import {
  CLASSIFIERS, NOUNS, NUMBERS, LEVELS, PROMPT, CONFUSE, PAIRS, TWINS, SAY, EXTRA_WORDS,
  classifierOf, nounsFor, phrase, renderSay,
} from '../lib/classifiers';

// Classifiers tab, rebuilt 24 Oct 2026 after Jay's review (spec v3: project doc claude/classifiers-spec.md).
//   Learn    - a big intro, then the 10 classifiers stacked; open one to see its things,
//              tap a thing for a full everyday sentence.
//   Practice - Find the matches: drag or tap pictures into the circle.
//                L1 Recognise (one circle, Thai + romanization), L2 Listen (pictures only, two circles),
//                L3 Build the phrase (picture only, Thai instructions, build thing + number + classifier).
//              Each right drop flashes the short phrase; a full circle ends with building one sentence.
//            - Slot machine: spin, stop each reel on what's in the picture. A full match is a jackpot.
// Shared look: navy band cards, round play + slow buttons top left, English on hover or long-press.

const STORE = 'tsc-classifiers';
const img = (n) => `/classifiers/${n.img}.webp`;
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, k) => shuffle(a).slice(0, k);
const nounOf = (th) => NOUNS.find((n) => n.th === th);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---- English for a counted phrase: "two glasses of coffee", "three men" ----
const NUM_EN = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
const PLURAL = { man: 'men', woman: 'women', child: 'children', fish: 'fish', trousers: 'pairs of trousers', box: 'boxes', 'chicken (the bird)': 'chickens', taxi: 'taxis' };
const bare = (en) => en.replace(/\s*\(.*\)$/, '');
export function phraseEn(noun, n) {
  const k = NUM_EN[n];
  switch (noun.cls) {
    case 'ขวด': return `${k} bottles of ${bare(noun.en)}`;
    case 'แก้ว': return `${k} glasses of ${bare(noun.en)}`;
    case 'จาน': return `${k} plates of ${bare(noun.en)}`;
    case 'ชิ้น': return `${k} pieces of ${bare(noun.en)}`;
    default: return `${k} ${PLURAL[noun.en] || `${bare(noun.en)}s`}`;
  }
}
// "Cat, แมว (maaeo), takes ตัว (dtuaa). ตัว (dtuaa) is for animals..."
const takes = (n) => `${cap(bare(n.en))}, ${n.th} (${n.rom}), takes ${n.cls} (${classifierOf(n.cls).rom}). ${classifierOf(n.cls).hint}`;

// ---- Icons ----
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
const ShuffleIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" /></svg>;
const NextIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
const LeverIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>;

// ---- Audio: one clip, or several in a row; play/stop toggles like the Patterns card ----
function useAudio() {
  const ref = useRef(null); const token = useRef(0);
  const [playing, setPlaying] = useState(null); // null | key
  const stop = () => { ++token.current; ref.current?.pause(); setPlaying(null); };
  const play = (texts, { slow = false, key = 'any', toggle = false } = {}) => {
    if (toggle && playing === key) { stop(); return; }
    const list = [].concat(texts).filter(Boolean); const my = ++token.current;
    const next = (i) => {
      if (token.current !== my) return;
      if (i >= list.length) { setPlaying(null); return; }
      try {
        ref.current?.pause();
        const voice = readStore('tsc-help', {}).voice || 'female';
        const t = list[i];
        const a = new Audio(`/api/speak?text=${encodeURIComponent(t)}&voice=${voice}${slow ? '&slow=1' : ''}&v=${audioVersion(t, slow)}`);
        a.preservesPitch = true; a.webkitPreservesPitch = true;
        if (slow) { a.defaultPlaybackRate = SLOW_RATE; a.playbackRate = SLOW_RATE; }
        ref.current = a; setPlaying(key);
        a.onended = () => next(i + 1); a.onerror = () => next(i + 1);
        a.play().catch(() => next(i + 1));
      } catch { setPlaying(null); }
    };
    next(0);
  };
  useEffect(() => () => ref.current?.pause(), []);
  return { play, stop, playing };
}

// ---- English on hover (mouse, after a moment) or long-press (touch), like the word cards ----
function usePeek() {
  const [id, setId] = useState(null);
  const t = useRef(0);
  useEffect(() => () => clearTimeout(t.current), []);
  const clear = () => clearTimeout(t.current);
  const bind = (key) => ({
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') { clear(); t.current = setTimeout(() => setId(key), 500); } },
    onPointerLeave: () => { clear(); setId((v) => (v === key ? null : v)); },
    onPointerDown: (e) => { if (e.pointerType !== 'mouse') { clear(); t.current = setTimeout(() => setId(key), 450); } },
    onPointerUp: (e) => { clear(); if (e.pointerType !== 'mouse') t.current = setTimeout(() => setId((v) => (v === key ? null : v)), 1400); },
    onContextMenu: (e) => e.preventDefault(),
  });
  return { id, bind, hide: () => { clear(); setId(null); }, clear };
}
const Peek = ({ on, text }) => (on ? <span className="cl-peek" role="tooltip">{text}</span> : null);

function SoundButtons({ audio, text, k }) {
  return (
    <div className="pm-sound">
      <button type="button" className={`pm-play${audio.playing === k ? ' on' : ''}`} onClick={() => audio.play(text, { key: k, toggle: true })} aria-label={audio.playing === k ? 'Stop' : 'Play'}>
        {audio.playing === k ? <StopIcon /> : <PlayIcon />}
      </button>
      <button type="button" className={`pm-slow${audio.playing === `${k}-slow` ? ' on' : ''}`} onClick={() => audio.play(text, { key: `${k}-slow`, slow: true, toggle: true })} aria-label="Play slowly">
        <SlowIcon />
      </button>
    </div>
  );
}

const stats = () => readStore(STORE, {});
function saveRound(activity, level, clean) {
  const all = stats(); const key = `${activity}:${level}`; const e = all[key] || { rounds: 0, clean: 0, days: [] };
  const day = dayKey();
  all[key] = { rounds: e.rounds + 1, clean: e.clean + (clean ? 1 : 0), days: e.days.includes(day) ? e.days : [...e.days, day].slice(-30) };
  writeStore(STORE, all);
  track('classifiers_round', { activity, level, clean });
}

// ======================================================================
export default function Classifiers() {
  const [mode, setMode] = useState('learn');
  const [act, setAct] = useState('match');
  const [lvl, setLvl] = useState(1);
  const [help, setHelp] = useState(false);
  const audio = useAudio();
  const reg = useMemo(() => getRegister(), []);
  const setM = (m) => { audio.stop(); setHelp(false); setMode(m); };
  const setA = (a) => { audio.stop(); setHelp(false); setAct(a); };
  const level = LEVELS.find((l) => l.n === lvl);
  const modeSwitch = (cls) => (
    <div className={`pm-mode ${cls}`} role="group" aria-label="Mode">
      {[['learn', 'Learn'], ['practice', 'Practice']].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'on' : ''} onClick={() => setM(id)}>{label}</button>
      ))}
    </div>
  );
  const ACTS = [['match', 'Find the matches'], ['slots', 'Slot machine']];
  const levelPick = (
    <>
      <label className="pm-pick">
        <span className="sr-only">Level</span>
        <select value={lvl} onChange={(e) => { audio.stop(); setHelp(false); setLvl(Number(e.target.value)); }}>
          {LEVELS.map((l) => <option key={l.n} value={l.n}>{l.name}</option>)}
        </select>
      </label>
      <span className="pm-help">
        <button type="button" className="pm-help-btn" aria-label="What this level asks" aria-expanded={help} onClick={() => setHelp((h) => !h)}>?</button>
        <span className={`pm-help-tip${help ? ' on' : ''}`} role="tooltip">{level.rule}</span>
      </span>
    </>
  );

  return (
    <div className="pm-layout cl">
      <nav className="pm-side" aria-label="Classifiers">
        <p className="pm-side-h">Mode</p>
        {modeSwitch('is-side')}
        {mode === 'practice' && (
          <>
            <p className="pm-side-h pm-side-h2">Activity</p>
            {ACTS.map(([id, label]) => (
              <button key={id} type="button" className={`pm-side-i${act === id ? ' on' : ''}`} aria-current={act === id} onClick={() => setA(id)}>{label}</button>
            ))}
            {act === 'match' && (<><p className="pm-side-h pm-side-h2">Level</p><div className="pm-side-level">{levelPick}</div></>)}
          </>
        )}
      </nav>

      <div className="pm-wrap cl-wrap">
        <header className={`pm-head${mode === 'practice' ? ' cl-head-practice' : ''}`}>
          <h1>Classifiers</h1>
        </header>
        {modeSwitch('is-top')}
        {mode === 'practice' && (
          <div className="pm-pickers cl-pickers">
            <label className="pm-pick">
              <span className="sr-only">Activity</span>
              <select value={act} onChange={(e) => setA(e.target.value)}>
                {ACTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            {act === 'match' && levelPick}
          </div>
        )}
        {mode === 'learn' && <Learn audio={audio} reg={reg} />}
        {mode === 'practice' && act === 'match' && lvl < 3 && <Match key={`m${lvl}`} level={level} audio={audio} reg={reg} />}
        {mode === 'practice' && act === 'match' && lvl === 3 && <Produce key="p3" audio={audio} reg={reg} />}
        {mode === 'practice' && act === 'slots' && <Slots key="slots" audio={audio} reg={reg} />}
      </div>
    </div>
  );
}

// ======================================================================
// Learn
function Learn({ audio, reg }) {
  const [open, setOpen] = useState(null);
  const [nudge, setNudge] = useState(false);
  useEffect(() => { setNudge(!readStore('tsc-hint-classifiers', false)); }, []);
  const choose = (th) => {
    audio.stop();
    if (nudge) { setNudge(false); writeStore('tsc-hint-classifiers', true); }
    setOpen((o) => (o === th ? null : th));
  };
  return (
    <div className="cl-learn">
      <section className="pm-card cl-intro">
        <div className="pm-band"><span>Classifiers</span></div>
        <div className="pm-body">
          <h2 className="cl-intro-h">Thai counts things with classifiers</h2>
          <p className="cl-intro-p">In Thai, you can&apos;t put a number straight in front of a thing. You say the thing, then the number, then a <b>classifier</b>: a small word that depends on what kind of thing you&apos;re counting.</p>
          <div className="cl-intro-ex">
            <SoundButtons audio={audio} text="หมาสองตัว" k="intro" />
            <div className="cl-intro-line">
              <b>Two dogs</b>
              <span className="cl-tiles">
                <span className="pm-tile"><span className="th" lang="th">หมา</span><span className="rom">mǎa</span></span>
                <span className="pm-tile"><span className="th" lang="th">สอง</span><span className="rom">sǎawng</span></span>
                <span className="pm-tile is-slot"><span className="th" lang="th">ตัว</span><span className="rom">dtuaa</span></span>
              </span>
              <span className="cl-lit">Word for word: dog, two, animal-classifier.</span>
            </div>
          </div>
          <p className="cl-intro-p">There are dozens of classifiers. In this section you&apos;ll learn the 10 that help you count, order and buy most things in Bangkok.</p>
          <p className="cl-intro-go">Pick a classifier to see what it counts.</p>
        </div>
      </section>
      <ul className="cl-list">
        {CLASSIFIERS.map((c, i) => (
          <li key={c.th} className={`cl-item${open === c.th ? ' is-open' : ''}`}>
            <button type="button" className={`cl-row${nudge && i === 0 ? ' is-nudge' : ''}`} aria-expanded={open === c.th} onClick={() => choose(c.th)}>
              <span className="cl-row-for">{c.for}</span>
              <span className="cl-row-th"><span className="th" lang="th">{c.th}</span><span className="rom">{c.rom}</span></span>
              <span className="cl-row-chev"><Chevron /></span>
            </button>
            {open === c.th && <ClassifierCard c={c} audio={audio} reg={reg} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClassifierCard({ c, audio, reg }) {
  const ns = nounsFor(c.th);
  const [sel, setSel] = useState(ns[0].th);
  const peek = usePeek();
  const say = useMemo(() => renderSay(SAY[sel], reg, particleFor), [sel, reg]);
  const tap = (n) => { peek.clear(); setSel(n.th); audio.play([n.th, renderSay(SAY[n.th], reg, particleFor).th], { key: `n-${n.th}` }); };
  return (
    <div className="cl-open">
      <div className="pm-top">
        <SoundButtons audio={audio} text={c.th} k={`c-${c.th}`} />
        <div className="pm-key">
          <span className="kl"><span className="th" lang="th">{c.th}</span><i>{c.rom}</i></span>
          <b>{c.for}</b>
        </div>
      </div>
      <p className="cl-open-h">Tap a picture for a sentence you can use.</p>
      <div className="cl-nouns">
        {ns.map((n) => (
          <button key={n.th} type="button" className={`cl-noun${sel === n.th ? ' is-on' : ''}`} onClick={() => tap(n)} {...peek.bind(n.th)} aria-label={`${n.en}: play and show a sentence`}>
            <Peek on={peek.id === n.th} text={bare(n.en)} />
            <img src={img(n)} alt="" width="160" height="160" loading="lazy" draggable="false" />
            <span className="cl-noun-l"><span className={`th${n.th.length > 7 ? ' is-long' : ''}`} lang="th">{n.th}</span><span className="rom">{n.rom}</span></span>
          </button>
        ))}
      </div>
      <div className="cl-say" aria-live="polite">
        <SoundButtons audio={audio} text={say.th} k={`s-${sel}`} />
        <div className="cl-say-text">
          <span key={sel} className="cl-tiles is-in">
            {say.parts.map((x, k) => (
              <span key={k} className={`pm-tile${x.role === 'cls' ? ' is-slot' : ''}${x.role === 'ending' ? ' is-end' : ''}`}>
                <span className="th" lang="th">{x.th.trim()}</span><span className="rom">{x.rom}</span>
              </span>
            ))}
          </span>
          <BlurEn className="pm-en cl-say-en" text={say.en} />
        </div>
      </div>
      {c.also && <p className="cl-also">{c.also}</p>}
    </div>
  );
}

// ======================================================================
// Practice: Find the matches (L1 one circle, L2 two circles)
function makeMatch(level) {
  if (level.n === 1) {
    const target = pick(CLASSIFIERS, 1)[0].th;
    const right = pick(nounsFor(target), Math.min(nounsFor(target).length, Math.random() < 0.5 ? 3 : 4));
    // One look-alike from a classifier people mix up, the rest from anywhere else
    const near = shuffle(NOUNS.filter((n) => CONFUSE[target].includes(n.cls))).slice(0, 2);
    const rest = pick(NOUNS.filter((n) => n.cls !== target && !near.includes(n)), 8 - right.length - near.length);
    return { targets: [target], items: shuffle([...right, ...near, ...rest]) };
  }
  const pair = shuffle(pick(PAIRS, 1)[0]);
  const items = pair.flatMap((c) => pick(nounsFor(c), 4));
  return { targets: pair, items: shuffle(items) };
}

function Match({ level, audio, reg }) {
  const [round, setRound] = useState(() => makeMatch(level));
  const [placed, setPlaced] = useState({});   // th -> circle index
  const [bad, setBad] = useState(null);       // th of a wrong drop (shakes)
  const [strip, setStrip] = useState(null);   // { kind: 'say'|'hint', ... }
  const [sel, setSel] = useState(null);       // L2: picked card, waiting for a circle
  const [drag, setDrag] = useState(null);     // { th, dx, dy, over }
  const [missed, setMissed] = useState(false);
  const [build, setBuild] = useState(null);   // the sentence to build when the circle is full
  const [built, setBuilt] = useState(false);
  const circles = useRef([]);
  const start = useRef(null);
  const peek = usePeek();
  const L1 = level.n === 1;

  const rights = round.items.filter((n) => round.targets.includes(n.cls));
  const complete = rights.every((n) => placed[n.th] !== undefined);
  const lastRight = useRef(null);

  useEffect(() => {
    if (!complete || build) return;
    soundDone();
    saveRound('match', level.n, !missed);
    const n = lastRight.current || rights[0];
    const t = setTimeout(() => { setStrip(null); setBuild(SAY[n.th]); }, 1100);
    return () => clearTimeout(t);
  }, [complete]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (next) => { audio.stop(); setRound(next); setPlaced({}); setBad(null); setStrip(null); setSel(null); setMissed(false); setBuild(null); setBuilt(false); lastRight.current = null; };
  const shuffleCards = () => reset({ ...round, items: shuffle(round.items) });
  const newClassifier = () => {
    let next = makeMatch(level);
    for (let i = 0; i < 8 && next.targets.join() === round.targets.join(); i++) next = makeMatch(level);
    reset(next);
  };

  const drop = (n, ci) => {
    const target = round.targets[ci];
    setSel(null);
    if (n.cls === target) {
      soundRight(); lastRight.current = n;
      const num = pick(NUMBERS, 1)[0]; const ph = phrase(n, num);
      audio.play(ph.th, { key: 'phrase' });
      setPlaced((p) => ({ ...p, [n.th]: ci }));
      setStrip({ kind: 'say', th: ph.th, rom: ph.rom, en: cap(phraseEn(n, num.n)), id: n.th });
    } else {
      soundWrong(); setMissed(true);
      setBad(n.th); setTimeout(() => setBad((b) => (b === n.th ? null : b)), 650);
      setStrip({ kind: 'hint', text: takes(n), id: `${n.th}-x${Date.now()}` });
    }
  };
  const overCircle = (x, y) => circles.current.findIndex((el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy) <= r.width / 2 + 16;
  });

  const handlers = (n) => {
    const pk = peek.bind(n.th);
    return {
      ...pk,
      onPointerDown: (e) => {
        if (placed[n.th] !== undefined) return;
        pk.onPointerDown(e);
        start.current = { th: n.th, x: e.clientX, y: e.clientY, moved: false };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
      },
      onPointerMove: (e) => {
        const s = start.current; if (!s || s.th !== n.th) return;
        const dx = e.clientX - s.x; const dy = e.clientY - s.y;
        if (!s.moved && Math.hypot(dx, dy) < 6) return;
        if (!s.moved) { s.moved = true; peek.hide(); }
        setDrag({ th: n.th, dx, dy, over: overCircle(e.clientX, e.clientY) });
      },
      onPointerUp: (e) => {
        pk.onPointerUp(e);
        const s = start.current; start.current = null;
        if (!s || s.th !== n.th) return;
        if (s.moved) {
          const ci = overCircle(e.clientX, e.clientY);
          setDrag(null);
          if (ci >= 0) drop(n, ci);
          return;
        }
        // A tap: L1 drops into the circle; L2 plays the word and waits for a circle
        if (L1) drop(n, 0);
        else { setSel(n.th); audio.play(n.th, { key: `w-${n.th}` }); }
      },
      onPointerCancel: () => { start.current = null; setDrag(null); },
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (L1) drop(n, 0); else { setSel(n.th); audio.play(n.th); } } },
    };
  };

  const pos = (i) => `p${i}`;
  return (
    <section className={`pm-card cl-card cl-match lv${level.n}`}>
      <div className="pm-band"><span>Find the matches</span></div>
      <div className="pm-body cl-body">
        {build ? (
          <SentenceBuild key={build.parts.map((x) => x.th).join('')} say={build} audio={audio} reg={reg} onDone={() => setBuilt(true)} />
        ) : (
          <>
            <p className="cl-task">
              {L1
                ? <>Tap or drag everything that takes <b lang="th">{round.targets[0]}</b> ({classifierOf(round.targets[0]).rom}).</>
                : <>Tap a picture to hear it, then drag it into its circle.</>}
            </p>
            <div className={`cl-arena ${L1 ? 'one' : 'two'}`}>
              {round.targets.map((t, ci) => {
                const c = classifierOf(t);
                const inside = round.items.filter((n) => placed[n.th] === ci);
                return (
                  <button key={t} type="button" ref={(el) => { circles.current[ci] = el; }} data-cls={t}
                    className={`cl-circle c${ci}${drag && drag.over === ci ? ' is-over' : ''}${sel ? ' is-ready' : ''}${inside.length && inside.length === rights.filter((n) => n.cls === t).length ? ' is-full' : ''}`}
                    onClick={() => { if (sel) drop(nounOf(sel), ci); else audio.play(t, { key: `c-${t}` }); }}
                    aria-label={sel ? `Put it in ${c.rom}` : `Play ${c.rom}`}>
                    <span className="cl-circle-th" lang="th">{t}</span>
                    <span className="cl-circle-rom">{c.rom}</span>
                    <span className="cl-circle-in">
                      {inside.map((n) => <img key={n.th} src={img(n)} alt={n.en} width="34" height="34" />)}
                    </span>
                  </button>
                );
              })}
              {round.items.map((n, i) => {
                const isIn = placed[n.th] !== undefined;
                const d = drag && drag.th === n.th ? drag : null;
                const tilt = ((n.th.charCodeAt(0) + i * 7) % 7) - 3;
                return (
                  <div key={n.th} className={`cl-spot ${pos(i)}`}>
                    <button type="button" {...handlers(n)} data-cls={n.cls}
                      className={`cl-pic${isIn ? ' is-in' : ''}${bad === n.th ? ' is-bad' : ''}${d ? ' is-drag' : ''}${sel === n.th ? ' is-sel' : ''}`}
                      style={d ? { transform: `translate(${d.dx}px, ${d.dy}px) scale(1.08)` } : { transform: `rotate(${tilt}deg)` }}
                      disabled={isIn} aria-label={L1 ? n.en : `Play this picture (${n.en})`}>
                      <Peek on={peek.id === n.th && !d} text={bare(n.en)} />
                      <img src={img(n)} alt="" width="160" height="160" draggable="false" />
                      {L1 && <span className="cl-pic-l"><span className={`th${n.th.length > 7 ? ' is-long' : ''}`} lang="th">{n.th}</span><span className="rom">{n.rom}</span></span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {!build && (
          <div className={`cl-strip${strip ? ` is-${strip.kind}` : ''}`} role="status" aria-live="polite">
            {strip?.kind === 'say' && (
              <span key={strip.id} className="cl-strip-say">
                <button type="button" className="cl-mini-play" onClick={() => audio.play(strip.th, { key: 'phrase' })} aria-label="Play again"><PlayIcon /></button>
                <span className="cl-strip-text"><b>{strip.en}</b><span className="th" lang="th">{strip.th}</span><span className="rom">{strip.rom}</span></span>
              </span>
            )}
            {strip?.kind === 'hint' && <span key={strip.id} className="cl-strip-hint">{strip.text}</span>}
            {!strip && complete && <span className="cl-strip-hint">Circle complete.</span>}
          </div>
        )}
        {build && built && (
          <div className="cl-after">
            <button type="button" className="cl-small" onClick={shuffleCards}><ShuffleIcon />Shuffle cards</button>
            <button type="button" className="cl-small is-main" onClick={newClassifier}><NextIcon />Try a new classifier</button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Build one sentence from tiles (after a full circle). The thing, number and classifier are gaps. ----
function SentenceBuild({ say, audio, reg, onDone, prompt }) {
  const s = useMemo(() => renderSay(say, reg, particleFor), [say, reg]);
  const gaps = s.parts.map((x, k) => (['noun', 'num', 'cls'].includes(x.role) ? k : -1)).filter((k) => k >= 0);
  const noun = nounOf(s.parts.find((x) => x.role === 'noun').th);
  const tiles = useMemo(() => {
    const need = gaps.map((k) => ({ th: s.parts[k].th, rom: s.parts[k].rom, role: s.parts[k].role }));
    const clsWrong = pick([...new Set([...CONFUSE[noun.cls], ...CLASSIFIERS.map((c) => c.th)])].filter((c) => c !== noun.cls), 2)
      .map((c) => ({ th: c, rom: classifierOf(c).rom, role: 'cls' }));
    const numNow = s.parts.find((x) => x.role === 'num')?.th;
    const numWrong = pick([...NUMBERS, ...EXTRA_WORDS].filter((x) => x.th !== numNow), 1).map((x) => ({ th: x.th, rom: x.rom, role: 'num' }));
    const twin = nounOf(TWINS[noun.th]) || pick(NOUNS.filter((n) => n.cls !== noun.cls), 1)[0];
    return shuffle([...need, ...clsWrong, ...numWrong, { th: twin.th, rom: twin.rom, role: 'noun' }]).map((t, id) => ({ ...t, id }));
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filled, setFilled] = useState([]); const [used, setUsed] = useState([]);
  const [wrong, setWrong] = useState(null);
  const done = filled.length === gaps.length;
  const tap = (t) => {
    if (done || used.includes(t.id)) return;
    const want = s.parts[gaps[filled.length]];
    if (t.th !== want.th) { soundWrong(); setWrong(t.id); audio.play(t.th, { key: 'tile' }); return; }
    const f = [...filled, t.th]; setFilled(f); setUsed([...used, t.id]); setWrong(null);
    if (f.length === gaps.length) { soundRight(); setTimeout(() => audio.play(s.th, { key: 'built' }), 250); onDone?.(); } else audio.play(t.th, { key: 'tile' });
  };
  const want = !done && s.parts[gaps[filled.length]];
  const hint = wrong !== null && want
    ? (want.role === 'cls' ? takes(noun) : want.role === 'num' ? 'Look at the number in the English.' : 'Look at the picture: which thing is it?')
    : '';
  return (
    <div className="cl-build">
      <div className="cl-build-top">
        <img src={img(noun)} alt="" width="96" height="96" />
        <div>
          <p className="cl-eyebrow">{prompt || 'Now make a sentence'}</p>
          <p className="cl-build-en">{s.en}</p>
        </div>
      </div>
      <div className="px-slots cl-slots" aria-label="Your sentence">
        {s.parts.map((x, k) => {
          const gi = gaps.indexOf(k);
          const show = gi < 0 || gi < filled.length;
          return (
            <span key={k} data-want={gi >= 0 ? x.th : undefined} className={`px-slot${gi >= 0 ? ' is-gap' : ''}${gi >= 0 && show ? ' is-done' : ''}${gi === filled.length && !done ? ' is-next' : ''}`}>
              <span className="th" lang="th">{show ? x.th.trim() : ' '}</span>
              <span className="rom">{show ? x.rom : ' '}</span>
            </span>
          );
        })}
      </div>
      <p className={`cl-hint${hint ? ' on' : ''}`} role="status">{hint || ' '}</p>
      {done ? (
        <div className="cl-built is-row">
          <SoundButtons audio={audio} text={s.th} k="built" />
          <p><b>Now say it out loud.</b> Play it again as often as you like.</p>
        </div>
      ) : (
        <div className="cl-bank">
          {tiles.map((t) => (
            <button key={t.id} type="button" data-th={t.th} className={`px-tile cl-tile${used.includes(t.id) ? ' is-used' : ''}${wrong === t.id ? ' is-wrong' : ''}${t.role === 'cls' ? ' is-cls' : ''}`}
              disabled={used.includes(t.id)} onClick={() => tap(t)}>
              <span className="th" lang="th">{t.th}</span><span className="rom">{t.rom}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Practice L3: Build the phrase. Picture only, Thai instructions.
function makeProduce(prev) {
  const pool = NOUNS.filter((n) => n.th !== prev);
  const noun = Math.random() < 0.4 ? nounOf(pick(Object.keys(TWINS).filter((t) => t !== prev), 1)[0]) : pick(pool, 1)[0];
  return { noun, num: pick(NUMBERS, 1)[0] };
}

function Produce({ audio, reg }) {
  const [item, setItem] = useState(() => makeProduce());
  const prompt = PROMPT.th + particleFor(reg, true).th;
  const promptRom = `${PROMPT.rom} ${particleFor(reg, true).rom}`;
  useEffect(() => { audio.play(prompt, { key: 'prompt' }); }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const [done, setDone] = useState(false);
  const [missed, setMissed] = useState(false);
  const { noun, num } = item;
  const answer = phrase(noun, num);
  const parts = [{ th: noun.th, rom: noun.rom, role: 'noun' }, { th: num.th, rom: num.rom, role: 'num' }, { th: noun.cls, rom: classifierOf(noun.cls).rom, role: 'cls' }];
  const tiles = useMemo(() => {
    const twin = nounOf(TWINS[noun.th]) || pick(NOUNS.filter((n) => n.cls !== noun.cls), 1)[0];
    const other = pick(NOUNS.filter((n) => n.th !== noun.th && n.th !== twin.th), 1)[0];
    const nums = pick(NUMBERS.filter((x) => x.th !== num.th), 1);
    const cls = pick([...new Set([...CONFUSE[noun.cls], ...CLASSIFIERS.map((c) => c.th)])].filter((c) => c !== noun.cls), 2);
    return shuffle([...parts, { th: twin.th, rom: twin.rom }, { th: other.th, rom: other.rom }, ...nums.map((x) => ({ th: x.th, rom: x.rom })), ...cls.map((c) => ({ th: c, rom: classifierOf(c).rom }))]).map((t, id) => ({ ...t, id }));
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filled, setFilled] = useState([]); const [used, setUsed] = useState([]); const [wrong, setWrong] = useState(null);
  const tap = (t) => {
    if (done || used.includes(t.id)) return;
    const want = parts[filled.length];
    if (t.th !== want.th) { soundWrong(); setWrong(t.id); setMissed(true); audio.play(t.th, { key: 'tile' }); return; }
    const f = [...filled, t.th]; setFilled(f); setUsed([...used, t.id]); setWrong(null);
    if (f.length === 3) { soundRight(); setDone(true); saveRound('match', 3, !missed); setTimeout(() => audio.play(answer.th, { key: 'answer' }), 250); } else audio.play(t.th, { key: 'tile' });
  };
  const next = () => { setItem(makeProduce(noun.th)); setDone(false); setMissed(false); setFilled([]); setUsed([]); setWrong(null); };
  const want = !done && parts[filled.length];
  const hint = wrong !== null && want ? (want.role === 'cls' ? takes(noun) : want.role === 'num' ? 'Count the pictures.' : 'Which thing is in the picture?') : '';
  const say = useMemo(() => renderSay(SAY[noun.th], reg, particleFor), [noun, reg]);
  return (
    <section className="pm-card cl-card cl-produce">
      <div className="pm-band"><span>Build the phrase</span></div>
      <div className="pm-body cl-body">
        <div className="pm-top cl-prompt">
          <SoundButtons audio={audio} text={prompt} k="prompt" />
          <div className="pm-key"><span className="kl"><span className="th" lang="th">{prompt}</span></span><i>{promptRom}</i></div>
        </div>
        <div className={`cl-scene n${num.n}`} aria-label={`${num.n} pictures`}>
          {Array.from({ length: num.n }, (_, k) => <img key={k} src={img(noun)} alt="" width="120" height="120" draggable="false" />)}
        </div>
        <div className="px-slots cl-slots" aria-label="Your phrase">
          {parts.map((x, k) => (
            <span key={k} data-want={x.th} className={`px-slot is-gap${k < filled.length ? ' is-done' : ''}${k === filled.length && !done ? ' is-next' : ''}`}>
              <span className="th" lang="th">{k < filled.length ? x.th : ' '}</span>
              <span className="rom">{k < filled.length ? x.rom : ' '}</span>
            </span>
          ))}
        </div>
        <p className={`cl-hint${hint ? ' on' : ''}`} role="status">{hint || ' '}</p>
        {done ? (
          <div className="cl-built">
            <p className="cl-eyebrow">{cap(phraseEn(noun, num.n))}. Use it like this:</p>
            <div className="cl-use">
              <SoundButtons audio={audio} text={say.th} k="use" />
              <div><span className="th" lang="th">{say.th}</span><span className="rom">{say.rom}</span><BlurEn as="span" className="en" text={say.en} /></div>
            </div>
            <button type="button" className="cl-small is-main" onClick={next}><NextIcon />Next picture</button>
          </div>
        ) : (
          <div className="cl-bank">
            {tiles.map((t) => (
              <button key={t.id} type="button" data-th={t.th} className={`px-tile cl-tile${used.includes(t.id) ? ' is-used' : ''}${wrong === t.id ? ' is-wrong' : ''}`}
                disabled={used.includes(t.id)} onClick={() => tap(t)}>
                <span className="th" lang="th">{t.th}</span><span className="rom">{t.rom}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ======================================================================
// Practice: Slot machine. Spin, then stop each reel on what's in the picture.
const TICK = 560; // ms per step while a reel spins
function makeSlots(prev) {
  const noun = pick(NOUNS.filter((n) => n.th !== prev), 1)[0];
  const num = pick(NUMBERS, 1)[0];
  const twin = nounOf(TWINS[noun.th]);
  const others = pick(NOUNS.filter((n) => n.cls !== noun.cls && n.th !== twin?.th), twin ? 2 : 3);
  const nouns = shuffle([noun, ...(twin ? [twin] : []), ...others]).map((n) => ({ th: n.th, rom: n.rom }));
  const near = CONFUSE[noun.cls].slice(0, 1);
  const cls = shuffle([noun.cls, ...near, ...pick(CLASSIFIERS.map((c) => c.th).filter((c) => c !== noun.cls && !near.includes(c)), 3 - near.length)])
    .map((c) => ({ th: c, rom: classifierOf(c).rom }));
  return { noun, num, reels: [
    { label: 'Thing', opts: nouns, want: noun.th },
    { label: 'Number', opts: NUMBERS.map((x) => ({ th: x.th, rom: x.rom })), want: num.th },
    { label: 'Classifier', opts: cls, want: noun.cls },
  ] };
}

// Each reel starts on a wrong item, so the answer never shows before you spin
const startIdx = (it) => it.reels.map((r) => { const i = r.opts.findIndex((o) => o.th !== r.want); return Math.max(0, i); });

function Slots({ audio, reg }) {
  const [item, setItem] = useState(() => makeSlots());
  const [idx, setIdx] = useState(() => startIdx(item));
  const [spin, setSpin] = useState([false, false, false]);
  const [lock, setLock] = useState([null, null, null]); // null | 'right' | 'wrong'
  const [started, setStarted] = useState(false);
  const [missed, setMissed] = useState(false);
  const [said, setSaid] = useState(false);
  const prompt = PROMPT.th + particleFor(reg, true).th;
  const promptRom = `${PROMPT.rom} ${particleFor(reg, true).rom}`;
  const spinRef = useRef(spin); spinRef.current = spin;

  useEffect(() => {
    const t = setInterval(() => {
      if (!spinRef.current.some(Boolean)) return;
      setIdx((cur) => cur.map((v, r) => (spinRef.current[r] ? (v + 1) % item.reels[r].opts.length : v)));
    }, TICK);
    return () => clearInterval(t);
  }, [item]);

  const jackpot = lock.every((l) => l === 'right');
  const allStopped = started && !spin.some(Boolean);
  useEffect(() => {
    if (!allStopped || lock.every((l) => l)) return;
    const res = item.reels.map((r, k) => (r.opts[idx[k]].th === r.want ? 'right' : 'wrong'));
    setLock(res);
    if (res.every((x) => x === 'right')) {
      soundDone(); saveRound('slots', 1, !missed);
      setTimeout(() => audio.play(phrase(item.noun, item.num).th, { key: 'jackpot' }), 400);
    } else { soundWrong(); setMissed(true); }
  }, [allStopped]); // eslint-disable-line react-hooks/exhaustive-deps

  const pull = () => {
    audio.stop();
    setStarted(true);
    setSpin(lock.map((l) => l !== 'right'));
    setLock((cur) => cur.map((l) => (l === 'right' ? 'right' : null)));
  };
  const stopReel = (r) => { if (spin[r]) setSpin((s) => s.map((v, k) => (k === r ? false : v))); };
  const next = () => { audio.stop(); const it = makeSlots(item.noun.th); setItem(it); setIdx(startIdx(it)); setSpin([false, false, false]); setLock([null, null, null]); setStarted(false); setMissed(false); setSaid(false); };

  const firstWrong = lock.findIndex((l) => l === 'wrong');
  const hint = firstWrong === 0 ? 'Thing: look at the picture again.'
    : firstWrong === 1 ? 'Number: count the pictures.'
      : firstWrong === 2 ? takes(item.noun) : '';
  const say = useMemo(() => renderSay(SAY[item.noun.th], reg, particleFor), [item, reg]);
  const ph = phrase(item.noun, item.num);
  const spinning = spin.some(Boolean);

  return (
    <section className={`pm-card cl-card cl-slots-card${jackpot ? ' is-jackpot' : ''}`}>
      <div className="pm-band"><span>Slot machine</span></div>
      <div className="pm-body cl-body">
        <div className="pm-top cl-prompt">
          <SoundButtons audio={audio} text={prompt} k="prompt" />
          <div className="cl-prompt-t"><b>What do you see?</b><span className="th" lang="th">{prompt}</span><i>{promptRom}</i></div>
        </div>
        {!jackpot && (
          <div className={`cl-scene n${item.num.n}`} aria-label={`${item.num.n} pictures`}>
            {Array.from({ length: item.num.n }, (_, k) => <img key={k} src={img(item.noun)} alt="" width="120" height="120" draggable="false" />)}
          </div>
        )}
        {jackpot ? (
          <div className="cl-jackpot" aria-live="polite">
            <div className="sayit cl-sayit">
              <p className="sayit-eyebrow">Jackpot</p>
              <div className="cl-jackpot-ph">
                <span className="sayit-en">{cap(phraseEn(item.noun, item.num.n))}</span>
                <span className="sayit-th" lang="th">{ph.th}</span>
                <span className="sayit-rom">{ph.rom}</span>
              </div>
              <p className="sayit-eyebrow cl-say-today">Say it today</p>
              <div className="sayit-line">
                <button type="button" className={`sayit-play${audio.playing === 'say' ? ' on' : ''}`} onClick={() => audio.play(say.th, { key: 'say', toggle: true })} aria-label="Play"><PlayIcon /></button>
                <div className="sayit-text">
                  <span className="sayit-en">{say.en}</span>
                  <span className="sayit-th cl-say-th" lang="th">{say.th}</span>
                  <span className="sayit-rom">{say.rom}</span>
                </div>
              </div>
              {said ? <span className="cl-said">★ You said it. Nice.</span>
                : <button type="button" className="cl-said-btn" onClick={() => { setSaid(true); track('classifiers_said_it', { noun: item.noun.th }); }}>I said it to someone ★</button>}
            </div>
            <button type="button" className="pm-lever" onClick={next}><NextIcon />Next picture</button>
          </div>
        ) : (
          <>
            <div className="cl-machine" role="group" aria-label="Slot machine">
              {item.reels.map((r, k) => {
                const n = r.opts.length; const i = idx[k];
                const at = (d) => r.opts[(i + d + n) % n];
                return (
                  <button key={k} type="button" data-want={r.want} data-cur={at(0).th} className={`cl-reel${spin[k] ? ' is-spin' : ''}${lock[k] ? ` is-${lock[k]}` : ''}${k === 2 ? ' is-cls' : ''}`}
                    onClick={() => stopReel(k)} disabled={!spin[k]} aria-label={spin[k] ? `Stop the ${r.label.toLowerCase()} reel` : `${r.label}: ${at(0).th}`}>
                    <span className="cl-reel-l">{r.label}</span>
                    <span className="cl-reel-win">
                      <span key={i} className="cl-reel-strip">
                        <span className="cl-reel-i is-off"><span className="th" lang="th">{at(-1).th}</span></span>
                        <span className="cl-reel-i is-pay"><span className="th" lang="th">{at(0).th}</span><span className="rom">{at(0).rom}</span></span>
                        <span className="cl-reel-i is-off"><span className="th" lang="th">{at(1).th}</span></span>
                      </span>
                    </span>
                    <span className="cl-reel-stop">{spin[k] ? 'Stop' : lock[k] === 'right' ? '✓' : lock[k] === 'wrong' ? '✕' : ' '}</span>
                  </button>
                );
              })}
            </div>
            <p className={`cl-hint${hint ? ' on' : ''}`} role="status">{hint || (spinning ? 'Tap each reel to stop it on what you see.' : ' ')}</p>
            <button type="button" className="pm-lever cl-spin" onClick={pull} disabled={spinning}>
              <LeverIcon />{lock.some((l) => l === 'wrong') ? 'Spin again' : 'Spin'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
