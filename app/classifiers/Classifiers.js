'use client';
import { useEffect, useMemo, useState } from 'react';
import { getRegister } from '../lib/register';
import { MATCH_LEVELS, SLOT_LEVELS } from '../lib/classifiers';
import { useAudio } from './shared';
import Learn from './Learn';
import Match from './Match';
import Slots from './Slots';

// Classifiers tab (rebuilt 27 Oct 2026, three review rounds; spec: project doc claude/classifiers-spec.md).
//   Learn    - intro, then the classifiers grouped and stacked; open one for its things and sentences.
//   Practice - Find the matches (L1 see it, L2 read it, L3 hear it) and How many? (the slot machine).
// Deep links: /classifiers?mode=practice&act=slots&level=2

const ACTS = [['match', 'Find the matches'], ['slots', 'How many?']];
const LEVELS_FOR = { match: MATCH_LEVELS, slots: SLOT_LEVELS };

export default function Classifiers() {
  const [mode, setMode] = useState('learn');
  const [act, setAct] = useState('match');
  const [lvl, setLvl] = useState(1);
  const [help, setHelp] = useState(false);
  const audio = useAudio();
  const reg = useMemo(() => getRegister(), []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('mode') === 'practice') setMode('practice');
    if (LEVELS_FOR[q.get('act')]) setAct(q.get('act'));
    const l = Number(q.get('level')); if (l >= 1 && l <= 3) setLvl(l);
  }, []);
  const setM = (m) => { audio.stop(); setHelp(false); setMode(m); };
  const setA = (a) => { audio.stop(); setHelp(false); setAct(a); setLvl(1); };
  const levels = LEVELS_FOR[act];
  const level = levels.find((l) => l.n === lvl) || levels[0];
  const modeSwitch = (cls) => (
    <div className={`pm-mode ${cls}`} role="group" aria-label="Mode">
      {[['learn', 'Learn'], ['practice', 'Practice']].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'on' : ''} onClick={() => setM(id)}>{label}</button>
      ))}
    </div>
  );
  const levelPick = (
    <>
      <label className="pm-pick">
        <span className="sr-only">Level</span>
        <select value={lvl} onChange={(e) => { audio.stop(); setHelp(false); setLvl(Number(e.target.value)); }}>
          {levels.map((l) => <option key={l.n} value={l.n}>{l.name}</option>)}
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
            <p className="pm-side-h pm-side-h2">Level</p>
            <div className="pm-side-level">{levelPick}</div>
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
            {levelPick}
          </div>
        )}
        {mode === 'learn' && <Learn audio={audio} reg={reg} />}
        {mode === 'practice' && act === 'match' && <Match key={`m${lvl}`} level={level} audio={audio} reg={reg} />}
        {mode === 'practice' && act === 'slots' && <Slots key={`s${lvl}`} level={level} audio={audio} reg={reg} />}
      </div>
    </div>
  );
}
