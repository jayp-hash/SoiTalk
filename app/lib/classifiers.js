// Classifiers (Jay, 23 Oct 2026; spec: project doc claude/classifiers-spec.md).
// Thai counts things with a counting word: thing + number + classifier,
// e.g. หมาสองตัว (mǎa sǎawng dtuaa) "two dogs". Tier 1 = the 10 you'll use this week.
// Romanization follows the app's word list where the word is in it.
// Every pair here needs a native check before release (see the pull request).

export const CLASSIFIERS = [
  { ex: 'two men', th: 'คน', rom: 'khon', for: 'People', hint: 'คน (khon) is for people.', also: '' },
  { ex: 'two dogs', th: 'ตัว', rom: 'dtuaa', for: 'Animals, clothes, tables and chairs', hint: 'ตัว (dtuaa) is for animals, and also clothes, tables and chairs.', also: '' },
  { ex: 'two chargers', th: 'อัน', rom: 'an', for: 'Small things with no special word', hint: 'อัน (an) is for small things with no special counting word.', also: 'When you are not sure, Thais often use อัน (an).' },
  { ex: 'two bottles of water', th: 'ขวด', rom: 'khùat', for: 'Bottles, and things that come in bottles', hint: 'ขวด (khùat) is for bottles, and anything sold in a bottle.', also: '' },
  { ex: 'two coffees', th: 'แก้ว', rom: 'gâaew', for: 'Drinks, by the glass or cup', hint: 'แก้ว (gâaew) is for drinks counted by the glass or cup.', also: 'The empty glass itself is counted with ใบ (bai).' },
  { ex: 'two plates of fried rice', th: 'จาน', rom: 'jaan', for: 'Food, by the plate', hint: 'จาน (jaan) is for food counted by the plate.', also: 'The empty plate itself is counted with ใบ (bai).' },
  { ex: 'two bags', th: 'ใบ', rom: 'bai', for: 'Flat or hollow things', hint: 'ใบ (bai) is for flat or hollow things: bags, tickets, cards, hats, boxes.', also: '' },
  { ex: 'two cars', th: 'คัน', rom: 'khan', for: 'Vehicles you drive or ride', hint: 'คัน (khan) is for vehicles you drive or ride.', also: 'Textbooks also use คัน (khan) for spoons and umbrellas; in Bangkok you will often hear อัน (an).' },
  { ex: 'two books', th: 'เล่ม', rom: 'lêm', for: 'Books', hint: 'เล่ม (lêm) is for books, notebooks and passports.', also: '' },
  { ex: 'two slices of cake', th: 'ชิ้น', rom: 'chín', for: 'Pieces', hint: 'ชิ้น (chín) is for pieces: a slice of cake or pizza, a piece of chicken.', also: '' },
];

