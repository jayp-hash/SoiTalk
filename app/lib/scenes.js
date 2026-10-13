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
    swapOn: 'ask', // tap the cashier's question to change what she offers
    items: [
      // Order = the order of swaps. Cashiers ask spoon and fork together
      // (ช้อนส้อม), so no fork on its own (Thai Teacher, 12 Oct).
      { th: 'ถุง', rom: 'thǔng', en: 'bag', a: 'a bag' },
      { th: 'ช้อน', rom: 'cháawn', en: 'spoon', a: 'a spoon' },
      { th: 'ใบเสร็จ', rom: 'bai-sèt', en: 'receipt', a: 'the receipt' },
      // Spares: you make 3 sentences, and can keep swapping to these
      { th: 'หลอด', rom: 'lǎawt', en: 'straw', a: 'a straw' },
      { th: 'ตะเกียบ', rom: 'dtà-gìap', en: 'chopsticks', a: 'chopsticks' },
    ],
    mission: 'At the 7-Eleven checkout, before they bag your things.',
    tomorrow: 'Order Thai food your way',
    // Tomorrow: the restaurant scene (they already know ไม่)
    teaser: { title: 'Tomorrow: order Thai food your way', th: 'ไม่เผ็ด', rom: 'mâi phèt', en: 'Not spicy.' },
  },
  // Day 2. Order a dish (swap it), then the waitress asks about spice.
  // Starts with yesterday's line from memory (recall), then the new scene.
  restaurant: {
    id: 'restaurant',
    place: 'At a Thai restaurant',
    promise: 'Order Thai food your way',
    minutes: 3,
    staff: { who: 'The waitress', ask: () => ({ th: 'รับอะไรดีคะ', rom: 'ráp a-rai dii khá', en: 'What would you like?' }) },
    reply: [
      { th: 'ขอ', rom: 'khǎaw', en: 'may I have' },
      { slot: true },
    ],
    replyEn: (it) => `${it.en.charAt(0).toUpperCase()}${it.en.slice(1)}, please.`,
    slotLabel: 'the dish',
    items: [
      { th: 'ผัดกะเพรา', rom: 'phàt-gà-phrao', en: 'pad kra pao', a: 'pad kra pao', name: true },
      { th: 'ต้มยำ', rom: 'dtôm-yam', en: 'tom yum', a: 'tom yum', name: true },
      { th: 'ส้มตำ', rom: 'sôm-dtam', en: 'som tam', a: 'som tam', name: true },
    ],
    // The second exchange: the waitress asks, you pick how spicy
    followUp: {
      staff: { th: 'เผ็ดไหมคะ', rom: 'phèt mǎi khá', en: 'Spicy?' },
      answers: [
        { key: 'none', parts: [{ th: 'ไม่', rom: 'mâi', en: 'not' }, { th: 'เผ็ด', rom: 'phèt', en: 'spicy' }], en: 'Not spicy.' },
        { key: 'little', parts: [{ th: 'เผ็ด', rom: 'phèt', en: 'spicy' }, { th: 'นิดหน่อย', rom: 'nít-nòi', en: 'a little' }], en: 'A little spicy.' },
      ],
      wrong: 'Very spicy.', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    // What the waitress will often ask next (heard, not taught yet)
    next: { th: 'หมูหรือไก่คะ', rom: 'mǔu rǔue gài khá', en: 'Pork or chicken?' },
    recall: '7eleven', // day 2 opens with yesterday's line
    mission: 'Next time you order Thai food.',
    tomorrow: 'Order coffee your way',
    teaser: { title: 'Tomorrow: order coffee your way', th: 'ขอกาแฟเย็น', rom: 'khǎaw gaa-faae yen', en: 'Iced coffee, please.' },
  },
  // Day 3. Order a drink (swap it: coffee or tea, iced or hot), then the
  // barista asks how sweet. A drink is two words (กาแฟ + เย็น), so it shows as
  // two tiles that swap together. Opens with yesterday's order from memory.
  cafe: {
    id: 'cafe',
    place: 'At a coffee shop',
    promise: 'Order coffee your way',
    minutes: 3,
    staff: { who: 'The barista', ask: () => ({ th: 'รับอะไรดีคะ', rom: 'ráp a-rai dii khá', en: 'What would you like?' }) },
    reply: [
      { th: 'ขอ', rom: 'khǎaw', en: 'may I have' },
      { slot: true },
    ],
    replyEn: (it) => `${it.en.charAt(0).toUpperCase()}${it.en.slice(1)}, please.`,
    slotLabel: 'the drink',
    items: [
      { th: 'กาแฟเย็น', rom: 'gaa-faae yen', en: 'iced coffee', a: 'iced coffee', parts: [{ th: 'กาแฟ', rom: 'gaa-faae', en: 'coffee' }, { th: 'เย็น', rom: 'yen', en: 'iced' }] },
      { th: 'กาแฟร้อน', rom: 'gaa-faae ráawn', en: 'hot coffee', a: 'hot coffee', parts: [{ th: 'กาแฟ', rom: 'gaa-faae', en: 'coffee' }, { th: 'ร้อน', rom: 'ráawn', en: 'hot' }] },
      { th: 'ชาเย็น', rom: 'chaa yen', en: 'Thai iced tea', a: 'Thai iced tea', parts: [{ th: 'ชา', rom: 'chaa', en: 'Thai tea' }, { th: 'เย็น', rom: 'yen', en: 'iced' }] },
      // Spare
      { th: 'ชาร้อน', rom: 'chaa ráawn', en: 'hot tea', a: 'hot tea', parts: [{ th: 'ชา', rom: 'chaa', en: 'tea' }, { th: 'ร้อน', rom: 'ráawn', en: 'hot' }] },
    ],
    // Sweetness, not size: the question baristas really ask, and no pair of
    // opposites on the same day (Learning Scientist, Jay, 13 Oct). Size moves to day 4.
    followUp: {
      staff: { th: 'หวานปกติไหมคะ', rom: 'wǎan bpòk-gà-dtì mǎi khá', en: 'Normal sweetness?' },
      answers: [
        { key: 'less', adj: 'less sweet', parts: [{ th: 'หวาน', rom: 'wǎan', en: 'sweet' }, { th: 'น้อย', rom: 'nói', en: 'less' }], en: 'Less sweet.' },
        { key: 'none', adj: 'not sweet', notFor: ['ชาเย็น'], parts: [{ th: 'ไม่', rom: 'mâi', en: 'not' }, { th: 'หวาน', rom: 'wǎan', en: 'sweet' }], en: 'Not sweet.' },
      ],
      wrong: 'Extra sweet.', // a listening option only
      // ชาเย็น gets its sweetness from condensed milk: order it หวานน้อย, not ไม่หวาน (Thai Teacher)
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'restaurant',
    missionFull: true, // say the whole order: ขอ + drink + sweetness
    mission: 'Next time you buy a coffee or a tea.',
    tomorrow: 'Order two drinks',
    teaser: { title: 'Tomorrow: order two drinks', th: 'ขอชาเย็นสองแก้ว', rom: 'khǎaw chaa-yen sǎawng gâaew', en: 'Two Thai iced teas, please.' },
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
    ...scene.reply.flatMap((p) => (p.slot ? (item.parts ? item.parts.map((x) => ({ ...x, slot: true })) : [{ ...item, slot: true }]) : [p])),
    { ...endingFor(reg), ending: true },
  ];
}
// The spice answer (or other follow-up) as word pieces, in the learner's register
export function followParts(scene, idx, reg) {
  const a = scene.followUp.answers[idx];
  return [...a.parts, { ...endingFor(reg), ending: true }];
}
// The line the mission asks you to say for real
export function missionParts(scene, reg, idx = 0, item = scene.items[0]) {
  if (scene.missionFull && scene.followUp) {
    // The whole order in one line: ขอกาแฟเย็นแก้วใหญ่ครับ
    return [...replyParts(scene, item, reg).filter((p) => !p.ending), ...followParts(scene, idx, reg)];
  }
  return scene.followUp ? followParts(scene, idx, reg) : replyParts(scene, scene.items[0], reg);
}
export const joinTh = (parts) => parts.map((p) => p.th).join('');
export const joinRom = (parts) => parts.map((p) => p.rom).join(' ');

// The words a scene teaches (recorded in the learner's reviews)
export const sceneWords = (scene, made) => [...new Set([
  ...scene.reply.filter((p) => !p.slot).map((p) => p.th),
  ...made,
  ...(scene.followUp ? scene.followUp.answers.flatMap((a) => a.parts.map((p) => p.th)) : []),
])];

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
      for (const x of it.parts || []) out.add(x.th);
    }
    for (const p of s.reply) if (!p.slot) out.add(p.th);
    for (const reg of ['male', 'female']) { out.add(s.teaser.th + endingFor(reg).th); if (s.alsoHeard) out.add(s.alsoHeard.th + endingFor(reg).th); }
    if (s.followUp) {
      out.add(s.followUp.staff.th);
      if (s.next) out.add(s.next.th);
      s.followUp.answers.forEach((a, i) => {
        for (const p of a.parts) out.add(p.th);
        for (const reg of ['male', 'female']) out.add(joinTh(followParts(s, i, reg)));
        if (s.missionFull) for (const it of s.items) for (const reg of ['male', 'female']) out.add(joinTh(missionParts(s, reg, i, it)));
      });
    }
    out.add(s.teaser.th);
  }
  cache = out;
  return out;
}
