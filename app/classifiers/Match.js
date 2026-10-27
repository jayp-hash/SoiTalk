'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { particleFor } from '../lib/register';
import { soundRight, soundWrong, soundDone } from '../lib/sfx';
import { CLASSIFIERS, PRACTICE_NOUNS, NUMBERS, CONFUSE, PAIRS, TWINS, SAY, EXTRA_WORDS, classifierOf, phrase, renderSay } from '../lib/classifiers';
import { img, shuffle, pick, cap, bare, phraseEn, takes, usePeek, Peek, SoundButtons, PlayIcon, ShuffleIcon, NextIcon, saveRound } from './shared';

// Find the matches (rebuilt 27 Oct). The circle sits in the middle, the cards
// around it. Each level changes the task (no blurring):
//   L1 See it:  one classifier; cards show the picture and the Thai name.
//   L2 Read it: two easily mixed classifiers; cards show only the Thai word.
//   L3 Hear it: two classifiers; cards only play the word.
// A full circle ends with building one sentence, then Shuffle cards / Try a new classifier.

const practiceNouns = (cls) => PRACTICE_NOUNS.filter((n) => n.cls === cls);
const usable = CLASSIFIERS.filter((c) => practiceNouns(c.th).length >= 3).map((c) => c.th);

export function makeMatch(n, avoid = []) {
  if (n === 1) {
    const pool = usable.filter((c) => !avoid.includes(c));
    const target = pick(pool.length ? pool : usable, 1)[0];
    const right = pick(practiceNouns(target), Math.min(4, practiceNouns(target).length));
    // Look-alikes from the classifiers people mix up, so the picture alone isn't enough
    const near = pick(PRACTICE_NOUNS.filter((x) => (CONFUSE[target] || []).includes(x.cls)), 3);
    const rest = pick(PRACTICE_NOUNS.filter((x) => x.cls !== target && !near.includes(x)), 8 - right.length - near.length);
    return { targets: [target], items: shuffle([...right, ...near, ...rest]) };
  }
  const pairs = PAIRS.filter(([a, b]) => practiceNouns(a).length >= 3 && practiceNouns(b).length >= 3 && !(avoid.includes(a) && avoid.includes(b)));
  const pair = shuffle(pick(pairs.length ? pairs : PAIRS, 1)[0]);
  const k = Math.min(4, practiceNouns(pair[0]).length, practiceNouns(pair[1]).length);
  return { targets: pair, items: shuffle(pair.flatMap((c) => pick(practiceNouns(c), k))) };
}

