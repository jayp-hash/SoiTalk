'use client';
import BlurEn from '../components/BlurEn';
import Practice from './Practice';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audioVersion, SLOW_RATE } from '../lib/audioVersion';
import { readStore, writeStore } from '../lib/progress';
import { laddersInRegister, sentenceThai, swapValue } from '../lib/patterns';
import { getRegister, particleFor } from '../lib/register';

// Sentence patterns (Jay, 20 Oct 2026): pick a pattern (sidebar on wide
// screens, a menu on phones), pick a level (1 is the bare pattern, each level
// adds a piece), and pull one big button for a new sentence. The changeable
// words fade out, the new sentence fades in, and it plays.

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
// A circular arrow: "go again" (designer, 20 Oct 2026)
const AgainIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>;

const isChangeable = (slot) => slot !== 'fixed' && slot !== 'ending';

function useAudio() {
  const ref = useRef(null); const token = useRef(0);
  const [playing, setPlaying] = useState(false); // false | 'normal' | 'slow'
  const stop = () => { ++token.current; ref.current?.pause(); setPlaying(false); };
  const play = (text, slow = false, toggle = false) => {
    if (toggle && playing === (slow ? 'slow' : 'normal')) { stop(); return; }
    const my = ++token.current;
    try {
      ref.current?.pause();
      const voice = readStore('tsc-help', {}).voice || 'female';
      const a = new Audio(`/api/speak?text=${encodeURIComponent(text)}&voice=${voice}${slow ? '&slow=1' : ''}&v=${audioVersion(text, slow)}`);
      a.preservesPitch = true; a.webkitPreservesPitch = true;
      if (slow) { a.defaultPlaybackRate = SLOW_RATE; a.playbackRate = SLOW_RATE; }
      ref.current = a; setPlaying(slow ? 'slow' : 'normal');
      a.onended = a.onerror = () => { if (token.current === my) setPlaying(false); };
      a.play().catch(() => { if (token.current === my) setPlaying(false); });
    } catch { setPlaying(false); }
  };
  useEffect(() => () => ref.current?.pause(), []);
  return { play, stop, playing };
}

