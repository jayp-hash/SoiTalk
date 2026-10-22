'use client';
// "Report a mistake / send feedback": one small sheet used across the app.
// Messages go into the Supabase table `feedback` (supabase/010_feedback.sql):
// anyone can add a row, nobody can read them through the app; Jay reads them
// in Supabase → Table Editor → feedback. If the table isn't there yet, the
// message is sent to PostHog instead, so nothing is lost.
import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase-browser';
import { track, inAppBrowser } from '../lib/analytics';

const KINDS = [
  ['thai', 'Thai or translation mistake'],
  ['audio', 'Audio problem'],
  ['broken', 'Something broke'],
  ['idea', 'Idea or other'],
];

const FlagIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" />
  </svg>
);

function Sheet({ context, onClose }) {
  const [kind, setKind] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('edit'); // edit | sending | sent
  const box = useRef(null);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    box.current?.focus();
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const send = async () => {
    if (!kind && !message.trim()) return;
    setState('sending');
    let anon = '';
    try { anon = localStorage.getItem('tsc-anon-id') || ''; } catch { /* private mode */ }
    const row = {
      kind: kind || 'other',
      message: message.trim().slice(0, 2000),
      email: email.trim().slice(0, 200) || null,
      page: window.location.pathname,
      context: { ...context, in_app: inAppBrowser() || null },
      anon_id: anon,
      user_agent: navigator.userAgent.slice(0, 300),
    };
    let ok = false;
    try { const { error } = await supabaseBrowser().from('feedback').insert(row); ok = !error; } catch { ok = false; }
    // Backup: the analytics service keeps it if the table isn't set up yet
    track(ok ? 'feedback_sent' : 'feedback', ok ? { kind: row.kind } : { ...row, context: JSON.stringify(row.context) });
    setState('sent');
  };

  return (
    <div className="fb-overlay" onClick={onClose}>
      <div className="fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-title" onClick={(e) => e.stopPropagation()}>
        <div className="fb-band"><FlagIcon /><span id="fb-title">{state === 'sent' ? 'Thank you' : 'Tell us'}</span>
          <button type="button" className="fb-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {state === 'sent' ? (
          <div className="fb-body">
            <p className="fb-thanks">Got it. We read every message, and fixes go out fast.</p>
            <button type="button" className="st-cta" onClick={onClose}>Back</button>
          </div>
        ) : (
          <div className="fb-body">
            <div className="fb-kinds" role="radiogroup" aria-label="What is it about?">
              {KINDS.map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{label}</button>
              ))}
            </div>
            <label className="fb-label" htmlFor="fb-msg">What happened?</label>
            <textarea id="fb-msg" ref={box} rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={kind === 'thai' ? 'Which word or line, and what should it be?' : 'A sentence or two is plenty.'} />
            <label className="fb-label" htmlFor="fb-email">Email <span>(only if you'd like a reply)</span></label>
            <input id="fb-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="button" className="st-cta" disabled={state === 'sending' || (!kind && !message.trim())} onClick={send}>
              {state === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// A button or link that opens the sheet. `context` says where they were
// (scene and step, or the word on the card) so a report can be found and fixed.
export default function Feedback({ context = {}, className = 'fb-link', label = 'Report a mistake', icon = false }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} aria-label={icon ? label : undefined} title={icon ? label : undefined} onClick={() => setOpen(true)}>
        {icon ? <FlagIcon /> : label}
      </button>
      {open && <Sheet context={context} onClose={() => setOpen(false)} />}
    </>
  );
}
