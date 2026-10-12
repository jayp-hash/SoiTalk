'use client';
import { useEffect, useMemo, useState } from 'react';
import Deck from './Deck';
import TopicIcon from './TopicIcon';
import { useProgressStore } from '../lib/progress';
import { isKnown as knownEntry } from '../lib/memory';
import { TOPIC_GROUPS, TOPIC_HERO } from '../lib/categories';

// /vocabulary: a topic page first, then the cards for what you pick.
// The choice sits in the URL (?topic=Food%20%26%20drink, ?topic=all&set=3) so Back works.
const ALL = 'all';
const SET_SIZE = 20; // keep in step with Deck.js

function readUrl() {
  if (typeof window === 'undefined') return { topic: undefined, set: 0 };
  const q = new URLSearchParams(window.location.search);
  return { topic: q.get('topic') || undefined, set: Number(q.get('set')) || 0 };
}

export default function Vocab({ words }) {
  const [view, setView] = useState(null); // { topic, set }; topic undefined = topic page
  useEffect(() => {
    setView(readUrl());
    const onPop = () => setView(readUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = (topic, set = 0) => {
    const q = topic === undefined ? '' : `?topic=${encodeURIComponent(topic)}${set ? `&set=${set}` : ''}`;
    window.history.pushState(null, '', window.location.pathname + q);
    setView({ topic, set });
    window.scrollTo(0, 0);
  };
  if (!view) return null;
  if (view.topic === undefined) return <TopicPage words={words} onOpen={open} />;
  return (
    <>
      <h1 className="sr-only">Flashcards: {view.topic === ALL ? 'all words' : view.topic}</h1>
      <Deck key={`${view.topic}-${view.set}`} words={words} topic={view.topic === ALL ? null : view.topic} startSet={view.set} onTopics={() => open(undefined)} />
    </>
  );
}

const shortMeaning = (en = '') => en.split(';')[0].replace(/[()]/g, '').trim();

function TopicPage({ words, onOpen }) {
  const { progress } = useProgressStore();
  // 'Met' = in your memory (from Today); 'known' = checked over time (lib/memory.js)
  const isMet = (w) => !!progress[w.thai];
  const isKnown = (w) => knownEntry(progress[w.thai]);
  const topics = useMemo(() => {
    const map = new Map();
    for (const w of words) {
      const name = w.category?.name; if (!name) continue;
      if (!map.has(name)) map.set(name, { name, color: w.category.color, words: [] });
      map.get(name).words.push(w);
    }
    for (const t of map.values()) t.hero = t.words.find((w) => w.thai === TOPIC_HERO[t.name]) || t.words[0];
    return map;
  }, [words]);

  // Where "All words" picks up: the set holding the first word not learned yet
  const learnedAll = words.filter(isMet).length;
  const knownAll = words.filter(isKnown).length;
  const firstGap = words.findIndex((w) => !isMet(w));
  const nextSet = firstGap < 0 ? 0 : Math.floor(firstGap / SET_SIZE);
  const started = learnedAll > 0;
  const group = (label) => (TOPIC_GROUPS.find((g) => g.label === label)?.names || []).map((n) => topics.get(n)).filter(Boolean);
  const startHere = group('Start here');
  const blocks = group('Building blocks');
  const formal = group('Formal Thai');

  return (
    <div className="tp">
      <div className="tp-head">
        <h1>Word library</h1>
        <p>Browse and practise by topic. Words are added and checked on Today.</p>
      </div>

      {/* Today is the main path; the library points there */}
      <a className="tp-start" href="/today">
        <span className="tp-start-text">
          <span className="tp-start-kicker">Your daily lesson</span>
          <span className="tp-start-title">{started ? 'Continue on Today' : 'Start on Today'}</span>
          <span className="tp-start-sub">
            {started
              ? <>{learnedAll} words met, {knownAll} known. Next up: <span lang="th">{words[firstGap]?.thai}</span> ({words[firstGap]?.romanization}), {shortMeaning(words[firstGap]?.english)}.</>
              : <>A few new words a day, most useful first. First up: <span lang="th">สวัสดี</span> (sà-wàt-dii), hello.</>}
          </span>
          {started && <span className="tp-bar" aria-hidden="true"><i style={{ width: `${(learnedAll / words.length) * 100}%` }} /></span>}
        </span>
        <span className="tp-start-go" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </a>

      <section className="tp-section" aria-labelledby="tp-start-here">
        <h2 id="tp-start-here">Everyday topics</h2>
        <div className="tp-tiles">
          {startHere.map((t, i) => {
            const done = t.words.filter(isMet).length;
            const known = t.words.filter(isKnown).length;
            return (
              <button key={t.name} type="button" className={`tp-tile${i === 0 ? ' is-wide' : ''}`} style={{ '--tc': t.color }} onClick={() => onOpen(t.name)}>
                <span className="tp-tile-top">
                  <span className="tp-icon"><TopicIcon name={t.name} /></span>
                  <span className="tp-tile-name">{t.name}<small>{t.words.length} words</small></span>
                </span>
                <span className="tp-hero">
                  <span className="th" lang="th">{t.hero.thai}</span>
                  <span className="rom">{t.hero.romanization}</span>
                  <span className="en">{shortMeaning(t.hero.english)}</span>
                </span>
                {done > 0 && known < t.words.length && (
                  <span className="tp-tile-progress">
                    <span className="tp-bar" aria-hidden="true"><i style={{ width: `${(done / t.words.length) * 100}%` }} /></span>
                    <span>{done} met{known ? ` · ${known} known` : ''}</span>
                  </span>
                )}
                {known >= t.words.length && <span className="tp-done">✓ All known</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="tp-section" aria-labelledby="tp-blocks">
        <h2 id="tp-blocks">Building blocks</h2>
        <p className="tp-section-sub">Verbs, describing words and the small words that hold sentences together.</p>
        <div className="tp-chips">
          {blocks.map((t) => {
            const done = t.words.filter(isMet).length;
            const known = t.words.filter(isKnown).length;
            return (
              <button key={t.name} type="button" className="tp-chip" style={{ '--tc': t.color }} onClick={() => onOpen(t.name)}>
                <span className="tp-icon sm"><TopicIcon name={t.name} size={18} /></span>
                <span className="tp-chip-name">{t.name}</span>
                <span className="tp-chip-n">{known >= t.words.length ? '✓ All known' : done > 0 ? `${done} of ${t.words.length} met` : `${t.words.length} words`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" className="tp-formal tp-all-row" onClick={() => onOpen(ALL, nextSet)}>
        <span><b>All words in course order</b> · {words.length.toLocaleString('en')} words, most useful first{started ? `. You're on set ${nextSet + 1} of ${Math.ceil(words.length / SET_SIZE)}.` : '.'}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>

      {formal.map((t) => (
        <button key={t.name} type="button" className="tp-formal" onClick={() => onOpen(t.name)}>
          <span><b>Formal Thai</b> · {t.name}, {t.words.length} words for the office and the news. Best saved for later.</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      ))}
    </div>
  );
}
