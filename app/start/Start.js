'use client';
import { track } from '../lib/analytics';
import BlurEn from '../components/BlurEn';
import { audioVersion, SLOW_RATE } from '../lib/audioVersion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgressStore, readStore, writeStore, dayKey } from '../lib/progress';
import { getRegister, setRegister, registerChosen } from '../lib/register';
import { useUser } from '../lib/useUser';
import { soundRight, soundWrong, soundDone } from '../lib/sfx';
import { supabaseBrowser } from '../lib/supabase-browser';
import { SCENES, DEFAULT_SCENE, replyParts, followParts, missionParts, joinTh, joinRom, endingFor } from '../lib/scenes';

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
export const MISSION_KEY = 'tsc-mission'; // { scene, th, rom, en, text, day, done }
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Plays one clip or a short sequence (cashier, then you). One at a time.
function usePlayer() {
  const cur = useRef(null);
  const token = useRef(0);
  const [playing, setPlaying] = useState(null);
  const stop = () => { token.current += 1; cur.current?.pause(); setPlaying(null); };
  const play = async (id, clips) => {
    if (playing === id) { stop(); return; }
    stop();
    const my = token.current;
    setPlaying(id);
    for (const c of clips) {
      if (token.current !== my) return;
      try {
        const a = new Audio(`/api/speak?text=${encodeURIComponent(c.text)}&voice=${c.voice}${c.slow ? '&slow=1' : ''}&v=${audioVersion(c.text, c.slow)}`);
        a.preservesPitch = true; a.webkitPreservesPitch = true;
        if (c.slow) { a.defaultPlaybackRate = SLOW_RATE; a.playbackRate = SLOW_RATE; }
        cur.current = a;
        await new Promise((res) => { a.onended = res; a.onerror = res; a.play().catch(res); });
        await new Promise((res) => setTimeout(res, 250));
      } catch { /* keep going */ }
    }
    if (token.current === my) setPlaying(null);
  };
  useEffect(() => () => { token.current += 1; cur.current?.pause(); }, []);
  return { play, stop, playing };
}

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

function PlayBtn({ id, clips, player, label, big }) {
  const on = player.playing === id;
  return (
    <button type="button" className={`st-play${big ? ' is-big' : ''}${on ? ' is-on' : ''}`} aria-label={on ? 'Stop' : label}
      onClick={(e) => { e.stopPropagation(); player.play(id, clips); }}>
      {on ? <StopIcon /> : <PlayIcon />}
    </button>
  );
}

