'use client';
import { track, inAppBrowser } from '../lib/analytics';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase-browser';
import { useUser } from '../lib/useUser';

// Sign in with Google, or by email with a 6-digit code (the email also has a link).
// Signing in is optional: it saves your progress so it follows you between devices.
//
// Why a code (CTO review, 22 Oct): people from Instagram, TikTok and LINE are in
// the app's own browser. The email opens in Mail or Safari, and a sign-in link
// only works in the browser that asked for it. A code typed back into the same
// screen works anywhere.
export default function SignIn() {
  const { user, ready } = useUser();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  // Google blocks its sign-in inside Instagram, TikTok and LINE: show email only there
  const [inApp, setInApp] = useState(false);
  useEffect(() => { setInApp(inAppBrowser() || false); }, []);

  // Where to go after signing in (e.g. /signin?next=/today from the first session)
  const back = () => {
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) localStorage.setItem('tsc-after-signin', next);
    } catch {}
    return `${window.location.origin}/auth/callback`;
  };

  const google = async () => {
    setError(''); track('signin_click', { method: 'google' });
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: back() },
    });
    if (error) { setStatus('error'); setError(error.message); }
  };

  const sendLink = async (e) => {
    e?.preventDefault?.();
    setStatus('sending'); setError(''); track('signin_click', { method: 'email' });
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: back() },
    });
    if (error) { setStatus('error'); setError(error.message); } else { setStatus('sent'); setCode(''); }
  };

  const verify = async (e) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) return;
    setChecking(true); setError('');
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    setChecking(false);
    if (error) { setError("That code didn't work. Check it, or send a new one."); return; }
    track('signin_done', { method: 'email_code' });
    let next = '/today';
    try { next = localStorage.getItem('tsc-after-signin') || '/today'; localStorage.removeItem('tsc-after-signin'); } catch {}
    window.location.replace(next);
  };

  if (ready && user) {
    return (
      <main className="page auth">
        <div className="auth-card">
          <h1 className="auth-title">You're signed in</h1>
          <p className="auth-sub">Signed in as <b>{user.email}</b>. Your progress is saved to your account.</p>
          <a className="auth-btn primary" href="/today">Go to Today</a>
        </div>
      </main>
    );
  }

  return (
    <main className="page auth">
      <div className="auth-card">
        <h1 className="auth-title">Save your progress</h1>
        <p className="auth-sub">Keep your words and progress on every device.</p>

        {inApp ? (
          <p className="auth-inapp">Google sign-in doesn't work inside {({ instagram: 'Instagram', facebook: 'Facebook', line: 'LINE', tiktok: 'TikTok' })[inApp] || 'this app'}. Use your email and we'll send you a code.</p>
        ) : (
          <>
            <button type="button" className="auth-btn google" onClick={google}>
              <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-or"><span>or</span></div>
          </>
        )}

        {status === 'sent' ? (
          <div className="auth-code" role="status">
            <div className="auth-code-head">
              <svg className="auth-code-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
              <p className="auth-code-title">Check your inbox</p>
            </div>
            <p className="auth-code-text">We sent a 6-digit code to <b>{email}</b></p>
            <form onSubmit={verify} className="auth-code-form">
              <label htmlFor="signin-code" className="sr-only">6-digit code</label>
              <input id="signin-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} autoFocus />
              <button type="submit" className="auth-btn primary" disabled={checking || code.length !== 6}>
                {checking ? 'Checking…' : 'Sign in'}
              </button>
            </form>
            {error && <p className="auth-error">{error}</p>}
            <p className="auth-code-alt">Or open the email on this phone and tap the button.</p>
            <p className="auth-code-links">
              <button type="button" className="auth-link" onClick={sendLink}>Send a new code</button>
              <button type="button" className="auth-link" onClick={() => { setStatus('idle'); setError(''); }}>Change email</button>
            </p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="auth-form">
            <label htmlFor="signin-email">Email</label>
            <input id="signin-email" type="email" required autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="auth-btn primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Email me a sign-in code'}
            </button>
          </form>
        )}

        {status === 'error' && <p className="auth-error">Couldn't sign you in: {error}. Please try again.</p>}

        <p className="auth-fine">No password needed. By signing in you agree to our <a href="/privacy">privacy policy</a>.</p>
      </div>
    </main>
  );
}
