// Clips are cached for a year by the browser and Vercel, keyed by URL.
// Version 3 (Oct 2026): sentences play a little slower (speed 0.8) and the
// turtle clip is the whole sentence at the voice's slowest speed, with no
// spaces between words (spaces made it stutter). Single words keep version 2,
// so their cached clips are reused and don't cost new audio.
// Turtle speed. The voice service ignores slower speeds, so the browser
// slows the clip down itself (pitch kept). Used by every turtle button.
// 29 Oct (Jay: echo on the slow male voice): 0.75 stretched the clip hard enough to
// echo on the deeper voice. 0.85 on top of the voice's own 0.7 is still clearly slow.
export const SLOW_RATE = 0.85;

export const isSentence = (text = '') => text.replace(/\s/g, '').length > 8;
// Version 4 (29 Oct, Jay: "a little fast to start"): sentences at speed 0.75. Slow clips keep version 3.
export const audioVersion = (text = '', slow = false) => (slow ? 3 : isSentence(text) ? 4 : 2);