// img = /public/classifiers/<img>.webp. Pictures always show the drink or food, never an empty container.
export const NOUNS = [
  { th: 'ผู้ชาย', rom: 'phûu-chaai', en: 'man', cls: 'คน', img: 'man' },
  { th: 'ผู้หญิง', rom: 'phûu-yǐng', en: 'woman', cls: 'คน', img: 'woman' },
  { th: 'เด็ก', rom: 'dèk', en: 'child', cls: 'คน', img: 'child' },
  { th: 'ครู', rom: 'khruu', en: 'teacher', cls: 'คน', img: 'teacher' },
  { th: 'หมอ', rom: 'mǎaw', en: 'doctor', cls: 'คน', img: 'doctor' },
  { th: 'หมา', rom: 'mǎa', en: 'dog', cls: 'ตัว', img: 'dog' },
  { th: 'แมว', rom: 'maaeo', en: 'cat', cls: 'ตัว', img: 'cat' },
  { th: 'ปลา', rom: 'bplaa', en: 'fish', cls: 'ตัว', img: 'fish' },
  { th: 'ไก่', rom: 'gài', en: 'chicken (the bird)', cls: 'ตัว', img: 'chicken' },
  { th: 'เสื้อ', rom: 'sûeaa', en: 'shirt', cls: 'ตัว', img: 'shirt' },
  { th: 'กางเกง', rom: 'gaang-geeng', en: 'trousers', cls: 'ตัว', img: 'trousers' },
  { th: 'โต๊ะ', rom: 'dtó', en: 'table', cls: 'ตัว', img: 'table' },
  { th: 'เก้าอี้', rom: 'gâo-îi', en: 'chair', cls: 'ตัว', img: 'chair' },
  { th: 'ที่ชาร์จ', rom: 'thîi-cháat', en: 'charger', cls: 'อัน', img: 'charger' },
  { th: 'รีโมท', rom: 'rii-mòot', en: 'remote control', cls: 'อัน', img: 'remote' },
  { th: 'ไม้บรรทัด', rom: 'mái ban-thát', en: 'ruler', cls: 'อัน', img: 'ruler' },
  { th: 'ปลั๊ก', rom: 'bplák', en: 'power strip', cls: 'อัน', img: 'plug' },
  { th: 'น้ำเปล่า', rom: 'náam-bplàao', en: 'water', cls: 'ขวด', img: 'water' },
  { th: 'โค้ก', rom: 'khóok', en: 'cola', cls: 'ขวด', img: 'cola' },
  { th: 'นม', rom: 'nom', en: 'milk', cls: 'ขวด', img: 'milk' },
  { th: 'แชมพู', rom: 'chaaem-phuu', en: 'shampoo', cls: 'ขวด', img: 'shampoo' },
  { th: 'กาแฟ', rom: 'gaa-faae', en: 'coffee', cls: 'แก้ว', img: 'coffee' },
  { th: 'ชาเย็น', rom: 'chaa-yen', en: 'Thai iced tea', cls: 'แก้ว', img: 'thaitea' },
  { th: 'ชาเขียว', rom: 'chaa-khǐao', en: 'green tea', cls: 'แก้ว', img: 'greentea' },
  { th: 'น้ำปั่น', rom: 'náam-bpàn', en: 'smoothie', cls: 'แก้ว', img: 'smoothie' },
  { th: 'ข้าวผัด', rom: 'khâao-phàt', en: 'fried rice', cls: 'จาน', img: 'friedrice' },
  { th: 'ผัดไทย', rom: 'phàt-thai', en: 'pad thai', cls: 'จาน', img: 'padthai' },
  { th: 'ผัดกะเพรา', rom: 'phàt-gà-phrao', en: 'pad kra pao', cls: 'จาน', img: 'kraphao' },
  { th: 'ส้มตำ', rom: 'sôm-dtam', en: 'som tam', cls: 'จาน', img: 'somtam' },
  { th: 'กระเป๋า', rom: 'grà-bpǎo', en: 'bag', cls: 'ใบ', img: 'bag' },
  { th: 'ตั๋ว', rom: 'dtǔa', en: 'ticket', cls: 'ใบ', img: 'ticket' },
  { th: 'บัตร', rom: 'bàt', en: 'card', cls: 'ใบ', img: 'card' },
  { th: 'หมวก', rom: 'mùak', en: 'hat', cls: 'ใบ', img: 'hat' },
  { th: 'กล่อง', rom: 'glàawng', en: 'box', cls: 'ใบ', img: 'box' },
  { th: 'รถ', rom: 'rót', en: 'car', cls: 'คัน', img: 'car' },
  { th: 'มอเตอร์ไซค์', rom: 'maaw-dtoe-sai', en: 'motorbike', cls: 'คัน', img: 'motorbike' },
  { th: 'จักรยาน', rom: 'jàk-grà-yaan', en: 'bicycle', cls: 'คัน', img: 'bicycle' },
  { th: 'แท็กซี่', rom: 'tháek-sîi', en: 'taxi', cls: 'คัน', img: 'taxi' },
  { th: 'หนังสือ', rom: 'nǎng-sǔue', en: 'book', cls: 'เล่ม', img: 'book' },
  { th: 'สมุด', rom: 'sà-mùt', en: 'notebook', cls: 'เล่ม', img: 'notebook' },
  { th: 'พาสปอร์ต', rom: 'phâat-sà-bpàawt', en: 'passport', cls: 'เล่ม', img: 'passport' },
  { th: 'เค้ก', rom: 'khéek', en: 'cake (a slice)', cls: 'ชิ้น', img: 'cake' },
  { th: 'พิซซ่า', rom: 'phít-sâa', en: 'pizza (a slice)', cls: 'ชิ้น', img: 'pizza' },
  { th: 'ไก่ทอด', rom: 'gài-thâawt', en: 'fried chicken (a piece)', cls: 'ชิ้น', img: 'friedchicken' },
];

// Numbers for the slot machine. One is left out: Thais say เล่มเดียว or เล่มหนึ่ง, not หนึ่งเล่ม (Thai Teacher, 23 Oct).
export const NUMBERS = [
  { th: 'สอง', rom: 'sǎawng', n: 2 },
  { th: 'สาม', rom: 'sǎam', n: 3 },
  { th: 'สี่', rom: 'sìi', n: 4 },
  { th: 'ห้า', rom: 'hâa', n: 5 },
];

// Measure levels (Jay): L1 rotates 4 classifiers, L2 rotates 8, L3 uses all 10.
export const MEASURE_LEVELS = [
  { n: 1, name: 'Level 1', rule: 'Four counting words: คน (khon), ตัว (dtuaa), ขวด (khùat) and จาน (jaan).', cls: ['คน', 'ตัว', 'ขวด', 'จาน'] },
  { n: 2, name: 'Level 2', rule: 'Eight counting words. Adds drinks by the glass, bags, vehicles and books.', cls: ['คน', 'ตัว', 'ขวด', 'จาน', 'แก้ว', 'ใบ', 'คัน', 'เล่ม'] },
  { n: 3, name: 'Level 3', rule: 'All ten, including อัน (an) and ชิ้น (chín).', cls: CLASSIFIERS.map((c) => c.th) },
];

export const classifierOf = (th) => CLASSIFIERS.find((c) => c.th === th);
export const nounsFor = (cls) => NOUNS.filter((n) => n.cls === cls);
export const phrase = (noun, num) => ({ th: noun.th + num.th + noun.cls, rom: `${noun.rom} ${num.rom} ${classifierOf(noun.cls).rom}` });

// The prompt over the slot-machine picture: "What do you see?" in the learner's register.
export const PROMPT = { th: 'เห็นอะไรบ้าง', rom: 'hěn à-rai bâang', en: 'What do you see?' };

// Every line the Classifiers tab can play, for /api/speak's course-content check.
export function allClassifierLines() {
  const s = new Set([PROMPT.th]);
  for (const c of CLASSIFIERS) s.add(c.th);
  for (const n of NOUNS) {
    s.add(n.th);
    for (const num of NUMBERS) s.add(phrase(n, num).th);
  }
  return s;
}
