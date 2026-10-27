'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { particleFor } from '../lib/register';
import { soundRight, soundWrong, soundDone } from '../lib/sfx';
import { track } from '../lib/analytics';
import { PRACTICE_NOUNS, NUMBERS, CONFUSE, TWINS, SAY, VENDOR_CLS, ASK_WHAT, askHowMany, classifierOf, renderSay } from '../lib/classifiers';
import { img, shuffle, pick, cap, bare, phraseEn, takes, SoundButtons, PlayIcon, UpIcon, DownIcon, NextIcon, saveRound } from './shared';

// "How many?" (rebuilt 27 Oct, Jay: a vendor asks, you answer). A real slot
// machine look, but no timing test: when a customer arrives the reels spin for
// show and land on wrong answers; you set each reel with ▲ ▼ (or the arrow
// keys), then pull the lever to answer.
//   L1: the vendor asks "How many <classifier>?" (Thai only); your order has two things.
//       Set which thing she means and how many: you have to know what the classifier counts.
//   L2: the vendor asks "What would you like?"; set the number and classifier.
//   L3: same question; set the thing, the number and the classifier.
const CUSTOMERS = 5;
const vendorNouns = PRACTICE_NOUNS.filter((n) => VENDOR_CLS.includes(n.cls));

function clsOptions(right, also = []) {
  const near = [...also, ...(CONFUSE[right] || [])].filter((c, i, a) => c !== right && VENDOR_CLS.includes(c) && a.indexOf(c) === i);
  const rest = shuffle(VENDOR_CLS.filter((c) => c !== right && !near.includes(c)));
  return shuffle([right, ...[...near, ...rest].slice(0, 3)]).map((c) => ({ th: c, rom: classifierOf(c).rom }));
}

export function makeCustomer(level, prev) {
  const noun = pick(vendorNouns.filter((n) => n.th !== prev), 1)[0];
  const num = pick(NUMBERS, 1)[0];
  const numReel = { key: 'num', label: 'Number', opts: NUMBERS.map((x) => ({ th: x.th, rom: x.rom })), want: num.th };
  const answer = { th: `${noun.th}${num.th}${noun.cls}`, rom: `${noun.rom} ${num.rom} ${classifierOf(noun.cls).rom}`, en: `${cap(phraseEn(noun, num.n))}, please.` };
  if (level === 1) {
    // A second thing on the order, with a classifier people mix up and a different number
    const otherCls = shuffle(VENDOR_CLS.filter((c) => c !== noun.cls)).sort((a, b) => (CONFUSE[noun.cls] || []).includes(b) - (CONFUSE[noun.cls] || []).includes(a))[0];
    const other = pick(vendorNouns.filter((n) => n.cls === otherCls), 1)[0];
    const otherNum = pick(NUMBERS.filter((x) => x.th !== num.th), 1)[0];
    const extra = pick(vendorNouns.filter((n) => n.cls !== noun.cls && n.th !== other.th), 2);
    const ask = askHowMany(noun.cls);
    return {
      noun, num, ask: { ...ask, hide: true }, slip: shuffle([{ noun, num }, { noun: other, num: otherNum }]), fixed: { th: noun.cls, rom: classifierOf(noun.cls).rom },
      reels: [{ key: 'noun', label: 'Thing', opts: shuffle([noun, other, ...extra]).map((n) => ({ th: n.th, rom: n.rom })), want: noun.th }, numReel],
      answer: { ...answer, ask: ask.en },
    };
  }
  const reels = [numReel, { key: 'cls', label: 'Classifier', opts: clsOptions(noun.cls), want: noun.cls }];
  if (level === 3) {
    const twin = vendorNouns.find((n) => n.th === TWINS[noun.th]);
    const others = pick(vendorNouns.filter((n) => n.th !== noun.th && n.th !== twin?.th && n.cls !== noun.cls), twin ? 2 : 3);
    reels.unshift({ key: 'noun', label: 'Thing', opts: shuffle([noun, ...(twin ? [twin] : []), ...others]).map((n) => ({ th: n.th, rom: n.rom })), want: noun.th });
  }
  return { noun, num, ask: ASK_WHAT, slip: [{ noun, num }], reels, answer };
}
// Every reel starts on a wrong option
const startIdx = (c) => c.reels.map((r) => Math.max(0, r.opts.findIndex((o) => o.th !== r.want)));