export default function SimplePatterns({ lex }) {
  const PATS = useMemo(() => laddersInRegister(getRegister(), particleFor), []);
  const [pid, setPid] = useState(PATS[0].id);
  const [lvl, setLvl] = useState(1); // every pattern starts at level 1
  const p = PATS.find((x) => x.id === pid);
  const level = p.levels.find((l) => l.n === lvl) || p.levels[0];
  const audio = useAudio();
  const [help, setHelp] = useState(false);
  const [mode, setMode] = useState('learn'); // learn | practice (Jay, 21 Oct)
  const modeSwitch = (cls) => (
    <div className={`pm-mode ${cls}`} role="group" aria-label="Mode">
      {[['learn', 'Learn'], ['practice', 'Practice']].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'on' : ''}
          onClick={() => { audio.stop(); setHelp(false); setMode(id); }}>{label}</button>
      ))}
    </div>
  );
  // First visit only: a hint on the button. Gone after the first new sentence, or when closed.
  const [hint, setHint] = useState(false);
  useEffect(() => { setHint(!readStore('tsc-hint-patterns', false)); }, []);
  // One-time tip the first time เขา appears (Jay, 21 Oct: เขา = he or she)
  const [khaoSeen, setKhaoSeen] = useState(true);
  useEffect(() => { setKhaoSeen(!!readStore('tsc-hint-khao', false)); }, []);
  const closeKhao = () => { setKhaoSeen(true); writeStore('tsc-hint-khao', true); };
  const hintSeen = () => { setHint(false); writeStore('tsc-hint-patterns', true); };

  const [v, setV] = useState(null);      // the values behind the sentence (so one word can be swapped)
  // The sentence on screen. Values from the previous pattern can't build this one's sentence, so wait for new ones.
  const s = useMemo(() => { if (!v) return null; try { return level.make(v); } catch { return null; } }, [v, level]);
  const [spin, setSpin] = useState(false); // true while the changing words fade out
  const [fresh, setFresh] = useState(0);   // bumps when a new sentence lands, to fade it in
  const timer = useRef(0);
  useEffect(() => { setV(level.random()); setSpin(false); setSwapped(-1); }, [pid, lvl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);

  const choosePattern = (id) => { audio.stop(); setHelp(false); setSwapped(-1); setPid(id); setLvl(1); };
  const pull = () => {
    if (spin) return;
    if (hint) hintSeen();
    audio.stop();
    let next = null; let nv = null;
    for (let i = 0; i < 20 && (!next || (s && sentenceThai(next) === sentenceThai(s))); i++) { nv = level.random(); next = level.make(nv); }
    // Calm swap (Jay, 20 Oct): the changing words fade out, the new sentence
    // fades in. Nothing jumps around while it changes.
    setSpin(true); setSwapped(-1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSpin(false); setV(nv); setFresh((n) => n + 1);
      audio.play(sentenceThai(next));
    }, 220);
  };

  // Tap a coloured word: swap just that word, and hear the new sentence (panel, 27 Oct)
  const [swapped, setSwapped] = useState(-1);
  const swap = (key, i) => {
    if (spin) return;
    const nv = swapValue(p.id, v, key); if (!nv) return;
    if (hint) hintSeen();
    audio.stop(); setV(nv); setSwapped(i);
    audio.play(sentenceThai(level.make(nv)));
  };
  const shown = s;
  return (
    <div className="pm-layout">
      <nav className="pm-side" aria-label="Sentence patterns">
        <p className="pm-side-h">Mode</p>
        {modeSwitch('is-side')}
        <p className="pm-side-h pm-side-h2">Sentence patterns</p>
        {PATS.map((x) => (
          <button key={x.id} type="button" className={`pm-side-i${x.id === pid ? ' on' : ''}`} aria-current={x.id === pid} onClick={() => choosePattern(x.id)}>
            {x.title}
          </button>
        ))}
        <p className="pm-side-h pm-side-h2">Level</p>
        <div className="pm-side-level">
          <label className="pm-pick">
            <span className="sr-only">Level</span>
            <select value={lvl} onChange={(e) => { audio.stop(); setHelp(false); setLvl(Number(e.target.value)); }}>
              {p.levels.map((l) => <option key={l.n} value={l.n}>{l.name}</option>)}
            </select>
          </label>
          <span className="pm-help">
            <button type="button" className="pm-help-btn" aria-label="What this level adds" aria-expanded={help} onClick={() => setHelp((h) => !h)}>?</button>
            <span className={`pm-help-tip${help ? ' on' : ''}`} role="tooltip">{level.rule}</span>
          </span>
        </div>
      </nav>

      <div className="pm-wrap">
        <header className="pm-head">
          <h1>Sentence patterns</h1>
        </header>

        {modeSwitch('is-top')}
        <div className="pm-pickers">
          <label className="pm-pick pm-pick-pattern">
            <span className="sr-only">Sentence pattern</span>
            <select value={pid} onChange={(e) => choosePattern(e.target.value)}>
              {PATS.map((x) => <option key={x.id} value={x.id}>{x.short || x.title}</option>)}
            </select>
          </label>
          <label className="pm-pick pm-pick-level">
            <span className="sr-only">Level</span>
            <select value={lvl} onChange={(e) => { audio.stop(); setHelp(false); setLvl(Number(e.target.value)); }}>
              {p.levels.map((l) => <option key={l.n} value={l.n}>{l.name}</option>)}
            </select>
          </label>
          <span className="pm-help">
            <button type="button" className="pm-help-btn" aria-label="What this level adds" aria-expanded={help} onClick={() => setHelp((h) => !h)}>?</button>
            <span className={`pm-help-tip${help ? ' on' : ''}`} role="tooltip">{level.rule}</span>
          </span>
        </div>

        {mode === 'practice' ? (
          <Practice key={`${pid}-${lvl}`} p={p} level={level} lex={lex} onLearn={() => setMode('learn')} />
        ) : (<>
        {/* Same card layout as the word cards: band on top, play + slow top left,
            the pattern's key word top right, word boxes, then the English */}
        <section className="pm-card" data-level={lvl}>
          <div className="pm-band"><span>{p.short || p.title}</span></div>
          <div className="pm-body">
            <div className="pm-top">
              <div className="pm-sound">
                <button type="button" className={`pm-play${audio.playing === 'normal' ? ' on' : ''}`} disabled={!s}
                  onClick={() => audio.play(sentenceThai(s), false, true)} aria-label={audio.playing === 'normal' ? 'Stop' : 'Play'}>
                  {audio.playing === 'normal' ? <StopIcon /> : <PlayIcon />}
                </button>
                <button type="button" className={`pm-slow${audio.playing === 'slow' ? ' on' : ''}`} disabled={!s}
                  onClick={() => audio.play(sentenceThai(s), true, true)} aria-label={audio.playing === 'slow' ? 'Stop' : 'Play slowly'}>
                  <SlowIcon />
                </button>
                {/* One Shuffle button beside play and slow (principle 15): a whole new sentence */}
                <button type="button" className={`pm-slow pm-shuffle${spin ? ' is-pulling' : ''}`} onClick={pull} disabled={!s} aria-label="New sentence" title="New sentence">
                  <AgainIcon />
                </button>
              </div>
              <div className="pm-key">
                <span className="kl"><span className="th" lang="th">{p.key.th}</span><i>{p.key.rom}</i></span>
                <b>{p.key.en}</b>
              </div>
            </div>
            <div key={fresh} className={`pm-sentence${spin ? ' is-out' : ''}${fresh ? ' is-in' : ''}`} aria-live="polite">
              {shown && shown.parts.map((x, i) => (x.key && swapValue(p.id, v, x.key) ? (
                <button key={`${i}-${x.th}`} type="button" className={`pm-tile is-slot is-swap${swapped === i ? ' is-new' : ''}`} onClick={() => swap(x.key, i)} aria-label={`Swap ${x.rom || lex[x.th]?.rom || x.th}`}>
                  <span className="th" lang="th">{x.th}</span>
                  <span className="rom">{x.rom || lex[x.th]?.rom || '\u00a0'}</span>
                </button>
              ) : (
                <span key={i} className={`pm-tile${isChangeable(x.slot) ? ' is-slot' : ''}`}>
                  <span className="th" lang="th">{x.th}</span>
                  <span className="rom">{x.rom || lex[x.th]?.rom || '\u00a0'}</span>
                </span>
              )))}
            </div>
            <BlurEn className={`pm-en${spin ? ' is-out' : ''}`} text={s ? s.en : '\u00a0'} />
            {level.adds && <p className="pm-adds">Level {level.n}: {level.adds}</p>}
          </div>
          {!khaoSeen && !spin && s?.parts.some((x) => x.th === 'เขา') && (
            <div className="pm-tip" role="note">
              <span><b lang="th">เขา</b> (khǎo) means he <i>or</i> she. Thais rarely say เธอ (thoe) for "she" in conversation.</span>
              <button type="button" aria-label="Got it, hide this tip" onClick={closeKhao}>×</button>
            </div>
          )}
        </section>

        {hint && (
          <div className="pm-hint pm-hint-card" role="note">
            <span><b>Tap a coloured word</b> to swap it, or the circular arrows for a whole new sentence. Play it, then say it out loud.</span>
            <button type="button" aria-label="Got it, hide this tip" onClick={hintSeen}>×</button>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
