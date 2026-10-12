'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgressStore, readStore, writeStore } from '../lib/progress';
import { stageOf } from '../lib/memory';
import {
  PATTERNS, SLOT_COLOURS, memoryKey, slotOptions, levelWords, randomValues, isValid, sentenceThai, isFlag, wrongCountersFor, inRegister,
} from '../lib/patterns';
import { dayKey, endOfToday } from '../lib/progress';
import { getRegister, particleFor } from '../lib/register';

// The patterns as this learner sees them (ผม/ครับ or ฉัน/ค่ะ/คะ)
const usePatterns = () => useMemo(() => inRegister(PATTERNS, getRegister(), particleFor), []);

// Patterns: see a sentence frame, spin it, build it, hear it.
// Three ways to practise each level:
//   Spin   - reels pick a sensible sentence from words you know; hear it, peek at the English
//   Build  - read the English, tap the Thai words in the right order (recall, no typing)
//   Listen - hear a sentence, pick what it means (one word differs between options)
// Build and Listen rounds (5 sentences) are tracked over time like words (lib/memory.js).

const AUDIO_VERSION = 2;
const ROUND = 5;
const PREVIEW_KEY = 'tsc-pattern-preview';
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function useAudio() {
  const ref = useRef(null); const token = useRef(0);
  const [playing, setPlaying] = useState(false);
  const play = (text, rate = 1) => {
    const my = ++token.current;
    try {
      ref.current?.pause();
      const voice = readStore('tsc-help', {}).voice || 'female';
      const a = new Audio(`/api/speak?text=${encodeURIComponent(text)}&voice=${voice}&v=${AUDIO_VERSION}`);
      a.playbackRate = rate; a.preservesPitch = true; a.webkitPreservesPitch = true;
      ref.current = a; setPlaying(true);
      a.onended = a.onerror = () => { if (token.current === my) setPlaying(false); };
      a.play().catch(() => { if (token.current === my) setPlaying(false); });
    } catch { setPlaying(false); }
  };
  useEffect(() => () => ref.current?.pause(), []);
  return { play, playing };
}

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
const LockIcon = () => <svg className="lk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const Back = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;

function readUrl() {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  return { p: q.get('p') || null, l: Number(q.get('l')) || 1 };
}

