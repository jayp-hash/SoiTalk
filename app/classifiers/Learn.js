'use client';
import { useEffect, useMemo, useState } from 'react';
import BlurEn from '../components/BlurEn';
import { readStore, writeStore } from '../lib/progress';
import { particleFor } from '../lib/register';
import { CLASSIFIERS, GROUPS, SAY, nounsFor, renderSay } from '../lib/classifiers';
import { img, bare, usePeek, Peek, SoundButtons, Chevron } from './shared';

// Learn: a short intro (collapses once you've opened a classifier), then the
// classifiers grouped and stacked. Open one to see its things; tap a thing
// for an everyday sentence that uses it.
const INTRO_KEY = 'tsc-cl-intro';

export default function Learn({ audio, reg }) {
  const [open, setOpen] = useState(null);
  const [seen, setSeen] = useState(true);     // seen the intro before (collapsed)
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => { const s = !!readStore(INTRO_KEY, false); setSeen(s); setShowIntro(!s); }, []);
  const choose = (th) => {
    audio.stop();
    if (!seen) { setSeen(true); writeStore(INTRO_KEY, true); }
    setShowIntro(false);
    setOpen((o) => (o === th ? null : th));
  };
  return (
    <div className="cl-learn">
      {showIntro ? (
        <section className="pm-card cl-intro">
          <div className="pm-band"><span>Classifiers</span>{seen && <button type="button" className="cl-band-btn" onClick={() => setShowIntro(false)}>Close</button>}</div>
          <div className="pm-body">
            <h2 className="cl-intro-h">Thai counts things with classifiers</h2>
            <p className="cl-intro-p">In Thai, you can&apos;t put a number straight in front of a thing. You say the thing, then the number, then a <b>classifier</b>: a small word that depends on what kind of thing you&apos;re counting.</p>
            <div className="cl-intro-ex">
              <SoundButtons audio={audio} text="หมาสองตัว" k="intro" column />
              <div className="cl-intro-line">
                <b>Two dogs</b>
                <span className="cl-tiles">
                  <span className="pm-tile"><span className="th" lang="th">หมา</span><span className="rom">mǎa</span></span>
                  <span className="pm-tile"><span className="th" lang="th">สอง</span><span className="rom">sǎawng</span></span>
                  <span className="pm-tile is-slot"><span className="th" lang="th">ตัว</span><span className="rom">dtuaa</span></span>
                </span>
                <span className="cl-lit">Word for word: dog, two, animal-classifier.</span>
              </div>
            </div>
            <p className="cl-intro-p">There are dozens of classifiers. Here you&apos;ll learn the {CLASSIFIERS.length} that help you count, order and buy most things in Bangkok.</p>
            <p className="cl-intro-go">Pick a classifier to see what it counts.</p>
          </div>
        </section>
      ) : (
        <button type="button" className="cl-intro-strip" onClick={() => setShowIntro(true)} aria-expanded="false">
          <span className="cl-intro-strip-t"><b>Thai counts with classifiers</b><span><span lang="th">หมาสองตัว</span> <i>mǎa sǎawng dtuaa</i> · two dogs</span></span>
          <span className="cl-intro-strip-more">How it works <Chevron /></span>
        </button>
      )}
      {GROUPS.map((g) => (
        <section key={g.id} className="cl-group" aria-label={g.en}>
          <h3 className="cl-group-h">{g.en}</h3>
          <ul className="cl-list">
            {CLASSIFIERS.filter((c) => c.group === g.id).map((c, i) => {
              const thumb = nounsFor(c.th).find((n) => n.practice !== false) || nounsFor(c.th)[0];
              return (
                <li key={c.th} className={`cl-item${open === c.th ? ' is-open' : ''}`}>
                  <button type="button" className={`cl-row${!seen && g.id === GROUPS[0].id && i === 0 ? ' is-nudge' : ''}`} aria-expanded={open === c.th} onClick={() => choose(c.th)}>
                    <img className="cl-row-img" src={img(thumb)} alt="" width="48" height="48" loading="lazy" />
                    <span className="cl-row-for">{c.for}</span>
                    <span className="cl-row-th"><span className="th" lang="th">{c.th}</span><span className="rom">{c.rom}</span></span>
                    <span className="cl-row-chev"><Chevron /></span>
                  </button>
                  {open === c.th && <ClassifierCard c={c} audio={audio} reg={reg} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ClassifierCard({ c, audio, reg }) {
  const ns = nounsFor(c.th);
  const [sel, setSel] = useState(ns[0].th);
  const peek = usePeek();
  const say = useMemo(() => renderSay(SAY[sel], reg, particleFor), [sel, reg]);
  const tap = (n) => { peek.clear(); setSel(n.th); audio.play([n.th, renderSay(SAY[n.th], reg, particleFor).th], { key: `n-${n.th}` }); };
  return (
    <div className="cl-open">
      <div className="pm-top">
        <SoundButtons audio={audio} text={c.th} k={`c-${c.th}`} />
        <div className="pm-key">
          <span className="kl"><span className="th" lang="th">{c.th}</span><i>{c.rom}</i></span>
          <b>{c.for}</b>
        </div>
      </div>
      <div className="cl-say" aria-live="polite">
        <SoundButtons audio={audio} text={say.th} k={`s-${sel}`} column />
        <div className="cl-say-text">
          <span key={sel} className="cl-tiles is-in">
            {say.parts.map((x, k) => (
              <span key={k} className={`pm-tile${x.role === 'cls' ? ' is-slot' : ''}${x.role === 'ending' ? ' is-end' : ''}`}>
                <span className="th" lang="th">{x.th.trim()}</span><span className="rom">{x.rom}</span>
              </span>
            ))}
          </span>
          <BlurEn className="pm-en cl-say-en" text={say.en} />
        </div>
      </div>
      <p className="cl-open-h">Tap a picture for a sentence you can use.</p>
      <div className="cl-nouns">
        {ns.map((n) => (
          <button key={n.th} type="button" className={`cl-noun${sel === n.th ? ' is-on' : ''}`} onClick={() => tap(n)} {...peek.bind(n.th)} aria-label={`${n.en}: play and show a sentence`}>
            <Peek on={peek.id === n.th} text={bare(n.en)} />
            <img src={img(n)} alt="" width="160" height="160" loading="lazy" draggable="false" />
            <span className="cl-noun-l"><span className={`th${n.th.length > 7 ? ' is-long' : ''}`} lang="th">{n.th}</span><span className="rom">{n.rom}</span></span>
          </button>
        ))}
      </div>
      {c.also && <p className="cl-also">{c.also}</p>}
    </div>
  );
}
