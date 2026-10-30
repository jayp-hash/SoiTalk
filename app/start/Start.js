'use client';
import { track } from '../lib/analytics';
import BlurEn from '../components/BlurEn';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer, preload } from '../lib/audio';
import Feedback from '../components/Feedback';
import { useProgressStore, readStore, writeStore, dayKey } from '../lib/progress';
import { getRegister, setRegister, registerChosen } from '../lib/register';
import { useUser } from '../lib/useUser';
import { soundRight, soundWrong, soundDone } from '../lib/sfx';
import { supabaseBrowser } from '../lib/supabase-browser';
import { SCENES, SCENE_DAYS, DEFAULT_SCENE, replyParts, followParts, missionParts, joinTh, joinRom, endingFor } from '../lib/scenes';

// ---------------------------------------------------------------------
// The first session (soitalk.app/start/<scene>): about 2 minutes from an
// ad to "I can say this in Thai", built for the 12 Oct 2026 review:
//   1. Hear the moment (cashier asks, you answer). Man/woman toggle here.
//   2. Break it down: 4 words, English under each.
//   3. Make your own: swap one word (the learner does it, not the app).
//   4. Listen x3 (silent, works on the BTS). Misses come back once.
//   5. Quick word check (this starts the spaced reviews; no "Got it").
//   6. Done: what you can now say, a real-life mission, tomorrow's teaser,
//      save progress.
// ---------------------------------------------------------------------

const STEPS = ['scene', 'parts', 'swap', 'listen', 'check', 'done'];
const FIRST_KEY = 'tsc-first-session';   // { scene, made, day }
export const SCENES_KEY = 'tsc-scenes';  // { <scene id>: day finished }
const HINTS_KEY = 'tsc-lesson-hints'; // { hear, swap, read-th, read-ph, read-er }: one-time hints already used
const READ_TIPS = [
  { key: 'read-th', test: /(^|[\s-])(th|kh)/, text: 'th, kh: t, k with a puff of air. Thonglor = Tong-lor.' },
  { key: 'read-ph', test: /(^|[\s-])ph/, text: 'ph: p with a puff of air, never f. Phrom Phong = Prom Pong.' },
  { key: 'read-er', test: /er/, text: 'er sounds like "her" without the r.' },
];
export const MISSION_KEY = 'tsc-mission'; // { scene, th, rom, en, text, day, done }
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// The player (download whole clips, preload, ignore extra taps) lives in lib/audio.js
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
const SwapIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 21v-5h-5" /></svg>;

// Slow: the words one by one (spaces between them) in the voice's slow mode
// Slow clips are the whole line at the voice's slowest speed (spaces between words made it stutter)
const spaced = (parts) => parts.map((p) => p.th).join('');
function SlowBtn({ id, clips, player }) {
  const on = player.playing === id;
  return (
    <button type="button" className={`st-slow${on ? ' is-on' : ''}`} aria-label={on ? 'Stop' : 'Play slowly, word by word'} title="Slowly, word by word"
      onClick={(e) => { e.stopPropagation(); player.play(id, clips); }}>
      <SlowIcon />
    </button>
  );
}

function PlayBtn({ id, clips, player, label, big, hidden, live }) {
  const on = player.playing === id || live;
  return (
    <button type="button" className={`st-play${big ? ' is-big' : ''}${on ? ' is-on' : ''}${hidden && !live ? ' is-hidden' : ''}`} aria-label={on ? 'Stop' : label}
      tabIndex={hidden && !live ? -1 : undefined} aria-hidden={hidden && !live ? true : undefined}
      onClick={(e) => { e.stopPropagation(); player.play(id, clips); }}>
      {on ? <StopIcon /> : <PlayIcon />}
    </button>
  );
}

// Karaoke, same as the word cards: each word gets a share of the clip
// in proportion to its syllables, and lights up while it is spoken.
function activeWord(words, progress) {
  if (!words || progress <= 0) return -1;
  const weights = words.map((w) => (w.rom || '').split(/[-\s]/).filter(Boolean).length + 0.6);
  const total = weights.reduce((a, b) => a + b, 0);
  const p = Math.min(Math.max((progress - 0.06) / 0.88, 0), 0.999); // the voice starts a moment after the clip
  let acc = 0;
  for (let k = 0; k < weights.length; k++) { acc += weights[k] / total; if (p < acc) return k; }
  return weights.length - 1;
}
// Thai and romanization word by word, with the spoken word highlighted
function KLine({ words, on }) {
  return (
    <>
      <p className="th" lang="th">{words.map((w, k) => <span key={k} className={`st-k${on === k ? ' is-on' : ''}`}>{w.th}</span>)}</p>
      <p className="rom">{words.map((w, k) => <span key={k}>{k ? ' ' : ''}<span className={`st-k${on === k ? ' is-on' : ''}`}>{w.rom}</span></span>)}</p>
    </>
  );
}

// The place, as a green district plate: Thai (with romanization) above English
function Plate({ sc, pre }) {
  return (
    <div className="st-plate-row">
      {pre && <span className="st-step">{pre}</span>}
      <p className="st-plate"><span className="th" lang="th">{sc.plate.th} <i>{sc.plate.rom}</i></span><span className="en">{sc.plate.en}</span></p>
    </div>
  );
}

