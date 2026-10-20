// ---------------------------------------------------------------------
// Sentence patterns ("pattern machines").
//
// A pattern is a sentence frame with slots, e.g.  Who · (ไม่) ชอบ · Doing.
// Each level adds one piece. Slot options are course words; the learner
// only gets options they've already met on Today (or everything in preview).
// Sentences are built here in code, so /api/speak can check that any
// pattern sentence it's asked to say really is one (see allPatternSentences).
//
// Thai order and English are generated together so they always match.
// Source: Jay's ชอบ machine idea + the Sentence Structures tab; content
// drafted 9 Oct 2026 (thai-study-companion-content/drafts-2026-10-08/patterns.md).
// ---------------------------------------------------------------------

// Slot colours follow the topic colours on the word cards
export const SLOT_COLOURS = {
  who: '#E8604C', doing: '#8B5CF6', place: '#21A867', when: '#2B86E8',
  thing: '#F08A1C', number: '#11A79A', counter: '#B0743F', fixed: '#1D4FA0', ending: '#1D4FA0',
};

// ---- Pattern 1: ชอบ / ไม่ชอบ (Jay's pattern) -------------------------
const WHO = [
  { th: 'ฉัน', en: 'I', third: false },
  { th: 'คุณ', en: 'You', third: false },
  { th: 'เขา', en: 'He/She', third: true },
  { th: 'เรา', en: 'We', third: false },
  { th: 'พวกเขา', en: 'They', third: false },
  { th: 'เพื่อน', en: 'My friend', third: true },
  { th: 'แม่', en: 'Mom', third: true },
];
// Verbs that sound unfinished on their own get their natural object (ดูหนัง, ฟังเพลง).
// places: where the activity sensibly happens with ที่ (เที่ยว takes no ที่, so none).
const DOING = [
  { th: 'กิน', en: 'eating', places: ['บ้าน', 'ร้านอาหาร', 'ตลาด', 'ห้าง'] },
  { th: 'ดื่มกาแฟ', words: ['ดื่ม', 'กาแฟ'], en: 'drinking coffee', places: ['บ้าน'] },
  { th: 'ดูหนัง', words: ['ดู', 'หนัง'], en: 'watching movies', places: ['บ้าน', 'ห้าง'] },
  { th: 'ฟังเพลง', words: ['ฟัง', 'เพลง'], en: 'listening to music', places: [] },
  { th: 'เดินเล่น', words: ['เดิน', 'เล่น'], en: 'going for walks', places: ['ตลาด', 'ห้าง', 'สวน'] },
  { th: 'เที่ยว', en: 'going out', places: [] },
  { th: 'ทำงาน', en: 'working', places: ['บ้าน', 'ร้าน'] },
  { th: 'ทำอาหาร', en: 'cooking', places: ['บ้าน', 'คอนโด'] },
  { th: 'เรียน', en: 'studying', places: ['บ้าน', 'โรงเรียน'] },
  { th: 'นอน', en: 'sleeping', places: ['บ้าน'] },
  { th: 'วิ่ง', en: 'running', places: ['สวน', 'ทะเล'] },
];
const PLACE = [
  { th: 'บ้าน', en: 'at home' }, { th: 'ร้าน', en: 'at the shop' }, { th: 'ร้านอาหาร', en: 'at restaurants' },
  { th: 'ตลาด', en: 'at the market' }, { th: 'ห้าง', en: 'at the mall' }, { th: 'โรงเรียน', en: 'at school' },
  { th: 'สวน', en: 'in the park' }, { th: 'ทะเล', en: 'on the beach' }, { th: 'คอนโด', en: 'at the condo' },
];
const WHEN = [{ th: 'วันเสาร์', en: 'on Saturday' }, { th: 'วันอาทิตย์', en: 'on Sunday' }];

