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
  { th: 'พ่อ', en: 'Dad', third: true, rom: 'phâaw' },
];
// The lever picks "I" (ผม / ฉัน) more often: it's what learners say most (Jay, 21 Oct)
const WHO_PICK = [WHO[0], WHO[0], WHO[0], ...WHO.slice(1)];
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
    { slot: 'who', th: who.th, ...(who.rom ? { rom: who.rom } : {}) },
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
// Order = the order new words are offered in. Beer is last and never offered as a
// practice word (alcohol: some learners don't drink; Jay, 22 Oct).
const THING = [
  { th: 'น้ำเปล่า', en: 'water', counter: 'ขวด', kind: 'drink' },
  { th: 'กาแฟ', en: 'coffee', counter: 'แก้ว', kind: 'drink', many: 'coffees' },
  { th: 'ชาเย็น', en: 'Thai iced tea', counter: 'แก้ว', kind: 'drink', many: 'Thai iced teas' },
  { th: 'ข้าวผัด', en: 'fried rice', counter: 'จาน', kind: 'food' },
  { th: 'ผัดไทย', en: 'pad Thai', counter: 'จาน', kind: 'food' },
  { th: 'ก๋วยเตี๋ยว', en: 'noodles', counter: 'ชาม', kind: 'food' },
  { th: 'ส้มตำ', en: 'papaya salad', counter: 'จาน', kind: 'food' },
  { th: 'เบียร์', en: 'beer', counter: 'ขวด', kind: 'drink', alcohol: true },
];
const COUNTER = [
  { th: 'ขวด', plural: 'bottles', kind: 'drink' },
  { th: 'แก้ว', plural: 'glasses', kind: 'drink' },
  { th: 'จาน', plural: 'plates', kind: 'food' },
  { th: 'ชาม', plural: 'bowls', kind: 'food' },
];
const NUMBER = [{ th: 'สอง', en: 'two' }, { th: 'สาม', en: 'three' }, { th: 'สี่', en: 'four' }, { th: 'ห้า', en: 'five' }];
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

