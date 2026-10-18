#!/usr/bin/env node
// Reel audio: makes the Thai clips for the social reels, with the timing of
// every character so the karaoke highlight can follow the voice exactly.
//
// Usage (from the project folder):   node scripts/reel-audio.js
// Output: voice-tests/reels/<name>.mp3 and <name>.json (not uploaded to GitHub).
// Same voice and settings as the app (app/api/speak): eleven_v4, stability 0.8.

const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnvLocal();
const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) { console.error('ELEVENLABS_API_KEY not found in .env.local'); process.exit(1); }

const AMY = 'OZxMHsGaBmV5pjMIDIn0'; // the app's female voice
const OUT = path.join(__dirname, '..', 'voice-tests', 'reels');

// name, text, speed (0.85 words, 0.8 sentences, 0.7 slow, as in the app)
const CLIPS = [
  ['ao-word', 'เอา', 0.85],
  ['ao-sent', 'ไม่เอาถุงค่ะ', 0.8],
  ['ao-sent-slow', 'ไม่เอาถุงค่ะ', 0.7],
  ['arai-word', 'อะไร', 0.85],
  ['arai-sent', 'คุณอยากกินอะไรคะ', 0.8],
  ['arai-sent-slow', 'คุณอยากกินอะไรคะ', 0.7],
];

async function make([name, text, speed]) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${AMY}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${text}.`,
      model_id: 'eleven_v4',
      voice_settings: { stability: 0.8, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed },
    }),
  });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  fs.writeFileSync(path.join(OUT, `${name}.mp3`), Buffer.from(data.audio_base64, 'base64'));
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ text, speed, alignment: data.alignment }, null, 1));
  console.log(`  ${name}  ${text}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Making ${CLIPS.length} reel clips in voice-tests/reels ...`);
  for (const c of CLIPS) await make(c);
  console.log('Done.');
})().catch((e) => { console.error(e.message); process.exit(1); });
