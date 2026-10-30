'use client';
// One audio player for the app's lessons.
//
// Why it works this way (phone tests from Instagram, 22 Oct):
// 1. Each clip is downloaded in full before it plays (a blob URL). Streamed
//    clips made iPhones guess the length too short, so the karaoke jumped to
//    the last word. With the whole file, the length is exact.
// 2. Clips are fetched ahead of time (preload), a few at a time, so most taps
//    play straight away.
// 3. One shared audio element, "unlocked" on the first touch. iPhones only let
//    sound play from a tap; once the element has played inside a tap, it can
//    play later clips that finish downloading after the tap.
// 4. The button shows "playing" the moment it's pressed. Tapping again while
//    the clip is still loading does nothing (it used to stop and restart it,
//    which caused the stutter). Tapping while it plays stops it.
import { useEffect, useRef, useState } from 'react';
import { audioVersion, SLOW_RATE } from './audioVersion';

const SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABAAAAlgAenp6enp6enp6enp6enp6enp6enp6enp6pqampqampqampqampqampqampqampqamptPT09PT09PT09PT09PT09PT09PT09PT09P/////////////////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCcQAAAAAAAAJY+/rsqgAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

export const clipUrl = (c) => `/api/speak?text=${encodeURIComponent(c.text)}&voice=${c.voice}${c.slow ? '&slow=1' : ''}&v=${audioVersion(c.text, c.slow)}`;

const cache = new Map(); // url -> Promise<blob URL>
export function loadClip(c) {
  const url = clipUrl(c);
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`speak ${r.status}`); return r.blob(); })
      .then((b) => URL.createObjectURL(b));
    p.catch(() => cache.delete(url)); // a failed download can be tried again
    cache.set(url, p);
  }
  return cache.get(url);
}

// Background downloads, 3 at a time. first=true jumps the queue.
const queue = [];
let active = 0;
export function preload(clips, first = false) {
  const fresh = clips.filter((c) => c && c.text && !cache.has(clipUrl(c)));
  if (first) queue.unshift(...fresh); else queue.push(...fresh);
  pump();
}
function pump() {
  while (active < 3 && queue.length) {
    const c = queue.shift();
    if (cache.has(clipUrl(c))) continue;
    active += 1;
    loadClip(c).catch(() => {}).finally(() => { active -= 1; pump(); });
  }
}

let el = null;
let unlocked = false;
function element() {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio();
    el.preload = 'auto';
    el.preservesPitch = true; el.webkitPreservesPitch = true; el.mozPreservesPitch = true;
  }
  return el;
}
function unlock() {
  const a = element();
  if (!a || unlocked) return;
  unlocked = true;
  try { a.src = SILENT; const p = a.play(); if (p) p.then(() => a.pause()).catch(() => { unlocked = false; }); } catch { unlocked = false; }
}

// play(id, clips): plays a short sequence (cashier, then you). One at a time.
// playing = the id of the button that's active (from the moment it's pressed)
// started = sound is actually coming out; idx = which clip of the sequence;
// progress = 0..1 through the current clip, for the karaoke.
export function usePlayer() {
  const token = useRef(0);
  const state = useRef({ playing: null, started: false });
  const [playing, setPlaying] = useState(null);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  const set = (p, s) => { state.current = { playing: p, started: s }; setPlaying(p); setStarted(s); };

  useEffect(() => {
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchend', unlock, true);
    return () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('touchend', unlock, true);
      token.current += 1; el?.pause();
    };
  }, []);

  const stop = () => { token.current += 1; el?.pause(); set(null, false); setIdx(-1); setProgress(0); };

  const play = async (id, clips) => {
    if (state.current.playing === id) {
      if (!state.current.started) return false; // still loading: ignore the extra tap
      stop(); return false;
    }
    stop();
    const my = token.current;
    set(id, false);
    const srcs = clips.map((c) => loadClip(c).catch(() => null)); // all start downloading now
    const a = element();
    for (const [i, c] of clips.entries()) {
      const src = await srcs[i];
      if (token.current !== my) return false;
      if (!src || !a) continue;
      setIdx(i); setProgress(0);
      a.src = src;
      // Male voice: no extra browser slow-down (Jay heard an echo). Its own 0.7 speed is enough.
      const rate = c.slow && c.voice !== 'male' ? SLOW_RATE : 1;
      a.defaultPlaybackRate = rate; a.playbackRate = rate;
      await new Promise((res) => {
        a.onended = res; a.onerror = res;
        const tick = () => {
          if (token.current !== my || a.paused) return;
          if (Number.isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration);
          requestAnimationFrame(tick);
        };
        a.play().then(() => {
          if (token.current !== my) { a.pause(); res(); return; }
          a.playbackRate = rate; // Safari resets it when a clip starts
          state.current.started = true; setStarted(true);
          tick();
        }).catch(res);
      });
      if (token.current !== my) return false;
      setProgress(0);
      // A real pause between two people speaking (Jay, 29 Oct: it felt rushed)
      await new Promise((res) => setTimeout(res, clips.length > 1 ? 650 : 250));
    }
    if (token.current !== my) return false;
    set(null, false); setIdx(-1); setProgress(0);
    return true; // played to the end
  };

  return { play, stop, playing, started, idx, progress };
}
