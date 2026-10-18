'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audioVersion } from '../lib/audioVersion';
import { soundRight, soundWrong } from '../lib/sfx';
import { readStore, writeStore } from '../lib/progress';
import { PATTERNS, slotOptions, randomValues, isValid, sentenceThai, isFlag, inRegister } from '../lib/patterns';
import { getRegister, particleFor } from '../lib/register';

// Patterns, simplified (Jay, Oct 2026): one pattern step at a time, three short
// screens like the scenes: hear one sentence, swap one word, then make your own.
// Everything is open; no locks, reels or level jargon.

const DONE_KEY = 'tsc-pattern-done'; // { 'like:1': true }

// One plain line per step: what the piece does
const RULES = {
  'like:1': { th: 'ชอบ', rom: 'châawp', line: 'ชอบ (châawp) + an activity = like doing it' },
  'like:2': { th: 'ไม่ชอบ', rom: 'mâi châawp', line: 'ไม่ (mâi) before ชอบ = don\'t like' },
  'like:3': { th: 'ที่', rom: 'thîi', line: 'ที่ (thîi) + a place = where you do it' },
  'like:4': { th: 'วันเสาร์', rom: 'wan-sǎo', line: 'Put the day at the end = when' },
  'order:1': { th: 'ขอ', rom: 'khǎaw', line: 'ขอ (khǎaw) + thing + number + counting word = ordering' },
  'order:2': { th: 'กี่', rom: 'gìi', line: 'กี่ (gìi) + counting word = how many?' },
  'order:3': { th: 'ด้วย', rom: 'dûai', line: 'ด้วย (dûai) at the end = and ... too' },
};
const STEP_NAMES = {
  'like:1': 'Who likes what', 'like:2': 'Saying you don\'t like it', 'like:3': 'Adding where', 'like:4': 'Adding when',
  'order:1': 'Ordering', 'order:2': 'The question you\'ll hear', 'order:3': 'One more thing',
};

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
const SwapIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 21v-5h-5" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

function useAudio() {
  const ref = useRef(null); const token = useRef(0);
  const [playing, setPlaying] = useState(false); // false | 'normal' | 'slow'
  const play = (text, slow = false, toggle = false) => {
    if (toggle && playing === (slow ? 'slow' : 'normal')) { ++token.current; ref.current?.pause(); setPlaying(false); return; }
    const my = ++token.current;
    try {
      ref.current?.pause();
      const voice = readStore('tsc-help', {}).voice || 'female';
      const a = new Audio(`/api/speak?text=${encodeURIComponent(text)}&voice=${voice}${slow ? '&slow=1' : ''}&v=${audioVersion(text, slow)}`);
      ref.current = a; setPlaying(slow ? 'slow' : 'normal');
      a.onended = a.onerror = () => { if (token.current === my) setPlaying(false); };
      a.play().catch(() => { if (token.current === my) setPlaying(false); });
    } catch { setPlaying(false); }
  };
  useEffect(() => () => ref.current?.pause(), []);
  return { play, playing };
}

// Sentence as word tiles with romanization under each
function Tiles({ parts, lex, swappable = [], onSwap, pulse }) {
  return (
    <div className="ps-tiles">
      {parts.map((x, k) => {
        // A slot can be two words (เดิน|เล่น): only its first word carries the swap button
        const swap = onSwap && swappable.includes(x.slot) && (k === 0 || parts[k - 1].slot !== x.slot);
        const inner = (
          <>
            <span className="th" lang="th">{x.th}</span>
            <span className="rom">{x.rom || lex[x.th]?.rom || ''}</span>
            {swap && <span className="sw" aria-hidden="true"><SwapIcon /></span>}
          </>
        );
        return swap
          ? <button key={k} type="button" className={`ps-tile is-swap${pulse === x.slot ? ' is-new' : ''}`} onClick={() => onSwap(x.slot)} aria-label={`Swap ${x.th}`}>{inner}</button>
          : <span key={k} className={`ps-tile${x.slot === 'ending' ? ' is-end' : ''}`}>{inner}</span>;
      })}
    </div>
  );
}

function Sound({ text, audio }) {
  return (
    <div className="ps-sound">
      <button type="button" className={`ps-play${audio.playing === 'normal' ? ' on' : ''}`} onClick={() => audio.play(text, false, true)} aria-label={audio.playing === 'normal' ? 'Stop' : 'Play'}>
        {audio.playing === 'normal' ? <StopIcon /> : <PlayIcon />}
      </button>
      <button type="button" className={`ps-slow${audio.playing === 'slow' ? ' on' : ''}`} onClick={() => audio.play(text, true, true)} aria-label={audio.playing === 'slow' ? 'Stop' : 'Play slowly'}><SlowIcon /></button>
    </div>
  );
}

