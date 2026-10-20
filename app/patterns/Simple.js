'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audioVersion } from '../lib/audioVersion';
import { readStore } from '../lib/progress';
import { laddersInRegister, sentenceThai } from '../lib/patterns';
import { getRegister, particleFor } from '../lib/register';

// Sentence patterns (Jay, 20 Oct 2026): pick a pattern (sidebar on wide
// screens, a menu on phones), pick a level (1 is the bare pattern, each level
// adds a piece), and pull one big button for a new sentence. The changeable
// words spin, land, and the sentence plays.

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

  const [s, setS] = useState(null);      // the sentence on screen (picked in the browser)
  const [spin, setSpin] = useState(null); // a passing sentence while the reel spins
  const timer = useRef(0);
  useEffect(() => { setS(level.make(level.random())); setSpin(null); }, [pid, lvl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(timer.current), []);

  const choosePattern = (id) => { audio.stop(); setHelp(false); setPid(id); setLvl(1); };
  const pull = () => {
    if (spin) return;
    audio.stop();
    let next = null;
    for (let i = 0; i < 20 && (!next || (s && sentenceThai(next) === sentenceThai(s))); i++) next = level.make(level.random());
    const t0 = Date.now();
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (Date.now() - t0 > 650) {
        clearInterval(timer.current); setSpin(null); setS(next);
        audio.play(sentenceThai(next));
      } else setSpin(level.make(level.random()));
    }, 70);
  };

  const shown = spin || s;
  return (
    <div className="pm-layout">
      <nav className="pm-side" aria-label="Sentence patterns">
        <p className="pm-side-h">Sentence patterns</p>
        {PATS.map((x) => (
          <button key={x.id} type="button" className={`pm-side-i${x.id === pid ? ' on' : ''}`} aria-current={x.id === pid} onClick={() => choosePattern(x.id)}>
            {x.title}
          </button>
        ))}
      </nav>

      <div className="pm-wrap">
        <header className="pm-head">
          <h1>Sentence patterns</h1>
          <p>One sentence shape. Tap New sentence to practise it with different words.</p>
        </header>

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

        {/* Same card layout as the word cards: band on top, play + slow top left,
            the pattern's key word top right, word boxes, then the English */}
        <section className="pm-card">
          <div className="pm-band"><span>{p.short || p.title}</span></div>
          <div className="pm-body">
            <div className="pm-top">
              <div className="pm-sound">
                <button type="button" className={`pm-play${audio.playing === 'normal' ? ' on' : ''}`} disabled={!s || !!spin}
                  onClick={() => audio.play(sentenceThai(s), false, true)} aria-label={audio.playing === 'normal' ? 'Stop' : 'Play'}>
                  {audio.playing === 'normal' ? <StopIcon /> : <PlayIcon />}
                </button>
                <button type="button" className={`pm-slow${audio.playing === 'slow' ? ' on' : ''}`} disabled={!s || !!spin}
                  onClick={() => audio.play(sentenceThai(s), true, true)} aria-label={audio.playing === 'slow' ? 'Stop' : 'Play slowly'}>
                  <SlowIcon />
                </button>
              </div>
              <div className="pm-key">
                <span className="kl"><span className="th" lang="th">{p.key.th}</span><i>{p.key.rom}</i></span>
                <b>{p.key.en}</b>
              </div>
            </div>
            <div className={`pm-sentence${spin ? ' is-spinning' : ''}`} aria-live="polite">
              {shown && shown.parts.map((x, i) => (
                <span key={i} className={`pm-tile${isChangeable(x.slot) ? ' is-slot' : ''}${spin && isChangeable(x.slot) ? ' is-spin' : ''}`}>
                  <span className="th" lang="th">{x.th}</span>
                  <span className="rom">{x.rom || lex[x.th]?.rom || '\u00a0'}</span>
                </span>
              ))}
            </div>
            <p className="pm-en">{spin || !s ? '\u00a0' : s.en}</p>
          </div>
        </section>

        <button type="button" className={`pm-lever${spin ? ' is-pulling' : ''}`} onClick={pull} disabled={!s}>
          <AgainIcon /> New sentence
        </button>
      </div>
    </div>
  );
}
