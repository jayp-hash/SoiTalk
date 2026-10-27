// Analytics + error logging (Oct 2026): one free PostHog project does both.
// No package needed: events go straight to PostHog's capture endpoint.
// Off until NEXT_PUBLIC_POSTHOG_KEY is set in Vercel (the public project key,
// safe in the browser). Each visitor gets a random id on this device; the
// first ad or link they came from (utm_source etc.) rides along on every
// event, so we can see which ads bring people who finish and come back.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

function visitorId() {
  let id = get('tsc-anon-id');
  if (!id) { id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`); set('tsc-anon-id', id); }
  return id;
}

export const inAppBrowser = () => {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/\bLine\//i.test(ua)) return 'line';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'tiktok';
  return '';
};

// The first place this visitor came from, kept for good (first touch)
function firstTouch() {
  let ft = null;
  try { ft = JSON.parse(get('tsc-first-touch') || 'null'); } catch { ft = null; }
  if (ft) return ft;
  const q = new URLSearchParams(window.location.search);
  ft = {
    utm_source: q.get('utm_source') || (inAppBrowser() || ''), utm_medium: q.get('utm_medium') || '',
    utm_campaign: q.get('utm_campaign') || '', utm_content: q.get('utm_content') || '',
    referrer: document.referrer || '', landing: window.location.pathname, first_seen: new Date().toISOString(),
  };
  set('tsc-first-touch', JSON.stringify(ft));
  return ft;
}

// Signed in: events use the account id, so one person on two devices (or in
// Instagram's browser and then Safari) counts as one person, not two.
const USER_KEY = 'tsc-ph-user';
const distinctId = () => get(USER_KEY) || visitorId();

// Called once when someone signs in: tells PostHog that this device's
// anonymous id and the account are the same person ($identify).
export function identify(userId) {
  if (!userId || typeof window === 'undefined' || get(USER_KEY) === userId) return;
  const anon = visitorId();
  set(USER_KEY, userId);
  track('$identify', { $anon_distinct_id: anon });
}
// Signed out: this device starts again with a fresh anonymous id, so what
// happens next isn't counted to the account that just left
export function forgetUser() {
  try { localStorage.removeItem(USER_KEY); localStorage.removeItem('tsc-anon-id'); } catch { /* private mode */ }
}

export function track(event, props = {}) {
  if (!KEY || typeof window === 'undefined') return;
  try {
    const ft = firstTouch();
    const body = {
      api_key: KEY, event, distinct_id: distinctId(), timestamp: new Date().toISOString(),
      properties: {
        ...props,
        $current_url: window.location.href, $pathname: window.location.pathname, $referrer: document.referrer,
        $screen_width: window.innerWidth, in_app_browser: inAppBrowser() || 'no',
        first_utm_source: ft.utm_source, first_utm_medium: ft.utm_medium, first_utm_campaign: ft.utm_campaign,
        first_utm_content: ft.utm_content, first_landing: ft.landing,
        voice: (() => { try { return JSON.parse(get('tsc-help') || '{}').voice || ''; } catch { return ''; } })(),
        $lib: 'soitalk-web',
      },
    };
    fetch(`${HOST}/i/v0/e/`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  } catch { /* never break the app for analytics */ }
}

// Errors anywhere in the browser get logged as "app_error" (our error log)
let listening = false;
export function listenForErrors() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  let sent = 0; // at most 20 per page load, so a loop can't flood it
  const send = (message, extra) => { if (sent++ < 20) track('app_error', { message: String(message).slice(0, 500), ...extra }); };
  window.addEventListener('error', (e) => send(e.message, { source: e.filename, line: e.lineno, stack: e.error?.stack?.slice(0, 1500) }));
  window.addEventListener('unhandledrejection', (e) => send(e.reason?.message || e.reason, { stack: e.reason?.stack?.slice(0, 1500), kind: 'promise' }));
}