// A line of Thai as word tiles with romanization and English under each
// The English meaning under each tile shows on hover (mouse) or tap (Jay, 29 Oct: no blur).
// Until then a dotted line marks where it goes.
function Tiles({ parts, onTap, swapIndex, onSwap, flash, pulse, locked, seen: shared, setSeen: setShared }) {
  const first = parts.findIndex((p) => p.slot);
  // Meanings opened on one step stay open on the next (shared from Start)
  const [own, setOwn] = useState({});
  const seen = shared || own; const setSeen = setShared || setOwn;
  return (
    <div className={`st-tiles${parts.length > 5 ? ' is-many' : ''}${locked ? ' is-locked' : ''}`} lang="th">
      {parts.map((p, i) => {
        const swap = swapIndex === 'slot' ? !!p.slot : i === swapIndex;
        const lead = swap && (swapIndex !== 'slot' || i === first); // badge and hint on the first tile only
        return (
          <button key={`${i}-${p.th}`} type="button"
            className={`st-tile${p.th.length > 5 ? ' is-long' : ''}${p.th.length > 8 ? ' is-xlong' : ''}${swap ? ' is-swap' : ''}${swap && flash ? ' is-flash' : ''}${swap && pulse ? ' is-pulse' : ''}${p.ending ? ' is-ending' : ''}`}
            disabled={locked} tabIndex={locked ? -1 : undefined}
            onClick={() => { if (swap && onSwap) { onSwap(); return; } setSeen((x) => ({ ...x, [p.th]: true })); onTap(p); }}
            aria-label={swap && onSwap ? `${p.th}, ${p.en}. Tap to swap` : `${p.th}, ${p.en}. Tap to hear`}>
            {lead && onSwap && <span className="st-swap-badge" aria-hidden="true"><SwapIcon /></span>}
            <span className="th">{p.th}</span>
            <span className="rom">{p.rom}</span>
            <span className={`en${seen[p.th] ? '' : ' is-hid'}`} aria-hidden={!seen[p.th]}>{p.ending ? 'polite' : p.en}</span>
          </button>
        );
      })}
    </div>
  );
}

// After answering: ✓ on the right answer, ✕ on a wrong pick, plus a word that says so
function Mark({ on, right, mine }) {
  if (!on) return null;
  if (right) return <span className="st-mark is-right" aria-hidden="true">✓</span>;
  if (mine) return <span className="st-mark is-wrong" aria-hidden="true">✕</span>;
  return null;
}
function Tag({ on, right, mine }) {
  if (!on) return null;
  if (right && mine) return <span className="st-tag is-right">Correct</span>;
  if (right) return <span className="st-tag is-right">Right answer</span>;
  if (mine) return <span className="st-tag is-wrong">Your answer</span>;
  return null;
}

// Thailand's colours of the day (Sunday red ... Saturday purple), same as Today
const DAY_COLOURS = ['#E5383B', '#F2C200', '#EC6AA8', '#2BA84A', '#F28C28', '#3A8DDE', '#8E5CC9'];
function Bar({ step, steps, frac = 0, report }) {
  const i = steps.indexOf(step) + Math.min(Math.max(frac, 0), 0.95);
  return (
    <div className="st-top">
      <a className="st-close" href="/" aria-label="Leave">×</a>
      <div className="st-bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={i}>
        <i style={{ width: `${Math.max(6, (i / (steps.length - 1)) * 100)}%`, background: DAY_COLOURS[new Date().getDay()] }} />
      </div>
      {report}
    </div>
  );
}

