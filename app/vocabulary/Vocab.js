'use client';
import { useEffect, useMemo, useState } from 'react';
import Deck from './Deck';
import { useProgressStore } from '../lib/progress';
import { TOPIC_GROUPS, TOPIC_BLURB } from '../lib/categories';

// /vocabulary: a page of topic tiles first, then the cards for the topic you pick.
// The choice sits in the URL (?topic=Food%20%26%20drink, ?topic=all) so Back works.
const ALL = 'all';

function readTopic() {
  if (typeof window === 'undefined') return undefined;
  const t = new URLSearchParams(window.location.search).get('topic');
  return t || undefined;
}

export default function Vocab({ words }) {
  const [topic, setTopic] = useState(undefined); // undefined = topic page
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setTopic(readTopic()); setReady(true);
    const onPop = () => setTopic(readTopic());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = (t) => {
    const url = t === undefined ? window.location.pathname : `${window.location.pathname}?topic=${encodeURIComponent(t)}`;
    window.history.pushState(null, '', url);
    setTopic(t);
    window.scrollTo(0, 0);
  };
  if (!ready) return null;
  if (topic === undefined) return <TopicPage words={words} onOpen={open} />;
  return <><h1 className="sr-only">Flashcards: {topic === ALL ? 'all words' : topic}</h1><Deck key={topic} words={words} topic={topic === ALL ? null : topic} onTopics={() => open(undefined)} /></>;
}

function TopicPage({ words, onOpen }) {
  const { progress } = useProgressStore();
  const topics = useMemo(() => {
    const map = new Map();
    for (const w of words) {
      const name = w.category?.name; if (!name) continue;
      if (!map.has(name)) map.set(name, { name, color: w.category.color, words: [] });
      map.get(name).words.push(w);
    }
    return map;
  }, [words]);
  const learned = (list) => list.filter((w) => (progress[w.thai]?.got || 0) >= 1).length;
  const allLearned = learned(words);

  return (
    <div className="tp">
      <div className="tp-head">
        <h1>What do you want to learn?</h1>
        <p>Start with the most useful words, or pick a topic you need this week.</p>
      </div>

      <button type="button" className="tp-all" onClick={() => onOpen(ALL)}>
        <span className="tp-all-tag">Recommended</span>
        <span className="tp-all-title">All words, most useful first</span>
        <span className="tp-all-sub">{words.length.toLocaleString('en')} words in the order you'll need them, starting with สวัสดี (sà-wàt-dii), hello.</span>
        <span className="tp-progress" aria-label={`${allLearned} of ${words.length} learned`}>
          <i style={{ width: `${(allLearned / Math.max(words.length, 1)) * 100}%` }} />
        </span>
        <span className="tp-count">{allLearned > 0 ? `${allLearned} learned` : 'Start here'}</span>
      </button>

      {TOPIC_GROUPS.map((g) => {
        const items = g.names.map((n) => topics.get(n)).filter(Boolean);
        if (!items.length) return null;
        return (
          <section key={g.label} className="tp-group" aria-label={g.label}>
            <h2>{g.label}</h2>
            <div className="tp-grid">
              {items.map((t) => {
                const done = learned(t.words);
                return (
                  <button key={t.name} type="button" className="tp-tile" style={{ '--tc': t.color }} onClick={() => onOpen(t.name)}>
                    <span className="tp-band"><b>{t.name}</b><small>{t.words.length} words</small></span>
                    <span className="tp-body">
                      <span className="tp-blurb">{TOPIC_BLURB[t.name] || ''}</span>
                      <span className="tp-samples">
                        {t.words.slice(0, 3).map((w) => (
                          <span key={w.thai} className="tp-sample">
                            <span className="th" lang="th">{w.thai}</span>
                            <span className="rom">{w.romanization}</span>
                            <span className="en">{(w.english || '').split(';')[0].replace(/[()]/g, '').trim()}</span>
                          </span>
                        ))}
                      </span>
                      <span className="tp-foot">
                        <span className="tp-progress" aria-hidden="true"><i style={{ width: `${(done / t.words.length) * 100}%` }} /></span>
                        <span className="tp-count">{done > 0 ? `${done} of ${t.words.length} learned` : 'Not started'}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