export default function Match({ level, audio, reg }) {
  const L = level.n;
  const [round, setRound] = useState(() => makeMatch(L));
  const [placed, setPlaced] = useState({});   // th -> circle index
  const [bad, setBad] = useState(null);       // th of a wrong drop (shakes)
  const [strip, setStrip] = useState(null);   // { kind: 'say' | 'hint', ... }
  const [sel, setSel] = useState(null);       // L2/L3: picked card, waiting for a circle
  const [over, setOver] = useState(-1);       // circle under a dragged card
  const [missed, setMissed] = useState(false);
  const [build, setBuild] = useState(null);
  const [built, setBuilt] = useState(false);
  const circles = useRef([]);
  const drag = useRef(null);
  const lastRight = useRef(null);
  const peek = usePeek();

  const rights = round.items.filter((n) => round.targets.includes(n.cls));
  const complete = rights.every((n) => placed[n.th] !== undefined);

  useEffect(() => {
    if (!complete || build) return undefined;
    soundDone();
    saveRound('match', L, !missed, { targets: round.targets.join(',') });
    const n = lastRight.current || rights[0];
    const t = setTimeout(() => { setStrip(null); setBuild(SAY[n.th]); }, 1100);
    return () => clearTimeout(t);
  }, [complete]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (next) => { audio.stop(); setRound(next); setPlaced({}); setBad(null); setStrip(null); setSel(null); setMissed(false); setBuild(null); setBuilt(false); lastRight.current = null; };
  const shuffleCards = () => reset({ ...round, items: shuffle(round.items) });
  const newClassifier = () => reset(makeMatch(L, round.targets));

  const drop = (n, ci) => {
    setSel(null);
    if (n.cls === round.targets[ci]) {
      soundRight(); lastRight.current = n;
      const num = pick(NUMBERS, 1)[0]; const ph = phrase(n, num);
      audio.play(ph.th, { key: 'phrase' });
      setPlaced((p) => ({ ...p, [n.th]: ci }));
      setStrip({ kind: 'say', th: ph.th, rom: ph.rom, en: cap(phraseEn(n, num.n)), id: n.th });
    } else {
      soundWrong(); setMissed(true);
      setBad(n.th); setTimeout(() => setBad((b) => (b === n.th ? null : b)), 650);
      setStrip({ kind: 'hint', text: takes(n), id: `${n.th}-${Date.now()}` });
    }
  };
  const circleAt = (x, y, rects) => rects.findIndex((r) => r && Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= r.width / 2 + 18);

  // Tap: L1 drops into the circle; L2 and L3 pick the card (L3 also plays it) and wait for a circle
  const tapCard = (n) => {
    if (L === 1) drop(n, 0);
    else { setSel(n.th); if (L === 3) audio.play(n.th, { key: `w-${n.th}` }); }
  };

  const handlers = (n) => {
    const pk = peek.bind(n.th);
    return {
      ...pk,
      onPointerDown: (e) => {
        if (placed[n.th] !== undefined || e.button > 0) return;
        pk.onPointerDown(e);
        drag.current = { th: n.th, x: e.clientX, y: e.clientY, t: Date.now(), touch: e.pointerType !== 'mouse', moved: false, el: e.currentTarget, rects: circles.current.map((c) => c?.getBoundingClientRect()) };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
      },
      onPointerMove: (e) => {
        const d = drag.current; if (!d || d.th !== n.th) return;
        const dx = e.clientX - d.x; const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        if (!d.moved) { d.moved = true; peek.hide(); d.el.classList.add('is-drag'); if (L === 3) audio.play(n.th, { key: `w-${n.th}` }); }
        d.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
        const o = circleAt(e.clientX, e.clientY, d.rects);
        if (o !== d.over) { d.over = o; setOver(o); }
      },
      onPointerUp: (e) => {
        pk.onPointerUp(e);
        const d = drag.current; drag.current = null;
        if (!d || d.th !== n.th) return;
        if (d.moved) {
          d.el.classList.remove('is-drag'); d.el.style.transform = '';
          setOver(-1);
          const ci = circleAt(e.clientX, e.clientY, d.rects);
          if (ci >= 0) drop(n, ci);
          return;
        }
        // A long press on touch shows the English: it is not an answer
        if (d.touch && Date.now() - d.t > 400) return;
        tapCard(n);
      },
      onPointerCancel: () => { const d = drag.current; drag.current = null; if (d) { d.el.classList.remove('is-drag'); d.el.style.transform = ''; } setOver(-1); },
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapCard(n); } },
    };
  };

  const t0 = classifierOf(round.targets[0]);
  const task = L === 1
    ? <>Tap or drag everything that takes <b lang="th">{round.targets[0]}</b> <i>({t0.rom})</i>.</>
    : L === 2 ? <>Tap a word, then its circle. Or drag it.</>
      : <>Tap a card to hear it, then put it in its circle.</>;
  const half = Math.ceil(round.items.length / 2);
  const circle = (t, ci) => {
    const c = classifierOf(t);
    const inside = round.items.filter((n) => placed[n.th] === ci);
    const full = inside.length === rights.filter((n) => n.cls === t).length;
    return (
      <button key={t} type="button" ref={(el) => { circles.current[ci] = el; }} data-cls={t}
        className={`cl-circle c${ci}${over === ci ? ' is-over' : ''}${sel ? ' is-ready' : ''}${full ? ' is-full' : ''}`}
        onClick={() => { if (sel) drop(round.items.find((x) => x.th === sel), ci); else audio.play(t, { key: `c-${t}` }); }}
        aria-label={sel ? `Put it in ${c.rom}` : `Play ${c.rom}`}>
        <span className="cl-circle-th" lang="th">{t}</span>
        <span className="cl-circle-rom">{c.rom}</span>
        <span className="cl-circle-in">
          {inside.map((n) => <img key={n.th} src={img(n)} alt={n.en} width="36" height="36" />)}
        </span>
      </button>
    );
  };
  const card = (n, i) => {
    const isIn = placed[n.th] !== undefined;
    return (
      <div key={n.th} className={`cl-spot p${i}`}>
        <button type="button" {...handlers(n)} data-cls={n.cls}
          className={`cl-pic${isIn ? ' is-in' : ''}${bad === n.th ? ' is-bad' : ''}${sel === n.th ? ' is-sel' : ''}${L === 2 ? ' is-word' : ''}${L === 3 ? ' is-ear' : ''}`}
          disabled={isIn} aria-label={L === 3 ? `Word ${i + 1} of ${round.items.length}: play it` : n.en}>
          {L !== 3 && <Peek on={peek.id === n.th} text={bare(n.en)} />}
          {L === 1 && <img src={img(n)} alt="" width="160" height="160" draggable="false" />}
          {L === 3 ? (
            <span className="cl-ear"><PlayIcon /></span>
          ) : (
            <span className="cl-pic-l"><span className={`th${n.th.length > 7 ? ' is-long' : ''}`} lang="th">{n.th}</span><span className="rom">{n.rom}</span></span>
          )}
        </button>
      </div>
    );
  };

  return (
    <section className={`pm-card cl-card cl-match lv${L}`}>
      <div className="pm-band"><span>Find the matches</span></div>
      <div className="pm-body cl-body">
        {build ? (
          <SentenceBuild key={build.parts.map((x) => x.th).join('')} say={build} audio={audio} reg={reg} onDone={() => setBuilt(true)} />
        ) : (
          <>
            <h2 className="cl-task">{task}</h2>
            <div className={`cl-arena ${round.targets.length === 1 ? 'one' : 'two'}`}>
              {round.targets.length === 2 ? (
                <>
                  <div className="cl-cards">{round.items.slice(0, half).map((n, i) => card(n, i))}</div>
                  <div className="cl-circles">{round.targets.map(circle)}</div>
                  <div className="cl-cards">{round.items.slice(half).map((n, i) => card(n, i + half))}</div>
                </>
              ) : (
                <>
                  {round.targets.map((t, ci) => circle(t, ci))}
                  {round.items.map((n, i) => card(n, i))}
                </>
              )}
            </div>
          </>
        )}
        {!build && (
          <div className={`cl-strip${strip ? ` is-${strip.kind}` : ''}`} role="status" aria-live="polite">
            {strip?.kind === 'say' && (
              <span key={strip.id} className="cl-strip-say">
                <button type="button" className="cl-mini-play" onClick={() => audio.play(strip.th, { key: 'phrase' })} aria-label="Play again"><PlayIcon /></button>
                <span className="cl-strip-text"><b>{strip.en}</b><span className="th" lang="th">{strip.th}</span><span className="rom">{strip.rom}</span></span>
              </span>
            )}
            {strip?.kind === 'hint' && <span key={strip.id} className="cl-strip-hint">{strip.text}</span>}
            {!strip && complete && <span className="cl-strip-hint">Circle complete.</span>}
          </div>
        )}
        {build && built && (
          <div className="cl-after">
            <button type="button" className="cl-small" onClick={shuffleCards}><ShuffleIcon />Shuffle cards</button>
            <button type="button" className="cl-small is-main" onClick={newClassifier}><NextIcon />Try a new classifier</button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Build one sentence from tiles. The thing, number and classifier are the gaps. ----
export function SentenceBuild({ say, audio, reg, onDone, prompt }) {
  const s = useMemo(() => renderSay(say, reg, particleFor), [say, reg]);
  const gaps = s.parts.map((x, k) => (['noun', 'num', 'cls'].includes(x.role) ? k : -1)).filter((k) => k >= 0);
  const noun = PRACTICE_NOUNS.concat([]).find((x) => x.th === s.parts.find((p) => p.role === 'noun').th) || { th: '', img: '', cls: '' };
  const tiles = useMemo(() => {
    const need = gaps.map((k) => ({ th: s.parts[k].th, rom: s.parts[k].rom, role: s.parts[k].role }));
    const clsWrong = pick([...new Set([...(CONFUSE[noun.cls] || []), ...CLASSIFIERS.map((c) => c.th)])].filter((c) => c !== noun.cls), 2)
      .map((c) => ({ th: c, rom: classifierOf(c).rom, role: 'cls' }));
    const numNow = s.parts.find((x) => x.role === 'num')?.th;
    const numWrong = pick([...NUMBERS, ...EXTRA_WORDS].filter((x) => x.th !== numNow), 1).map((x) => ({ th: x.th, rom: x.rom, role: 'num' }));
    const twin = PRACTICE_NOUNS.find((x) => x.th === TWINS[noun.th]) || pick(PRACTICE_NOUNS.filter((x) => x.cls !== noun.cls), 1)[0];
    return shuffle([...need, ...clsWrong, ...numWrong, { th: twin.th, rom: twin.rom, role: 'noun' }]).map((t, id) => ({ ...t, id }));
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filled, setFilled] = useState([]); const [used, setUsed] = useState([]);
  const [wrong, setWrong] = useState(null);
  const done = filled.length === gaps.length;
  const tap = (t) => {
    if (done || used.includes(t.id)) return;
    const want = s.parts[gaps[filled.length]];
    if (t.th !== want.th) { soundWrong(); setWrong(t.id); audio.play(t.th, { key: 'tile' }); return; }
    const f = [...filled, t.th]; setFilled(f); setUsed([...used, t.id]); setWrong(null);
    if (f.length === gaps.length) { soundRight(); setTimeout(() => audio.play(s.th, { key: 'built' }), 250); onDone?.(); } else audio.play(t.th, { key: 'tile' });
  };
  const want = !done && s.parts[gaps[filled.length]];
  const hint = wrong !== null && want
    ? (want.role === 'cls' ? takes(noun) : want.role === 'num' ? 'Look at the number in the English.' : 'Look at the picture: which thing is it?')
    : '';
  return (
    <div className="cl-build">
      <div className="cl-build-top">
        {noun.img && <img src={img(noun)} alt="" width="96" height="96" />}
        <div>
          <p className="cl-eyebrow">{prompt || 'Now make a sentence'}</p>
          <p className="cl-build-en">{s.en}</p>
        </div>
      </div>
      <div className="px-slots cl-slots" aria-label="Your sentence">
        {s.parts.map((x, k) => {
          const gi = gaps.indexOf(k);
          const show = gi < 0 || gi < filled.length;
          return (
            <span key={k} data-want={gi >= 0 ? x.th : undefined} className={`px-slot${gi >= 0 ? ' is-gap' : ''}${gi >= 0 && show ? ' is-done' : ''}${gi === filled.length && !done ? ' is-next' : ''}`}>
              <span className="th" lang="th">{show ? x.th.trim() : ' '}</span>
              <span className="rom">{show ? x.rom : ' '}</span>
            </span>
          );
        })}
      </div>
      <p className={`cl-hint${hint ? ' on' : ''}`} role="status">{hint || ' '}</p>
      {done ? (
        <div className="cl-built is-row">
          <SoundButtons audio={audio} text={s.th} k="built" />
          <p><b>Now say it out loud.</b> Play it again as often as you like.</p>
        </div>
      ) : (
        <div className="cl-bank">
          {tiles.map((t) => (
            <button key={t.id} type="button" data-th={t.th} className={`px-tile cl-tile${used.includes(t.id) ? ' is-used' : ''}${wrong === t.id ? ' is-wrong' : ''}`}
              disabled={used.includes(t.id)} onClick={() => tap(t)}>
              <span className="th" lang="th">{t.th}</span><span className="rom">{t.rom}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
