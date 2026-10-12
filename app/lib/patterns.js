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
  const en = also ? `And ${amount(number.en, thing, c)} too.` : `Can I have ${amount(number.en, thing, c)}?`;
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