export default function Patterns({ lex }) {
  const { progress, check } = useProgressStore();
  const PATS = usePatterns();
  const [view, setView] = useState(null);
  const [preview, setPreviewState] = useState(false);
  useEffect(() => {
    setView(readUrl()); setPreviewState(!!readStore(PREVIEW_KEY, false));
    const onPop = () => setView(readUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const setPreview = (v) => { setPreviewState(v); writeStore(PREVIEW_KEY, v); };
  const open = (p, l = 1) => {
    window.history.pushState(null, '', p ? `?p=${p}&l=${l}` : window.location.pathname);
    setView({ p, l }); window.scrollTo(0, 0);
  };
  // A word is usable once you've met it on Today (or anything, in preview)
  const can = (th) => preview || !!progress[th];
  if (!view) return null;
  const pattern = view.p && PATS.find((x) => x.id === view.p);
  if (!pattern) return <PatternList pats={PATS} lex={lex} can={can} progress={progress} preview={preview} setPreview={setPreview} onOpen={open} />;
  return <PatternView key={`${pattern.id}-${view.l}-${preview}`} pattern={pattern} levelN={view.l} lex={lex} can={can} preview={preview}
    progress={progress} onLevel={(l) => open(pattern.id, l)} onBack={() => open(null)} record={(key, grade) => check(key, grade)} />;
}

// Listening and building are different skills, so each has its own memory record.
// Only the first round of the day counts (later rounds are practice), like word checks.
const keyFor = (p, level, kind) => `${memoryKey(p, level)}:${kind}`;
const doneToday = (e) => !!e && dayKey(e.last) === dayKey() && e.checks + e.lapses > 0;
const gradeFor = (right) => (right >= ROUND - 1 ? 'good' : right === ROUND - 2 ? 'hard' : 'again');

// What's missing before a level opens: words not met yet, and the level before it
function lockInfo(p, level, can, progress, preview, lex = {}) {
  if (preview) return null;
  const missing = [...levelWords(p, level)].filter((th) => !can(th));
  const ready = level.slots.every((slot) => isFlag(slot) || slotOptions(p, slot, can).length >= 2)
    && level.fixed.every((th) => can(th));
  const prev = p.levels.find((l) => l.n === level.n - 1);
  // The next level opens once you've passed a Listen round on this one
  if (prev && !(progress[keyFor(p, prev, 'listen')]?.checks > 0)) return { reason: `Pass a Listen round on level ${prev.n} first.` };
  if (!ready) {
    const need = missing.filter((th) => level.fixed.includes(th));
    const named = need.map((th) => `${th} (${lex[th]?.rom || ''})`).join(', ');
    return { reason: need.length ? `Meet ${named} on Today first.` : 'Meet a few more of its words on Today first.', missing };
  }
  return null;
}

function levelEntry(progress, p, l) { return progress[keyFor(p, l, 'listen')]; }
function stageLabel(e) {
  const s = stageOf(e);
  return s === 'known' ? 'Strong' : s === 'learning' ? 'Practising' : 'New';
}

function Parts({ parts, lex, big }) {
  return (
    <span className={`pt-parts${big ? ' big' : ''}`}>
      {parts.map((x, k) => (
        <span key={k} className="pt-part" style={{ '--sc': SLOT_COLOURS[x.slot] }}>
          <span className="th" lang="th">{x.th}</span>
          <span className="rom">{lex[x.th]?.rom || x.rom || ''}</span>
        </span>
      ))}
    </span>
  );
}

function PatternList({ pats, lex, can, progress, preview, setPreview, onOpen }) {
  return (
    <div className="pt">
      <div className="tp-head">
        <h1>Patterns</h1>
        <p>Turn the words you know into sentences. Each pattern grows one piece at a time.</p>
      </div>
      <div className="pt-list">
        {pats.map((p) => {
          const example = p.levels[p.levels.length - 1].make(randomValues(p, p.levels[p.levels.length - 1]) || {});
          const first = p.levels[0];
          const lock = lockInfo(p, first, can, progress, preview, lex);
          return (
            <button key={p.id} type="button" className="pt-card" onClick={() => onOpen(p.id, 1)}>
              <span className="pt-card-title">{p.title}</span>
              <span className="pt-frame">{p.frame}</span>
              <span className="pt-card-ex"><Parts parts={example.parts} lex={lex} /></span>
              <span className="pt-card-en">{example.en}</span>
              <span className="pt-levels" aria-label="Levels">
                {p.levels.map((l) => {
                  const e = levelEntry(progress, p, l);
                  return <span key={l.n} className={`pt-dot ${stageOf(e)}`} title={`Level ${l.n}: ${stageLabel(e)}`}>{l.n}</span>;
                })}
                {lock && <span className="pt-lock">{lock.reason} <a href="/today" onClick={(e) => e.stopPropagation()}>Go to Today</a></span>}
              </span>
            </button>
          );
        })}
      </div>
      <label className="pt-preview">
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        <span><b>Preview with all words.</b> Try every level now, before you've met its words. Practice in preview isn't saved.</span>
      </label>
    </div>
  );
}

function PatternView({ pattern: p, levelN, lex, can, preview, progress, onLevel, onBack, record }) {
  const level = p.levels.find((l) => l.n === levelN) || p.levels[0];
  const lock = lockInfo(p, level, can, progress, preview, lex);
  const [mode, setMode] = useState('spin');
  const entry = levelEntry(progress, p, level);
  // Record a round (first one today per skill only; preview never counts)
  const save = (kind) => (right) => {
    const key = keyFor(p, level, kind);
    if (preview || doneToday(progress[key])) return false;
    record(key, gradeFor(right));
    return true;
  };

  return (
    <div className="pt">
      <button type="button" className="pt-back" onClick={onBack}><Back />All patterns</button>
      <div className="pt-head">
        <h1>{p.title}</h1>
        <span className="pt-frame">{p.frame}</span>
      </div>
      <div className="pt-levelbar" role="tablist" aria-label="Levels">
        {p.levels.map((l) => {
          const lk = lockInfo(p, l, can, progress, preview, lex);
          return (
            <button key={l.n} type="button" role="tab" aria-selected={l.n === level.n} className={`pt-level${l.n === level.n ? ' is-on' : ''}${lk ? ' is-locked' : ''} ${stageOf(levelEntry(progress, p, l))}`}
              onClick={() => onLevel(l.n)} aria-label={`Level ${l.n}: ${l.name}${lk ? ' (locked)' : ''}`}>
              {lk ? <LockIcon /> : null}Level {l.n}
            </button>
          );
        })}
      </div>
      <p className="pt-levelname">{level.name}</p>

      {lock ? (
        <div className="pt-locked">
          <p><b>Not open yet.</b> {lock.reason}</p>
          <p><a className="auth-btn primary pt-today" href="/today">Go to Today</a> or tick <b>Preview with all words</b> on the Patterns page.</p>
          {lock.missing?.length > 0 && (
            <p className="pt-missing">Words it uses that you haven't met: {lock.missing.slice(0, 8).map((th) => <span key={th} lang="th">{th} <i>{lex[th]?.rom}</i></span>)}</p>
          )}
        </div>
      ) : (
        <>
          <div className="pt-modes" role="tablist" aria-label="Practice">
            {[['spin', 'Spin'], ['build', 'Build'], ['listen', 'Listen']].map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={`pt-mode${mode === m ? ' is-on' : ''}`} onClick={() => setMode(m)}>{label}</button>
            ))}
            <span className="pt-stage">{preview ? 'Preview' : stageLabel(entry)}</span>
          </div>
          {mode === 'spin' && <Spin key={`s${level.n}`} p={p} level={level} lex={lex} can={can} />}
          {mode === 'build' && <Build key={`b${level.n}`} p={p} level={level} lex={lex} can={can} onRound={save('build')} />}
          {mode === 'listen' && <Listen key={`l${level.n}`} p={p} level={level} lex={lex} can={can} onRound={save('listen')} />}
        </>
      )}
    </div>
  );
}

// ---- Spin --------------------------------------------------------------
function Spin({ p, level, lex, can }) {
  const [v, setV] = useState(() => randomValues(p, level, can));
  const [spinning, setSpinning] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const hover = useRef(0);
  const { play, playing } = useAudio();
  const s = v && level.make(v);
  const spin = () => {
    setSpinning(true); setShowEn(false);
    setTimeout(() => {
      const next = randomValues(p, level, can); setV(next); setSpinning(false);
      if (next) play(sentenceThai(level.make(next)));
    }, 650);
  };
  // Tap a reel to change just that piece (only to sensible options)
  const turn = (slot) => {
    const cur = slot === 'neg' ? (v.neg ? 'ไม่' : '') : v[slot]?.th;
    const opts = slotOptions(p, slot, can).filter((o) => isValid(p, { ...v, [slot]: slot === 'neg' ? o.neg : o }));
    if (opts.length < 2) return;
    const i = opts.findIndex((o) => o.th === cur);
    const o = opts[(i + 1) % opts.length];
    const next = { ...v, [slot]: slot === 'neg' ? o.neg : o };
    setV(next); setShowEn(false); play(sentenceThai(level.make(next)));
  };
  if (!s) return <p className="pt-note">Not enough words yet for this level.</p>;
  return (
    <section className="pt-panel">
      <div className={`pt-reels${spinning ? ' is-spinning' : ''}`}>
        {s.parts.map((x, k) => {
          const slot = x.slot === 'fixed' && x.th === 'ไม่' && level.slots.includes('neg') ? 'neg' : x.slot;
          const turnable = slot !== 'fixed' && slot !== 'ending';
          return (
            <button key={k} type="button" className={`pt-reel${turnable ? '' : ' is-fixed'}`} style={{ '--sc': SLOT_COLOURS[x.slot] }}
              onClick={() => turnable && turn(slot)} disabled={!turnable || spinning} aria-label={turnable ? `Change ${x.th}` : x.th}>
              <span className="th" lang="th">{x.th}</span>
              <span className="rom">{lex[x.th]?.rom || x.rom || ''}</span>
            </button>
          );
        })}
      </div>
      <div className="pt-actions">
        <button type="button" className={`pt-play${playing ? ' on' : ''}`} onClick={() => play(sentenceThai(s))} aria-label="Play the sentence"><PlayIcon /></button>
        <button type="button" className="pt-play" onClick={() => play(sentenceThai(s), 0.65)} aria-label="Play slowly"><SlowIcon /></button>
        <button type="button" className="auth-btn primary pt-spin" onClick={spin} disabled={spinning}>Spin</button>
      </div>
      <button type="button" className={`pt-en${showEn ? ' is-on' : ''}`} onClick={() => setShowEn(true)}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') { clearTimeout(hover.current); hover.current = setTimeout(() => setShowEn(true), 700); } }}
        onPointerLeave={() => clearTimeout(hover.current)} aria-label={showEn ? s.en : 'Show the English'}>
        <span aria-hidden={!showEn}>{s.en}</span>
      </button>
      <p className="pt-note">Tap a coloured word to change it. Say the sentence out loud, then check the English.</p>
    </section>
  );
}

// ---- Build ---------------------------------------------------------------
function makeBuild(p, level, can) {
  const v = randomValues(p, level, can); if (!v) return null;
  const s = level.make(v);
  // 2 wrong tiles: another option for a reel, or a wrong counting word (the real skill in pattern 2)
  const extras = [];
  for (const slot of shuffle(level.slots.filter((x) => !isFlag(x)))) {
    const other = shuffle(slotOptions(p, slot, can)).find((o) => o.th !== v[slot].th && !s.parts.some((x) => x.th === o.th));
    if (other) extras.push({ slot, th: other.th });
    if (extras.length >= 2) break;
  }
  if (p.id === 'order' && v.thing) {
    // a counting word that's really wrong for this thing (no bottles of fried rice)
    const wrongCounter = shuffle(wrongCountersFor(v.thing)).find((c) => can(c));
    if (wrongCounter) extras[0] = { slot: 'counter', th: wrongCounter };
  }
  if (level.slots.includes('neg') && !v.neg && can('ไม่')) extras.push({ slot: 'fixed', th: 'ไม่' });
  const tiles = shuffle([...s.parts.map((x, k) => ({ ...x, id: `a${k}` })), ...extras.slice(0, 2).map((x, k) => ({ ...x, id: `x${k}` }))]);
  return { s, tiles };
}

function Build({ p, level, lex, can, onRound }) {
  const [round, setRound] = useState(() => ({ n: 0, right: 0, item: makeBuild(p, level, can) }));
  const [placed, setPlaced] = useState([]);
  const [result, setResult] = useState(null);
  const { play } = useAudio();
  const item = round.item;
  if (!item) return <p className="pt-note">Not enough words yet for this level.</p>;
  if (round.n >= ROUND) return <RoundDone right={round.right} counted={round.counted} onAgain={() => { setRound({ n: 0, right: 0, item: makeBuild(p, level, can) }); setPlaced([]); setResult(null); }} />;
  const answer = item.s.parts.map((x) => x.th);
  const check = () => {
    const ok = placed.map((t) => t.th).join('|') === answer.join('|');
    setResult(ok ? 'right' : 'wrong'); play(sentenceThai(item.s));
  };
  const next = () => {
    const right = round.right + (result === 'right' ? 1 : 0);
    const n = round.n + 1;
    const counted = n >= ROUND ? onRound(right) : null;
    setRound({ n, right, counted, item: n >= ROUND ? item : makeBuild(p, level, can) }); setPlaced([]); setResult(null);
  };
  return (
    <section className="pt-panel">
      <p className="pt-count">{round.n + 1} / {ROUND}</p>
      <p className="pt-prompt">{item.s.en}</p>
      <div className={`pt-answer${result ? ` is-${result}` : ''}`} aria-label="Your sentence">
        {placed.length === 0 && <span className="pt-placeholder">Tap the words below in order</span>}
        {placed.map((t) => (
          <button key={t.id} type="button" className="pt-tile" style={result ? { '--sc': SLOT_COLOURS[t.slot] } : undefined} disabled={!!result}
            onClick={() => setPlaced(placed.filter((x) => x.id !== t.id))}>
            <span className="th" lang="th">{t.th}</span><span className="rom">{lex[t.th]?.rom || t.rom}</span>
          </button>
        ))}
      </div>
      <div className="pt-bank">
        {item.tiles.map((t) => {
          const used = placed.some((x) => x.id === t.id);
          return (
            <button key={t.id} type="button" className={`pt-tile${used ? ' is-used' : ''}`} disabled={used || !!result}
              onClick={() => { setPlaced([...placed, t]); play(t.th); }}>
              <span className="th" lang="th">{t.th}</span><span className="rom">{lex[t.th]?.rom || t.rom}</span>
            </button>
          );
        })}
      </div>
      {result ? (
        <div className={`ck-result is-${result}`}>
          <p aria-live="polite">{result === 'right' ? 'Right.' : <><b>Not quite.</b> The sentence is: <Parts parts={item.s.parts} lex={lex} /></>}</p>
          <button type="button" className="auth-btn primary" onClick={next} autoFocus>Continue</button>
        </div>
      ) : (
        <button type="button" className="auth-btn primary pt-check" onClick={check} disabled={placed.length === 0}>Check</button>
      )}
    </section>
  );
}

// ---- Listen --------------------------------------------------------------
// Options differ from the right answer in one piece, so you have to catch that piece
// Options: a base sentence plus three versions that each change one piece of it.
// The sentence you hear is any one of the four, picked at random, so you can't
// find it by spotting the "typical" or the "odd one out": you have to hear it.
function makeListen(p, level, can) {
  const base = randomValues(p, level, can); if (!base) return null;
  const bySlot = level.slots.map((slot) => {
    if (isFlag(slot)) return [{ ...base, [slot]: !base[slot] }];
    return shuffle(slotOptions(p, slot, can)).filter((o) => o.th !== base[slot]?.th && isValid(p, { ...base, [slot]: o }))
      .map((o) => ({ ...base, [slot]: o }));
  });
  const seen = new Set(); const sets = [];
  const add = (vv) => { const x = level.make(vv); if (!seen.has(x.en) && sets.length < 4) { seen.add(x.en); sets.push(x); } };
  add(base);
  for (let i = 0; sets.length < 4 && bySlot.some((l) => i < l.length); i++) for (const list of shuffle(bySlot)) if (list[i]) add(list[i]);
  const s = sets[Math.floor(Math.random() * sets.length)];
  return { s, options: shuffle(sets.map((x) => x.en)) };
}

function Listen({ p, level, lex, can, onRound }) {
  const [round, setRound] = useState(() => ({ n: 0, right: 0, item: makeListen(p, level, can) }));
  const [picked, setPicked] = useState(null);
  const { play, playing } = useAudio();
  const item = round.item;
  useEffect(() => { if (item && round.n < ROUND) play(sentenceThai(item.s)); }, [round.n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item) return <p className="pt-note">Not enough words yet for this level.</p>;
  if (round.n >= ROUND) return <RoundDone right={round.right} counted={round.counted} onAgain={() => { setRound({ n: 0, right: 0, item: makeListen(p, level, can) }); setPicked(null); }} />;
  const right = picked === item.s.en;
  const next = () => {
    const r = round.right + (right ? 1 : 0); const n = round.n + 1;
    const counted = n >= ROUND ? onRound(r) : null;
    setRound({ n, right: r, counted, item: n >= ROUND ? item : makeListen(p, level, can) }); setPicked(null);
  };
  return (
    <section className="pt-panel">
      <p className="pt-count">{round.n + 1} / {ROUND}</p>
      <p className="pt-prompt">What does it mean?</p>
      <div className="pt-actions">
        <button type="button" className={`ck-play${playing ? ' on' : ''}`} style={{ '--cat': 'var(--soi)' }} onClick={() => play(sentenceThai(item.s))} aria-label="Play again"><PlayIcon /></button>
        <button type="button" className="ck-slow" onClick={() => play(sentenceThai(item.s), 0.65)} aria-label="Play slowly"><SlowIcon /></button>
      </div>
      <p className="ck-tap">Tap to hear it again · turtle = slow</p>
      {picked != null && <div className="pt-reveal"><Parts parts={item.s.parts} lex={lex} big /></div>}
      <div className="ck-options">
        {item.options.map((o, k) => {
          const state = picked == null ? '' : o === item.s.en ? ' is-right' : o === picked ? ' is-wrong' : ' is-dim';
          return (
            <button key={o} type="button" className={`ck-opt${state}`} disabled={picked != null} onClick={() => setPicked(o)}>
              <span className="ck-key" aria-hidden="true">{picked != null && o === item.s.en ? '✓' : picked != null && o === picked ? '✕' : k + 1}</span>{o}
            </button>
          );
        })}
      </div>
      {picked != null && (
        <div className={`ck-result is-${right ? 'right' : 'wrong'}`}>
          <p aria-live="polite">{right ? 'Right.' : <>It was: <b>{item.s.en}</b></>}</p>
          <button type="button" className="auth-btn primary" onClick={next} autoFocus>Continue</button>
        </div>
      )}
    </section>
  );
}

function RoundDone({ right, counted, onAgain }) {
  const good = right >= ROUND - 1;
  const note = !counted
    ? 'Practice round. Only your first round each day counts toward memory.'
    : good ? 'Counted. It comes back on a later day to check it stuck.' : 'Counted. It comes back sooner, while it\'s new.';
  return (
    <section className="pt-panel pt-done">
      <p className="pt-score"><b>{right} / {ROUND}</b> right</p>
      <p className="pt-note">{note}</p>
      <button type="button" className="auth-btn primary" onClick={onAgain}>Another round</button>
    </section>
  );
}

// ---- Patterns in Today ----------------------------------------------------
// One pattern block a day, after the words: a level whose Listen check is due,
// or else the next level that has just opened (at most one new level a day).
// New level: 3 Spins (hear it, see it) then 3 Listen items. Due level: 3 Listen items.
// Recorded on the Listen record: 3/3 right = good, 2/3 = no change (due tomorrow), else again.
const TODAY_LISTEN = 3;
const TODAY_SPINS = 3;

export function pickTodayPattern(progress) {
  const can = (th) => !!progress[th];
  const pats = inRegister(PATTERNS, getRegister(), particleFor);
  let fresh = null;
  for (const p of pats) {
    for (const level of p.levels) {
      if (lockInfo(p, level, can, progress, false)) break; // later levels are locked too
      const e = progress[keyFor(p, level, 'listen')];
      if (e && doneToday(e)) continue;
      if (e && e.due <= endOfToday()) return { p, level, isNew: false };
      if (!e && !fresh) fresh = { p, level, isNew: true };
      if (!e) break;
    }
  }
  return fresh;
}

export function TodayPattern({ pick, lex, onDone, onQuit }) {
  const { progress, check } = useProgressStore();
  const can = (th) => !!progress[th];
  const { p, level, isNew } = pick;
  const total = (isNew ? TODAY_SPINS : 0) + TODAY_LISTEN;
  const [step, setStep] = useState(0);
  const [spin, setSpin] = useState(() => randomValues(p, level, can));
  const [showEn, setShowEn] = useState(false);
  const [item, setItem] = useState(null);
  const [picked, setPicked] = useState(null);
  const right = useRef(0);
  const { play, playing } = useAudio();
  const spinning = isNew && step < TODAY_SPINS;
  const s = spinning && spin ? level.make(spin) : null;

  useEffect(() => {
    if (spinning) { if (s) play(sentenceThai(s)); setShowEn(false); }
    else { const it = makeListen(p, level, can); setItem(it); setPicked(null); if (it) play(sentenceThai(it.s)); }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    const n = step + 1;
    if (n >= total) {
      const r = right.current;
      check(keyFor(p, level, 'listen'), r >= TODAY_LISTEN ? 'good' : r === TODAY_LISTEN - 1 ? 'hard' : 'again');
      onDone?.({ right: r, total: TODAY_LISTEN, pattern: p.title });
      return;
    }
    if (isNew && n < TODAY_SPINS) setSpin(randomValues(p, level, can));
    setStep(n);
  };
  const choose = (o) => { if (picked != null) return; setPicked(o); if (o === item.s.en) right.current += 1; };

  return (
    <div className="ck">
      <div className="ck-top">
        <div className="ck-progress" aria-hidden="true"><span style={{ width: `${(step / total) * 100}%` }} /></div>
        <span className="ck-count">{step + 1} / {total}</span>
        <button type="button" className="today-quit" onClick={onQuit}>End session</button>
      </div>
      <section className="ck-card">
        <div className="ck-band" style={{ background: 'var(--soi)' }}>
          <span>{isNew ? (spinning ? 'New pattern' : 'Listen') : 'Pattern check'}</span>
          <span>Level {level.n}</span>
        </div>
        <div className="ck-body">
          <p className="ck-q">{spinning ? p.title : 'What does it mean?'}</p>
          {spinning && <p className="pt-frame">{p.frame}</p>}
          {spinning && s && (
            <>
              <div className="pt-reels">
                {s.parts.map((x, k) => (
                  <span key={k} className="pt-reel is-static" style={{ '--sc': SLOT_COLOURS[x.slot] }}>
                    <span className="th" lang="th">{x.th}</span>
                    <span className="rom">{lex[x.th]?.rom || x.rom || ''}</span>
                  </span>
                ))}
              </div>
              <div className="pt-actions">
                <button type="button" className={`pt-play${playing ? ' on' : ''}`} onClick={() => play(sentenceThai(s))} aria-label="Play the sentence"><PlayIcon /></button>
                <button type="button" className="pt-play" onClick={() => play(sentenceThai(s), 0.65)} aria-label="Play slowly"><SlowIcon /></button>
              </div>
              <button type="button" className={`pt-en${showEn ? ' is-on' : ''}`} onClick={() => setShowEn(true)} aria-label={showEn ? s.en : 'Show the English'}>
                <span aria-hidden={!showEn}>{s.en}</span>
              </button>
              <p className="pt-note">Say it out loud, then tap to check the English.</p>
              <button type="button" className="auth-btn primary pt-check" onClick={next}>{step + 1 < TODAY_SPINS ? 'Next sentence' : 'Now listen'}</button>
            </>
          )}
          {!spinning && item && (
            <>
              <div className="ck-audio">
                <button type="button" className={`ck-play${playing ? ' on' : ''}`} style={{ '--cat': 'var(--soi)' }} onClick={() => play(sentenceThai(item.s))} aria-label="Play again"><PlayIcon /></button>
                <button type="button" className="ck-slow" onClick={() => play(sentenceThai(item.s), 0.65)} aria-label="Play slowly"><SlowIcon /></button>
              </div>
              {picked != null && <div className="pt-reveal"><Parts parts={item.s.parts} lex={lex} big /></div>}
              <div className="ck-options">
                {item.options.map((o, k) => {
                  const state = picked == null ? '' : o === item.s.en ? ' is-right' : o === picked ? ' is-wrong' : ' is-dim';
                  return (
                    <button key={o} type="button" className={`ck-opt${state}`} disabled={picked != null} onClick={() => choose(o)}>
                      <span className="ck-key" aria-hidden="true">{picked != null && o === item.s.en ? '✓' : picked != null && o === picked ? '✕' : k + 1}</span>{o}
                    </button>
                  );
                })}
              </div>
              {picked != null && (
                <div className={`ck-result is-${picked === item.s.en ? 'right' : 'wrong'}`}>
                  <p aria-live="polite">{picked === item.s.en ? 'Right.' : <>It was: <b>{item.s.en}</b></>}</p>
                  <button type="button" className="auth-btn primary" onClick={next} autoFocus>Continue</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