function likeSentence({ who, neg, doing, place, when }) {
  const parts = [
    { slot: 'who', th: who.th },
    ...(neg ? [{ slot: 'fixed', th: 'ไม่' }] : []),
    { slot: 'fixed', th: 'ชอบ' },
    ...(doing.words || [doing.th]).map((th) => ({ slot: 'doing', th })),
    ...(place ? [{ slot: 'fixed', th: 'ที่' }, { slot: 'place', th: place.th }] : []),
    ...(when ? [{ slot: 'when', th: when.th }] : []),
  ];
  const verb = neg ? (who.third ? "doesn't like" : "don't like") : (who.third ? 'likes' : 'like');
  const en = `${who.en} ${verb} ${doing.en}${place ? ` ${place.en}` : ''}${when ? ` ${when.en}` : ''}.`;
  return { parts, en };
}

// ---- Pattern 2: ordering with counting words ---------------------------
// kind: drink / food, so a "wrong counting word" tile is really wrong (เบียร์สองแก้ว is fine Thai,
// เบียร์สองจาน isn't). many: English for N of them when it isn't "N <counter>s of <thing>".
const THING = [
  { th: 'เบียร์', en: 'beer', counter: 'ขวด', kind: 'drink' },
  { th: 'น้ำเปล่า', en: 'water', counter: 'ขวด', kind: 'drink' },
  { th: 'กาแฟ', en: 'coffee', counter: 'แก้ว', kind: 'drink', many: 'coffees' },
  { th: 'ชาเย็น', en: 'Thai iced tea', counter: 'แก้ว', kind: 'drink', many: 'Thai iced teas' },
  { th: 'ข้าวผัด', en: 'fried rice', counter: 'จาน', kind: 'food' },
  { th: 'ผัดไทย', en: 'pad Thai', counter: 'จาน', kind: 'food' },
  { th: 'ก๋วยเตี๋ยว', en: 'noodles', counter: 'ชาม', kind: 'food' },
  { th: 'ส้มตำ', en: 'papaya salad', counter: 'จาน', kind: 'food' },
];
const COUNTER = [
  { th: 'ขวด', plural: 'bottles', kind: 'drink' },
  { th: 'แก้ว', plural: 'glasses', kind: 'drink' },
  { th: 'จาน', plural: 'plates', kind: 'food' },
  { th: 'ชาม', plural: 'bowls', kind: 'food' },
];
const NUMBER = [{ th: 'สอง', en: 'two' }, { th: 'สาม', en: 'three' }, { th: 'สี่', en: 'four' }];
export const wrongCountersFor = (thing) => COUNTER.filter((c) => c.kind !== thing.kind).map((c) => c.th);
const counterOf = (thing) => COUNTER.find((c) => c.th === thing.counter);

const amount = (n, thing, c) => (thing.many ? `${n} ${thing.many}` : `${n} ${c.plural} of ${thing.en}`);

// ask: the question staff ask (เบียร์กี่ขวด, or just เอากี่ขวด). also: ด้วย = "as well / too"
function orderSentence({ thing, number, ask, short, also }) {
  const c = counterOf(thing);
  if (ask) {
    if (short) return { q: true, parts: [{ slot: 'fixed', th: 'เอา' }, { slot: 'fixed', th: 'กี่' }, { slot: 'counter', th: c.th }], en: `How many ${c.plural} do you want?` };
    return {
      q: true,
      parts: [{ slot: 'thing', th: thing.th }, { slot: 'fixed', th: 'กี่' }, { slot: 'counter', th: c.th }],
      en: thing.many ? `How many ${thing.many}?` : `How many ${c.plural} of ${thing.en}?`,
    };
  }
  const parts = [
    { slot: 'fixed', th: 'ขอ' }, { slot: 'thing', th: thing.th },
    { slot: 'number', th: number.th }, { slot: 'counter', th: c.th },
    ...(also ? [{ slot: 'fixed', th: 'ด้วย' }] : []),
  ];
  const a = amount(number.en, thing, c);
  const en = also ? `And ${a} too.` : `${a.charAt(0).toUpperCase()}${a.slice(1)}, please.`;
  return { parts, en };
}

