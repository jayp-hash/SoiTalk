'use client';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '../lib/useUser';
import SoiSign from './SoiSign';

// The home page for new visitors. The pitch changes with who's visiting
// (live in Thailand / Thai partner / visiting); the choice is remembered
// in this browser (later: saved to the profile and used to tailor the course).
const PERSONA_KEY = 'tsc-persona';
const AUDIO_VERSION = 2; // keep in step with Deck.js

const PERSONAS = {
  live: {
    chip: 'I live in Thailand',
    h1: <>Thai for the street <span className="lp-th">you live on</span></>,
    lede: 'Order food, give the taxi directions and sort things out with the condo office. Learn the words people around you actually use, most useful first.',
  },
  partner: {
    chip: 'My partner is Thai',
    h1: <>Talk with their family, <span className="lp-th">not just smile and nod</span></>,
    lede: 'Follow the conversation at dinner, say the right thing to their parents and surprise your partner. Start with the everyday Thai families really speak.',
  },
  visit: {
    chip: "I'm visiting",
    h1: <>Survival Thai <span className="lp-th">before you land</span></>,
    lede: 'Greet people, ask where things are and pay at the market. The most useful words come first, so a few days of practice already helps.',
  },
};

const MISSIONS = {
  live: [['7-Eleven', 'ไม่เอาถุง', 'mâi ao thǔng', "Tell the cashier you don't need a bag."], ['Taxi', 'ไปสุขุมวิท', 'bpai sù-khǔm-wít', "Tell the driver where you're going."], ['Street food', 'ไม่เผ็ด', 'mâi phèt', 'Order your dish not spicy.']],
  partner: [['Dinner', 'อร่อยมาก', 'à-ràwi mâak', 'Tell their mum the food is delicious.'], ['Greeting', 'สวัสดี', 'sà-wàt-dii', 'Greet their parents with a wai.'], ['At home', 'กินข้าวหรือยัง', 'gin khâao rǔue yang', "Ask someone if they've eaten yet."]],
  visit: [['Market', 'เท่าไหร่', 'thâo-rài', 'Ask how much something costs.'], ['Restaurant', 'เช็คบิลด้วย', 'chék-bin dûaai', 'Ask for the bill.'], ['Hotel', 'ขอบคุณ', 'khàawp-khun', 'Thank the staff in Thai.']],
};

const clean = (m) => (m || '').replace(/\s*\([^)]*\)\s*$/, '');

function usePlay() {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(null);
  const play = (id, text) => {
    try {
      audio.current?.pause();
      const a = new Audio(`/api/speak?text=${encodeURIComponent(text)}&voice=female&v=${AUDIO_VERSION}`);
      audio.current = a;
      setPlaying(id);
      a.onended = a.onerror = () => setPlaying((p) => (p === id ? null : p));
      a.play().catch(() => setPlaying(null));
    } catch { setPlaying(null); }
  };
  return { play, playing };
}

const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>;

