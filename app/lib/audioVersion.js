// Clips are cached for a year by the browser and Vercel, keyed by URL.
// Version 3 (Oct 2026): sentences play a little slower (speed 0.8) and the
// turtle clip is the whole sentence at the voice's slowest speed, with no
// spaces between words (spaces made it stutter). Single words keep version 2,
// so their cached clips are reused and don't cost new audio.
export const isSentence = (text = '') => text.replace(/\s/g, '').length > 8;
export const audioVersion = (text = '', slow = false) => (slow || isSentence(text) ? 3 : 2);