export default function Slots({ level, audio, reg }) {
  const L = level.n;
  const [cust, setCust] = useState(() => makeCustomer(L));
  const [idx, setIdx] = useState(() => startIdx(cust));
  const [phase, setPhase] = useState('spin');   // spin | set | right | shown
  const [marks, setMarks] = useState([]);       // per reel: '' | 'right' | 'wrong'
  const [tries, setTries] = useState(0);
  const [n, setN] = useState(0);                // customer number
  const [bulbs, setBulbs] = useState([]);       // 'lit' | 'miss'
  const [focus, setFocus] = useState(0);
  const [done, setDone] = useState(false);
  const [said, setSaid] = useState(false);
  const served = useRef([]);
  const timer = useRef(0); const sureTimer = useRef(0);
  const hintRef = useRef(null);
  const [win, setWin] = useState(false); // bulbs chase for a moment after a right answer
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(sureTimer.current); }, []);
  // After an answer, keep the feedback and the next button in view on short screens
  useEffect(() => {
    if (phase === 'right' || phase === 'shown' || tries > 0) {
      const t = setTimeout(() => {
        const el = hintRef.current; if (!el) return;
        // Room for the button under the feedback (it sticks to the bottom on phones)
        const over = el.getBoundingClientRect().bottom + 96 - window.innerHeight;
        if (over > 0) window.scrollBy({ top: over, behavior: 'smooth' });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [phase, tries]);
  const ending = particleFor(reg, false);

  // A new customer: the reels spin for show, the vendor asks
  useEffect(() => {
    setPhase('spin'); setMarks([]); setTries(0); setFocus(0);
    const t = setTimeout(() => setPhase('set'), 900);
    audio.play(cust.ask.th, { key: 'ask', voice: 'female' });
    return () => clearTimeout(t);
  }, [cust]); // eslint-disable-line react-hooks/exhaustive-deps

  const nudge = (r, d) => {
    if (phase !== 'set') return;
    const len = cust.reels[r].opts.length;
    setIdx((cur) => cur.map((v, k) => (k === r ? (v + d + len) % len : v)));
    setMarks((m) => m.map((x, k) => (k === r ? '' : x)));
    setFocus(r);
  };
  const pull = () => {
    if (phase !== 'set') return;
    const res = cust.reels.map((r, k) => (r.opts[idx[k]].th === r.want ? 'right' : 'wrong'));
    setMarks(res);
    if (res.every((x) => x === 'right')) {
      soundRight(); setPhase('right'); served.current.push(cust);
      setBulbs((b) => [...b, tries === 0 ? 'lit' : 'miss']);
      setWin(true); clearTimeout(timer.current); timer.current = setTimeout(() => setWin(false), 900);
      // Your answer, then the vendor: ได้ค่ะ (Sure), in her voice
      // She answers when you have finished speaking (not on a fixed timer)
      audio.play(cust.answer.th, { key: 'answer', onEnd: () => { clearTimeout(sureTimer.current); sureTimer.current = setTimeout(() => audio.play('ได้ค่ะ', { key: 'sure', voice: 'female' }), 300); } });
    } else if (tries >= 1) {
      // Second miss: show the answer
      soundWrong(); setPhase('shown'); served.current.push(cust);
      setIdx(cust.reels.map((r) => r.opts.findIndex((o) => o.th === r.want)));
      setBulbs((b) => [...b, 'miss']);
      clearTimeout(timer.current); timer.current = setTimeout(() => audio.play(cust.answer.th, { key: 'answer' }), 500);
    } else { soundWrong(); setTries(1); }
  };
  const next = () => {
    clearTimeout(timer.current); clearTimeout(sureTimer.current); audio.stop();
    if (n + 1 >= CUSTOMERS) {
      const lit = bulbs.filter((b) => b === 'lit').length;
      saveRound('slots', L, lit === CUSTOMERS, { lit });
      if (lit >= CUSTOMERS - 1) soundDone();
      setDone(true); return;
    }
    const c = makeCustomer(L, cust.noun.th); setN(n + 1); setCust(c); setIdx(startIdx(c));
  };
  const again = () => { const c = makeCustomer(L); served.current = []; setBulbs([]); setN(0); setDone(false); setSaid(false); setCust(c); setIdx(startIdx(c)); };

  const firstWrong = marks.findIndex((m) => m === 'wrong');
  const hint = phase === 'shown' ? `The answer: ${cust.answer.th} (${cust.answer.rom}).`
    : firstWrong < 0 ? '' : cust.reels[firstWrong].key === 'cls' ? takes(cust.noun)
      : cust.reels[firstWrong].key === 'num' ? 'Count them on your order.'
        : L === 1 ? `${cust.noun.cls} (${classifierOf(cust.noun.cls).rom}) counts ${classifierOf(cust.noun.cls).unit}. Which thing on your order is that?`
          : 'Which thing is on your order?';
  const lit = bulbs.filter((b) => b === 'lit').length;
  const say = useMemo(() => {
    const best = served.current[served.current.length - 1] || cust;
    return renderSay(SAY[best.noun.th], reg, particleFor);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    const jackpot = lit === CUSTOMERS;
    return (
      <section className="pm-card cl-card cl-slots-card is-done">
        <div className="pm-band"><span>How many?</span></div>
        <div className="pm-body cl-body cl-finish">
          <div className={`cl-marquee is-big${jackpot ? ' is-jackpot' : ''}`} aria-hidden="true">{bulbs.map((b, i) => <i key={i} className={b} />)}</div>
          <p className="cl-finish-h">{jackpot ? 'Jackpot! Every order right first time.' : `${lit} of ${CUSTOMERS} orders right first time.`}</p>
          <div className="sayit cl-sayit">
            <p className="sayit-eyebrow">Say it today</p>
            <div className="sayit-line">
              <button type="button" className={`sayit-play${audio.playing === 'say' ? ' on' : ''}`} onClick={() => audio.play(say.th, { key: 'say', toggle: true })} aria-label="Play"><PlayIcon /></button>
              <div className="sayit-text">
                <span className="sayit-en">{say.en}</span>
                <span className="sayit-th cl-say-th" lang="th">{say.th}</span>
                <span className="sayit-rom">{say.rom}</span>
              </div>
            </div>
            {said ? <span className="cl-said">★ You said it. Nice.</span>
              : <button type="button" className="cl-said-btn" onClick={() => { setSaid(true); track('classifiers_said_it', { level: L }); }}>I said it to someone ★</button>}
          </div>
          <a className="pm-lever cl-today" href="/today">Back to Today</a>
          <button type="button" className="cl-back" onClick={again}>Play again</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`pm-card cl-card cl-slots-card lv${L}`}>
      <div className="pm-band"><span>How many?</span></div>
      <div className="pm-body cl-body cl-slots-body">
        <div className="cl-slots-left">
          <div className="cl-ask">
            <div className="cl-ask-band">The vendor asks</div>
            <div className="cl-ask-body">
              <button type="button" className={`cl-mini-play${audio.playing === 'ask' ? ' on' : ''}`} onClick={() => audio.play(cust.ask.th, { key: 'ask', voice: 'female' })} aria-label="Play the question"><PlayIcon /></button>
              <div className="cl-ask-t">
                <b>{phase === 'right' ? 'Sure.' : cust.ask.hide && phase !== 'shown' ? 'How many…?' : cust.ask.en}</b>
                <span className="th" lang="th">{phase === 'right' ? 'ได้ค่ะ' : cust.ask.th}</span>
                <i>{phase === 'right' ? 'dâai khâ' : cust.ask.rom}</i>
              </div>
            </div>
          </div>
          <div className="cl-slip" aria-label="Your order">
            <span className="cl-slip-h">Your order</span>
            {cust.slip.length > 1 ? (
              <div className="cl-slip-rows">
                {cust.slip.map((s) => (
                  <div key={s.noun.th} className="cl-slip-row">
                    <img src={img(s.noun)} alt={bare(s.noun.en)} width="44" height="44" />
                    <span className="cl-slip-x">× {s.num.n}</span>
                    <span className="cl-slip-name"><span className="th" lang="th">{s.noun.th}</span><span className="rom">{s.noun.rom}</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cl-slip-pics">
                <span className="cl-slip-one"><img src={img(cust.noun)} alt={cap(phraseEn(cust.noun, cust.num.n))} width="72" height="72" /><span className="cl-slip-badge">× {cust.num.n}</span></span>
                {L === 2 && <span className="cl-slip-name"><span className="th" lang="th">{cust.noun.th}</span><span className="rom">{cust.noun.rom}</span></span>}
                {L === 3 && <span className="cl-slip-name is-en">{cap(bare(cust.noun.en))}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="cl-slots-right">
          <div className="cl-cabinet">
            <div className={`cl-marquee${win ? ' is-win' : ''}`} role="img" aria-label={`Customer ${n + 1} of ${CUSTOMERS}, ${lit} right so far`}>
              {Array.from({ length: CUSTOMERS }, (_, i) => <i key={i} className={bulbs[i] || (i === n ? 'now' : '')} />)}
            </div>
            <div className={`cl-reels r${cust.reels.length}`} role="group" aria-label="Your answer">
              {cust.reels.map((r, k) => {
                const len = r.opts.length; const i = idx[k];
                const at = (d) => r.opts[(i + d + len) % len];
                return (
                  <div key={r.key} className={`cl-reel${phase === 'spin' ? ' is-spin' : ''}${marks[k] ? ` is-${marks[k]}` : ''}${focus === k && phase === 'set' ? ' is-turn' : ''}`} style={{ '--d': `${0.45 + k * 0.18}s` }}
                    data-want={r.want} data-cur={at(0).th}>
                    <span className="cl-reel-l">{r.label}</span>
                    <button type="button" className="cl-nudge" onClick={() => nudge(k, -1)} disabled={phase !== 'set'} aria-label={`${r.label}: previous`}><UpIcon /></button>
                    <div className="cl-reel-win" role="spinbutton" tabIndex={phase === 'set' ? 0 : -1} aria-label={r.label} aria-valuetext={at(0).th}
                      onFocus={() => setFocus(k)}
                      onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); nudge(k, -1); } else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(k, 1); } else if (e.key === 'Enter') pull(); }}>
                      <span key={`${i}-${phase === 'spin'}`} className="cl-reel-strip">
                        <span className="cl-reel-i is-off"><span className="th" lang="th">{at(-1).th}</span></span>
                        <span className="cl-reel-i is-pay"><span className="th" lang="th">{at(0).th}</span><span className="rom">{at(0).rom}</span></span>
                        <span className="cl-reel-i is-off"><span className="th" lang="th">{at(1).th}</span></span>
                      </span>
                    </div>
                    <button type="button" className="cl-nudge" onClick={() => nudge(k, 1)} disabled={phase !== 'set'} aria-label={`${r.label}: next`}><DownIcon /></button>
                  </div>
                );
              })}
              <span className="cl-reel-end" aria-hidden="true">
                {cust.fixed && <span className="cl-reel-fixed"><span className="th" lang="th">{cust.fixed.th}</span><span className="rom">{cust.fixed.rom}</span></span>}
                <span className="cl-reel-pol"><span className="th" lang="th">{ending.th}</span><span className="rom">{ending.rom}</span></span>
              </span>
            </div>
            <button type="button" className={`cl-lever-art${phase === 'set' ? '' : ' is-off'}`} onClick={pull} tabIndex={-1} aria-hidden="true"><i /></button>
          </div>
          <p ref={hintRef} className={`cl-hint${hint ? ' on' : ''}${phase === 'shown' ? ' is-shown' : ''}`} role="status">
            {phase === 'right'
              ? <span className="cl-right">{cust.answer.ask && <span className="cl-right-q">She asked: {cust.answer.ask}</span>}<b>{cust.answer.en}</b><span lang="th">{cust.answer.th}{ending.th}</span><i>{cust.answer.rom} {ending.rom}</i></span>
              : (hint || ' ')}
          </p>
          {phase === 'right' || phase === 'shown'
            ? <button type="button" className="pm-lever cl-pull" onClick={next}><NextIcon />{n + 1 >= CUSTOMERS ? 'See how you did' : 'Next customer'}</button>
            : <button type="button" className="pm-lever cl-pull" onClick={pull} disabled={phase !== 'set'}>Pull the lever</button>}
        </div>
      </div>
    </section>
  );
}
