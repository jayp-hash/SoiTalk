// ---------------------------------------------------------------------
// Scenes: the first session for someone arriving from an ad.
//
// Each ad links to its own scene (soitalk.app/start/<id>), so the first
// thing a visitor does matches what the ad promised. A scene is one real
// moment (someone asks you something, you answer), taught whole first,
// then broken into words, then the learner swaps one word to make their
// own sentences. New funnel = new entry here, no new page.
//
// Rules for a scene (from the 12 Oct 2026 first-session review):
//   - usable today, in real life (the mission)
//   - 3–4 words in the reply, one swappable slot with 3–4 options
//   - every word is a course word (so it joins the learner's reviews)
//   - the teaser for tomorrow uses a pattern that's already built
// Romanization matches the course workbook.
// ---------------------------------------------------------------------

export const SCENES = {
  '7eleven': {
    id: '7eleven',
    place: 'At 7-Eleven',
    promise: 'Turn down a bag in Thai',
    minutes: 2,
    // The other person (always the female voice: most cashiers are women)
    staff: { who: 'The cashier', ask: (it) => ({ th: `รับ${it.th}ไหมคะ`, rom: `ráp ${it.rom} mǎi khá`, en: `Do you want ${it.a}?` }) },
    // Your reply: fixed words, then the slot. The polite ending is added by register.
    reply: [
      { th: 'ไม่', rom: 'mâi', en: 'not' },
      { th: 'เอา', rom: 'ao', en: 'want' },
      { slot: true },
    ],
    // Other natural replies (no word to swap, so shown on the done screen)
    alsoHeard: { th: 'ไม่ต้อง', rom: 'mâi tâwng', en: 'no need' },
    replyEn: (it) => `No ${it.en}, thanks.`,
    slotLabel: 'the thing',
    items: [
      // Order = the order of swaps. Cashiers ask spoon and fork together
      // (ช้อนส้อม), so no fork on its own (Thai Teacher, 12 Oct).
      { th: 'ถุง', rom: 'thǔng', en: 'bag', a: 'a bag' },
      { th: 'ใบเสร็จ', rom: 'bai-sèt', en: 'receipt', a: 'the receipt' },
      { th: 'ช้อน', rom: 'cháawn', en: 'spoon', a: 'a spoon' },
      { th: 'หลอด', rom: 'lǎawt', en: 'straw', a: 'a straw' },
    ],
    mission: 'Next time you pay at 7-Eleven, say it before they bag your things.',
    // Tomorrow: the restaurant scene (they already know ไม่)
    teaser: { title: 'Tomorrow: order Thai food your way', th: 'ไม่เผ็ด', rom: 'mâi phèt', en: 'Not spicy.' },
  },
};

export const DEFAULT_SCENE = '7eleven';

const ENDING = {
  male: { th: 'ครับ', rom: 'khráp', en: 'polite ending (men)' },
  female: { th: 'ค่ะ', rom: 'khâ', en: 'polite ending (women)' },
};
export const endingFor = (reg) => ENDING[reg === 'male' ? 'male' : 'female'];

// The reply as word pieces, in the learner's register
export function replyParts(scene, item, reg) {
  return [
    ...scene.reply.map((p) => (p.slot ? { ...item, slot: true } : p)),
    { ...endingFor(reg), ending: true },
  ];
}
export const joinTh = (parts) => parts.map((p) => p.th).join('');
export const joinRom = (parts) => parts.map((p) => p.rom).join(' ');

// The words a scene teaches (recorded in the learner's reviews)
export const sceneWords = (scene, made) => [
  ...scene.reply.filter((p) => !p.slot).map((p) => p.th),
  ...made,
];

// For /api/speak: every line a scene can say
let cache = null;
export function allSceneLines() {
  if (cache) return cache;
  const out = new Set();
  for (const s of Object.values(SCENES)) {
    for (const it of s.items) {
      out.add(s.staff.ask(it).th);
      for (const reg of ['male', 'female']) out.add(joinTh(replyParts(s, it, reg)));
      out.add(it.th);
    }
    for (const p of s.reply) if (!p.slot) out.add(p.th);
    for (const reg of ['male', 'female']) { out.add(s.teaser.th + endingFor(reg).th); if (s.alsoHeard) out.add(s.alsoHeard.th + endingFor(reg).th); }
    out.add(s.teaser.th);
  }
  cache = out;
  return out;
}
