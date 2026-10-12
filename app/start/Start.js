'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgressStore, readStore, writeStore, dayKey } from '../lib/progress';
import { getRegister, setRegister } from '../lib/register';
import { useUser } from '../lib/useUser';
import { SCENES, DEFAULT_SCENE, replyParts, joinTh, joinRom, endingFor } from '../lib/scenes';

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
            className={`st-tile${swap ? ' is-swap' : ''}${swap && flash ? ' is-flash' : ''}${p.ending ? ' is-ending' : ''}`}
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

function Bar({ step }) {
  const i = STEPS.indexOf(step);
  return (
    <div className="st-top">
      <a className="st-close" href="/" aria-label="Leave">×</a>
      <div className="st-bar" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length - 1} aria-valuenow={i}>
        <i style={{ width: `${Math.max(6, (i / (STEPS.length - 1)) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function Start({ sceneId }) {
  const scene = SCENES[sceneId] || SCENES[DEFAULT_SCENE]; // (functions can't cross from the server, so look it up here)
  const { learn, finishToday, loaded } = useProgressStore();
  const { user, ready } = useUser();
  const player = usePlayer();
  const [step, setStep] = useState('scene');
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
  const swapIndex = scene.reply.findIndex((p) => p.slot);

  const say = (p) => player.play(`w-${p.th}`, [{ text: p.th, voice: p.ending ? voice : voice }]);
  const conversation = (it = item) => [
    { text: scene.staff.ask(it).th, voice: 'female' },
    { text: joinTh(replyParts(scene, it, reg)), voice },
  ];
  const go = (s) => { player.stop(); setStep(s); window.scrollTo(0, 0); };

  const switchReg = (r) => {
    setReg(r); setRegister(r);
    player.play('reply', [{ text: joinTh(replyParts(scene, item, r)), voice: r }]);
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
    const opts = (kind, it) => {
      const others = [...shuffle(madeItems.filter((o) => o.th !== it.th)), ...scene.items.filter((o) => !made.includes(o.th))].slice(0, 2);
      return shuffle([it, ...others]).map((o) => ({ key: o.th, en: kind === 'ask' ? scene.staff.ask(o).en : scene.replyEn(o) }));
    };
    return [
      { kind: 'ask', it: its[0], opts: opts('ask', its[0]) },
      { kind: 'reply', it: its[1 % its.length], opts: opts('reply', its[1 % its.length]) },
      { kind: 'ask', it: its[2 % its.length], opts: opts('ask', its[2 % its.length]) },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [retried, setRetried] = useState(false);
  useEffect(() => { if (step === 'listen') { setQueue(listenItems); setQi(0); setPicked(null); setRetried(false); } }, [step, listenItems]);
  const q = queue[qi];
  const qClip = (x) => (x.kind === 'ask'
    ? [{ text: scene.staff.ask(x.it).th, voice: 'female' }]
    : [{ text: joinTh(replyParts(scene, x.it, reg)), voice }]);
  useEffect(() => { if (step === 'listen' && q && !picked) player.play(`q-${qi}`, qClip(q)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, qi, queue]);
  const answer = (o) => {
    if (picked) return;
    setPicked(o.key);
    if (o.key !== q.it.th && !retried) { setRetried(true); setQueue((qq) => [...qq, { ...q, again: true }]); }
  };
  const nextQ = () => {
    setPicked(null);
    if (qi + 1 < queue.length) setQi(qi + 1); else go('check');
  };

  // ---- 5. word check -------------------------------------------------
  const words = useMemo(() => {
    const fixed = scene.reply.filter((p) => !p.slot);
    return [...fixed, ...madeItems].slice(0, 5);
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
    learn(endingFor(reg).th, true);
    setRegister(reg);
    finishToday();
    writeStore(FIRST_KEY, { scene: scene.id, made, day: dayKey() });
    const mine = replyParts(scene, scene.items[0], reg);
    writeStore(MISSION_KEY, { scene: scene.id, th: joinTh(mine), rom: joinRom(mine), en: scene.replyEn(scene.items[0]), text: scene.mission, day: dayKey(), done: false });
    go('done');
  };

  if (!loaded) return <div className="st-wrap" />;

  return (
    <div className="st-wrap">
      <Bar step={step} />
      <div className="st-body">

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
            <button type="button" className="st-cta" onClick={() => {
              if (!heard) { setHeard(true); player.play('both', conversation()); } else go('parts');
            }}>{heard ? 'Next: how it works' : 'Hear the conversation'}</button>
          </section>
        )}

        {step === 'parts' && (
          <section className="st-card">
            <p className="st-place">{scene.place}</p>
            <h1 className="st-title">{parts.length} little words</h1>
            <p className="st-sub">Tap each one to hear it.</p>
            <Tiles parts={parts} onTap={say} />
            <div className="st-whole">
              <PlayBtn id="reply" clips={[{ text: joinTh(parts), voice }]} player={player} label="Play the whole sentence" />
              <button type="button" className="st-slow" aria-label="Play slowly" onClick={() => player.play('slow', [{ text: joinTh(parts), voice, slow: true }])}><SlowIcon /></button>
              <span className="en">{scene.replyEn(item)}</span>
            </div>
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
              <span className="en">{scene.replyEn(item)}</span>
            </div>
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
            <h1 className="st-title">{q.kind === 'ask' ? 'What is the cashier asking?' : 'What did you say?'}</h1>
            <div className="st-listen">
              <PlayBtn id={`q-${qi}`} clips={qClip(q)} player={player} label="Play again" big />
              <button type="button" className="st-slow" aria-label="Play slowly" onClick={() => player.play('slow', qClip(q).map((c) => ({ ...c, slow: true })))}><SlowIcon /></button>
            </div>
            <div className="st-opts">
              {q.opts.map((o) => {
                const right = o.key === q.it.th;
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
                {picked === q.it.th
                  ? <p><b>Right.</b> <span lang="th">{q.it.th}</span> ({q.it.rom}) = {q.it.en}.</p>
                  : <p>Not quite. You heard <b lang="th">{q.it.th}</b> ({q.it.rom}) = {q.it.en}. {retried && !q.again ? 'It comes back once more.' : ''}</p>}
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
            </ul>
            {scene.alsoHeard && (
              <p className="st-also">Also natural: <span lang="th">{scene.alsoHeard.th}{endingFor(reg).th}</span> <i>{scene.alsoHeard.rom} {endingFor(reg).rom}</i>, {scene.alsoHeard.en}.</p>
            )}
            <div className="st-mission">
              <p className="st-mission-label">Your mission</p>
              <p>{scene.mission}</p>
              <p className="st-mission-line"><span lang="th">{joinTh(replyParts(scene, scene.items[0], reg))}</span></p>
              <p className="st-mission-rom">{joinRom(replyParts(scene, scene.items[0], reg))}</p>
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