// ---- The patterns -------------------------------------------------------
// slots: which reels a level spins. fixed: words that never change (must be met too).
export const PATTERNS = [
  {
    id: 'like',
    title: 'Saying what you like',
    frame: 'Who · (ไม่) ชอบ · doing',
    blurb: 'I like eating at the market. She doesn\'t like running.',
    levels: [
      { n: 1, name: 'Who likes doing what', slots: ['who', 'doing'], fixed: ['ชอบ'], make: (v) => likeSentence(v) },
      { n: 2, name: 'Add ไม่ (don\'t)', slots: ['who', 'neg', 'doing'], fixed: ['ชอบ', 'ไม่'], make: (v) => likeSentence(v) },
      { n: 3, name: 'Add where: ที่ + place', slots: ['who', 'neg', 'doing', 'place'], fixed: ['ชอบ', 'ไม่', 'ที่'], make: (v) => likeSentence(v) },
      { n: 4, name: 'Add when', slots: ['who', 'doing', 'place', 'when'], fixed: ['ชอบ', 'ที่'], make: (v) => likeSentence(v) },
    ],
    options: { who: WHO, doing: DOING, place: PLACE, when: WHEN },
  },
  {
    id: 'order',
    title: 'Ordering with counting words',
    frame: 'ขอ · thing · number · counting word',
    blurb: 'Can I have two bottles of beer? How many do you want?',
    levels: [
      { n: 1, name: 'Ask for it: ขอ', slots: ['thing', 'number'], fixed: ['ขอ'], make: (v) => orderSentence(v) },
      { n: 2, name: 'The question you\'ll hear: กี่', slots: ['thing', 'short'], fixed: ['กี่', 'เอา'], make: (v) => orderSentence({ ...v, ask: true }) },
      { n: 3, name: 'One more thing: ด้วย', slots: ['thing', 'number'], fixed: ['ขอ', 'ด้วย'], make: (v) => orderSentence({ ...v, also: true }) },
    ],
    options: { thing: THING, number: NUMBER },
  },
];

export const patternById = (id) => PATTERNS.find((p) => p.id === id);
export const memoryKey = (p, level) => `pattern:${p.id}:${level.n}`;

// Words a slot can use. `can(th)` says whether the learner has met a word.
export const isFlag = (slot) => slot === 'neg' || slot === 'short'; // on/off pieces, not word reels
export function slotOptions(p, slot, can = () => true) {
  if (slot === 'neg') return [{ th: '', en: 'like', neg: false }, { th: 'ไม่', en: "don't like", neg: true }];
  if (slot === 'short') return [];
  return (p.options[slot] || []).filter((o) => (o.words || [o.th]).every(can) && (!o.counter || can(o.counter)));
}

// Every word a level needs before it can be played
export function levelWords(p, level) {
  const words = new Set(level.fixed);
  for (const slot of level.slots) for (const o of p.options[slot] || []) { for (const w of o.words || [o.th]) words.add(w); if (o.counter) words.add(o.counter); }
  return words;
}

// Pick a random valid combination (respecting which doing goes with which place)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function randomValues(p, level, can = () => true) {
  const v = {};
  for (const slot of level.slots) {
    if (slot === 'neg') { v.neg = Math.random() < 0.5; continue; }
    if (slot === 'short') { v.short = Math.random() < 0.4; continue; }
    let opts = slotOptions(p, slot, can);
    if (slot === 'place' && v.doing) opts = opts.filter((o) => v.doing.places.includes(o.th));
    if (slot === 'doing' && level.slots.includes('place')) opts = opts.filter((d) => d.places.some((pl) => slotOptions(p, 'place', can).some((o) => o.th === pl)));
    if (!opts.length) return null;
    v[slot] = pick(opts);
  }
  return v;
}

// Is this combination sensible? (used when the learner changes one reel)
export function isValid(p, v) {
  if (v.place && v.doing && !v.doing.places.includes(v.place.th)) return false;
  return true;
}

export const sentenceThai = (s) => s.parts.map((x) => x.th).join('');

// For /api/speak: every sentence any level can produce
let cache = null;
export function allPatternSentences() {
  if (cache) return cache;
  const out = new Set();
  for (const who of WHO) for (const neg of [false, true]) for (const doing of DOING) {
    out.add(sentenceThai(likeSentence({ who, neg, doing })));
    for (const pl of PLACE.filter((x) => doing.places.includes(x.th))) {
      out.add(sentenceThai(likeSentence({ who, neg, doing, place: pl })));
      if (!neg) for (const when of WHEN) out.add(sentenceThai(likeSentence({ who, doing, place: pl, when })));
    }
  }
  for (const thing of THING) {
    out.add(sentenceThai(orderSentence({ thing, ask: true })));
    out.add(sentenceThai(orderSentence({ thing, ask: true, short: true })));
    for (const number of NUMBER) for (const also of [false, true]) out.add(sentenceThai(orderSentence({ thing, number, also })));
  }
  for (const t of allLadderSentences()) out.add(t);
  cache = out;
  return out;
}

