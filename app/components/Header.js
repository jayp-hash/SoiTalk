'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '../lib/useUser';
import { supabaseBrowser } from '../lib/supabase-browser';
import SoiSign from './SoiSign';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/today', label: 'Today' },
  { href: '/vocabulary', label: 'Words' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/classifiers', label: 'Classifiers' },
];

// "Sign in" when signed out; a round initial with a small menu when signed in.
function Account() {
  const { user, ready } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (!ready) return <span className="acct-slot" aria-hidden="true" />;
  if (!user) return (
    <a href="/signin" className="acct-signin" aria-label="Sign in">
      <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
      <span className="lbl">Sign in</span>
    </a>
  );

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?';
  const signOut = async () => { await supabaseBrowser().auth.signOut(); window.location.href = '/'; };
  return (
    <div className="acct" ref={ref}>
      <button type="button" className="acct-btn" aria-label="Your account" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {name.trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="acct-menu">
          <div className="acct-who">{user.email}</div>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}

// The Patterns tab appears once you've used a pattern or shown you want more,
// not on a set day (Instagram's browser keeps its own storage, so a day count
// resets there). Pattern practice is saved with your progress ("pattern:..."
// keys), so a signed-in learner sees the tab on every device.
const showPatterns = () => {
  try {
    if (JSON.parse(localStorage.getItem('tsc-patterns-open'))) return true;
    const mem = JSON.parse(localStorage.getItem('tsc-memory')) || {};
    if (Object.keys(mem).some((k) => k.startsWith('pattern:'))) return true;
    if (Object.keys(JSON.parse(localStorage.getItem('tsc-signs')) || {}).length) return true;
    return Object.keys(JSON.parse(localStorage.getItem('tsc-days')) || {}).length >= 3;
  } catch { return false; }
};

export default function Header() {
  const pathname = usePathname();
  const [patterns, setPatterns] = useState(false);
  useEffect(() => { setPatterns(showPatterns() || pathname === '/patterns'); }, [pathname]);
  // The first session (/start) is full screen: nothing to wander off to
  if (pathname?.startsWith('/start')) return null;

  return (
    <header className="site-header">
      <a href="/" className="brand" aria-label="Soi Talk home">
        <SoiSign width={172} tab={false} title="Soi Talk" />
      </a>
      <nav>
        {LINKS.filter((l) => l.href !== '/patterns' || patterns).map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`${pathname === link.href ? 'active' : ''}${link.href === '/' ? ' nav-home' : ''}`.trim() || undefined}
          >
            {link.label}
          </a>
        ))}
        <Account />
      </nav>
    </header>
  );
}
