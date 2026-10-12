'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgressStore, readStore, writeStore, dayKey } from '../lib/progress';
import { getRegister, setRegister } from '../lib/register';
import { useUser } from '../lib/useUser';
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

const AUDIO_VERSION = 2; // keep in step with Deck.js
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
        const a = new Audio(`/api/speak?text=${encodeURIComponent(c.text)}&voice=${c.voice}${c.slow ? '&slow=1' : ''}&v=${AUDIO_VERSION}`);
        a.preservesPitch = true; a.webkitPreservesPitch = true;
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
  return (
    <div className="st-tiles" lang="th">
      {parts.map((p, i) => {
        const swap = i === swapIndex;
        return (
          <button key={`${i}-${p.th}`} type="button"
            className={`st-tile${p.th.length > 5 ? ' is-long' : ''}${swap ? ' is-swap' : ''}${swap && flash ? ' is-flash' : ''}${p.ending ? ' is-ending' : ''}`}
            onClick={() => (swap && onSwap ? onSwap() : onTap(p))}
            aria-label={swap && onSwap ? `${p.th}, ${p.en}. Tap to swap` : `${p.th}, ${p.en}. Tap to hear`}>
            {swap && onSwap && <span className="st-swap-badge" aria-hidden="true"><SwapIcon /></span>}
            {swap && hint && <span className="st-hint" role="status">Tap to swap</span>}
            <span className="th">{p.th}</span>
            <span className="rom">{p.rom}</span>
            <span className="en">{p.ending ? 'polite' : p.en}</span>
          </button>
        );
      })}
    </div>
  );
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
  useEffect(() => { setReg(getRegister()); }, []);
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
  const pickSpice = (i) => { setSpiceIdx(i); player.play('spice', [{ text: joinTh(followParts(scene, i, reg)), voice }]); };
  const swapIndex = scene.reply.findIndex((p) => p.slot);

  const say = (p) => player.play(`w-${p.th}`, [{ text: p.th, voice: p.ending ? voice : voice }]);
  const conversation = (it = item) => [
    { text: scene.staff.ask(it).th, voice: 'female' },
    { text: joinTh(replyParts(scene, it, reg)), voice },
    ...(fu ? [{ text: fu.staff.th, voice: 'female' }, { text: joinTh(followParts(scene, spiceIdx, reg)), voice }] : []),
  ];
  const go = (s) => { player.stop(); setStep(s); window.scrollTo(0, 0); };

  const switchReg = (r) => {
    setReg(r); setRegister(r);
    player.play('reply', [{ text: joinTh(replyParts(scene, item, r)), voice: r }]);
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
  const rAnswer = (o) => { if (rPicked) return; setRPicked(o.key); check(rw.th, o.key === rw.th ? 'good' : 'again'); };
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
    player.play('reply', [{ text: joinTh(replyParts(scene, it, reg)), voice }]);
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
          opts: shuffle([...fu.answers.map((x) => ({ key: x.key, en: x.en })), { key: 'wrong', en: fu.wrong }]),
          fb: { th: joinTh(ans.parts), rom: joinRom(ans.parts), en: ans.en },
        };
      }
      const asks = kind === 'ask';
      return {
        kind, key: it.th,
        title: asks ? `What is ${scene.staff.who.toLowerCase()} asking?` : scene.followUp ? 'What did you order?' : 'What did you say?',
        clip: asks ? [{ text: scene.staff.ask(it).th, voice: 'female' }] : [{ text: joinTh(replyParts(scene, it, reg)), voice }],
        opts: shuffle([it, ...others(it)]).map((o) => ({ key: o.th, en: asks ? scene.staff.ask(o).en : scene.replyEn(o) })),
        fb: { th: it.th, rom: it.rom, en: it.en },
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
      .slice(0, 6);
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
  const cAnswer = (o) => { if (cPicked) return; setCPicked(o.key); results.current[cw.th] = o.key === cw.th; };
  const cNext = () => {
    setCPicked(null);
    if (ci + 1 < words.length) { setCi(ci + 1); return; }
    // Record: these words join the spaced reviews (first check tomorrow)
    for (const w of words) learn(w.th, !!results.current[w.th]);
    for (const it of madeItems) if (!progress[it.th]) learn(it.th, false); // tested in listening; first check tomorrow
    learn(endingFor(reg).th, true);
    setRegister(reg);
    finishToday();
    if (!readStore(FIRST_KEY, null)) writeStore(FIRST_KEY, { scene: scene.id, made, day: dayKey() });
    writeStore(SCENES_KEY, { ...readStore(SCENES_KEY, {}), [scene.id]: dayKey() });
    const mine = missionParts(scene, reg, spiceIdx);
    const mineEn = fu ? fu.answers[spiceIdx].en : scene.replyEn(scene.items[0]);
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
                <div><p className="th" lang="th">{prev.staff.ask(prevItem).th}</p><p className="rom">{prev.staff.ask(prevItem).rom}</p><p className="en">{prev.staff.ask(prevItem).en}</p></div>
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
                return <button key={o.key} type="button" className={`st-opt${cls}`} onClick={() => rAnswer(o)} disabled={!!rPicked}>{rPicked && right && <span aria-hidden="true">✓ </span>}{o.en}</button>;
              })}
            </div>
            {rPicked && <button type="button" className="st-cta" onClick={rNext}>{rStage < prevWords.length ? 'Next word' : 'On to today'}</button>}
          </section>
        )}

        {step === 'scene' && (
          <section className="st-card">
            <p className="st-place">{scene.place}</p>
            <h1 className="st-title">{scene.promise}</h1>
            <div className="st-bubble is-them">
              <span className="st-who">{scene.staff.who} asks</span>
              <div className="st-line">
                <PlayBtn id="ask" clips={[{ text: ask.th, voice: 'female' }]} player={player} label="Play the question" />
                <div><p className="th" lang="th">{ask.th}</p><p className="rom">{ask.rom}</p><p className="en">{ask.en}</p></div>
              </div>
            </div>
            <div className="st-bubble is-you">
              <span className="st-who">You say</span>
              <div className="st-line">
                <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play your answer" />
                <div><p className="th" lang="th">{joinTh(parts)}</p><p className="rom">{joinRom(parts)}</p><p className="en">{scene.replyEn(item)}</p></div>
              </div>
              <div className="st-reg" role="radiogroup" aria-label="I speak as">
                <span>I speak as</span>
                {[['female', 'Woman', 'ค่ะ'], ['male', 'Man', 'ครับ']].map(([r, label, end]) => (
                  <button key={r} type="button" role="radio" aria-checked={reg === r} className={reg === r ? 'on' : ''} onClick={() => switchReg(r)}>
                    {label} <span lang="th">{end}</span>
                  </button>
                ))}
              </div>
            </div>
            {fu && (
              <>
                <div className="st-bubble is-them">
                  <span className="st-who">{scene.staff.who} asks</span>
                  <div className="st-line">
                    <PlayBtn id="fask" clips={[{ text: fu.staff.th, voice: 'female' }]} player={player} label="Play the question" />
                    <div><p className="th" lang="th">{fu.staff.th}</p><p className="rom">{fu.staff.rom}</p><p className="en">{fu.staff.en}</p></div>
                  </div>
                </div>
                <div className="st-bubble is-you">
                  <span className="st-who">You say</span>
                  <div className="st-line">
                    <PlayBtn id="spice" clips={[{ text: joinTh(spiceParts), voice }]} player={player} label="Play your answer" />
                    <div><p className="th" lang="th">{joinTh(spiceParts)}</p><p className="rom">{joinRom(spiceParts)}</p><p className="en">{fu.answers[spiceIdx].en}</p></div>
                  </div>
                </div>
              </>
            )}
            <button type="button" className="st-cta" onClick={() => {
              if (!heard) { setHeard(true); player.play('both', conversation()); } else go('parts');
            }}>{heard ? 'Next: how it works' : 'Hear the conversation'}</button>
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
              <button type="button" className="st-slow" aria-label="Play slowly" onClick={() => player.play('slow', [{ text: joinTh(parts), voice, slow: true }])}><SlowIcon /></button>
              <span className="en">{scene.replyEn(item)}</span>
            </div>
            {fu && (
              <>
                <p className="st-row-label">{scene.staff.who} asks <span lang="th">{fu.staff.th}</span> <i>{fu.staff.rom}</i>, {fu.staff.en.toLowerCase()} You say:</p>
                <Tiles parts={spiceParts} onTap={say} />
                <div className="st-whole">
                  <PlayBtn id="spice" clips={[{ text: joinTh(spiceParts), voice }]} player={player} label="Play the whole sentence" />
                  <button type="button" className="st-slow" aria-label="Play slowly" onClick={() => player.play('slow2', [{ text: joinTh(spiceParts), voice, slow: true }])}><SlowIcon /></button>
                  <span className="en">{fu.answers[spiceIdx].en}</span>
                </div>
              </>
            )}
            <p className="st-note"><span lang="th">{endingFor(reg).th}</span> makes it polite. You'll add it to almost everything you say.</p>
            <button type="button" className="st-cta" onClick={() => go('swap')}>Next: make your own</button>
          </section>
        )}

        {step === 'swap' && (
          <section className="st-card">
            <p className="st-place">{scene.place}</p>
            <h1 className="st-title">Now make your own</h1>
            <p className="st-sub">Swap {scene.slotLabel} and you have a new sentence.</p>
            <div className="st-bubble is-them is-small">
              <div className="st-line">
                <PlayBtn id="ask" clips={[{ text: ask.th, voice: 'female' }]} player={player} label="Play the question" />
                <div><p className="th" lang="th">{ask.th}</p><p className="rom">{ask.rom}</p><p className="en">{ask.en}</p></div>
              </div>
            </div>
            <Tiles parts={parts} onTap={say} swapIndex={swapIndex} onSwap={swap} hint={made.length === 1} flash={flash} />
            <div className="st-whole">
              <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play the sentence" />
              <button type="button" className="st-slow" aria-label="Play slowly" onClick={() => player.play('slow', [{ text: joinTh(parts), voice, slow: true }])}><SlowIcon /></button>
              <span className="en">{scene.replyEn(item)}</span>
            </div>
            {fu && (
              <div className="st-spice">
                <div className="st-bubble is-them is-small">
                  <div className="st-line">
                    <PlayBtn id="fask" clips={[{ text: fu.staff.th, voice: 'female' }]} player={player} label="Play the question" />
                    <div><p className="th" lang="th">{fu.staff.th}</p><p className="rom">{fu.staff.rom}</p><p className="en">{fu.staff.en}</p></div>
                  </div>
                </div>
                <p className="st-choose">You say (pick one)</p>
                <div className="st-choices" role="radiogroup" aria-label="How spicy?">
                  {fu.answers.map((x, i) => {
                    const ps = followParts(scene, i, reg);
                    return (
                      <button key={x.key} type="button" role="radio" aria-checked={spiceIdx === i} className={spiceIdx === i ? 'on' : ''} onClick={() => pickSpice(i)}>
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
                {made.length} of {needSwaps} sentences made. Tap ↻ to make another.
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
              <button type="button" className="st-slow" aria-label="Play slowly" onClick={() => player.play('slow', q.clip.map((c) => ({ ...c, slow: true })))}><SlowIcon /></button>
            </div>
            <div className="st-opts">
              {q.opts.map((o) => {
                const right = o.key === q.key;
                const cls = picked ? (right ? ' is-right' : o.key === picked ? ' is-wrong' : ' is-dim') : '';
                return (
                  <button key={o.key} type="button" className={`st-opt${cls}`} onClick={() => answer(o)} disabled={!!picked}>
                    {picked && right && <span aria-hidden="true">✓ </span>}{picked && !right && o.key === picked && <span aria-hidden="true">✕ </span>}{o.en}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="st-feedback" role="status">
                {picked === q.key
                  ? <p><b>Right.</b> <span lang="th">{q.fb.th}</span> ({q.fb.rom}) = {q.fb.en.replace(/\.$/, '')}.</p>
                  : <p>Not quite. You heard <b lang="th">{q.fb.th}</b> ({q.fb.rom}) = {q.fb.en.replace(/\.$/, '')}. {retried && !q.again ? 'It comes back once more.' : ''}</p>}
                <button type="button" className="st-cta" onClick={nextQ}>Continue</button>
              </div>
            )}
          </section>
        )}

        {step === 'check' && cw && (
          <section className="st-card">
            <p className="st-place">Your {words.length} new words · {ci + 1} of {words.length}</p>
            <h1 className="st-title">What does it mean?</h1>
            <div className="st-word">
              <PlayBtn id={`c-${ci}`} clips={[{ text: cw.th, voice }]} player={player} label="Play the word" />
              <div><p className="th" lang="th">{cw.th}</p><p className="rom">{cw.rom}</p></div>
            </div>
            <div className="st-opts">
              {cOpts.map((o) => {
                const right = o.key === cw.th;
                const cls = cPicked ? (right ? ' is-right' : o.key === cPicked ? ' is-wrong' : ' is-dim') : '';
                return <button key={o.key} type="button" className={`st-opt${cls}`} onClick={() => cAnswer(o)} disabled={!!cPicked}>{cPicked && right && <span aria-hidden="true">✓ </span>}{o.en}</button>;
              })}
            </div>
            {cPicked && <button type="button" className="st-cta" onClick={cNext}>{ci + 1 < words.length ? 'Next word' : 'Finish'}</button>}
          </section>
        )}

        {step === 'done' && (
          <section className="st-card st-done">
            <p className="st-place">{scene.place} · done</p>
            <h1 className="st-title">You can now say</h1>
            <p className="st-win">+{madeItems.length + (fu ? fu.answers.length : 0)} things you can say in Thai</p>
            <ul className="st-said">
              {madeItems.map((it) => {
                const p = replyParts(scene, it, reg);
                return (
                  <li key={it.th}>
                    <PlayBtn id={`s-${it.th}`} clips={[{ text: joinTh(p), voice }]} player={player} label={`Play ${scene.replyEn(it)}`} />
                    <div><p className="th" lang="th">{joinTh(p)}</p><p className="rom">{joinRom(p)}</p><p className="en">{scene.replyEn(it)}</p></div>
                  </li>
                );
              })}
              {fu && fu.answers.map((x, i) => {
                const p = followParts(scene, i, reg);
                return (
                  <li key={x.key}>
                    <PlayBtn id={`f-${x.key}`} clips={[{ text: joinTh(p), voice }]} player={player} label={`Play ${x.en}`} />
                    <div><p className="th" lang="th">{joinTh(p)}</p><p className="rom">{joinRom(p)}</p><p className="en">{x.en}</p></div>
                  </li>
                );
              })}
            </ul>
            {scene.next && (
              <p className="st-next">Next, she may ask <span lang="th">{scene.next.th}</span> <i>{scene.next.rom}</i>, {scene.next.en.toLowerCase()} That's coming soon.</p>
            )}
            {scene.alsoHeard && (
              <p className="st-also">Also natural: <span lang="th">{scene.alsoHeard.th}{endingFor(reg).th}</span> <i>{scene.alsoHeard.rom} {endingFor(reg).rom}</i>, {scene.alsoHeard.en}.</p>
            )}
            <div className="st-mission">
              <p className="st-mission-label">Your mission</p>
              <p>{scene.mission}</p>
              <p className="st-mission-line"><span lang="th">{joinTh(missionParts(scene, reg, spiceIdx))}</span></p>
              <p className="st-mission-rom">{joinRom(missionParts(scene, reg, spiceIdx))}</p>
              <p className="st-mission-foot">Come back and tick it off. No pressure if you don't get the chance.</p>
            </div>
            <div className="st-teaser">
              <p className="st-teaser-label">{scene.teaser.title}</p>
              <div className="st-line">
                <PlayBtn id="teaser" clips={[{ text: scene.teaser.th + endingFor(reg).th, voice }]} player={player} label="Hear tomorrow's sentence" />
                <div><p className="th" lang="th">{scene.teaser.th}{endingFor(reg).th}</p><p className="rom">{scene.teaser.rom} {endingFor(reg).rom}</p><p className="en">{scene.teaser.en}</p></div>
              </div>
            </div>
            {ready && user ? (
              <a className="st-cta" href="/today">Go to Today</a>
            ) : (
              <>
                <a className="st-cta" href="/signin?next=/today">Save my progress</a>
                <a className="st-later" href="/today">Not now</a>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