// Patterns in the learner's register (lib/register.js): ฉัน -> ผม for men, and the
// polite ending (ครับ / ค่ะ / คะ) as the last piece of every sentence.
export function inRegister(patterns, reg, particleFor) {
  const wrap = (make) => (v) => {
    const s = make(v); if (!s) return s;
    const parts = s.parts.map((x) => (reg === 'male' && x.th === 'ฉัน' ? { ...x, th: 'ผม' } : x));
    const e = particleFor(reg, !!s.q);
    return { ...s, parts: [...parts, { slot: 'ending', th: e.th, rom: e.rom }] };
  };
  return patterns.map((p) => ({ ...p, levels: p.levels.map((l) => ({ ...l, make: wrap(l.make) })) }));
}

// An example sentence for a word, built from a pattern, using only words the
// learner can use (can(th) is true) plus the word itself. Used on Today's
// cards when the workbook sentence still has words the learner hasn't met.
// patterns: already in the learner's register (inRegister). lex: { th: { rom, en } }.
export function exampleFor(patterns, thai, can, lex, tries = 60) {
  const ok = (th) => th === thai || can(th) || (th === 'ฉัน' && (thai === 'ผม' || can('ผม')));
  for (const p of patterns) {
    for (const level of p.levels) {
      for (let i = 0; i < tries; i++) {
        const v = randomValues(p, level, ok);
        if (!v) break;
        const s = level.make(v);
        if (!s || !s.parts.some((x) => x.th === thai)) continue;
        if (!s.parts.every((x) => x.slot === 'ending' || ok(x.th) || (x.th === 'ผม' && ok('ฉัน')))) continue;
        const words = s.parts.map((x) => ({
          th: x.th,
          rom: x.rom || lex[x.th]?.rom || '',
          en: x.slot === 'ending' ? 'polite ending' : (lex[x.th]?.en || ''),
          ...(x.slot === 'ending' ? { ending: true } : {}),
        }));
        return { thai: words.map((w) => w.th).join(''), romanization: words.map((w) => w.rom).join(' '), english: s.en, words, generated: true };
      }
    }
  }
  return null;
}


// ---------------------------------------------------------------------
// Sentence ladders (Jay, 20 Oct 2026): the Patterns page. One sentence
// pattern, three levels that add pieces: level 1 is the bare pattern,
// level 2 adds where and/or when, level 3 adds one more piece (a time of
// day or the weather, or a reason). The lever picks a random sentence for
// the level. Level 2-3 extras are Claude drafts: Thai Teacher to check.
// ---------------------------------------------------------------------

// Extra pieces for level 3 of "like": a time / weather, or a reason (เพราะ)
const LIKE_EXTRA = [
  { parts: [{ th: 'ตอนเช้า', rom: 'dtaawn-cháo' }], en: 'in the morning', kind: 'time' },
  { parts: [{ th: 'ตอนเย็น', rom: 'dtaawn-yen' }], en: 'in the evening', kind: 'time' },
  { parts: [{ th: 'ตอนฝนตก', rom: 'dtaawn fǒn dtòk' }], en: 'when it rains', kind: 'time' },
  { parts: [{ th: 'เพราะ', rom: 'phráw' }, { th: 'สนุก', rom: 'sà-nùk' }], en: "because it's fun", kind: 'why' },
  { parts: [{ th: 'เพราะ', rom: 'phráw' }, { th: 'สบาย', rom: 'sà-baai' }], en: "because it's relaxing", kind: 'why' },
];