function DemoCard({ card }) {
  const [flipped, setFlipped] = useState(false);
  const { play, playing } = usePlay();
  // Word meanings work like the real cards: tap a word (stays 2.5 s) or rest the mouse on it for half a second
  const [peek, setPeek] = useState(-1);
  const peekTimer = useRef(0), hoverTimer = useRef(0);
  const showPeek = (k, ms) => { clearTimeout(peekTimer.current); setPeek(k); peekTimer.current = ms ? setTimeout(() => { setPeek(-1); peekTimer.current = 0; }, ms) : 0; };
  const hoverIn = (k) => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => showPeek(k, 0), 500); };
  const hoverOut = () => { clearTimeout(hoverTimer.current); if (!peekTimer.current) setPeek(-1); };
  useEffect(() => { setFlipped(false); setPeek(-1); }, [card.thai]);
  const s = card.sentence;
  const style = { '--cat': card.category.color, '--cat-edge': card.category.edge };
  const band = (
    <div className="lp-band"><span>{card.category.name}</span><span>#{card.position}</span></div>
  );
  return (
    <div className="lp-stage">
      <div className={`lp-card${flipped ? ' is-flipped' : ''}`} style={style} role="button" tabIndex={0}
        aria-label={flipped ? 'Flip the card back' : `${card.thai}. Tap to see the meaning.`}
        onClick={() => setFlipped((f) => !f)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); } }}>
        <div className="lp-in">
          <section className="lp-face lp-front" aria-hidden={flipped}>
            {band}
            <div className="lp-front-body">
              <div className="lp-big" lang="th">{card.thai}</div>
              <div className="lp-rom">{card.romanization}</div>
              <button type="button" className={`lp-play${playing === 'word' ? ' on' : ''}`} aria-label={`Play ${card.thai}`} onClick={(e) => { e.stopPropagation(); play('word', card.thai); }}><PlayIcon /></button>
            </div>
          </section>
          <section className="lp-face lp-back" aria-hidden={!flipped}>
            {band}
            <div className="lp-back-body">
              <div className="lp-top">
                {s && <button type="button" className={`lp-play sm${playing === 'sentence' ? ' on' : ''}`} aria-label="Play the sentence" onClick={(e) => { e.stopPropagation(); play('sentence', s.thai); }}><PlayIcon /></button>}
                <div className="lp-word">
                  <span lang="th">{card.thai}</span>
                  <i>{card.romanization}</i>
                  <b>{clean(card.english)}</b>
                </div>
              </div>
              {s && (
                <>
                  <div className="lp-boxes" lang="th">
                    {(s.words || [{ th: s.thai, rom: s.romanization }]).map((w, k) => (
                      <button key={k} type="button" className={`lp-box${w.th === card.thai ? ' target' : ''}${playing === `b${k}` ? ' on' : ''}`}
                        aria-label={`Play ${w.th}${w.en ? `, meaning ${w.en}` : ''}`}
                        onClick={(e) => { e.stopPropagation(); play(`b${k}`, w.th); if (w.en) showPeek(k, 2500); }}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && w.en && hoverIn(k)}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && hoverOut()}>
                        {peek === k && w.en && <span className={`lp-peek${k === 0 ? ' left' : ''}`} role="tooltip">{w.en}</span>}
                        <span className="th">{w.th}</span>
                        {w.rom && <small>{w.rom}</small>}
                      </button>
                    ))}
                  </div>
                  <p className="lp-en">{s.english}</p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
      <p className="lp-stage-note">{flipped ? 'Tap a word to hear it and see what it means.' : 'A real card from the course. Tap it to flip.'}</p>
    </div>
  );
}