// A line of Thai as word tiles with romanization and English under each
function Tiles({ parts, onTap, swapIndex, onSwap, hint, flash }) {
  const first = parts.findIndex((p) => p.slot);
  return (
    <div className="st-tiles" lang="th">
      {parts.map((p, i) => {
        const swap = swapIndex === 'slot' ? !!p.slot : i === swapIndex;
        const lead = swap && (swapIndex !== 'slot' || i === first); // badge and hint on the first tile only
        return (
          <button key={`${i}-${p.th}`} type="button"
            className={`st-tile${p.th.length > 5 ? ' is-long' : ''}${swap ? ' is-swap' : ''}${swap && flash ? ' is-flash' : ''}${p.ending ? ' is-ending' : ''}`}
            onClick={() => (swap && onSwap ? onSwap() : onTap(p))}
            aria-label={swap && onSwap ? `${p.th}, ${p.en}. Tap to swap` : `${p.th}, ${p.en}. Tap to hear`}>
            {lead && onSwap && <span className="st-swap-badge" aria-hidden="true"><SwapIcon /></span>}
            {lead && hint && <span className="st-hint is-below" role="status">Tap to swap</span>}
            <span className="th">{p.th}</span>
            <span className="rom">{p.rom}</span>
            <span className="en">{p.ending ? 'polite' : p.en}</span>
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

function Bar({ step, steps }) {
  const i = steps.indexOf(step);
  return (
    <div className="st-top">
      <a className="st-close" href="/" aria-label="Leave">×</a>
      <div className="st-bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={i}>
        <i style={{ width: `${Math.max(6, (i / (steps.length - 1)) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function Start({ sceneId }) {
  const scene = SCENES[sceneId] || SCENES[DEFAULT_SCENE]; // (functions can't cross from the server, so look it up here)
  const { learn, check, finishToday, loaded, progress } = useProgressStore();
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
  const [flash, setFlash] = useState(false);
  const item = scene.items[itemIdx];
  const parts = replyParts(scene, item, reg);
  const ask = scene.staff.ask(item);
  const spiceParts = fu ? followParts(scene, spiceIdx, reg) : null;
  // Some answers don't go with some items (no "not sweet" Thai iced tea): fall back to the first
  useEffect(() => {
    if (fu && (fu.answers[spiceIdx].notFor || []).includes(item.th)) setSpiceIdx(0);
  }, [item.th]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickSpice = (i) => { setSpiceIdx(i); player.play('spice', [{ text: joinTh(followParts(scene, i, reg)), voice }]); };
  const swapIndex = 'slot';

  const say = (p) => player.play(`w-${p.th}`, [{ text: p.th, voice: p.ending ? voice : voice }]);
  const conversation = (it = item) => [
    { text: scene.staff.ask(it).th, voice: 'female' },
    { text: joinTh(replyParts(scene, it, reg)), voice },
    ...(fu ? [{ text: fu.staff.th, voice: 'female' }, { text: joinTh(followParts(scene, spiceIdx, reg)), voice }] : []),
  ];
  const go = (s) => { player.stop(); setStep(s); window.scrollTo(0, 0); track('scene_step', { scene: scene.id, step: s }); };

  const switchReg = (r) => {
    setReg(r); setRegister(r); setRegChosen(true);
    player.play('both', [{ text: scene.staff.ask(item).th, voice: 'female' }, { text: joinTh(replyParts(scene, item, r)), voice: r }]);
  };

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
    const pool = shuffle(prev.items.filter((it) => it.th !== rw.th)).slice(0, 2);
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
    const next = (itemIdx + 1) % scene.items.length;
    const it = scene.items[next];
    setItemIdx(next);
    setFlash(true); setTimeout(() => setFlash(false), 450);
    player.play('both', [{ text: scene.staff.ask(it).th, voice: 'female' }, { text: joinTh(replyParts(scene, it, reg)), voice }]);
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
    const others = (it) => [...shuffle(madeItems.filter((o) => o.th !== it.th)), ...scene.items.filter((o) => !made.includes(o.th))].slice(0, 2);
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
        clip: asks ? [{ text: scene.staff.ask(it).th, voice: 'female' }] : [{ text: joinTh(replyParts(scene, it, reg)), voice }],
        slowClip: asks ? [{ text: scene.staff.ask(it).th, voice: 'female', slow: true }] : [{ text: spaced(replyParts(scene, it, reg)), voice, slow: true }],
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
  useEffect(() => { if (step === 'listen') { setQueue(listenItems); setQi(0); setPicked(null); setRetried(false); } }, [step, listenItems]);
  const q = queue[qi];
  useEffect(() => { if (step === 'listen' && q && !picked) player.play(`q-${qi}`, q.clip); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, qi, queue]);
  const answer = (o) => {
    if (picked) return;
    setPicked(o.key);
    if (o.key === q.key) soundRight(); else soundWrong();
    if (o.key !== q.key && !retried) { setRetried(true); setQueue((qq) => [...qq, { ...q, again: true }]); }
  };
  const nextQ = () => {
    setPicked(null);
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
    const others = shuffle(words.filter((w) => w.th !== cw.th)).slice(0, 2);
    return shuffle([cw, ...others]).map((w) => ({ key: w.th, en: w.en }));
  }, [cw, words]);
  useEffect(() => { if (step === 'check' && cw && !cPicked) player.play(`c-${ci}`, [{ text: cw.th, voice }]); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, ci]);
  const cAnswer = (o) => { if (cPicked) return; setCPicked(o.key); results.current[cw.th] = o.key === cw.th; if (o.key === cw.th) soundRight(); else soundWrong(); };
  const cNext = () => {
    setCPicked(null);
    if (ci + 1 < words.length) { setCi(ci + 1); return; }
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
    const mineEn = scene.missionFull ? `${item.en.charAt(0).toUpperCase()}${item.en.slice(1)}, ${fu.answers[spiceIdx].adj}, please.` : fu ? fu.answers[spiceIdx].en : scene.replyEn(scene.items[0]);
    writeStore(MISSION_KEY, { scene: scene.id, th: joinTh(mine), rom: joinRom(mine), en: mineEn, text: scene.mission, day: dayKey(), done: false });
    go('done');
  };

  if (!loaded) return <div className="st-wrap" />;

  return (
    <div className="st-wrap">
      <Bar step={step} steps={steps} />
      <div className="st-body">

        {step === 'recall' && prev && rStage === 0 && (
          <section className="st-card">
            <p className="st-place">Yesterday · {prev.place}</p>
            <h1 className="st-title">Remember this?</h1>
            <div className="st-bubble is-them">
              <span className="st-who">{prev.staff.who} asks</span>
              <div className="st-line">
                <PlayBtn id="rask" clips={[{ text: prev.staff.ask(prevItem).th, voice: 'female' }]} player={player} label="Play the question" />
                <div><p className="th" lang="th">{prev.staff.ask(prevItem).th}</p><p className="rom">{prev.staff.ask(prevItem).rom}</p><BlurEn className="en" text={prev.staff.ask(prevItem).en} /></div>
              </div>
            </div>
            <p className="st-sub">Build your answer: <b>{prev.replyEn(prevItem)}</b></p>
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
            <p className="st-place">Yesterday's words · {rStage} of {prevWords.length}</p>
            <h1 className="st-title">What does it mean?</h1>
            <div className="st-word">
              <PlayBtn id={`r-${rStage}`} clips={[{ text: rw.th, voice }]} player={player} label="Play the word" />
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
            <p className="st-place">{scene.place}</p>
            <h1 className="st-title">The conversation</h1>
            <div className={`st-reg is-top${regChosen ? '' : ' is-ask'}`} role="radiogroup" aria-label="I speak as">
              <span>I'm speaking as:</span>
              {[['female', 'Woman', 'ค่ะ'], ['male', 'Man', 'ครับ']].map(([r, label, end]) => (
                <button key={r} type="button" role="radio" aria-checked={regChosen && reg === r} className={regChosen && reg === r ? 'on' : ''} onClick={() => switchReg(r)}>
                  {label} <span lang="th">{end}</span>
                </button>
              ))}
            </div>
            <div className="st-bubble is-them">
              <span className="st-who">{scene.staff.who} asks</span>
              <div className="st-line">
                <PlayBtn id="ask" clips={[{ text: ask.th, voice: 'female' }]} player={player} label="Play the question" />
                <div><p className="th" lang="th">{ask.th}</p><p className="rom">{ask.rom}</p><BlurEn className="en" text={ask.en} /></div>
              </div>
            </div>
            <div className="st-bubble is-you">
              <span className="st-who">You say</span>
              <div className="st-line">
                <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play your answer" />
                <div><p className="th" lang="th">{joinTh(parts)}</p><p className="rom">{joinRom(parts)}</p><BlurEn className="en" text={scene.replyEn(item)} /></div>
              </div>
            </div>
            {fu && (
              <>
                <div className="st-bubble is-them">
                  <span className="st-who">{scene.staff.who} asks</span>
                  <div className="st-line">
                    <PlayBtn id="fask" clips={[{ text: fu.staff.th, voice: 'female' }]} player={player} label="Play the question" />
                    <div><p className="th" lang="th">{fu.staff.th}</p><p className="rom">{fu.staff.rom}</p><BlurEn className="en" text={fu.staff.en} /></div>
                  </div>
                </div>
                <div className="st-bubble is-you">
                  <span className="st-who">You say</span>
                  <div className="st-line">
                    <PlayBtn id="spice" clips={[{ text: joinTh(spiceParts), voice }]} player={player} label="Play your answer" />
                    <div><p className="th" lang="th">{joinTh(spiceParts)}</p><p className="rom">{joinRom(spiceParts)}</p><BlurEn className="en" text={fu.answers[spiceIdx].en} /></div>
                  </div>
                </div>
              </>
            )}
            <button type="button" className="st-cta" disabled={!regChosen} onClick={() => {
              if (!heard) { setHeard(true); player.play('both', conversation()); } else go('parts');
            }}>{!regChosen ? 'Choose woman or man above' : heard ? 'Next: how it works' : 'Hear the conversation'}</button>
          </section>
        )}

        {step === 'parts' && (
          <section className="st-card">
            <p className="st-place">{scene.place}</p>
            <h1 className="st-title">{fu ? 'Word by word' : `${parts.length} little words`}</h1>
            <p className="st-sub">Tap each one to hear it.</p>
            <Tiles parts={parts} onTap={say} />
            <div className="st-whole">
              <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play the whole sentence" />
              <SlowBtn id="slow" clips={[{ text: spaced(parts), voice, slow: true }]} player={player} />
              <span className="en">{scene.replyEn(item)}</span>
            </div>
            {fu && (
              <>
                <p className="st-row-label">{scene.staff.who} asks <span lang="th">{fu.staff.th}</span> <i>{fu.staff.rom}</i>, {fu.staff.en.toLowerCase()} You say:</p>
                <Tiles parts={spiceParts} onTap={say} />
                <div className="st-whole">
                  <PlayBtn id="spice" clips={[{ text: joinTh(spiceParts), voice }]} player={player} label="Play the whole sentence" />
                  <SlowBtn id="slow2" clips={[{ text: spaced(spiceParts), voice, slow: true }]} player={player} />
                  <span className="en">{fu.answers[spiceIdx].en}</span>
                </div>
              </>
            )}
            <button type="button" className="st-cta" onClick={() => go('swap')}>Next: make your own</button>
          </section>
        )}

        {step === 'swap' && (
          <section className="st-card">
            <p className="st-place">{scene.place}</p>
            <h1 className="st-title">Now make your own</h1>
            {scene.swapOn === 'ask' ? (
              <>
                <p className="st-sub">Tap her question to change what she offers. Your answer changes with it.</p>
                <button type="button" className={`st-bubble is-them is-small is-swap${flash ? ' is-flash' : ''}`} onClick={swap} aria-label={`${ask.th}, ${ask.en} Tap to change`}>
                  <span className="st-swap-badge" aria-hidden="true"><SwapIcon /></span>
                  {made.length === 1 && <span className="st-hint is-below" role="status">Tap to change</span>}
                  <span className="st-who">{scene.staff.who} asks</span>
                  <span className="th" lang="th">{ask.th}</span>
                  <span className="rom">{ask.rom}</span>
                  <span className="en">{ask.en}</span>
                </button>
                <p className="st-you-say">You say:</p>
                <Tiles parts={parts} onTap={say} swapIndex={swapIndex} flash={flash} />
              </>
            ) : (
              <>
                <p className="st-sub">Swap {scene.slotLabel} and you have a new sentence.</p>
                <div className="st-bubble is-them is-small">
                  <div className="st-line">
                    <PlayBtn id="ask" clips={[{ text: ask.th, voice: 'female' }]} player={player} label="Play the question" />
                    <div><p className="th" lang="th">{ask.th}</p><p className="rom">{ask.rom}</p><BlurEn className="en" text={ask.en} /></div>
                  </div>
                </div>
                <Tiles parts={parts} onTap={say} swapIndex={swapIndex} onSwap={swap} hint={made.length === 1} flash={flash} />
              </>
            )}
            <div className="st-whole">
              <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play the sentence" />
              <SlowBtn id="slow" clips={[{ text: spaced(parts), voice, slow: true }]} player={player} />
              <span className="en">{scene.replyEn(item)}</span>
            </div>
            {fu && (
              <div className="st-spice">
                <div className="st-bubble is-them is-small">
                  <div className="st-line">
                    <PlayBtn id="fask" clips={[{ text: fu.staff.th, voice: 'female' }]} player={player} label="Play the question" />
                    <div><p className="th" lang="th">{fu.staff.th}</p><p className="rom">{fu.staff.rom}</p><BlurEn className="en" text={fu.staff.en} /></div>
                  </div>
                </div>
                <p className="st-choose">You say:</p>
                <div className="st-choices" role="radiogroup" aria-label="How spicy?">
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
            )}
            <p className={`st-toast${toast ? ' is-on' : ''}`} role="status">{toast || ' '}</p>
            {made.length < needSwaps ? (
              <p className="st-gate" aria-live="polite">
                <span className="dots" aria-hidden="true">{Array.from({ length: needSwaps }, (_, k) => <i key={k} className={k < made.length ? 'on' : ''} />)}</span>
                {made.length} of {needSwaps} sentences made. {scene.swapOn === 'ask' ? 'Tap her question to make another.' : 'Tap ↻ to make another.'}
              </p>
            ) : (
              <button type="button" className="st-cta" onClick={() => go('listen')}>Next: test your ear</button>
            )}
          </section>
        )}

        {step === 'listen' && q && (
          <section className="st-card">
            <p className="st-place">Test your ear · {Math.min(qi + 1, 3)} of 3{q.again ? ' · again' : ''}</p>
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
                  : <p>Not quite. You heard <b lang="th">{q.fb.th}</b> ({q.fb.rom}){q.fb.name ? '' : ` = ${q.fb.en.replace(/\.$/, '')}`}. {retried && !q.again ? 'It comes back once more.' : ''}</p>}
                <button type="button" className="st-cta" onClick={nextQ}>Continue</button>
              </div>
            )}
          </section>
        )}

        {step === 'check' && cw && (
          <section className="st-card">
            <p className="st-place">Quick check · {ci + 1} of {words.length}</p>
            <h1 className="st-title">What does it mean?</h1>
            <div className="st-word">
              <PlayBtn id={`c-${ci}`} clips={[{ text: cw.th, voice }]} player={player} label="Play the word" />
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
          <Done scene={scene} reg={reg} voice={voice} player={player} madeItems={madeItems} spiceIdx={spiceIdx} item={item} user={ready ? user : null} />
        )}
      </div>
    </div>
  );
}

// ---- 6. done ----------------------------------------------------------
// One job per band, top to bottom: celebrate (how much you can now say),
// show it (your lines, tap to hear), use it (today's mission), come back
// (tomorrow's teaser), keep it (save progress, one tap with Google).
const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>
);
// Instagram, TikTok, Facebook and LINE open links in their own browser,
// where Google sign-in is blocked. Email works there.
const inAppBrowser = () => {
  try { return /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|Bytedance/i.test(navigator.userAgent); } catch { return false; }
};
const CalIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
// A calendar reminder for tomorrow at 8am (works on phones and laptops, no account needed)
function reminderIcs(scene) {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const end = new Date(d.getTime() + 10 * 60000);
  const title = `Soi Talk: ${scene.tomorrow || 'today\'s Thai'} (2 min)`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Soi Talk//EN', 'BEGIN:VEVENT', `UID:${Date.now()}@soitalk.app`,
    `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, `SUMMARY:${title}`,
    'DESCRIPTION:Your next 2 minutes of Thai: https://soitalk.app/today', 'URL:https://soitalk.app/today',
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
const CONFETTI = ['#ED1C24', '#FFFFFF', '#241D4F', '#F2C200', '#ED1C24', '#F2C200', '#FFFFFF', '#241D4F', '#F2C200', '#ED1C24', '#FFFFFF', '#F2C200', '#241D4F', '#ED1C24', '#F2C200', '#FFFFFF'];

function Done({ scene, reg, voice, player, madeItems, spiceIdx, item, user }) {
  const fu = scene.followUp;
  const lines = [
    ...madeItems.map((it) => ({ id: `s-${it.th}`, parts: replyParts(scene, it, reg), en: scene.replyEn(it) })),
    ...(fu ? fu.answers.map((x, i) => ({ id: `f-${x.key}`, parts: followParts(scene, i, reg), en: x.en })) : []),
  ];
  const mission = missionParts(scene, reg, spiceIdx, item);
  const [all, setAll] = useState(false);
  const missionEn = scene.missionFull ? `${item.en.charAt(0).toUpperCase()}${item.en.slice(1)}, ${fu.answers[spiceIdx].adj}, please.` : fu ? fu.answers[spiceIdx].en : scene.replyEn(scene.items[0]);
  const [inApp, setInApp] = useState(false);
  useEffect(() => { setInApp(inAppBrowser()); soundDone(); }, []);
  const google = async () => {
    try { localStorage.setItem('tsc-after-signin', '/today'); } catch {}
    await supabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };

  return (
    <section className="dn">
      <div className="dn-hero">
        <div className="dn-confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => <i key={i} style={{ '--c': c, '--x': `${i % 2 ? 78 + ((i * 7) % 20) : 2 + ((i * 11) % 18)}%`, '--d': `${(i % 5) * 0.06}s`, '--r': `${(i * 53) % 360}deg` }} />)}
        </div>
        <b className="dn-num">{lines.length}</b>
        <div className="dn-hero-text">
          <p className="dn-cheer"><span lang="th">เก่งมาก!</span> <i>gèng mâak · great job</i></p>
          <p className="dn-count">new phrases you can say in Thai</p>
        </div>
      </div>

      {/* The one line to use today: the big thing on this screen */}
      <button type="button" className={`dn-use${player.playing === 'mission' ? ' is-on' : ''}`}
        onClick={() => player.play('mission', [{ text: joinTh(mission), voice }])} aria-label={`Play: ${joinTh(mission)}`}>
        <span className="dn-label">Say it today</span>
        <span className="dn-use-line" lang="th">{joinTh(mission)}</span>
        <span className="dn-use-rom">{joinRom(mission)}</span>
        <span className="dn-use-en">{missionEn}</span>
        <span className="dn-use-when">When: {scene.mission.charAt(0).toLowerCase()}{scene.mission.slice(1)}</span>
        <span className="dn-use-play" aria-hidden="true">{player.playing === 'mission' ? <StopIcon /> : <PlayIcon />}</span>
      </button>

      {all ? (
        <div className="dn-lines" role="list">
          {lines.map((l) => {
            const on = player.playing === l.id;
            return (
              <button key={l.id} type="button" role="listitem" className={`dn-line${on ? ' is-on' : ''}`}
                onClick={() => player.play(l.id, [{ text: joinTh(l.parts), voice }])} aria-label={`Play: ${l.en}`}>
                <span className="dn-line-text">
                  <span className="th" lang="th">{joinTh(l.parts)}</span>
                  <span className="rom">{joinRom(l.parts)}</span>
                </span>
                <span className="en">{l.en}</span>
                <span className="dn-line-play" aria-hidden="true">{on ? <StopIcon /> : <PlayIcon />}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <button type="button" className="dn-more" onClick={() => setAll(true)}>See all {lines.length} phrases</button>
      )}

      <div className="dn-back">
        <p className="dn-label">Tomorrow · about 2 minutes</p>
        <p className="dn-back-title">{scene.tomorrow || scene.teaser.title.replace(/^Tomorrow: /, '')}</p>
        <button type="button" className={`dn-back-line${player.playing === 'teaser' ? ' is-on' : ''}`}
          onClick={() => player.play('teaser', [{ text: scene.teaser.th + endingFor(reg).th, voice }])} aria-label="Hear tomorrow's sentence">
          <span className="dn-line-play" aria-hidden="true">{player.playing === 'teaser' ? <StopIcon /> : <PlayIcon />}</span>
          <span><span className="th" lang="th">{scene.teaser.th}{endingFor(reg).th}</span><span className="rom">{scene.teaser.rom} {endingFor(reg).rom} · {scene.teaser.en}</span></span>
        </button>
        <a className="dn-remind" href={reminderIcs(scene)} download="soi-talk-tomorrow.ics">
          <CalIcon /> Remind me tomorrow
        </a>
      </div>

      <div className="dn-save">
        {user ? (
          <a className="st-cta" href="/today">Go to Today</a>
        ) : inApp ? (
          <>
            <a className="st-cta" href="/signin?next=/today">Save my {lines.length} phrases (free)</a>
            <p className="dn-save-note">Google sign-in doesn't work inside Instagram, TikTok or LINE, so use your email (or open soitalk.app in Safari or Chrome). <a href="/today">Not now</a></p>
          </>
        ) : (
          <>
            <button type="button" className="dn-google" onClick={google}><GoogleG /> Save my {lines.length} phrases with Google</button>
            <p className="dn-save-note">Free. Keep your phrases and pick up tomorrow. <span className="dn-links"><a href="/signin?next=/today">Use email</a> · <a href="/today" className="dn-not-now">Not now</a></span></p>
          </>
        )}
      </div>
    </section>
  );
}