function ladderLike({ who, neg, doing, place, when, extra }) {
  const parts = [
    { slot: 'who', th: who.th },
    ...(neg ? [{ slot: 'neg', th: 'ไม่' }] : []),
    { slot: 'fixed', th: 'ชอบ' },
    ...(doing.words || [doing.th]).map((th) => ({ slot: 'doing', th })),
    ...(place ? [{ slot: 'fixed', th: 'ที่' }, { slot: 'place', th: place.th }] : []),
    ...(when ? [{ slot: 'when', th: when.th }] : []),
    ...(extra ? extra.parts.map((x) => ({ slot: 'extra', ...x })) : []),
  ];
  const verb = neg ? (who.third ? "doesn't like" : "don't like") : (who.third ? 'likes' : 'like');
  const en = `${who.en} ${verb} ${doing.en}${place ? ` ${place.en}` : ''}${when ? ` ${when.en}` : ''}${extra ? ` ${extra.en}` : ''}.`;
  return { parts, en };
}

// Order: level 2 adds a second thing with กับ (and); level 3 adds a request
const ONE = { th: 'หนึ่ง', en: 'one', rom: 'nùeng' };
const ORDER_EXTRA = {
  food: [{ th: 'ไม่เผ็ด', rom: 'mâi phèt', en: 'not spicy' }],
  'น้ำเปล่า': [{ th: 'ไม่ใส่น้ำแข็ง', rom: 'mâi sài náam-khǎeng', en: 'no ice' }],
  'เบียร์': [{ th: 'ไม่ใส่น้ำแข็ง', rom: 'mâi sài náam-khǎeng', en: 'no ice' }],
  'กาแฟ': [{ th: 'หวานน้อย', rom: 'wǎan nói', en: 'less sweet' }],
  'ชาเย็น': [{ th: 'หวานน้อย', rom: 'wǎan nói', en: 'less sweet' }],
};
const extrasFor = (thing) => ORDER_EXTRA[thing.th] || (thing.kind === 'food' ? ORDER_EXTRA.food : []);
const singular = { bottles: 'bottle', glasses: 'glass', plates: 'plate', bowls: 'bowl' };
function amt(n, thing) {
  const c = COUNTER.find((x) => x.th === thing.counter);
  if (n.en !== 'one') return amount(n.en, thing, c);
  return thing.many ? `one ${thing.en}` : `one ${singular[c.plural]} of ${thing.en}`;
}
function ladderOrder({ thing, number, thing2, number2, extra }) {
  const parts = [
    { slot: 'fixed', th: 'ขอ' }, { slot: 'thing', th: thing.th }, { slot: 'number', th: number.th, ...(number.rom ? { rom: number.rom } : {}) }, { slot: 'fixed', th: thing.counter },
    ...(extra ? [{ slot: 'extra', th: extra.th, rom: extra.rom }] : []),
    ...(thing2 ? [{ slot: 'fixed', th: 'กับ', rom: 'gàp' }, { slot: 'thing', th: thing2.th }, { slot: 'number', th: number2.th, ...(number2.rom ? { rom: number2.rom } : {}) }, { slot: 'fixed', th: thing2.counter }] : []),
  ];
  let en = amt(number, thing) + (extra ? `, ${extra.en}${thing2 ? ',' : ''}` : '') + (thing2 ? ` and ${amt(number2, thing2)}` : '');
  en = `${en.charAt(0).toUpperCase()}${en.slice(1)}, please.`;
  return { parts, en };
}