// Counts the hero sign's number up from 0 once, so the meter idea lands at a glance.
// Counts from the number now showing to the new target.
function useCountUp(target, ms = 1600) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(target); from.current = target; return; }
    let raf; const t0 = performance.now(); const start = from.current;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(start + (target - start) * (1 - Math.pow(1 - k, 3)));
      from.current = v; setN(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

// True once the element has scrolled into view (so the count-up is seen).
function useSeen() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

const Tick = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;

export default function Landing({ wordCount, demo, curve }) {
  const [persona, setPersona] = useState('live');
  const { user } = useUser();
  useEffect(() => {
    try { const p = localStorage.getItem(PERSONA_KEY); if (p && PERSONAS[p]) setPersona(p); } catch {}
  }, []);
  const choose = (p) => { setPersona(p); try { localStorage.setItem(PERSONA_KEY, p); } catch {} };
  const P = PERSONAS[persona];
  const count = wordCount.toLocaleString('en');
  const cta = user
    ? <a className="lp-btn" href="/today">Continue to Today</a>
    : <a className="lp-btn" href="/today">Start learning free</a>;
  const curvePts = Object.entries(curve).map(([n, pct]) => ({ n: Number(n), pct }));
  const maxPct = Math.max(...curvePts.map((p) => p.pct), 1);
  const [pick, setPick] = useState(() => (curvePts.find((p) => p.n >= 300) || curvePts[curvePts.length - 1] || { n: 0 }).n);
  const picked = curvePts.find((p) => p.n === pick) || { n: 0, pct: 0 };
  const [meterRef, meterSeen] = useSeen();
  const meter = useCountUp(meterSeen ? picked.pct : 0, 900);

  return (
    <main className="lp">
      <section className="lp-hero">
        <div className="lp-pitch">
          <p className="lp-who-label" id="who-label">I'm learning Thai because</p>
          <div className="lp-who" role="group" aria-labelledby="who-label">
            {Object.entries(PERSONAS).map(([id, p]) => (
              <button key={id} type="button" aria-pressed={persona === id} onClick={() => choose(id)}>{p.chip}</button>
            ))}
          </div>
          <h1>{P.h1}</h1>
          <p className="lp-lede">{P.lede}</p>
          <div className="lp-cta">
            {cta}
            {!user && <span>No signup needed. Save your progress later with Google or email.</span>}
          </div>
        </div>
        <DemoCard card={demo[persona]} />
      </section>

      <section className="lp-sec">
        <p className="lp-eyebrow">How it works</p>
        <h2>The words you need, in the order you need them</h2>
        <div className="lp-steps">
          <div className="lp-step" style={{ '--sc': '#F08A1C' }}>
            <span className="lp-n">1</span>
            <h3>Survival words first</h3>
            <p>{count} words ordered by how useful they are in daily life. Greetings, food and getting around come first. News and formal Thai wait until the end.</p>
          </div>
          <div className="lp-step" style={{ '--sc': '#2B86E8' }}>
            <span className="lp-n">2</span>
            <h3>A few minutes a day</h3>
            <p>Each day you get the cards that are due plus a few new ones. Help fades as you learn: first the English blurs, then the romanization.</p>
          </div>
          <div className="lp-step" style={{ '--sc': '#8B5CF6' }}>
            <span className="lp-n">3</span>
            <h3>Every sentence makes sense</h3>
            <p>Each card's example sentence only uses words you've already met, so you can always work it out.</p>
          </div>
        </div>
      </section>

      <section className="lp-sec lp-split">
        <div>
          <p className="lp-eyebrow">Progress you can feel</p>
          <h2>See how much everyday Thai you already understand</h2>
          <p className="lp-sub">Every word in the course is ranked by how often Thai people use it, so each word you learn moves a real number: the share of everyday Thai you can follow.</p>
          <ul className="lp-ticks">
            <li><i><Tick /></i><span><b>Daily review.</b> The cards you're about to forget, at the right time.</span></li>
            <li><i><Tick /></i><span><b>Streaks in Thailand's colours of the day.</b> Yellow Monday, pink Tuesday and so on.</span></li>
            <li><i><Tick /></i><span><b>On every device.</b> Sign in once and pick up on your phone or laptop.</span></li>
          </ul>
        </div>
        <div className="lp-panel" ref={meterRef}>
          <div className="lp-meter-sign">
            <SoiSign width={280} th="ซอย" en="Your street" number={`${meter}%`} title={`Street meter: ${picked.pct}% after ${picked.n} words`} />
          </div>
          <p className="lp-panel-title">Your street meter after…</p>
          <div className="lp-curve" role="radiogroup" aria-label="Words learned">
            {curvePts.map(({ n, pct }) => (
              <button key={n} type="button" role="radio" aria-checked={pick === n} className={`lp-curve-row${pick === n ? ' is-on' : ''}`} onClick={() => setPick(n)}>
                <span className="lp-curve-n">{n.toLocaleString('en')} words</span>
                <span className="lp-curve-bar"><i style={{ width: `${(pct / maxPct) * 100}%` }} /></span>
                <b>{pct}%</b>
              </button>
            ))}
          </div>
          <p className="lp-fine">Estimates from each word's frequency ranking. The first few hundred words do most of the work.</p>
        </div>
      </section>

      <section className="lp-sec">
        <p className="lp-eyebrow">Coming soon</p>
        <h2>Missions: small wins in real life</h2>
        <p className="lp-sub">Finish a word pack, then try it for real and tick it off.</p>
        <div className="lp-missions">
          {MISSIONS[persona].map(([where, th, rom, text]) => (
            <div key={where} className="lp-mission">
              <span className="lp-where">{where}</span>
              <span className="lp-mth" lang="th">{th}</span>
              <span className="lp-mrom">{rom}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-sec">
        <div className="lp-next">
          <div>
            <p className="lp-eyebrow yellow">Coming next</p>
            <h2>Practise the conversation before you have it</h2>
            <p className="lp-sub light">Role-play a 7-Eleven checkout, a taxi ride or a market stall, using only the words you've learned so far.</p>
          </div>
          <div className="lp-chat" aria-label="Example role-play at 7-Eleven">
            <div className="lp-msg them"><small>Cashier</small><span lang="th">รับถุงไหมคะ</span><i className="lp-rom">ráp thǔng mǎi khá</i><em>Do you want a bag?</em></div>
            <div className="lp-msg me"><small>You</small><span lang="th">ไม่เอาถุง ขอบคุณ</span><i className="lp-rom">mâi ao thǔng, khàawp-khun</i><em>No bag, thanks.</em></div>
          </div>
        </div>
      </section>

      <section className="lp-close">
        <span className="lp-big-th" lang="th">เริ่มกันเลย</span>
        <span className="lp-big-rom">rôeem gan loeei</span>
        <h2>Let's get started</h2>
        {cta}
      </section>

      <footer className="lp-foot">
        <span>Soi Talk · made in Bangkok</span>
        <span><a href="/vocabulary">All words</a> · <a href="/privacy">Privacy</a></span>
      </footer>
    </main>
  );
}