function Practice({ p, level, lex, onDone, onBack }) {
  const key = `${p.id}:${level.n}`;
  const rule = RULES[key];
  const audio = useAudio();
  const [step, setStep] = useState(0); // 0 hear, 1 swap, 2 your turn, 3 done
  // The ไม่ step starts with a ไม่ sentence, so you hear the new piece first
  const fresh = () => { const r = randomValues(p, level); return r && level.slots.includes('neg') ? { ...r, neg: true } : r; };
  const [v, setV] = useState(fresh);
  const [pulse, setPulse] = useState(null);
  const [swaps, setSwaps] = useState(0);
  const s = useMemo(() => level.make(v), [level, v]);
  const swappable = level.slots.filter((x) => !isFlag(x));

  // Your turn: a fresh sentence to build from shuffled tiles
  const [goal, setGoal] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [result, setResult] = useState(null); // null | 'right' | 'wrong'
  const startBuild = () => {
    let g = null;
    for (let i = 0; i < 20 && (!g || sentenceThai(g) === sentenceThai(s)); i++) g = level.make(randomValues(p, level));
    const tiles = shuffle(g.parts.map((x, k) => ({ ...x, id: k })));
    setGoal({ s: g, tiles }); setPlaced([]); setResult(null); setStep(2);
  };

  useEffect(() => { if (step <= 1 && s) audio.play(sentenceThai(s)); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const swap = (slot) => {
    for (let i = 0; i < 30; i++) {
      const opts = slot === 'neg' ? null : slotOptions(p, slot).filter((o) => o.th !== v[slot]?.th);
      const nv = { ...v, [slot]: opts[Math.floor(Math.random() * opts.length)] };
      if (isValid(p, nv)) {
        setV(nv); setPulse(slot); setSwaps((n) => n + 1);
        audio.play(sentenceThai(level.make(nv)));
        setTimeout(() => setPulse(null), 600);
        return;
      }
    }
  };
  const toggleNeg = () => { const nv = { ...v, neg: !v.neg }; setV(nv); setSwaps((n) => n + 1); audio.play(sentenceThai(level.make(nv))); };

  const tap = (t) => {
    if (result === 'right') return;
    const next = [...placed, t];
    setPlaced(next); setResult(null);
    if (next.length === goal.tiles.length) {
      const ok = next.map((x) => x.th).join('') === sentenceThai(goal.s);
      setResult(ok ? 'right' : 'wrong');
      if (ok) { soundRight(); audio.play(sentenceThai(goal.s)); } else soundWrong();
    }
  };
  const unplace = (t) => { if (result !== 'right') { setPlaced(placed.filter((x) => x.id !== t.id)); setResult(null); } };

  const finish = () => {
    const done = readStore(DONE_KEY, {}); done[key] = true; writeStore(DONE_KEY, done);
    setStep(3); onDone?.();
  };

  const STEPS = ['Hear it', 'Swap a word', 'Your turn'];
  return (
    <div className="ps-wrap">
      <div className="ps-top">
        <button type="button" className="ps-back" onClick={onBack}>← All patterns</button>
        {step < 3 && <ol className="ps-steps" aria-label="Steps">{STEPS.map((n, k) => <li key={n} className={k === step ? 'on' : k < step ? 'done' : ''}>{n}</li>)}</ol>}
      </div>

      <section className="ps-card">
        <p className="ps-eyebrow">{STEP_NAMES[key]}</p>

        {step === 0 && s && (
          <>
            <h2 className="ps-q">Listen to the sentence</h2>
            <Sound text={sentenceThai(s)} audio={audio} />
            <Tiles parts={s.parts} lex={lex} />
            <p className="ps-en">{s.en}</p>
            {rule && <p className="ps-rule">{rule.line}</p>}
            <button type="button" className="ps-go" onClick={() => setStep(1)}>Next: swap a word</button>
          </>
        )}

        {step === 1 && s && (
          <>
            <h2 className="ps-q">Tap a word with <span className="ps-sw-inline"><SwapIcon /></span> to change it</h2>
            <Sound text={sentenceThai(s)} audio={audio} />
            <Tiles parts={s.parts} lex={lex} swappable={swappable} onSwap={swap} pulse={pulse} />
            <p className="ps-en">{s.en}</p>
            {level.slots.includes('neg') && (
              <button type="button" className="ps-neg" onClick={toggleNeg}>{v.neg ? 'Make it "like"' : 'Make it "don\'t like"'}</button>
            )}
            <button type="button" className="ps-go" disabled={swaps < 1} onClick={startBuild}>{swaps < 1 ? 'Swap a word first' : 'Next: your turn'}</button>
          </>
        )}

        {step === 2 && goal && (
          <>
            <h2 className="ps-q">Say this in Thai</h2>
            <p className="ps-goal">{goal.s.en}</p>
            <div className={`ps-answer${result === 'wrong' ? ' is-wrong' : ''}${result === 'right' ? ' is-right' : ''}`} aria-live="polite">
              {placed.length === 0 && <span className="ps-hint">Tap the words below in order</span>}
              {placed.map((t) => (
                <button key={t.id} type="button" className="ps-tile is-placed" onClick={() => unplace(t)}>
                  <span className="th" lang="th">{t.th}</span><span className="rom">{t.rom || lex[t.th]?.rom || ''}</span>
                </button>
              ))}
            </div>
            <div className="ps-bank">
              {goal.tiles.filter((t) => !placed.some((x) => x.id === t.id)).map((t) => (
                <button key={t.id} type="button" className="ps-tile is-bank" onClick={() => tap(t)}>
                  <span className="th" lang="th">{t.th}</span><span className="rom">{t.rom || lex[t.th]?.rom || ''}</span>
                </button>
              ))}
            </div>
            {result === 'wrong' && <p className="ps-msg is-wrong">Not quite. Tap a word to take it back, or <button type="button" className="ps-link" onClick={() => { setPlaced([]); setResult(null); }}>start again</button>.</p>}
            {result === 'right' && <p className="ps-msg is-right">เก่งมาก (gèng mâak), well done!</p>}
            {result === 'right'
              ? <button type="button" className="ps-go" onClick={finish}>Finish</button>
              : <button type="button" className="ps-ghost" onClick={() => audio.play(sentenceThai(goal.s))}>Hear the answer</button>}
          </>
        )}

        {step === 3 && (
          <div className="ps-done">
            <span className="ps-done-mark" aria-hidden="true"><Check /></span>
            <h2 className="ps-q">You made a Thai sentence yourself</h2>
            {rule && <p className="ps-rule">{rule.line}</p>}
            <div className="ps-done-btns">
              <button type="button" className="ps-go" onClick={() => { setV(fresh()); setSwaps(0); setStep(0); }}>Practise again</button>
              <button type="button" className="ps-ghost" onClick={onBack}>All patterns</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function SimplePatterns({ lex }) {
  const PATS = useMemo(() => inRegister(PATTERNS, getRegister(), particleFor), []);
  const [open, setOpen] = useState(null); // { p, l }
  const [done, setDone] = useState({});
  useEffect(() => { setDone(readStore(DONE_KEY, {})); }, [open]);
  // Example sentences are random, so they're picked in the browser (no server/browser mismatch)
  const [examples, setExamples] = useState({});
  useEffect(() => { setExamples(Object.fromEntries(PATS.map((p) => [p.id, p.levels[0].make(randomValues(p, p.levels[0]))]))); }, [PATS]);

  if (open) {
    const p = PATS.find((x) => x.id === open.p);
    const level = p?.levels.find((l) => l.n === open.l);
    if (p && level) return <Practice key={`${p.id}-${level.n}`} p={p} level={level} lex={lex} onDone={() => {}} onBack={() => { setOpen(null); window.scrollTo(0, 0); }} />;
  }

  return (
    <div className="ps-wrap">
      <header className="ps-head">
        <h1>Patterns</h1>
        <p>One sentence shape, many things to say. For each step: hear a sentence, swap a word, then make your own. About a minute each.</p>
      </header>
      {PATS.map((p) => {
        const ex = examples[p.id];
        return (
          <section key={p.id} className="ps-pat">
            <h2>{p.title}</h2>
            {ex && <p className="ps-ex"><span lang="th">{sentenceThai(ex)}</span> <i>{ex.parts.map((x) => x.rom || lex[x.th]?.rom || '').join(' ')}</i> <b>{ex.en}</b></p>}
            <ol className="ps-levels">
              {p.levels.map((l) => {
                const k = `${p.id}:${l.n}`;
                return (
                  <li key={l.n}>
                    <button type="button" className={`ps-level${done[k] ? ' is-done' : ''}`} onClick={() => { setOpen({ p: p.id, l: l.n }); window.scrollTo(0, 0); }}>
                      <span className="n" aria-hidden="true">{done[k] ? <Check /> : l.n}</span>
                      <span className="txt"><b>{STEP_NAMES[k] || l.name}</b><small>{RULES[k]?.line}</small></span>
                      <span className="go" aria-hidden="true">›</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
