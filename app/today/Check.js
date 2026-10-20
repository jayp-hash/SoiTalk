'use client';
import { audioVersion, SLOW_RATE } from '../lib/audioVersion';
import { soundRight, soundWrong } from '../lib/sfx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { readStore } from '../lib/progress';
import { renderSentence, getRegister } from '../lib/register';

// Listen-and-choose checks: the only thing that makes a word stronger in
// memory (see lib/memory.js). You hear the word (or its sample sentence)
// and pick the meaning from 5 options.
//
// Fair options for Thai learners:
//   - no options that sound almost the same (tone or vowel-length look-alikes
//     such as ใกล้ glâi / ไกล glai, หมา mǎa / ม้า máa): no tone test by accident
//   - no options that mean the same thing in English
//   - small grammar words (ที่, ก็, แล้ว) are checked through their sentence,
//     because "what does ก็ mean?" isn't a fair question
// "Show the word" reveals the Thai and romanization; a right answer after
// that still counts, but less.

const OPTIONS = 5;

export const shortMeaning = (en = '') => en.split(';')[0].replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const plain = (rom = '') => rom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/gi, '').toLowerCase();
function nearlySame(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  // one edit apart (Levenshtein distance 1)
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const isGrammar = (w) => w.category?.name === 'Grammar words';

// Which kind of check this word gets today
function kindFor(word, entry) {
  const sentence = word.sentences?.[0];
  if (isGrammar(word)) return sentence ? 'sentence' : null;
  return 'word';
}

function buildItem(word, entry, allWords, progress) {
  let kind = kindFor(word, entry);
  // A sentence check only if you know every word in it; otherwise check the word itself
  if (kind === 'sentence') {
    const sw = renderSentence(word.sentences[0], getRegister()).words;
    const known = (th) => !!progress[th] || th === word.thai || /^(ครับ|ค่ะ|คะ)$/.test(th) || (th === 'ผม' && !!progress['ฉัน']) || (th === 'ฉัน' && !!progress['ผม']);
    if (!sw || !sw.every((x) => x.ending || known(x.th))) kind = 'word';
  }
  // Fewer choices in the first weeks
  const OPTIONS = Object.keys(progress).length < 40 ? 3 : 5;
  if (!kind) return null;
  const metFirst = (list) => [...list.filter((w) => progress[w.thai]), ...list.filter((w) => !progress[w.thai])];
  if (kind === 'word') {
    const answer = shortMeaning(word.english);
    const target = plain(word.romanization);
    const used = new Set([answer.toLowerCase()]);
    const pool = metFirst(shuffle(allWords.slice(0, 400))).filter((w) => {
      if (w.thai === word.thai || isGrammar(w)) return false;
      const m = shortMeaning(w.english).toLowerCase();
      if (!m || used.has(m)) return false;
      if (nearlySame(plain(w.romanization), target)) return false; // sound-alike: never an option
      if (w.thai.includes(word.thai) || word.thai.includes(w.thai)) return false; // ไป vs ไปไหน
      used.add(m);
      return true;
    });
    const options = shuffle([answer, ...pool.slice(0, OPTIONS - 1).map((w) => shortMeaning(w.english))]);
    return { word, kind, audio: word.thai, answer, options, reveal: { th: word.thai, rom: word.romanization, en: answer } };
  }
  const s = renderSentence(word.sentences[0], getRegister()); // in the learner's register
  const answer = s.english;
  const used = new Set([answer.toLowerCase()]);
  const pool = metFirst(shuffle(allWords.slice(0, 500))).filter((w) => {
    const o = w.sentences?.[0];
    if (!o || w.thai === word.thai || !o.english) return false;
    const e = o.english.toLowerCase();
    if (used.has(e)) return false;
    used.add(e);
    return true;
  });
  const options = shuffle([answer, ...pool.slice(0, OPTIONS - 1).map((w) => w.sentences[0].english)]);
  return { word, kind, audio: s.thai, answer, options, reveal: { th: s.thai, rom: s.romanization, en: answer, focus: word.thai } };
}

function useAudio() {
  const audio = useRef(null);
  const token = useRef(0);
  const [playing, setPlaying] = useState(false); // false | 'normal' | 'slow'
  const stop = () => { ++token.current; audio.current?.pause(); setPlaying(false); };
  const play = (text, rate = 1, toggle = false) => {
    const slow = rate < 1; // slow clip from the voice itself, nudged a touch slower
    if (toggle && playing === (slow ? 'slow' : 'normal')) { stop(); return; } // pressing again = stop, like the word cards
    const my = ++token.current;
    try {
      audio.current?.pause();
      const voice = readStore('tsc-help', {}).voice || 'female';
      const a = new Audio(`/api/speak?text=${encodeURIComponent(text)}&voice=${voice}${slow ? '&slow=1' : ''}&v=${audioVersion(text, slow)}`);
      a.defaultPlaybackRate = slow ? SLOW_RATE : 1; a.playbackRate = slow ? SLOW_RATE : 1; a.preservesPitch = true; a.webkitPreservesPitch = true;
      audio.current = a;
      setPlaying(slow ? 'slow' : 'normal');
      a.onended = a.onerror = () => { if (token.current === my) setPlaying(false); };
      a.play().catch(() => { if (token.current === my) setPlaying(false); });
    } catch { setPlaying(false); }
  };
  useEffect(() => () => audio.current?.pause(), []);
  return { play, playing };
}

const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;
const SlowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M2 15h19c1 0 1.5-.8 1.2-1.6L21 11" /><path d="M7 15l-1 3M15 15l1 3" /></svg>;

// queue: words due for a check. onAnswer(word, grade) records it. onDone({ right, total }).
export default function CheckSession({ queue, allWords, progress, onAnswer, onDone, onQuit }) {
  // Build all items up front so options don't reshuffle while you answer
  // Never play the same thing twice: ขอบคุณ and the ค่ะ check's sentence ขอบคุณค่ะ
  // are the same audio apart from the polite ending, so only the first stays.
  const [items, setItems] = useState(() => {
    const seen = new Set();
    const bare = (t) => t.replace(/\s+/g, '').replace(/(ครับ|ค่ะ|คะ|นะ)+$/, '');
    return queue.map((w) => buildItem(w, progress[w.thai], allWords, progress)).filter((it) => {
      if (!it) return false;
      const k = bare(it.audio);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [hinted, setHinted] = useState(false);
  const score = useRef({ right: 0, total: 0, missed: [] });
  const { play, playing } = useAudio();
  const item = items[i];

  useEffect(() => { if (item) play(item.audio); setPicked(null); setHinted(false); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!items.length) onDone?.(score.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (opt) => {
    if (picked != null || !item) return;
    setPicked(opt);
    const right = opt === item.answer;
    if (right) soundRight(); else soundWrong();
    if (!item.practice) {
      score.current.total += 1;
      if (right) score.current.right += 1;
      else score.current.missed.push(item.word);
      onAnswer(item.word, right ? (hinted ? 'hard' : 'good') : 'again', { proof: item.kind === 'word' });
    }
    // A miss comes back once at the end, as practice (not counted again)
    if (!right && !item.practice) setItems((list) => [...list, { ...item, practice: true, options: shuffle(item.options) }]);
    if (right) play(item.audio);
  };
  const next = () => {
    if (i + 1 >= items.length) { onDone?.(score.current); return; }
    setI(i + 1);
  };

  // Keys: 1-5 pick, Enter / → continue, Space replays
  const keyRef = useRef(null);
  keyRef.current = (e) => {
    if (!item) return;
    if (picked == null && /^[1-5]$/.test(e.key)) { const o = item.options[Number(e.key) - 1]; if (o) choose(o); }
    else if (picked != null && (e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); next(); }
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); play(item.audio); }
  };
  useEffect(() => { const h = (e) => keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  if (!item) return null;
  const right = picked != null && picked === item.answer;
  const cat = item.word.category || {};
  const base = items.filter((x) => !x.practice).length; // misses come back as extra practice without changing the count
  const done = Math.min(i, base);

  return (
    <div className="ck" style={{ '--cat': cat.color, '--cat-edge': cat.edge }}>
      <div className="ck-top">
        <div className="ck-progress" aria-hidden="true"><span style={{ width: `${(done / base) * 100}%` }} /></div>
        <span className="ck-count">{item.practice ? 'Practice' : `${i + 1} / ${base}`}</span>
        <button type="button" className="today-quit" onClick={onQuit}>End session</button>
      </div>

      <section className="ck-card is-compact" aria-live="polite">
        <div className="ck-body">
          <p className="ck-eyebrow">{item.practice ? 'One more try' : 'Listen'}{cat.name ? ` · ${cat.name}` : ''}</p>
          <p className="ck-q">{item.kind === 'sentence' ? 'What does it mean?' : 'What does this word mean?'}</p>
          <div className="ck-row">
            <button type="button" className={`ck-play${playing === 'normal' ? ' on' : ''}`} onClick={() => play(item.audio, 1, true)} aria-label={playing === 'normal' ? 'Stop' : 'Play again'}>{playing === 'normal' ? <StopIcon /> : <PlayIcon />}</button>
            <button type="button" className={`ck-slow${playing === 'slow' ? ' on' : ''}`} onClick={() => play(item.audio, 0.65, true)} aria-label={playing === 'slow' ? 'Stop' : 'Play slowly'}><SlowIcon /></button>
            <div className="ck-reveal-slot">
              {(hinted || picked != null) ? (
                <div className={`ck-reveal${item.kind === 'sentence' ? ' is-sentence' : ''}`}>
                  <span className="th" lang="th">{item.reveal.th}</span>
                  <span className="rom">{item.reveal.rom}</span>
                </div>
              ) : (
                <button type="button" className="ck-hint" onClick={() => setHinted(true)}>Show the {item.kind === 'sentence' ? 'sentence' : 'word'}</button>
              )}
            </div>
          </div>

          <div className="ck-options" role="group" aria-label="Choose the meaning">
            {item.options.map((o, k) => {
              const state = picked == null ? '' : o === item.answer ? ' is-right' : o === picked ? ' is-wrong' : ' is-dim';
              return (
                <button key={o} type="button" className={`ck-opt${state}`} onClick={() => choose(o)} disabled={picked != null}>
                  <span className="ck-key" aria-hidden="true">{picked != null && o === item.answer ? '✓' : picked != null && o === picked ? '✕' : k + 1}</span>{o}{picked != null && o === item.answer && <span className="st-tag is-right">{o === picked ? 'Correct' : 'Right answer'}</span>}{picked != null && o === picked && o !== item.answer && <span className="st-tag is-wrong">Your answer</span>}
                </button>
              );
            })}
          </div>

          {picked != null && (
            <div className={`ck-result${right ? ' is-right' : ' is-wrong'}`}>
              <p aria-live="polite">{right
                ? (hinted ? 'Right. Next time try it by ear: it comes back tomorrow.' : 'Right.')
                : <>It means <b>{item.answer}</b>. You'll get one more try at the end, and it comes back sooner.</>}</p>
              <button type="button" className="auth-btn primary" onClick={next} autoFocus>Continue</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
