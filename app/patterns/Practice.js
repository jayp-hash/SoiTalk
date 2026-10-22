'use client';
import { track } from '../lib/analytics';
import { useEffect, useMemo, useRef, useState } from 'react';
import BlurEn from '../components/BlurEn';
import { audioVersion, SLOW_RATE } from '../lib/audioVersion';
import { readStore, writeStore, dayKey } from '../lib/progress';
import { practiceExchanges, askMeanings, alikeFor, sentenceThai } from '../lib/patterns';
import { getRegister, particleFor } from '../lib/register';
import { soundDone } from '../lib/sfx';

// Practice (Jay, 21 Oct 2026): "hear them, answer back". Someone asks you
// something (staff voice, plays by itself), you build your reply from tiles.
// Each level hides more of the given words: L1 the changing words, L2 all
// but the key word, L3 every word. Wrong tiles come from the same slot and
// are ruled out by the English you're shown. A missed reply comes back at
// the end of the round, rebuilt from empty. A round with no misses earns
// the level's street sign.

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;
const SoundIcon = ({ on }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z" />{on ? <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /> : <path d="M16 9l5 6M21 9l-5 6" />}</svg>;

// What each level lets you do, said plainly at the end of a round
const CAN_DO = {
  like: { 1: "You can say what people like, and don't like.", 2: 'You can say where and when people like doing things.', 3: 'You can say when, and why, people like doing things.' },
  order: { 1: 'You can order food and drinks, with the right counting word.', 2: 'You can order two things at once.', 3: 'You can order, and answer when they ask how you want it.' },
};

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const shortEn = (en = '') => en.split(/[;,(]/)[0].trim();

// One clip at a time; onEnd runs when it finishes (or fails)
function usePlayer() {
  const ref = useRef(null); const token = useRef(0);
  const [playing, setPlaying] = useState(null);
  const stop = () => { ++token.current; ref.current?.pause(); setPlaying(null); };
  const play = (key, text, voice, { slow = false, onEnd } = {}) => {
    const my = ++token.current;
    ref.current?.pause();
    const done = () => { if (token.current !== my) return; setPlaying(null); onEnd?.(); };
    try {
      const a = new Audio(`/api/speak?text=${encodeURIComponent(text)}&voice=${voice}${slow ? '&slow=1' : ''}&v=${audioVersion(text, slow)}`);
      a.preservesPitch = true; a.webkitPreservesPitch = true;
      if (slow) { a.defaultPlaybackRate = SLOW_RATE; a.playbackRate = SLOW_RATE; }
      ref.current = a; setPlaying(key);
      a.onended = done; a.onerror = done;
      a.play().catch(done);
    } catch { done(); }
  };
  useEffect(() => () => ref.current?.pause(), []);
  return { play, stop, playing };
}

export default function Practice({ p, level, lex, onLearn }) {
  const reg = getRegister();
  const myVoice = readStore('tsc-help', {}).voice || 'female';
  const ending = particleFor(reg, false);
  const askEnding = particleFor('female', true); // the staff voice asks, so คะ
  const rom = (x) => x.rom || lex[x.th]?.rom || '';
  const audio = usePlayer();
  const [autoplay, setAutoplay] = useState(true);
  useEffect(() => { setAutoplay(readStore('tsc-autoplay', true) !== false); }, []);
  const toggleSound = () => setAutoplay((v) => { writeStore('tsc-autoplay', !v); if (v) audio.stop(); return !v; });

  // ---- Build a round ----
  const build = () => practiceExchanges(p.id, level).map((ex, i) => {
    const ask = { parts: [...ex.ask.parts, { th: askEnding.th, rom: askEnding.rom }], en: ex.ask.en, group: ex.ask.group };
    let reply;
    if (ex.follow) reply = { parts: [...ex.follow.reply, { th: ending.th, rom: ending.rom, slot: 'ending' }], en: ex.follow.replyEn, follow: true };
    else { const s = level.make(ex.v); reply = { parts: s.parts, en: s.en }; }
    // Gaps by level (Jay): L1 the changing words, L2 all but the key word, L3 every word.
    // A follow-up answer is short, so it is always built in full.
    const gap = reply.parts.map((x) => (reply.follow || level.n === 3 ? true
      : level.n === 2 ? x.th !== p.key.th
        : x.slot !== 'fixed' && x.slot !== 'ending'));
    const need = reply.parts.filter((_, k) => gap[k]).map((x) => ({ th: x.th, rom: rom(x) }));
    const wrong = [];
    for (const n of need) {
      const w = alikeFor(n.th);
      if (w && !need.some((x) => x.th === w.th) && !wrong.some((x) => x.th === w.th)) wrong.push({ th: w.th, rom: w.rom || lex[w.th]?.rom || '' });
    }
    const tiles = shuffle([...need, ...wrong.slice(0, Math.max(2, 12 - need.length))]).map((t, k) => ({ ...t, id: k }));
    return { id: i, ask, reply, gap, tiles, quiz: i === 1, meanings: askMeanings(ask, p.id) };
  });

  const [round, setRound] = useState(null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const exs = build();
    setRound({ queue: exs, pos: 0, phase: 'listen', filled: [], used: [], wrong: null, missed: false, misses: 0, total: exs.length, log: [{ side: 'them', ...exs[0].ask, key: 't0' }] });
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardRef = useRef(null);
  useEffect(() => { if (window.innerWidth <= 800) cardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, []);
  const chatRef = useRef(null);
  useEffect(() => { const el = chatRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [round?.log.length]);

  // Their line plays by itself; the tiles come once it has finished
  const cur = round && round.queue[round.pos];
  useEffect(() => {
    if (!round || round.phase !== 'listen' || !cur) return undefined;
    const ready = () => setRound((r) => (r && r.phase === 'listen' ? { ...r, phase: r.queue[r.pos].quiz && !r.queue[r.pos].retry ? 'quiz' : 'build' } : r));
    if (!autoplay) { const t = setTimeout(ready, 400); return () => clearTimeout(t); }
    audio.play(`t${round.pos}`, sentenceThai(cur.ask), 'female', { onEnd: () => setTimeout(ready, 250) });
    return undefined;
  }, [round?.pos, round?.phase === 'listen']); // eslint-disable-line react-hooks/exhaustive-deps

  const roundRef = useRef(round);
  const finishExchangeRef = useRef(null);
  if (!round) return <section className="pm-card px-card" />;
  const done = round.pos >= round.queue.length;
  const gapIdx = cur ? cur.gap.map((g, k) => (g ? k : -1)).filter((k) => k >= 0) : [];
  const nextGap = cur ? gapIdx[round.filled.length] : -1;

  const tap = (t) => {
    if (round.phase !== 'build' || round.used.includes(t.id)) return;
    const want = cur.reply.parts[nextGap];
    if (t.th !== want.th) { setRound({ ...round, wrong: t, missed: true, misses: round.missed ? round.misses : round.misses + 1 }); return; }
    const filled = [...round.filled, t.th]; const used = [...round.used, t.id];
    const r = { ...round, filled, used, wrong: null };
    setRound(r);
    if (filled.length === gapIdx.length) setTimeout(() => finishExchangeFrom(r), 250);
  };
  // Finishing reads the freshest round (set just before), so it goes through a ref
  const finishExchangeFrom = (r) => { roundRef.current = r; finishExchangeRef.current(); };
  roundRef.current = round;
  finishExchangeRef.current = () => {
    const r = roundRef.current;
    const ex = r.queue[r.pos];
    const queue = r.missed && !ex.retry ? [...r.queue, { ...ex, retry: true, id: `${ex.id}r` }] : r.queue;
    const log = [...r.log, { side: 'me', parts: ex.reply.parts, en: ex.reply.en, key: `m${r.pos}` }];
    const pos = r.pos + 1;
    const nextLog = pos < queue.length ? [...log, { side: 'them', ...queue[pos].ask, key: `t${pos}` }] : log;
    const go = () => setRound((s) => ({ ...s, queue, pos, phase: pos < queue.length ? 'listen' : 'done', filled: [], used: [], wrong: null, missed: false, log: nextLog }));
    setRound({ ...r, queue, phase: 'reply', log });
    if (autoplay) audio.play(`m${r.pos}`, sentenceThai(ex.reply), myVoice, { onEnd: () => setTimeout(go, 350) });
    else setTimeout(go, 700);
    if (pos >= queue.length) {
      const clean = r.misses === 0;
      track('practice_round_complete', { pattern: p.id, level: level.n, clean, misses: r.misses });
      if (clean) { const signs = readStore('tsc-signs', {}); signs[`${p.id}-${level.n}`] = dayKey(); writeStore('tsc-signs', signs); setTimeout(() => soundDone(), autoplay ? 1600 : 800); }
    }
  };

  const answerQuiz = (m) => {
    if (m === cur.ask.en) setRound({ ...round, phase: 'build', wrong: null, quizOk: true });
    else setRound({ ...round, wrong: { en: m }, missed: true, misses: round.missed ? round.misses : round.misses + 1 });
  };

  // Hints: say what the wrong tile means, and point at the right one
  let hint = '';
  if (round.wrong && round.phase === 'build') {
    const w = round.wrong; const en = shortEn(lex[w.th]?.en || '');
    hint = `${w.th}${w.rom ? ` (${w.rom})` : ''}${en ? ` means "${en}"` : ' doesn\'t fit here'}. Try the outlined tile.`;
  } else if (round.wrong && round.phase === 'quiz') hint = 'Not that one. Play it again and listen for the key word.';

  const clean = done && round.misses === 0;
  const lastThem = [...round.log].reverse().find((m) => m.side === 'them');
  const dots = Array.from({ length: round.total }, (_, i) => i < Math.min(round.pos, round.total));

  return (
    <section className="pm-card px-card" data-level={level.n} ref={cardRef}>
      <div className="pm-band">
        <span>{p.short || p.title}</span>
        <span className="px-dots" aria-label={`${Math.min(round.pos, round.total)} of ${round.total} done`}>{dots.map((d, i) => <i key={i} className={d ? 'on' : ''} />)}</span>
      </div>
      <div className="px-body">
        {done ? (
          <div className="px-end" aria-live="polite">
            <p className="px-eyebrow">{clean ? 'Round complete · no misses' : 'Round complete'}</p>
            {clean ? (
              <div className="px-sign" aria-label={`Sign earned: Soi ${p.key.rom}, level ${level.n}`}>
                <div><span className="th" lang="th">ซอย{p.key.th}</span><span className="en">SOI {p.key.rom.toUpperCase()} · LEVEL {level.n}</span></div>
              </div>
            ) : (
              <div className="px-sign is-ghost" aria-hidden="true"><div><span className="th" lang="th">ซอย{p.key.th}</span><span className="en">LEVEL {level.n}</span></div></div>
            )}
            <p className="px-cando">{CAN_DO[p.id]?.[level.n]}</p>
            <p className="px-note">{clean ? 'This sign is yours. It comes back in a few days, to keep it fresh.' : `${round.misses} ${round.misses === 1 ? 'reply' : 'replies'} needed a second try. A round with no misses earns the sign.`}</p>
            <div className="px-end-actions">
              <button type="button" className="pm-lever" onClick={() => setRun((n) => n + 1)}>Practise again</button>
              <button type="button" className="px-link" onClick={onLearn}>Back to Learn</button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-left">
              <div className="px-top">
                <div className="pm-sound">
                  <button type="button" className={`pm-play${audio.playing === 'replay' ? ' on' : ''}`} aria-label="Play their line again"
                    onClick={() => audio.play('replay', sentenceThai(lastThem), 'female')}><PlayIcon /></button>
                  <button type="button" className={`pm-slow${audio.playing === 'slow' ? ' on' : ''}`} aria-label="Play their line slowly"
                    onClick={() => audio.play('slow', sentenceThai(lastThem), 'female', { slow: true })}><SlowIcon /></button>
                </div>
                <button type="button" className={`px-sound${autoplay ? '' : ' off'}`} onClick={toggleSound}
                  aria-label={autoplay ? 'Lines play by themselves. Turn off' : 'Lines are silent until you tap play. Turn on'} title={autoplay ? 'Sound on' : 'Sound off'}>
                  <SoundIcon on={autoplay} />
                </button>
              </div>
              <div className="px-chat" ref={chatRef}>
                {round.log.map((m) => (
                  <div key={m.key} className={`px-msg ${m.side}`}>
                    <button type="button" className={`px-msg-play${audio.playing === m.key ? ' on' : ''}`} aria-label="Play"
                      onClick={() => audio.play(m.key, sentenceThai(m), m.side === 'them' ? 'female' : myVoice)}><PlayIcon /></button>
                    <div className="px-msg-text">
                      <span className="th" lang="th">{m.parts.map((x) => x.th).join('')}</span>
                      <span className="rom">{m.parts.map(rom).filter(Boolean).join(' ')}</span>
                      <BlurEn as="span" className="en" text={m.en} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-right">
              <p className="px-task">{round.phase === 'quiz' ? 'What did they ask?' : round.phase === 'listen' ? 'Listen…' : <>Answer: <b>{cur.reply.en}</b></>}</p>
              <div className={`px-slots${round.phase === 'listen' || round.phase === 'quiz' ? ' is-waiting' : ''}`} aria-label="Your answer">
                {cur.reply.parts.map((x, k) => {
                  const g = cur.gap[k];
                  const i = gapIdx.indexOf(k);
                  const isFilled = !g || i < round.filled.length || round.phase === 'reply';
                  return (
                    <span key={k} className={`px-slot${g ? ' is-gap' : ''}${g && isFilled ? ' is-done' : ''}${k === nextGap && round.phase === 'build' ? ' is-next' : ''}`}>
                      <span className="th" lang="th">{isFilled && round.phase !== 'listen' && round.phase !== 'quiz' ? x.th : (g ? ' ' : x.th)}</span>
                      <span className="rom">{isFilled && round.phase !== 'listen' && round.phase !== 'quiz' ? rom(x) : (g ? ' ' : rom(x))}</span>
                    </span>
                  );
                })}
              </div>
              <p className={`px-hint${hint ? ' on' : ''}`} role="status">{hint || ' '}</p>
              <div className="px-bank">
                {round.phase === 'quiz' ? (
                  <div className="px-quiz">
                    {cur.meanings.map((m) => (
                      <button key={m} type="button" className={`px-opt${round.wrong?.en === m ? ' is-wrong' : ''}`} onClick={() => answerQuiz(m)}>{m}</button>
                    ))}
                  </div>
                ) : round.phase === 'listen' ? (
                  <p className="px-wait">{autoplay ? 'Listen to what they say…' : 'Tap ▶ to hear it.'}</p>
                ) : (
                  <div className="px-tiles">
                    {cur.tiles.map((t) => {
                      const want = cur.reply.parts[nextGap];
                      const isHint = round.wrong && want && t.th === want.th && !round.used.includes(t.id);
                      return (
                        <button key={`${cur.id}-${t.id}`} type="button"
                          className={`px-tile${round.used.includes(t.id) ? ' is-used' : ''}${round.wrong?.id === t.id ? ' is-wrong' : ''}${isHint ? ' is-hint' : ''}`}
                          disabled={round.phase !== 'build' || round.used.includes(t.id)} onClick={() => tap(t)}>
                          <span className="th" lang="th">{t.th}</span>
                          <span className="rom">{t.rom || ' '}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
