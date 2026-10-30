// Tomorrow's reminder: a calendar file for 8am tomorrow (phones and laptops, no account).
// Moved here from the lesson Done screen (29 Oct): reminders now live on Today.
// Instagram, TikTok, Facebook and LINE open links in their own browser, where a calendar file does nothing.
export const inAppBrowser = () => {
  try { return /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|Bytedance/i.test(navigator.userAgent); } catch { return false; }
};
export const CalIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
// A calendar reminder for tomorrow at 8am (works on phones and laptops, no account needed)
export function reminderIcs(scene) {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const end = new Date(d.getTime() + 10 * 60000);
  const title = `Soi Talk: ${scene.tomorrow || 'today\'s Thai'} (2 min)`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Soi Talk//EN', 'BEGIN:VEVENT', `UID:${Date.now()}@soitalk.app`,
    `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, `SUMMARY:${title}`,
    'DESCRIPTION:Your next 2 minutes of Thai: https://soitalk.app/today', 'URL:https://soitalk.app/today',
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