export default function Start({ sceneId }) {
  const scene = SCENES[sceneId] || SCENES[DEFAULT_SCENE]; // (functions can't cross from the server, so look it up here)
  const SV = scene.staffVoice || 'female'; // the other person's voice (the motorbike taxi driver is a man)
  const { learn, check, finishToday, loaded, progress, days } = useProgressStore();
  const { user, ready } = useUser();
  const player = usePlayer();
  const steps = scene.recall ? ['recall', ...STEPS] : STEPS;
  const [step, setStep] = useState(steps[0]);
  const fu = scene.followUp;
  const [spiceIdx, setSpiceIdx] = useState(0);

  const [reg, setReg] = useState('female');
  const [regChosen, setRegChosen] = useState(true);
  useEffect(() => { setReg(getRegister()); setRegChosen(registerChosen()); }, []);
  const voice = reg;
  const [itemIdx, setItemIdx] = useState(0);
  const [made, setMade] = useState([scene.items[0].th]); // items used in sentences so far
  const [heard, setHeard] = useState(false);
  const [toast, setToast] = useState('');
  // Word by word (Jay, 29 Oct): one Play button first. Replay, Slower and tapping words come after it has played.
  const [partsHeard, setPartsHeard] = useState(false);
  // One-time hints stay gone once used, also when the lesson is replayed
  const [hints, setHints] = useState({});
  useEffect(() => { setHints(readStore(HINTS_KEY, {})); }, []);
  const hintDone = (k) => { if (hints[k]) return; const h = { ...readStore(HINTS_KEY, {}), [k]: true }; writeStore(HINTS_KEY, h); setHints(h); };
  // A replay of a lesson you've finished before (Done says "practised", not "made")
  const [replay, setReplay] = useState(false);
  useEffect(() => { setReplay(!!readStore(SCENES_KEY, {})[scene.id]); }, [scene.id]);
  const [flash, setFlash] = useState(false);
  const item = scene.items[itemIdx];
  const parts = replyParts(scene, item, reg);
  const ask = scene.staff.ask(item);
  const spiceParts = fu ? followParts(scene, spiceIdx, reg) : null;
  // Reading the romanization (27 Oct, panel): one tip at a time, on the first lesson where that sound appears,
  // under the conversation once it has been heard. Seen once per learner.
  const readTip = (() => {
    const roms = [ask.rom, ...(ask.words || []).map((w) => w.rom), ...parts.map((x) => x.rom), ...(fu ? [fu.staff.rom, ...(spiceParts || []).map((x) => x.rom)] : [])].filter(Boolean).join(' ');
    return READ_TIPS.find((t) => !hints[t.key] && t.test.test(roms)) || null;
  })();
  // Some answers don't go with some items (no "not sweet" Thai iced tea): fall back to the first
  useEffect(() => {
    if (fu && (fu.answers[spiceIdx].notFor || []).includes(item.th)) setSpiceIdx(0);
  }, [item.th]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickSpice = (i) => { setSpiceIdx(i); player.play('spice', [{ text: joinTh(followParts(scene, i, reg)), voice }]); };
  const swapIndex = 'slot';

  const say = (p) => { player.play(`w-${p.th}`, [{ text: p.th, voice }]); };
  const conversation = (it = item) => [
    { text: scene.staff.ask(it).th, voice: SV },
    { text: joinTh(replyParts(scene, it, reg)), voice },
    ...(fu ? [{ text: fu.staff.th, voice: SV }, { text: joinTh(followParts(scene, spiceIdx, reg)), voice }] : []),
  ];
  const qaClips = (slow = false) => [
    { text: ask.th, voice: SV, slow },
    { text: slow ? spaced(parts) : joinTh(parts), voice, slow },
    ...(fu ? [{ text: fu.staff.th, voice: SV, slow }, { text: slow ? spaced(spiceParts) : joinTh(spiceParts), voice, slow }] : []),
  ];
  const playQA = async () => { if (await player.play('qa', qaClips())) setPartsHeard(true); };
  // Swap step: the swap tile pulses if it hasn't been used after a few seconds (Jay, 29 Oct)
  const [pulse, setPulse] = useState(false);
  const [seenEn, setSeenEn] = useState({});
  const go = (s) => { player.stop(); setStep(s); window.scrollTo(0, 0); track('scene_step', { scene: scene.id, step: s }); };

  const switchReg = (r) => {
    setReg(r); setRegister(r); setRegChosen(true);
    // Before the first listen: just change ค่ะ/ครับ, no sound. After: replay only your line.
    if (heard) player.play('reply', [{ text: joinTh(replyParts(scene, item, r)), voice: r }]);
  };
  // Scene step: the line play buttons appear only after the whole conversation has played once.
  // While it plays, the speaking line's button shows as live. If they don't tap within a few
  // seconds, the button gets a gentle pulse.
  const seq = player.playing === 'both' || player.playing === 'reg';
  const lineBtn = (n) => ({ hidden: !heard, live: seq && player.idx === n });
  const kOn = (n, id, words) => ((seq && player.idx === n) || player.playing === id ? activeWord(words, player.progress) : -1);
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (step !== 'scene' || heard || !regChosen || player.playing) { setNudge(false); return undefined; }
    const t = setTimeout(() => setNudge(true), 4000);
    return () => clearTimeout(t);
  }, [step, heard, regChosen, player.playing]);
  useEffect(() => {
    if (step !== 'swap' || made.length > 1) { setPulse(false); return undefined; }
    const t = setTimeout(() => setPulse(true), 1500);
    return () => clearTimeout(t);
  }, [step, made.length]);
  useEffect(() => { if (step === 'parts') setPartsHeard(false); }, [step]);
  const hearAll = async () => {
    setNudge(false);
    if (await player.play('both', conversation())) setHeard(true);
  };

  // The other person's line as a small card with its header band
  const askCard = (id, line, quiet = false) => (
    <div className="st-bubble is-them is-small">
      <span className="st-who">{scene.staff.who} {line.verb || 'asks'}</span>
      <div className="st-line">
        {!quiet && <PlayBtn id={id} clips={[{ text: line.th, voice: SV }]} player={player} label="Play the question" />}
        <div><p className="th" lang="th">{line.th}</p><p className="rom">{line.rom}</p><BlurEn className="en" text={line.en} /></div>
      </div>
    </div>
  );
  // A whole line under its tiles: play, slow, and the English (blur setting applies)
  const whole = (id, slowId, ps, en) => (
    <div className="st-whole">
      <PlayBtn id={id} clips={[{ text: joinTh(ps), voice }]} player={player} label="Play the whole sentence" />
      <SlowBtn id={slowId} clips={[{ text: spaced(ps), voice, slow: true }]} player={player} />
      <BlurEn className="en" text={en} />
    </div>
  );

  // Download every clip this lesson can play in the background, in the order
  // they're needed, so taps play straight away (lib/audio.js).
  useEffect(() => {
    const v = reg;
    const line = (ps) => [{ text: joinTh(ps), voice: v }, { text: spaced(ps), voice: v, slow: true }];
    const words = (ps) => ps.map((w) => ({ text: w.th, voice: v }));
    const clips = [];
    if (scene.recall) {
      const pv = SCENES[scene.recall]; const pi = pv.items[0];
      clips.push({ text: pv.staff.ask(pi).th, voice: pv.staffVoice || 'female' }, { text: joinTh(replyParts(pv, pi, v)), voice: v }, ...pv.items.map((it) => ({ text: it.th, voice: v })));
    }
    clips.push(...conversation(scene.items[0]));
    const fus = fu ? fu.answers.map((_, i) => followParts(scene, i, v)) : [];
    clips.push(...words(replyParts(scene, scene.items[0], v)), ...line(replyParts(scene, scene.items[0], v)));
    for (const ps of fus) clips.push(...words(ps), ...line(ps));
    if (fu) clips.push({ text: fu.staff.th, voice: SV });
    for (const it of scene.items) {
      clips.push({ text: scene.staff.ask(it).th, voice: SV }, ...line(replyParts(scene, it, v)), { text: scene.staff.ask(it).th, voice: SV, slow: true }, ...words(it.parts || [it]));
    }
    const mission = missionParts(scene, v, 0, scene.items[0]);
    clips.push({ text: joinTh(mission), voice: v }, { text: scene.teaser.th + endingFor(v, scene.teaser.question).th, voice: v });
    preload(clips);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, reg]);

  // ---- 0. recall (day 2+): yesterday's line from memory, then 2 of its words
  const prev = scene.recall ? SCENES[scene.recall] : null;
  const prevItem = prev?.items[0];
  const target = prev ? replyParts(prev, prevItem, reg) : [];
  const [bank, setBank] = useState([]);
  const [built, setBuilt] = useState([]);
  const [rDone, setRDone] = useState(null); // null | 'right' | 'wrong'
  const [rStage, setRStage] = useState(0);
  const prevWords = useMemo(() => {
    if (!prev) return [];
    const made0 = (readStore(FIRST_KEY, null)?.made || []).filter((th) => th !== prevItem.th);
    return prev.items.filter((it) => made0.includes(it.th)).slice(0, 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prev]);
  useEffect(() => {
    if (!prev) return;
    const extras = prev.items.filter((it) => it.th !== prevItem.th).slice(0, 2);
    setBank(shuffle([...target.map((x, i) => ({ ...x, id: `t${i}` })), ...extras.map((x, i) => ({ ...x, id: `x${i}` }))]));
    setBuilt([]); setRDone(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prev, reg]);
  const place = (t) => { if (rDone) return; setBank((b) => b.filter((x) => x.id !== t.id)); setBuilt((b) => [...b, t]); };
  const unplace = (t) => { if (rDone) return; setBuilt((b) => b.filter((x) => x.id !== t.id)); setBank((b) => [...b, t]); };
  const checkBuilt = () => {
    const ok = built.length === target.length && built.every((x, i) => x.th === target[i].th);
    setRDone(ok ? 'right' : 'wrong');
    if (ok) soundRight(); else soundWrong();
    target.forEach((w, i) => check(w.th, built[i]?.th === w.th ? 'good' : 'again'));
    player.play('recall', [{ text: joinTh(target), voice }]);
  };
  const rw = prevWords[rStage - 1];
  const rOpts = useMemo(() => {
    if (!rw) return [];
    const pool = shuffle(prev.items.filter((it) => it.th !== rw.th)).slice(0, 3);
    return shuffle([rw, ...pool]).map((x) => ({ key: x.th, en: x.en }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rw]);
  const [rPicked, setRPicked] = useState(null);
  useEffect(() => { if (step === 'recall' && rw && !rPicked) player.play(`r-${rStage}`, [{ text: rw.th, voice }]); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, rStage]);
  const rAnswer = (o) => { if (rPicked) return; setRPicked(o.key); check(rw.th, o.key === rw.th ? 'good' : 'again'); if (o.key === rw.th) soundRight(); else soundWrong(); };
  const rNext = () => {
    setRPicked(null);
    if (rStage < prevWords.length) setRStage(rStage + 1); else go('scene');
  };

  // ---- 3. swap -------------------------------------------------------
  const swap = () => {
    hintDone('swap');
    const next = (itemIdx + 1) % scene.items.length;
    const it = scene.items[next];
    setItemIdx(next);
    setFlash(true); setTimeout(() => setFlash(false), 450);
    player.play('both', [{ text: scene.staff.ask(it).th, voice: SV }, { text: joinTh(replyParts(scene, it, reg)), voice }]);
    setMade((m) => {
      if (m.includes(it.th)) return m;
      const n = [...m, it.th];
      setToast(n.length === 2 ? 'You just made a new Thai sentence.' : n.length === 3 ? 'Three sentences. Nice.' : 'Another one.');
      setTimeout(() => setToast(''), 2200);
      return n;
    });
  };
  const needSwaps = 3; // bag + 2 of your own

  // ---- 4. listen -----------------------------------------------------
  const madeItems = scene.items.filter((it) => made.includes(it.th));
  const listenItems = useMemo(() => {
    if (step !== 'listen') return [];
    const its = shuffle(madeItems);
    // The answer plus two others (ones you made first, then the rest of the scene)
    const others = (it) => [...shuffle(madeItems.filter((o) => o.th !== it.th)), ...scene.items.filter((o) => !made.includes(o.th))].slice(0, 3);
    const item = (kind, it) => {
      if (kind === 'spice') {
        const i = Math.floor(Math.random() * fu.answers.length);
        const ans = fu.answers[i];
        return {
          kind, key: ans.key, title: 'What did you say?',
          clip: [{ text: joinTh(followParts(scene, i, reg)), voice }],
          slowClip: [{ text: spaced(followParts(scene, i, reg)), voice, slow: true }],
          opts: shuffle([...fu.answers.map((x) => ({ key: x.key, en: x.en })), { key: 'wrong', en: fu.wrong }]),
          fb: { th: joinTh(ans.parts), rom: joinRom(ans.parts), en: ans.en },
        };
      }
      const asks = kind === 'ask';
      return {
        kind, key: it.th,
        title: asks ? `What is ${scene.staff.who.toLowerCase()} asking?` : scene.followUp ? 'What did you order?' : 'What did you say?',
        clip: asks ? [{ text: scene.staff.ask(it).th, voice: SV }] : [{ text: joinTh(replyParts(scene, it, reg)), voice }],
        slowClip: asks ? [{ text: scene.staff.ask(it).th, voice: SV, slow: true }] : [{ text: spaced(replyParts(scene, it, reg)), voice, slow: true }],
        opts: shuffle([it, ...others(it)]).map((o) => ({ key: o.th, en: asks ? scene.staff.ask(o).en : scene.replyEn(o) })),
        fb: { th: it.th, rom: it.rom, en: it.en, name: !!it.name },
      };
    };
    const kinds = scene.listen || ['ask', 'reply', 'ask'];
    let n = 0;
    return kinds.map((k) => item(k, k === 'spice' ? null : its[(n++) % its.length]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [retried, setRetried] = useState(false);
  const [requeued, setRequeued] = useState(false); // this miss comes back at the end
  useEffect(() => { if (step === 'listen') { setQueue(listenItems); setQi(0); setPicked(null); setRetried(false); } }, [step, listenItems]);
  const q = queue[qi];
  useEffect(() => { if (step === 'listen' && q && !picked) player.play(`q-${qi}`, q.clip); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, qi, queue]);
  const answer = (o) => {
    if (picked) return;
    setPicked(o.key);
    if (o.key === q.key) soundRight(); else soundWrong();
    if (o.key !== q.key && !retried) { setRetried(true); setRequeued(true); setQueue((qq) => [...qq, { ...q, again: true }]); }
  };
  const nextQ = () => {
    setPicked(null); setRequeued(false);
    if (qi + 1 < queue.length) setQi(qi + 1); else go('check');
  };

  // ---- 5. word check -------------------------------------------------
  const words = useMemo(() => {
    const fixed = scene.reply.filter((p) => !p.slot);
    const follow = fu ? fu.answers.flatMap((x) => x.parts) : [];
    const seen = new Set();
    return [...fixed, ...follow]
      .filter((w) => !seen.has(w.th) && seen.add(w.th))
      .filter((w) => !progress[w.th]) // already learning it (e.g. ไม่ from day 1)
      .slice(0, 2); // a short check: the rest were tested in listening
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === 'check']);
  const [ci, setCi] = useState(0);
  const [cPicked, setCPicked] = useState(null);
  const results = useRef({});
  const cw = words[ci];
  const cOpts = useMemo(() => {
    if (!cw) return [];
    // Two wrong answers: the other checked word, then words from today's items (never a name)
    // Always 3 choices: other checked words first, then any other word from this scene
    // (items, their parts, the reply and the follow-up answers), never a name.
    const sceneWordsAll = [
      ...scene.items.flatMap((it) => (it.parts ? it.parts : [it])),
      ...scene.reply.filter((p) => !p.slot),
      ...(fu ? fu.answers.flatMap((x) => x.parts) : []),
    ].filter((w) => w.en && !w.name && w.th !== cw.th);
    const pool = [...shuffle(words.filter((w) => w.th !== cw.th)), ...shuffle(sceneWordsAll)];
    // One choice per meaning and per Thai word (แก้ว is both "glass" and "glasses" in one lesson)
    const seen = new Set([cw.en, cw.th]);
    const others = pool.filter((w) => !seen.has(w.en) && !seen.has(w.th) && seen.add(w.en) && seen.add(w.th)).slice(0, 3);
    return shuffle([cw, ...others]).map((w) => ({ key: w.th, en: w.en }));
  }, [cw, words]);
  useEffect(() => { if (step === 'check' && cw && !cPicked) player.play(`c-${ci}`, [{ text: cw.th, voice }]); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, ci]);
  const cAnswer = (o) => { if (cPicked) return; setCPicked(o.key); results.current[cw.th] = o.key === cw.th; if (o.key === cw.th) soundRight(); else soundWrong(); };
  const cNext = () => {
    setCPicked(null);
    if (ci + 1 < words.length) { setCi(ci + 1); return; }
    finish();
  };
  // Replaying a lesson: every word is already in your reviews, so there's
  // nothing new to check. Skip straight to the end (this used to show a blank screen).
  useEffect(() => { if (step === 'check' && words.length === 0) finish(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, words]);
  function finish() {
    // Record: these words join the spaced reviews (first check tomorrow)
    for (const w of words) learn(w.th, !!results.current[w.th]);
    // Swap words were tested in listening; first check tomorrow (two-word drinks: each word)
    for (const it of madeItems) for (const w of it.parts || [it]) if (!progress[w.th]) learn(w.th, false);
    learn(endingFor(reg).th, true);
    setRegister(reg);
    finishToday();
    if (!readStore(FIRST_KEY, null)) writeStore(FIRST_KEY, { scene: scene.id, made, day: dayKey() });
    writeStore(SCENES_KEY, { ...readStore(SCENES_KEY, {}), [scene.id]: dayKey() });
    track('scene_complete', { scene: scene.id });
    const mine = missionParts(scene, reg, spiceIdx, item);
    const mineEn = scene.missionEnOf ? scene.missionEnOf(item, spiceIdx) : scene.missionFull ? `${item.en.charAt(0).toUpperCase()}${item.en.slice(1)}, ${fu.answers[spiceIdx].adj}, please.` : fu ? fu.answers[spiceIdx].en : scene.replyEn(scene.items[0]);
    writeStore(MISSION_KEY, { scene: scene.id, th: joinTh(mine), rom: joinRom(mine), en: mineEn, text: scene.mission, day: dayKey(), done: false });
    go('done');
  }

  if (!loaded) return <div className="st-wrap" />;

  return (
    <div className="st-wrap">
      <Bar report={<Feedback icon className="st-report" label="Report a mistake" context={{ scene: scene.id, step, item: item.th }} />} step={step} steps={steps} frac={step === 'listen' ? qi / Math.max(queue.length, 1) : step === 'check' ? ci / Math.max(words.length, 1) : step === 'swap' ? (made.length - 1) / needSwaps : 0} />
      <div className="st-body">

        {step === 'recall' && prev && rStage === 0 && (
          <section className="st-card">
            <Plate sc={prev} pre="Yesterday" />
            <h1 className="st-title">Remember this?</h1>
            <div className="st-bubble is-them">
              <span className="st-who">{prev.staff.who} {prev.staff.ask(prevItem).verb || 'asks'}</span>
              <div className="st-line">
                <PlayBtn id="rask" clips={[{ text: prev.staff.ask(prevItem).th, voice: prev.staffVoice || 'female' }]} player={player} label="Play the question" />
                <SlowBtn id="rask-slow" clips={[{ text: prev.staff.ask(prevItem).th, voice: prev.staffVoice || 'female', slow: true }]} player={player} />
                <div><p className="th" lang="th">{prev.staff.ask(prevItem).th}</p><p className="rom">{prev.staff.ask(prevItem).rom}</p><BlurEn className="en" text={prev.staff.ask(prevItem).en} /></div>
              </div>
            </div>
            <div className="st-bubble is-you is-tiles">
            <span className="st-who">You say</span>
            <p className="st-task">Build your answer: <b>{prev.replyEn(prevItem)}</b></p>
            <div className={`st-built${rDone ? ` is-${rDone}` : ''}`} lang="th" aria-label="Your answer">
              {built.length === 0 && <span className="st-built-empty">Tap the words below in order</span>}
              {built.map((t) => (
                <button key={t.id} type="button" className="st-tile is-small" onClick={() => unplace(t)}><span className="th">{t.th}</span><span className="rom">{t.rom}</span></button>
              ))}
            </div>
            {!rDone && (
              <div className="st-bank" lang="th">
                {bank.map((t) => (
                  <button key={t.id} type="button" className="st-tile is-small" onClick={() => place(t)}><span className="th">{t.th}</span><span className="rom">{t.rom}</span></button>
                ))}
              </div>
            )}
            </div>
            {rDone ? (
              <div className="st-feedback" role="status">
                {rDone === 'right'
                  ? <p><b>Right.</b> Building it yourself is what makes it stick.</p>
                  : <p>Nearly. It's <b lang="th">{joinTh(target)}</b> ({joinRom(target)}).</p>}
                <button type="button" className="st-cta" onClick={rNext}>Continue</button>
              </div>
            ) : (
              <button type="button" className="st-cta" disabled={built.length < target.length} onClick={checkBuilt}>Check</button>
            )}
          </section>
        )}

        {step === 'recall' && rw && (
          <section className="st-card">
            <p className="st-step">Yesterday's words · {rStage} of {prevWords.length}</p>
            <h1 className="st-title">What does it mean?</h1>
            <div className="st-word">
              <span className="st-who">Yesterday's word</span>
              <PlayBtn id={`r-${rStage}`} clips={[{ text: rw.th, voice }]} player={player} label="Play the word" />
              <SlowBtn id={`rslow-${rStage}`} clips={[{ text: rw.th, voice, slow: true }]} player={player} />
              <div><p className="th" lang="th">{rw.th}</p><p className="rom">{rw.rom}</p></div>
            </div>
            <div className="st-opts">
              {rOpts.map((o) => {
                const right = o.key === rw.th;
                const cls = rPicked ? (right ? ' is-right' : o.key === rPicked ? ' is-wrong' : ' is-dim') : '';
                return <button key={o.key} type="button" className={`st-opt${cls}`} onClick={() => rAnswer(o)} disabled={!!rPicked}><Mark on={!!rPicked} right={right} mine={o.key === rPicked} />{o.en}<Tag on={!!rPicked} right={right} mine={o.key === rPicked} /></button>;
              })}
            </div>
            {rPicked && <button type="button" className="st-cta" onClick={rNext}>{rStage < prevWords.length ? 'Next word' : 'On to today'}</button>}
          </section>
        )}

        {step === 'scene' && (
          <section className={`st-card${regChosen ? '' : ' is-wait'}`}>
            <Plate sc={scene} />
            <h1 className="st-title">The conversation</h1>
            <div className={`st-reg is-top${regChosen ? '' : ' is-ask'}`} role="radiogroup" aria-label="I speak as">
              <span>I'm:</span>
              {[['female', 'Woman', 'ค่ะ', 'khâ'], ['male', 'Man', 'ครับ', 'khráp']].map(([r, label, end, endRom]) => (
                <button key={r} type="button" role="radio" aria-checked={regChosen && reg === r} className={regChosen && reg === r ? 'on' : ''} onClick={() => switchReg(r)}>
                  {label} <span lang="th">{end}</span> <i className="st-reg-rom">{endRom}</i>
                </button>
              ))}
            </div>
            <div className={`st-cols${fu ? ' has-2' : ''}`}>
            <div className="st-col">
            <div className="st-bubble is-them">
              <span className="st-who">{scene.staff.who} {ask.verb || 'asks'}</span>
              <div className="st-line">
                <PlayBtn id="ask" clips={[{ text: ask.th, voice: SV }]} player={player} label="Play the question" {...lineBtn(0)} />
                <div>{ask.words ? <KLine words={ask.words} on={kOn(0, 'ask', ask.words)} /> : <><p className="th" lang="th">{ask.th}</p><p className="rom">{ask.rom}</p></>}<BlurEn className="en" text={ask.en} /></div>
              </div>
            </div>
            <div className={`st-bubble is-you${heard ? ' is-turn' : ''}`}>
              <span className="st-who">{heard ? 'Your turn · say it out loud' : 'You say'}</span>
              <div className="st-line">
                <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play your answer" {...lineBtn(1)} />
                <div><KLine words={parts} on={kOn(1, 'reply', parts)} /><BlurEn className="en" text={scene.replyEn(item)} /></div>
              </div>
            </div>
            </div>
            {fu && (
              <div className="st-col">
                <div className="st-bubble is-them">
                  <span className="st-who">{scene.staff.who} {fu.staff.verb || 'asks'}</span>
                  <div className="st-line">
                    <PlayBtn id="fask" clips={[{ text: fu.staff.th, voice: SV }]} player={player} label="Play the question" {...lineBtn(2)} />
                    <div>{fu.staff.words ? <KLine words={fu.staff.words} on={kOn(2, 'fask', fu.staff.words)} /> : <><p className="th" lang="th">{fu.staff.th}</p><p className="rom">{fu.staff.rom}</p></>}<BlurEn className="en" text={fu.staff.en} /></div>
                  </div>
                </div>
                <div className={`st-bubble is-you${heard ? ' is-turn' : ''}`}>
                  <span className="st-who">{heard ? 'Your turn · say it out loud' : 'You say'}</span>
                  <div className="st-line">
                    <PlayBtn id="spice" clips={[{ text: joinTh(spiceParts), voice }]} player={player} label="Play your answer" {...lineBtn(3)} />
                    <div><KLine words={spiceParts} on={kOn(3, 'spice', spiceParts)} /><BlurEn className="en" text={fu.answers[spiceIdx].en} /></div>
                  </div>
                </div>
              </div>
            )}
            </div>
            {heard && (
              <div className="st-qa is-on is-conv">
                <SlowBtn id="conv-slow" clips={conversation().map((c) => ({ ...c, text: c.text, slow: true }))} player={player} />
                <div className="st-qa-text">
                  <span>Too fast? Hear it slower.</span>
                  {readTip && <p className="st-readtip" role="note"><span>Tip</span> {readTip.text}</p>}
                </div>
              </div>
            )}
            <button type="button" className={`st-cta${nudge ? ' is-nudge' : ''}${player.playing === 'both' && !heard ? ' is-busy' : ''}`} disabled={!regChosen} onClick={() => {
              if (heard) { track('said_it_lesson', { scene: scene.id }); if (readTip) hintDone(readTip.key); go('parts'); } else if (player.playing !== 'both') hearAll();
            }}>{!regChosen ? 'Choose woman or man above' : heard ? 'I said it ✓' : player.playing === 'both' ? 'Listening…' : 'Hear the conversation'}</button>
          </section>
        )}

        {step === 'parts' && (
          <section className="st-card">
            <h1 className="st-title">{fu ? 'Word by word' : `${parts.length} little words`}</h1>
            <div className={`st-cols${fu ? ' has-2' : ''}`}>
              <div className="st-col">
                {askCard('ask', ask, true)}
                <div className={`st-bubble is-you is-tiles${partsHeard ? '' : ' is-quiet'}`}>
                  <span className="st-who">You say</span>
                  <Tiles parts={parts} onTap={say} locked={!partsHeard} seen={seenEn} setSeen={setSeenEn} />
                </div>
              </div>
              {fu && (
                <div className="st-col">
                  {askCard('fask', fu.staff, true)}
                  <div className={`st-bubble is-you is-tiles${partsHeard ? '' : ' is-quiet'}`}>
                    <span className="st-who">You say</span>
                    <Tiles parts={spiceParts} onTap={say} locked={!partsHeard} seen={seenEn} setSeen={setSeenEn} />
                  </div>
                </div>
              )}
            </div>
            {/* After the first play: replay, slower, and a nudge to tap the words. Space kept, so nothing jumps. */}
            <div className={`st-qa${partsHeard ? ' is-on' : ''}`} aria-hidden={!partsHeard}>
              <PlayBtn id="qa" clips={qaClips()} player={player} label="Play the question and answer again" hidden={!partsHeard} />
              <SlowBtn id="qa-slow" clips={qaClips(true)} player={player} />
              <span>Tap any word to hear it.</span>
            </div>
            {partsHeard
              ? <button type="button" className="st-cta" onClick={() => go('swap')}>Next: swap a word</button>
              : <button type="button" className={`st-cta${player.playing === 'qa' ? ' is-busy' : ''}`} onClick={() => { if (player.playing !== 'qa') playQA(); }}>
                  {player.playing === 'qa' ? 'Listening…' : '▶ Play the question and answer'}
                </button>}
          </section>
        )}

        {step === 'swap' && (
          <section className="st-card">
            <h1 className="st-title">Now make your own</h1>
            <div className={`st-cols${fu ? ' has-2' : ''}`}>
              <div className="st-col">
                {askCard('ask', ask)}
                <div className="st-bubble is-you is-tiles">
                  <span className="st-who">You say
                    <span className="st-who-dots" role="img" aria-label={`${Math.min(made.length, needSwaps)} of ${needSwaps} sentences made`}>{Array.from({ length: needSwaps }, (_, k) => <i key={k} className={k < made.length ? 'on' : ''} />)}</span>
                  </span>
                  <Tiles parts={parts} onTap={say} swapIndex={swapIndex} onSwap={swap} pulse={pulse && made.length === 1} flash={flash} seen={seenEn} setSeen={setSeenEn} />
                  {whole('reply', 'slow', parts, scene.replyEn(item))}
                </div>
              </div>
              {fu && (
                <div className="st-col">
                  {askCard('fask', fu.staff)}
                  <div className="st-bubble is-you is-tiles">
                    <span className="st-who">You say</span>
                    <div className="st-choices" role="radiogroup" aria-label={fu.staff.en}>
                      {fu.answers.map((x, i) => {
                        const ps = followParts(scene, i, reg);
                        const off = (x.notFor || []).includes(item.th);
                        return (
                          <button key={x.key} type="button" role="radio" aria-checked={spiceIdx === i} disabled={off} title={off ? `Not usually ordered with ${item.en}` : undefined} className={spiceIdx === i ? 'on' : ''} onClick={() => pickSpice(i)}>
                            <span className="th" lang="th">{joinTh(ps)}</span><span className="rom">{joinRom(ps)}</span><span className="en">{x.en}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className={`st-toast${toast ? ' is-on' : ''}`} role="status">{toast || ' '}</p>
            <div className="st-cta-slot">
              {made.length >= needSwaps && <button type="button" className="st-cta" onClick={() => go('listen')}>Next: test your ear</button>}
            </div>
          </section>
        )}

        {step === 'listen' && q && (
          <section className="st-card">
            <p className="st-step">Test your ear · {q.again ? 'one more try' : `${Math.min(qi + 1, 3)} of 3`}</p>
            <h1 className="st-title">{q.title}</h1>
            <div className="st-listen">
              <PlayBtn id={`q-${qi}`} clips={q.clip} player={player} label="Play again" big />
              <SlowBtn id={`qslow-${qi}`} clips={q.slowClip} player={player} />
            </div>
            <div className="st-opts">
              {q.opts.map((o) => {
                const right = o.key === q.key;
                const cls = picked ? (right ? ' is-right' : o.key === picked ? ' is-wrong' : ' is-dim') : '';
                return (
                  <button key={o.key} type="button" className={`st-opt${cls}`} onClick={() => answer(o)} disabled={!!picked}>
                    <Mark on={!!picked} right={right} mine={o.key === picked} />{o.en}<Tag on={!!picked} right={right} mine={o.key === picked} />
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="st-feedback" role="status">
                {picked === q.key
                  ? <p><b>Right.</b> <span lang="th">{q.fb.th}</span> ({q.fb.rom}){q.fb.name ? '' : ` = ${q.fb.en.replace(/\.$/, '')}`}.</p>
                  : <p>Not quite. You heard <b lang="th">{q.fb.th}</b> ({q.fb.rom}){q.fb.name ? '' : ` = ${q.fb.en.replace(/\.$/, '')}`}. {requeued ? 'You\'ll get it again at the end.' : ''}</p>}
                <button type="button" className="st-cta" onClick={nextQ}>Continue</button>
              </div>
            )}
          </section>
        )}

        {step === 'check' && cw && (
          <section className="st-card">
            <p className="st-step">Words from today · {ci + 1} of {words.length}</p>
            <h1 className="st-title">What does it mean?</h1>
            <div className="st-word">
              <span className="st-who">Today's word</span>
              <PlayBtn id={`c-${ci}`} clips={[{ text: cw.th, voice }]} player={player} label="Play the word" />
              <SlowBtn id={`cslow-${ci}`} clips={[{ text: cw.th, voice, slow: true }]} player={player} />
              <div><p className="th" lang="th">{cw.th}</p><p className="rom">{cw.rom}</p></div>
            </div>
            <div className="st-opts">
              {cOpts.map((o) => {
                const right = o.key === cw.th;
                const cls = cPicked ? (right ? ' is-right' : o.key === cPicked ? ' is-wrong' : ' is-dim') : '';
                return <button key={o.key} type="button" className={`st-opt${cls}`} onClick={() => cAnswer(o)} disabled={!!cPicked}><Mark on={!!cPicked} right={right} mine={o.key === cPicked} />{o.en}<Tag on={!!cPicked} right={right} mine={o.key === cPicked} /></button>;
              })}
            </div>
            {cPicked && <button type="button" className="st-cta" onClick={cNext}>{ci + 1 < words.length ? 'Next word' : 'Finish'}</button>}
          </section>
        )}

        {step === 'done' && (
          <Done scene={scene} reg={reg} voice={voice} player={player} madeItems={madeItems} spiceIdx={spiceIdx} item={item} replay={replay} days={days} />
        )}
      </div>
    </div>
  );
}

// ---- 6. done ----------------------------------------------------------
// Done (Jay, 29 Oct): a moment of reward before they leave. Today's dot on the
// week fills in with Thailand's colour of the day, then the one line to use
// today, one line about tomorrow, and one button. Reminders and saving live on Today.
const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function DoneWeek({ days }) {
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setLit(true); soundDone(); }, 650); return () => clearTimeout(t); }, []);
  const cells = [];
  for (let back = 6; back >= 0; back--) {
    const t = Date.now() - back * 864e5; const wd = new Date(t).getDay();
    const today = back === 0;
    const done = today ? lit : !!days?.[dayKey(t)]?.done;
    cells.push(
      <li key={back} className={`${done ? 'done' : ''}${today ? ' today' : ''}${today && lit ? ' is-pop' : ''}`} style={{ '--day': today ? DAY_COLOURS[wd] : 'var(--soi, #1D4FA0)' }}>
        <span className="dot" aria-hidden="true">{done ? '✓' : ''}</span>
        <span className="lbl">{today ? 'Today' : WEEK_EN[wd]}</span>
      </li>
    );
  }
  const wd = new Date().getDay();
  return (
    <div className="dn-week">
      <ol aria-label="This week">{cells}</ol>
      <p className={`dn-week-msg${lit ? ' is-on' : ''}`} role="status" style={{ '--day': DAY_COLOURS[wd] }}>{WEEK_FULL[wd]} done ✓</p>
    </div>
  );
}

function Done({ scene, reg, voice, player, madeItems, spiceIdx, item, replay, days }) {
  const fu = scene.followUp;
  const lines = [
    ...madeItems.map((it) => ({ id: `s-${it.th}`, parts: replyParts(scene, it, reg), en: scene.replyEn(it) })),
    ...(fu ? fu.answers.map((x, i) => ({ id: `f-${x.key}`, parts: followParts(scene, i, reg), en: x.en })) : []),
  ];
  const mission = missionParts(scene, reg, spiceIdx, item);
  const missionEn = scene.missionEnOf ? scene.missionEnOf(item, spiceIdx) : scene.missionFull ? `${item.en.charAt(0).toUpperCase()}${item.en.slice(1)}, ${fu.answers[spiceIdx].adj}, please.` : fu ? fu.answers[spiceIdx].en : scene.replyEn(scene.items[0]);
  // Tomorrow's lesson: the next one in the course order (the same minutes Today shows)
  const at = SCENE_DAYS.indexOf(scene.id);
  const next = SCENES[scene.id === DEFAULT_SCENE ? SCENE_DAYS[0] : SCENE_DAYS[at + 1]];

  return (
    <section className="dn">
      <div className="dn-hero">
        <p className="dn-cheer">Great job! <span lang="th">เก่งมาก</span> <i>gèng mâak</i></p>
        <p className="dn-count">{replay ? `You practised ${lines.length} Thai sentences.` : `You made ${lines.length} Thai sentences.`}</p>
        <DoneWeek days={days} />
      </div>

      {/* The one line to use today: the big thing on this screen */}
      <button type="button" className={`dn-use${player.playing === 'mission' ? ' is-on' : ''}`}
        onClick={() => player.play('mission', [{ text: joinTh(mission), voice }])} aria-label={`Play: ${joinTh(mission)}`}>
        <span className="dn-label">Say it today</span>
        <span className="dn-use-play" aria-hidden="true">{player.playing === 'mission' ? <StopIcon /> : <PlayIcon />}</span>
        <span className="dn-use-line" lang="th">{joinTh(mission)}</span>
        <span className="dn-use-rom">{joinRom(mission)}</span>
        <span className="dn-use-en">{missionEn}</span>
        <span className="dn-use-when">When: {scene.mission.charAt(0).toLowerCase()}{scene.mission.slice(1)}</span>
      </button>

      <p className="dn-next"><b>Tomorrow:</b> {next ? `${next.promise}, about ${next.minutes} minutes.` : 'a review day. New lessons arrive every week.'}</p>
      <div className="dn-save">
        <a className="st-cta" href="/today">Done for today</a>
      </div>
    </section>
  );
}