// Learning principle (Jay, 22 Oct): a shuffler always has at least MIN_OPTIONS
// choices per slot. Words you've met come first; if that's fewer than the
// minimum, useful new words are added (in list order) and marked isNew, so the
// practice teaches them. Alcohol is never added: some learners don't drink.
export const MIN_OPTIONS = 4;
export function shuffleOptions(p, slot, can = () => true, min = MIN_OPTIONS) {
  if (isFlag(slot)) return slotOptions(p, slot, can);
  const all = (p.options[slot] || []).filter((o) => !o.alcohol);
  const knows = (o) => (o.words || [o.th]).every(can) && (!o.counter || can(o.counter));
  const known = all.filter(knows);
  const fresh = all.filter((o) => !knows(o)).slice(0, Math.max(0, min - known.length));
  return [...known, ...fresh.map((o) => ({ ...o, isNew: true }))];
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
  for (const t of allPracticeSentences()) out.add(t);
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
    { slot: 'who', th: who.th, ...(who.rom ? { rom: who.rom } : {}) },
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
  'กาแฟ': [{ th: 'หวานน้อย', rom: 'wǎan náawi', en: 'less sweet' }],
  'ชาเย็น': [{ th: 'หวานน้อย', rom: 'wǎan náawi', en: 'less sweet' }],
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
const SOFT = THING.filter((t) => !t.alcohol); // the lever never picks alcohol on its own
export const LADDERS = [
  {
    id: 'like', title: 'Likes and dislikes', short: 'Likes and dislikes', key: { th: 'ชอบ', rom: 'châawp', en: 'to like' },
    levels: [
      { n: 1, name: 'Level 1', rule: 'ชอบ (châawp) = like, ไม่ชอบ (mâi châawp) = don\'t like. Put an activity after it.', slots: ['who', 'neg', 'doing'],
        random: () => ({ who: pickOne(WHO_PICK), neg: Math.random() < 0.3, doing: pickOne(DOING) }), make: ladderLike },
      { n: 2, name: 'Level 2', rule: 'Add where (ที่ thîi + a place), when (a day), or both, at the end.', slots: ['who', 'neg', 'doing', 'place', 'when'],
        random: () => {
          const doing = pickOne(DOING.filter((d) => d.places.length));
          const both = Math.random() < 0.4, wantPlace = both || Math.random() < 0.5;
          const pl = pickOne(doing.places); const place = wantPlace ? PLACE.find((x) => x.th === pl) : null;
          return { who: pickOne(WHO_PICK), neg: Math.random() < 0.25, doing, place, when: !wantPlace || both ? pickOne(WHEN) : null };
        }, make: ladderLike },
      { n: 3, name: 'Level 3', rule: 'Add one more piece: a time or the weather (ตอน dtaawn), or why (เพราะ phráw).', slots: ['who', 'neg', 'doing', 'place', 'when', 'extra'],
        random: () => {
          const doing = pickOne(DOING.filter((d) => d.places.length));
          const neg = Math.random() < 0.2;
          const extra = pickOne(LIKE_EXTRA.filter((e) => !(neg && e.kind === 'why')));
          const pl = pickOne(doing.places);
          return { who: pickOne(WHO_PICK), neg, doing, place: PLACE.find((x) => x.th === pl), when: Math.random() < 0.5 ? pickOne(WHEN) : null, extra };
        }, make: ladderLike },
    ],
  },
  {
    id: 'order', title: 'Ordering food and drinks', short: 'Ordering', key: { th: 'ขอ', rom: 'khǎaw', en: 'may I have' },
    levels: [
      { n: 1, name: 'Level 1', rule: 'ขอ (khǎaw) + thing + number + counting word.', slots: ['thing', 'number'],
        random: () => ({ thing: pickOne(SOFT), number: pickOne(NUMBER) }), make: ladderOrder },
      { n: 2, name: 'Level 2', rule: 'Order two things: join them with กับ (gàp) = and.', slots: ['thing', 'number'],
        random: () => {
          const thing = pickOne(SOFT); const thing2 = pickOne(SOFT.filter((t) => t.th !== thing.th));
          return { thing, number: pickOne(NUMBER), thing2, number2: pickOne([ONE, ...NUMBER]) };
        }, make: ladderOrder },
      { n: 3, name: 'Level 3', rule: 'Say how you want it, straight after the counting word.', slots: ['thing', 'number', 'extra'],
        random: () => {
          const thing = pickOne(SOFT.filter((t) => extrasFor(t).length)); const thing2 = pickOne(SOFT.filter((t) => t.th !== thing.th));
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

// ---------------------------------------------------------------------
// Practice (Jay, 21 Oct 2026): "hear them, answer back". Someone asks
// (staff voice), you build your reply from tiles. Each level hides more of
// the given words: L1 the changing words, L2 everything but the key word,
// L3 every word. Lines checked by the Thai Teacher review (21 Oct).
// ---------------------------------------------------------------------
const W = (th, rom) => ({ th, rom });
const ASK_ORDER = [
  { parts: [W('รับอะไรดี', 'ráp à-rai dii')], en: 'What can I get you?', group: 'what' },
  { parts: [W('เอาอะไร', 'ao à-rai')], en: 'What would you like?', group: 'what' },
];
// The follow-up question for an order, and the reply words, by the extra it asks about
const FOLLOW_UP = {
  'หวานน้อย': { parts: [W('หวานปกติไหม', 'wǎan bpòk-gà-dtì mǎi')], en: 'Normal sweetness?', group: 'sweet',
    reply: [W('หวาน', 'wǎan'), W('น้อย', 'náawi')], replyEn: 'Less sweet, please.' },
  'ไม่ใส่น้ำแข็ง': { parts: [W('ใส่น้ำแข็งไหม', 'sài náam-khǎeng mǎi')], en: 'With ice?', group: 'ice',
    reply: [W('ไม่', 'mâi'), W('ใส่', 'sài'), W('น้ำแข็ง', 'náam-khǎeng')], replyEn: 'No ice, please.' },
  'ไม่เผ็ด': { parts: [W('เอาเผ็ดไหม', 'ao phèt mǎi')], en: 'Do you want it spicy?', group: 'spicy',
    reply: [W('ไม่', 'mâi'), W('เผ็ด', 'phèt')], replyEn: 'Not spicy, please.' },
};
// English meanings to choose from in "What did they ask?" (one per group)
const ASK_MEANINGS = [
  { en: 'What can I get you?', group: 'what' }, { en: 'How many?', group: 'many' }, { en: 'Anything else?', group: 'else' },
  { en: 'Normal sweetness?', group: 'sweet' }, { en: 'With ice?', group: 'ice' }, { en: 'Do you want it spicy?', group: 'spicy' },
  { en: 'For here or to go?', group: 'togo' }, { en: 'What do you like doing?', group: 'likewhat' }, { en: 'Where do you live?', group: 'where' },
  { en: 'Do you like it?', group: 'likeit' },
];
// Who the friend asks about: you, your mom, your dad, your friend (Teacher: คุณแม่ when asking about yours)
const PRACTICE_WHO = [
  { who: WHO[0], ask: [W('ว่างๆ', 'wâang-wâang')], askEn: 'What do you like doing in your free time?', yesNoEn: 'Do you like' },
  { who: WHO.find((w) => w.th === 'แม่'), ask: [W('คุณแม่', 'khun mâae')], askEn: 'What does your mom like doing?', yesNoEn: 'Does your mom like' },
  { who: WHO.find((w) => w.th === 'พ่อ'), ask: [W('คุณพ่อ', 'khun phâaw')], askEn: 'What does your dad like doing?', yesNoEn: 'Does your dad like' },
  { who: WHO.find((w) => w.th === 'เพื่อน'), ask: [W('เพื่อนคุณ', 'phûeaan khun')], askEn: 'What does your friend like doing?', yesNoEn: 'Does your friend like' },
];
const doingWords = (d) => (d.words || [d.th]).map((th) => ({ th }));
function likeAsk(p, v) {
  if (v.neg) {
    // Yes/no question for a "don't like" reply: (คุณแม่) ชอบ + activity + ไหม
    const lead = p.who === WHO[0] ? [] : p.ask;
    return { parts: [...lead, W('ชอบ', 'châawp'), ...doingWords(v.doing), W('ไหม', 'mǎi')], en: `${p.yesNoEn} ${v.doing.en}?`, group: 'likeit' };
  }
  return { parts: [...p.ask, W('ชอบ', 'châawp'), W('ทำ', 'tham'), W('อะไร', 'à-rai')], en: p.askEn, group: 'likewhat' };
}
const pickOneP = (a) => a[Math.floor(Math.random() * a.length)];
// One exchange: { ask: {parts, en, group}, values for the level's make(), follow-up flag }
export function practiceExchanges(patternId, level) {
  const out = [];
  if (patternId === 'like') {
    for (let i = 0; i < 3; i++) {
      const p = pickOneP(PRACTICE_WHO);
      const v = { ...level.random(), who: p.who };
      out.push({ v, ask: likeAsk(p, v) });
    }
  } else {
    const ask = () => pickOneP(ASK_ORDER);
    if (level.n === 3) {
      // An order, then the follow-up about how you want it, then another order
      const v1 = level.random(); const f = FOLLOW_UP[v1.extra.th];
      out.push({ v: { ...v1, extra: null, thing2: null }, ask: ask() });
      out.push({ follow: f, ask: { parts: f.parts, en: f.en, group: f.group } });
      const v3 = level.random();
      out.push({ v: { ...v3, extra: null }, ask: ask() });
    } else for (let i = 0; i < 3; i++) out.push({ v: level.random(), ask: ask() });
  }
  return out;
}
// Three English meanings for "What did they ask?": the answer + two from other groups
const MEANING_GROUPS = { like: ['likewhat', 'likeit', 'where', 'else'], order: ['what', 'many', 'else', 'sweet', 'ice', 'spicy', 'togo'] };
export function askMeanings(ask, patternId) {
  const allowed = MEANING_GROUPS[patternId] || ASK_MEANINGS.map((m) => m.group);
  const others = ASK_MEANINGS.filter((m) => m.group !== ask.group && allowed.includes(m.group)).sort(() => Math.random() - 0.5).slice(0, 2).map((m) => m.en);
  return [ask.en, ...others].sort(() => Math.random() - 0.5);
}
// Wrong tiles: same slot, sounds or looks alike, and ruled out by the English you're shown
const ALIKE = {
  'ทำอาหาร': 'ทำงาน', 'ทำงาน': 'ทำอาหาร', 'เดิน': 'เรียน', 'เรียน': 'เดิน', 'นอน': 'วิ่ง', 'วิ่ง': 'นอน', 'ดู': 'ฟัง', 'ฟัง': 'ดู',
  'หนัง': 'เพลง', 'เพลง': 'หนัง', 'กิน': 'ดื่ม', 'ดื่ม': 'กิน', 'เที่ยว': 'เรียน', 'เล่น': 'เดิน', 'กาแฟ': 'ชาเย็น', 'ชาเย็น': 'กาแฟ',
  'สอง': 'สาม', 'สาม': 'สี่', 'สี่': 'สาม', 'หนึ่ง': 'สอง', 'วันเสาร์': 'วันอาทิตย์', 'วันอาทิตย์': 'วันเสาร์',
  'เบียร์': 'น้ำเปล่า', 'น้ำเปล่า': 'น้ำแข็ง', 'ข้าวผัด': 'ผัดไทย', 'ผัดไทย': 'ข้าวผัด', 'ก๋วยเตี๋ยว': 'ส้มตำ', 'ส้มตำ': 'ก๋วยเตี๋ยว',
  'ขวด': 'จาน', 'แก้ว': 'จาน', 'จาน': 'แก้ว', 'ชาม': 'แก้ว', // a clearly wrong counter (Teacher: never แก้ว vs ขวด)
  'แม่': 'พ่อ', 'พ่อ': 'แม่', 'เพื่อน': 'แม่', 'น้อย': 'มาก', 'หวาน': 'ปกติ', 'เผ็ด': 'หวาน', 'น้ำแข็ง': 'น้ำเปล่า',
  'ตอนเช้า': 'ตอนเย็น', 'ตอนเย็น': 'ตอนเช้า', 'สนุก': 'สบาย', 'สบาย': 'สนุก',
  'บ้าน': 'ร้าน', 'ร้าน': 'บ้าน', 'ตลาด': 'ห้าง', 'ห้าง': 'ตลาด', 'สวน': 'ทะเล', 'ทะเล': 'สวน', 'โรงเรียน': 'คอนโด', 'คอนโด': 'บ้าน', 'ร้านอาหาร': 'ร้าน',
};
const ALIKE_ROM = { 'ทำงาน': 'tham-ngaan', 'มาก': 'mâak', 'ปกติ': 'bpòk-gà-dtì', 'จาน': 'jaan', 'แก้ว': 'gâaeo', 'ฟัง': 'fang', 'ดู': 'duu', 'เพลง': 'phleeng', 'หนัง': 'nǎng' };
export const alikeFor = (th) => (ALIKE[th] ? { th: ALIKE[th], rom: ALIKE_ROM[ALIKE[th]] } : null);

// Every practice line, for /api/speak's list of allowed text (endings are stripped there)
export function allPracticeSentences() {
  const out = new Set();
  const j = (parts) => parts.map((x) => x.th).join('');
  for (const a of ASK_ORDER) out.add(j(a.parts));
  for (const f of Object.values(FOLLOW_UP)) { out.add(j(f.parts)); out.add(j(f.reply)); }
  for (const p of PRACTICE_WHO) for (const doing of DOING) for (const neg of [false, true]) out.add(j(likeAsk(p, { neg, doing }).parts));
  return out;
}