const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
export const LADDERS = [
  {
    id: 'like', title: 'Say what you like', short: 'What you like', key: { th: 'ชอบ', rom: 'châawp', en: 'to like' },
    levels: [
      { n: 1, name: 'Level 1', rule: 'ชอบ (châawp) = like. Put an activity after it.', slots: ['who', 'doing'],
        random: () => ({ who: pickOne(WHO), doing: pickOne(DOING) }), make: ladderLike },
      { n: 2, name: 'Level 2', rule: 'Add where (ที่ thîi + a place), when (a day), or both, at the end.', slots: ['who', 'neg', 'doing', 'place', 'when'],
        random: () => {
          const doing = pickOne(DOING.filter((d) => d.places.length));
          const both = Math.random() < 0.4, wantPlace = both || Math.random() < 0.5;
          const pl = pickOne(doing.places); const place = wantPlace ? PLACE.find((x) => x.th === pl) : null;
          return { who: pickOne(WHO), neg: Math.random() < 0.25, doing, place, when: !wantPlace || both ? pickOne(WHEN) : null };
        }, make: ladderLike },
      { n: 3, name: 'Level 3', rule: 'Add one more piece: a time or the weather (ตอน dtaawn), or why (เพราะ phráw).', slots: ['who', 'neg', 'doing', 'place', 'when', 'extra'],
        random: () => {
          const doing = pickOne(DOING.filter((d) => d.places.length));
          const neg = Math.random() < 0.2;
          const extra = pickOne(LIKE_EXTRA.filter((e) => !(neg && e.kind === 'why')));
          const pl = pickOne(doing.places);
          return { who: pickOne(WHO), neg, doing, place: PLACE.find((x) => x.th === pl), when: Math.random() < 0.5 ? pickOne(WHEN) : null, extra };
        }, make: ladderLike },
    ],
  },
  {
    id: 'order', title: 'Order more than one', short: 'Ordering several', key: { th: 'ขอ', rom: 'khǎaw', en: 'may I have' },
    levels: [
      { n: 1, name: 'Level 1', rule: 'ขอ (khǎaw) + thing + number + counting word.', slots: ['thing', 'number'],
        random: () => ({ thing: pickOne(THING), number: pickOne(NUMBER) }), make: ladderOrder },
      { n: 2, name: 'Level 2', rule: 'Order two things: join them with กับ (gàp) = and.', slots: ['thing', 'number'],
        random: () => {
          const thing = pickOne(THING); const thing2 = pickOne(THING.filter((t) => t.th !== thing.th));
          return { thing, number: pickOne(NUMBER), thing2, number2: pickOne([ONE, ...NUMBER]) };
        }, make: ladderOrder },
      { n: 3, name: 'Level 3', rule: 'Say how you want it, straight after the counting word.', slots: ['thing', 'number', 'extra'],
        random: () => {
          const thing = pickOne(THING.filter((t) => extrasFor(t).length)); const thing2 = pickOne(THING.filter((t) => t.th !== thing.th));
          return { thing, number: pickOne(NUMBER), extra: pickOne(extrasFor(thing)), thing2: Math.random() < 0.5 ? thing2 : null, number2: pickOne([ONE, ...NUMBER]) };
        }, make: ladderOrder },
    ],
  },
];

// In the learner's register (ผม for men, and the polite ending last)
export function laddersInRegister(reg, particleFor) {
  return LADDERS.map((p) => ({ ...p, levels: p.levels.map((l) => ({ ...l, make: (v) => {
    const s = l.make(v);
    const parts = s.parts.map((x) => (reg === 'male' && x.th === 'ฉัน' ? { ...x, th: 'ผม' } : x));
    const e = particleFor(reg, false);
    return { ...s, parts: [...parts, { slot: 'ending', th: e.th, rom: e.rom }] };
  } })) }));
}

// Every ladder sentence, for /api/speak's list of allowed text (no ending, ฉัน form)
function allLadderSentences() {
  const out = new Set();
  const placesOf = (d) => PLACE.filter((x) => d.places.includes(x.th));
  for (const who of WHO) for (const neg of [false, true]) for (const doing of DOING) {
    out.add(sentenceThai(ladderLike({ who, neg, doing })));
    for (const when of WHEN) out.add(sentenceThai(ladderLike({ who, neg, doing, when })));
    for (const place of placesOf(doing)) for (const when of [null, ...WHEN]) {
      out.add(sentenceThai(ladderLike({ who, neg, doing, place, when })));
      for (const extra of LIKE_EXTRA) out.add(sentenceThai(ladderLike({ who, neg, doing, place, when, extra })));
    }
  }
  for (const thing of THING) for (const number of NUMBER) {
    const extras = [null, ...extrasFor(thing)];
    for (const extra of extras) {
      out.add(sentenceThai(ladderOrder({ thing, number, extra })));
      for (const thing2 of THING) if (thing2.th !== thing.th) for (const number2 of [ONE, ...NUMBER]) out.add(sentenceThai(ladderOrder({ thing, number, extra, thing2, number2 })));
    }
  }
  return out;
}
