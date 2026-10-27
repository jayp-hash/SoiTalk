'use client';
import { useEffect, useRef, useState } from 'react';
import { audioVersion, SLOW_RATE } from '../lib/audioVersion';
import { readStore, writeStore, dayKey } from '../lib/progress';
import { track } from '../lib/analytics';
import { classifierOf } from '../lib/classifiers';

// Shared pieces for the Classifiers tab (rebuilt 27 Oct 2026).

export const img = (n) => `/classifiers/${n.img}.webp`;
export const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const pick = (a, k) => shuffle(a).slice(0, k);
export const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const bare = (en) => en.replace(/\s*\(.*\)$/, '');

// English for a counted phrase: "two glasses of coffee", "three men"
const NUM_EN = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
const PLURAL = { man: 'men', woman: 'women', child: 'children', fish: 'fish', trousers: 'pairs of trousers', box: 'boxes', taxi: 'taxis', 'cut fruit': 'bags of cut fruit', 'fried banana': 'bags of fried banana', ice: 'bags of ice', 'rice porridge': 'bowls of rice porridge', 'tom yum': 'bowls of tom yum', 'noodle soup': 'bowls of noodle soup', 'grilled pork skewer': 'grilled pork skewers', 'sausage on a stick': 'sausages on a stick', satay: 'satay skewers', 'remote control': 'remote controls', watch: 'watches', dish: 'dishes' };
export function phraseEn(noun, n) {
  const k = NUM_EN[n];
  switch (noun.cls) {
    case 'ขวด': return `${k} bottles of ${bare(noun.en)}`;
    case 'แก้ว': return noun.many ? `${k} ${noun.many}` : `${k} cups of ${bare(noun.en)}`;
    case 'จาน': return `${k} plates of ${bare(noun.en)}`;
    case 'ชิ้น': return `${k} pieces of ${bare(noun.en)}`;
    default: return `${k} ${PLURAL[bare(noun.en)] || `${bare(noun.en)}s`}`;
  }
}
// "Cat, แมว (maaeo), takes ตัว (dtuaa). ตัว (dtuaa) is for animals..."
export const takes = (n) => `${cap(bare(n.en))}, ${n.th} (${n.rom}), takes ${n.cls} (${classifierOf(n.cls).rom}). ${classifierOf(n.cls).hint}`;

// ---- Icons ----
export const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
export const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
export const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
export const ShuffleIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" /></svg>;
export const NextIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
export const UpIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>;
export const DownIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
export const SoundIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>;

// ---- Audio: one clip, or several in a row. voice: 'mine' (the learner's) or 'female' (the vendor) ----
export function useAudio() {
  const ref = useRef(null); const token = useRef(0);
  const [playing, setPlaying] = useState(null);
  const stop = () => { ++token.current; ref.current?.pause(); setPlaying(null); };
  const play = (texts, { slow = false, key = 'any', toggle = false, voice = 'mine', onEnd } = {}) => {
    if (toggle && playing === key) { stop(); return; }
    const list = [].concat(texts).filter(Boolean); const my = ++token.current;
    const next = (i) => {
      if (token.current !== my) return;
      if (i >= list.length) { setPlaying(null); onEnd?.(); return; }
      try {
        ref.current?.pause();
        const v = voice === 'mine' ? (readStore('tsc-help', {}).voice || 'female') : voice;
        const t = list[i];
        const a = new Audio(`/api/speak?text=${encodeURIComponent(t)}&voice=${v}${slow ? '&slow=1' : ''}&v=${audioVersion(t, slow)}`);
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
export function usePeek() {
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
export const Peek = ({ on, text }) => (on ? <span className="cl-peek" role="tooltip">{text}</span> : null);

export function SoundButtons({ audio, text, k, voice = 'mine', column = false }) {
  return (
    <div className={`pm-sound${column ? ' is-col' : ''}`}>
      <button type="button" className={`pm-play${audio.playing === k ? ' on' : ''}`} onClick={() => audio.play(text, { key: k, toggle: true, voice })} aria-label={audio.playing === k ? 'Stop' : 'Play'}>
        {audio.playing === k ? <StopIcon /> : <PlayIcon />}
      </button>
      <button type="button" className={`pm-slow${audio.playing === `${k}-slow` ? ' on' : ''}`} onClick={() => audio.play(text, { key: `${k}-slow`, slow: true, toggle: true, voice })} aria-label="Play slowly">
        <SlowIcon />
      </button>
    </div>
  );
}

// Progress for each activity and level, kept in this browser
const STORE = 'tsc-classifiers';
export function saveRound(activity, level, clean, extra = {}) {
  const all = readStore(STORE, {}); const key = `${activity}:${level}`; const e = all[key] || { rounds: 0, clean: 0, days: [] };
  const day = dayKey();
  all[key] = { rounds: e.rounds + 1, clean: e.clean + (clean ? 1 : 0), days: e.days.includes(day) ? e.days : [...e.days, day].slice(-30) };
  writeStore(STORE, all);
  track('classifiers_round', { activity, level, clean, ...extra });
}
