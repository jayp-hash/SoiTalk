// Classifiers (Jay, 23 Oct 2026; spec: project doc claude/classifiers-spec.md).
// Thai counts things with a counting word: thing + number + classifier,
// e.g. หมาสองตัว (mǎa sǎawng dtuaa) "two dogs". Tier 1 = the 10 you'll use this week.
// Romanization follows the app's word list where the word is in it.
// Every pair here needs a native check before release (see the pull request).

export const CLASSIFIERS = [
  { ex: 'two men', group: 'people', unit: 'people', th: 'คน', rom: 'khon', for: 'People', hint: 'คน (khon) is for people.', also: '' },
  { ex: 'two dogs', group: 'people', unit: 'animals or clothes', th: 'ตัว', rom: 'dtuaa', for: 'Animals, clothes, tables and chairs', hint: 'ตัว (dtuaa) is for animals, and also clothes, tables and chairs.', also: '' },
  { ex: 'two chargers', group: 'things', unit: 'things', th: 'อัน', rom: 'an', for: 'Small things with no special word', hint: 'อัน (an) is for small things with no special counting word.', also: 'When you are not sure, Thais often use อัน (an).' },
  { ex: 'two bottles of water', group: 'food', unit: 'bottles', th: 'ขวด', rom: 'khùat', for: 'Bottles, and things that come in bottles', hint: 'ขวด (khùat) is for bottles, and anything sold in a bottle.', also: '' },
  { ex: 'two coffees', group: 'food', unit: 'cups', th: 'แก้ว', rom: 'gâaew', for: 'Drinks, by the glass or cup', hint: 'แก้ว (gâaew) is for drinks counted by the glass or cup.', also: 'The empty glass itself is counted with ใบ (bai).' },
  { ex: 'two plates of fried rice', group: 'food', unit: 'plates', th: 'จาน', rom: 'jaan', for: 'Food, by the plate', hint: 'จาน (jaan) is for food counted by the plate.', also: 'The empty plate itself is counted with ใบ (bai).' },
  { ex: 'two bags', group: 'things', unit: 'bags or boxes', th: 'ใบ', rom: 'bai', for: 'Flat or hollow things', hint: 'ใบ (bai) is for flat or hollow things: bags, tickets, cards, hats, boxes.', also: '' },
  { ex: 'two cars', group: 'people', unit: 'vehicles', th: 'คัน', rom: 'khan', for: 'Vehicles you drive or ride', hint: 'คัน (khan) is for vehicles you drive or ride.', also: 'Textbooks also use คัน (khan) for spoons and umbrellas; in Bangkok you will often hear อัน (an).' },
  { ex: 'two books', group: 'things', unit: 'books', th: 'เล่ม', rom: 'lêm', for: 'Books', hint: 'เล่ม (lêm) is for books, notebooks and passports.', also: '' },
  { ex: 'two slices of cake', group: 'food', unit: 'pieces', th: 'ชิ้น', rom: 'chín', for: 'Pieces', hint: 'ชิ้น (chín) is for pieces: a slice of cake or pizza, a piece of chicken.', also: '' },
  // Street classifiers (round 1 of the 27 Oct rebuild; panel draft, native check needed)
  { ex: 'two bowls of noodle soup', group: 'food', unit: 'bowls', th: 'ชาม', rom: 'chaam', for: 'Food served in a bowl', hint: 'ชาม (chaam) is for food served in a bowl: noodle soup, tom yum, rice porridge.', also: 'The empty bowl itself is counted with ใบ (bai).' },
  { ex: 'five pork skewers', group: 'food', unit: 'sticks', th: 'ไม้', rom: 'máai', for: 'Anything on a stick', hint: 'ไม้ (máai) means stick: use it for anything on a skewer.', also: '' },
  { ex: 'two mangoes', group: 'food', unit: 'whole ones', th: 'ลูก', rom: 'lûuk', for: 'Whole fruit, and balls', hint: 'ลูก (lûuk) is for whole fruit, and balls.', also: '' },
  { ex: 'two bags of ice', group: 'food', unit: 'bags', th: 'ถุง', rom: 'thǔng', for: 'Things sold in a bag', hint: 'ถุง (thǔng) is for things sold in a bag: ice, cut fruit, snacks.', also: 'A bag you carry, like a handbag, is counted with ใบ (bai).' },
];

// Learn list groups, in this order
export const GROUPS = [
  { id: 'food', en: 'Food and drink' },
  { id: 'things', en: 'Things' },
  { id: 'people', en: 'People, animals and vehicles' },
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
  { th: 'ไก่', rom: 'gài', en: 'chicken (the bird)', cls: 'ตัว', img: 'chicken', practice: false },
  { th: 'เสื้อ', rom: 'sûeaa', en: 'shirt', cls: 'ตัว', img: 'shirt' },
  { th: 'กางเกง', rom: 'gaang-geeng', en: 'trousers', cls: 'ตัว', img: 'trousers' },
  { th: 'โต๊ะ', rom: 'dtó', en: 'table', cls: 'ตัว', img: 'table' },
  { th: 'เก้าอี้', rom: 'gâo-îi', en: 'chair', cls: 'ตัว', img: 'chair' },
  { th: 'ที่ชาร์จ', rom: 'thîi-cháat', en: 'charger', cls: 'อัน', img: 'charger' },
  { th: 'รีโมท', rom: 'rii-mòot', en: 'remote control', cls: 'อัน', img: 'remote' },
  { th: 'ไม้บรรทัด', rom: 'máai ban-thát', en: 'ruler', cls: 'อัน', img: 'ruler' },
  { th: 'น้ำเปล่า', rom: 'náam-bplàao', en: 'water', cls: 'ขวด', img: 'water' },
  { th: 'โค้ก', rom: 'khóok', en: 'cola', cls: 'ขวด', img: 'cola' },
  { th: 'นม', rom: 'nom', en: 'milk', cls: 'ขวด', img: 'milk' },
  { th: 'แชมพู', rom: 'chaaem-phuu', en: 'shampoo', cls: 'ขวด', img: 'shampoo' },
  { th: 'กาแฟ', rom: 'gaa-faae', en: 'coffee', cls: 'แก้ว', img: 'coffee', many: 'coffees' },
  { th: 'ชาเย็น', rom: 'chaa-yen', en: 'Thai iced tea', cls: 'แก้ว', img: 'thaitea', many: 'Thai iced teas' },
  { th: 'ชาเขียว', rom: 'chaa-khǐao', en: 'green tea', cls: 'แก้ว', img: 'greentea', many: 'green teas' },
  { th: 'น้ำปั่น', rom: 'náam-bpàn', en: 'smoothie', cls: 'แก้ว', img: 'smoothie', many: 'smoothies' },
  { th: 'ข้าวผัด', rom: 'khâao-phàt', en: 'fried rice', cls: 'จาน', img: 'friedrice' },
  { th: 'ผัดไทย', rom: 'phàt-thai', en: 'pad thai', cls: 'จาน', img: 'padthai' },
  { th: 'ผัดกะเพรา', rom: 'phàt-gà-phrao', en: 'pad kra pao', cls: 'จาน', img: 'kraphao' },
  { th: 'ส้มตำ', rom: 'sôm-dtam', en: 'som tam', cls: 'จาน', img: 'somtam' },
  { th: 'กระเป๋า', rom: 'grà-bpǎo', en: 'bag', cls: 'ใบ', img: 'bag' },
  { th: 'ตั๋ว', rom: 'dtǔaa', en: 'ticket', cls: 'ใบ', img: 'ticket' },
  { th: 'บัตร', rom: 'bàt', en: 'card', cls: 'ใบ', img: 'card', practice: false },
  { th: 'หมวก', rom: 'mùak', en: 'hat', cls: 'ใบ', img: 'hat' },
  { th: 'กล่อง', rom: 'glàawng', en: 'box', cls: 'ใบ', img: 'box' },
  { th: 'รถ', rom: 'rót', en: 'car', cls: 'คัน', img: 'car' },
  { th: 'มอเตอร์ไซค์', rom: 'maaw-dter-sai', en: 'motorbike', cls: 'คัน', img: 'motorbike' },
  { th: 'จักรยาน', rom: 'jàk-grà-yaan', en: 'bicycle', cls: 'คัน', img: 'bicycle' },
  { th: 'แท็กซี่', rom: 'tháek-sîi', en: 'taxi', cls: 'คัน', img: 'taxi' },
  { th: 'หนังสือ', rom: 'nǎng-sǔue', en: 'book', cls: 'เล่ม', img: 'book' },
  { th: 'สมุด', rom: 'sà-mùt', en: 'notebook', cls: 'เล่ม', img: 'notebook' },
  { th: 'พาสปอร์ต', rom: 'phâat-sà-bpàawt', en: 'passport', cls: 'เล่ม', img: 'passport' },
  { th: 'เค้ก', rom: 'khéek', en: 'cake (a slice)', cls: 'ชิ้น', img: 'cake' },
  { th: 'พิซซ่า', rom: 'phít-sâa', en: 'pizza (a slice)', cls: 'ชิ้น', img: 'pizza' },
  { th: 'ไก่ทอด', rom: 'gài-thâawt', en: 'fried chicken (a piece)', cls: 'ชิ้น', img: 'friedchicken' },
  // Street nouns (27 Oct): native check needed
  { th: 'ก๋วยเตี๋ยว', rom: 'gǔay-dtǐao', en: 'noodle soup', cls: 'ชาม', img: 'noodles' },
  { th: 'ต้มยำ', rom: 'dtôm-yam', en: 'tom yum', cls: 'ชาม', img: 'tomyum' },
  { th: 'โจ๊ก', rom: 'jóok', en: 'rice porridge', cls: 'ชาม', img: 'jok' },
  { th: 'หมูปิ้ง', rom: 'mǔu-bpîng', en: 'grilled pork skewer', cls: 'ไม้', img: 'mooping' },
  { th: 'ไส้กรอก', rom: 'sâi-gràawk', en: 'sausage on a stick', cls: 'ไม้', img: 'sausage' },
  { th: 'สะเต๊ะ', rom: 'sà-dté', en: 'satay', cls: 'ไม้', img: 'satay' },
  { th: 'มะม่วง', rom: 'má-mûang', en: 'mango', cls: 'ลูก', img: 'mango' },
  { th: 'มะพร้าว', rom: 'má-práao', en: 'coconut', cls: 'ลูก', img: 'coconut' },
  { th: 'แตงโม', rom: 'dtaeng-moo', en: 'watermelon', cls: 'ลูก', img: 'watermelon' },
  { th: 'น้ำแข็ง', rom: 'náam-khǎeng', en: 'ice', cls: 'ถุง', img: 'ice' },
  { th: 'ผลไม้', rom: 'phǒn-lá-máai', en: 'cut fruit', cls: 'ถุง', img: 'fruitbag' },
  { th: 'กล้วยทอด', rom: 'glûay-thâawt', en: 'fried banana', cls: 'ถุง', img: 'friedbanana' },
];
// Nouns used in practice rounds (textbook ones stay in Learn only)
export const PRACTICE_NOUNS = NOUNS.filter((n) => n.practice !== false);

// Numbers for the activities: 2 to 5. One works differently: classifier + เดียว is "just one" (ขวดเดียว),
// classifier + หนึ่ง (spoken นึง) is "a / one" (กาแฟหนึ่งแก้ว). Taught in the sentences, not the reels (Thai Teacher, 24 Oct).
export const NUMBERS = [
  { th: 'สอง', rom: 'sǎawng', n: 2 },
  { th: 'สาม', rom: 'sǎam', n: 3 },
  { th: 'สี่', rom: 'sìi', n: 4 },
  { th: 'ห้า', rom: 'hâa', n: 5 },
];

// Practice levels (Jay, 24 Oct): each level changes the task, not the labels. No blurring.
// Find the matches: each level changes the task, not the labels (panel, 27 Oct)
export const MATCH_LEVELS = [
  { n: 1, name: 'Level 1', rule: 'See it: one classifier. Each card shows the thing and its Thai name. Tap or drag the ones that take this classifier.' },
  { n: 2, name: 'Level 2', rule: 'Read it: two classifiers that are easy to mix up. Cards show only the Thai word; the picture appears when you get it right.' },
  { n: 3, name: 'Level 3', rule: 'Hear it: two classifiers. Cards only play the word. Listen, then put it in its circle.' },
];
// How many? (the slot machine)
export const SLOT_LEVELS = [
  { n: 1, name: 'Level 1', rule: 'The vendor asks "How many?" with the classifier. Find the thing on your order that takes it, then set the number.' },
  { n: 2, name: 'Level 2', rule: 'The vendor asks "What can I get you?". Set the number and the right classifier for what you want.' },
  { n: 3, name: 'Level 3', rule: 'Say the whole order: set the thing, the number and the classifier.' },
];

// Classifiers learners mix up (Thai Teacher): used for wrong choices and Level 2 and 3 pairs.
export const CONFUSE = {
  'คน': ['ตัว'], 'ตัว': ['ชิ้น', 'คน'], 'อัน': ['ใบ', 'คัน'], 'ขวด': ['ถุง', 'แก้ว'], 'แก้ว': ['ขวด', 'ใบ'],
  'จาน': ['ชาม', 'ชิ้น'], 'ใบ': ['อัน', 'เล่ม'], 'คัน': ['อัน'], 'เล่ม': ['ใบ'], 'ชิ้น': ['จาน', 'ไม้'],
  'ชาม': ['จาน', 'แก้ว'], 'ไม้': ['ชิ้น', 'อัน'], 'ลูก': ['ถุง', 'อัน'], 'ถุง': ['ใบ', 'ขวด'],
};
// No ขวด/แก้ว pair: without a picture, น้ำเปล่า or โค้ก can take either (Thai Teacher, 27 Oct)
// Removed ลูก/ถุง and จาน/ชิ้น (27 Oct, Thai Teacher): with no picture, ผลไม้ and ไก่ทอด fit both
export const PAIRS = [['จาน', 'ชาม'], ['ไม้', 'ชิ้น'], ['ใบ', 'อัน'], ['คัน', 'อัน'], ['คน', 'ตัว'], ['เล่ม', 'ใบ'], ['ขวด', 'ถุง']];
// Things that look alike but take different classifiers (a glass of coffee vs a bottle of water)
export const TWINS = {
  'กาแฟ': 'น้ำเปล่า', 'น้ำเปล่า': 'กาแฟ', 'ก๋วยเตี๋ยว': 'ข้าวผัด', 'ข้าวผัด': 'ก๋วยเตี๋ยว',
  'มะม่วง': 'ผลไม้', 'ผลไม้': 'มะม่วง', 'ไก่ทอด': 'สะเต๊ะ', 'สะเต๊ะ': 'ไก่ทอด', 'เค้ก': 'พิซซ่า',
};

// The slot machine's vendor. Only things you buy from a stall or shop.
export const VENDOR_CLS = ['ขวด', 'แก้ว', 'จาน', 'ชาม', 'ไม้', 'ลูก', 'ถุง', 'ชิ้น'];
export const ASK_WHAT = { th: 'รับอะไรดีคะ', rom: 'ráp à-rai dii khá', en: 'What can I get you?' };
// "How many <classifier>?": เอากี่ขวดคะ (the vendor's voice is female, so คะ)
export const askHowMany = (cls) => {
  const c = classifierOf(cls);
  return { th: `เอากี่${cls}คะ`, rom: `ao gìi ${c.rom} khá`, en: `How many ${c.unit}?` };
};

// One everyday sentence per noun (Thai Teacher draft, 24 Oct; every line needs a native check).
// Stored neutral (ฉัน, no polite ending); renderSay() puts it in the learner's register.
// Parts: [thai, romanization, role]; role marks the noun, the number and the classifier.
const S = (en, parts, q = false) => ({ en, q, parts: parts.map(([th, rom, role]) => ({ th, rom, role })) });
export const SAY = {
  'ผู้ชาย': S('There are two men outside.', [['ข้างนอกมี', 'khâang-nâawk mii'], ['ผู้ชาย', 'phûu-chaai', 'noun'], ['สอง', 'sǎawng', 'num'], ['คน', 'khon', 'cls']]),
  'ผู้หญิง': S('Two women are waiting downstairs.', [['ผู้หญิง', 'phûu-yǐng', 'noun'], ['สอง', 'sǎawng', 'num'], ['คน', 'khon', 'cls'], ['รออยู่ข้างล่าง', 'raaw yùu khâang-lâang']]),
  'เด็ก': S('Two adults and one child.', [['ผู้ใหญ่สองคน', 'phûu-yài sǎawng khon'], ['เด็ก', 'dèk', 'noun'], ['หนึ่ง', 'nùeng', 'num'], ['คน', 'khon', 'cls']]),
  'ครู': S('I have two Thai teachers.', [['ฉันมี', 'chǎn mii'], ['ครู', 'khruu', 'noun'], ['สอนภาษาไทย', 'sǎawn phaa-sǎa thai'], ['สอง', 'sǎawng', 'num'], ['คน', 'khon', 'cls']]),
  'หมอ': S('How many doctors does this clinic have?', [['คลินิกนี้มี', 'khlí-ník níi mii'], ['หมอ', 'mǎaw', 'noun'], ['กี่', 'gìi', 'num'], ['คน', 'khon', 'cls']], true),
  'หมา': S('I have two dogs.', [['ฉันเลี้ยง', 'chǎn líang'], ['หมา', 'mǎa', 'noun'], ['สอง', 'sǎawng', 'num'], ['ตัว', 'dtuaa', 'cls']]),
  'แมว': S('How many cats do you have?', [['คุณเลี้ยง', 'khun líang'], ['แมว', 'maaeo', 'noun'], ['กี่', 'gìi', 'num'], ['ตัว', 'dtuaa', 'cls']], true),
  'ปลา': S("I'll take two fish.", [['เอา', 'ao'], ['ปลา', 'bplaa', 'noun'], ['สอง', 'sǎawng', 'num'], ['ตัว', 'dtuaa', 'cls']]),
  'ไก่': S('We have three chickens at home.', [['ที่บ้านมี', 'thîi bâan mii'], ['ไก่', 'gài', 'noun'], ['สาม', 'sǎam', 'num'], ['ตัว', 'dtuaa', 'cls']]),
  'เสื้อ': S('Three shirts. Can you give me a discount?', [['ซื้อ', 'súue'], ['เสื้อ', 'sûeaa', 'noun'], ['สาม', 'sǎam', 'num'], ['ตัว', 'dtuaa', 'cls'], [' ลดได้ไหม', 'lót dâai mǎi']], true),
  'กางเกง': S('Can I try on two pairs of trousers?', [['ขอลอง', 'khǎaw laawng'], ['กางเกง', 'gaang-geeng', 'noun'], ['สอง', 'sǎawng', 'num'], ['ตัว', 'dtuaa', 'cls']]),
  'โต๊ะ': S('How many tables does this room have?', [['ห้องนี้มี', 'hâwng níi mii'], ['โต๊ะ', 'dtó', 'noun'], ['กี่', 'gìi', 'num'], ['ตัว', 'dtuaa', 'cls']], true),
  'เก้าอี้': S('Two more chairs, please.', [['ขอ', 'khǎaw'], ['เก้าอี้', 'gâo-îi', 'noun'], ['เพิ่มอีก', 'phêrm ìik'], ['สอง', 'sǎawng', 'num'], ['ตัว', 'dtuaa', 'cls']]),
  'ที่ชาร์จ': S('Can I borrow a charger?', [['ขอยืม', 'khǎaw yuuem'], ['ที่ชาร์จ', 'thîi-cháat', 'noun'], ['อัน', 'an', 'cls'], ['หนึ่ง', 'nùeng', 'num'], ['ได้ไหม', 'dâai mǎi']], true),
  'รีโมท': S('One of the air-con remotes is missing.', [['รีโมท', 'rii-mòot', 'noun'], ['แอร์หายไป', 'aae hǎai bpai'], ['อัน', 'an', 'cls'], ['หนึ่ง', 'nùeng', 'num']]),
  'ไม้บรรทัด': S('Two rulers, please.', [['ขอ', 'khǎaw'], ['ไม้บรรทัด', 'máai ban-thát', 'noun'], ['สอง', 'sǎawng', 'num'], ['อัน', 'an', 'cls']]),
  'น้ำเปล่า': S('Two bottles of water, please.', [['ขอ', 'khǎaw'], ['น้ำเปล่า', 'náam-bplàao', 'noun'], ['สอง', 'sǎawng', 'num'], ['ขวด', 'khùat', 'cls']]),
  'โค้ก': S('Just one Coke, please.', [['ขอ', 'khǎaw'], ['โค้ก', 'khóok', 'noun'], ['ขวด', 'khùat', 'cls'], ['เดียว', 'diao', 'num']]),
  'นม': S('I bought two bottles of milk at 7-Eleven.', [['ซื้อ', 'súue'], ['นม', 'nom', 'noun'], ['สอง', 'sǎawng', 'num'], ['ขวด', 'khùat', 'cls'], ['ที่เซเว่น', 'thîi see-wên']]),
  'แชมพู': S('How much is a bottle of shampoo?', [['แชมพู', 'chaaem-phuu', 'noun'], ['ขวด', 'khùat', 'cls'], ['ละเท่าไหร่', 'lá thâo-rài']], true),
  'กาแฟ': S('Two iced coffees, please.', [['ขอ', 'khǎaw'], ['กาแฟ', 'gaa-faae', 'noun'], ['เย็น', 'yen'], ['สอง', 'sǎawng', 'num'], ['แก้ว', 'gâaew', 'cls']]),
  'ชาเย็น': S('One Thai iced tea, less sweet.', [['ชาเย็น', 'chaa-yen', 'noun'], ['หนึ่ง', 'nùeng', 'num'], ['แก้ว', 'gâaew', 'cls'], [' หวานน้อย', 'wǎan nói']]),
  'ชาเขียว': S('Three green teas to go.', [['เอา', 'ao'], ['ชาเขียว', 'chaa-khǐao', 'noun'], ['สาม', 'sǎam', 'num'], ['แก้ว', 'gâaew', 'cls'], [' กลับบ้าน', 'glàp bâan']]),
  'น้ำปั่น': S('Two smoothies, no sugar.', [['ขอ', 'khǎaw'], ['น้ำปั่น', 'náam-bpàn', 'noun'], ['สอง', 'sǎawng', 'num'], ['แก้ว', 'gâaew', 'cls'], [' ไม่ใส่น้ำตาล', 'mâi sài náam-dtaan']]),
  'ข้าวผัด': S('Two plates of fried rice, please.', [['ขอ', 'khǎaw'], ['ข้าวผัด', 'khâao-phàt', 'noun'], ['สอง', 'sǎawng', 'num'], ['จาน', 'jaan', 'cls']]),
  'ผัดไทย': S('Three pad thai, no peanuts.', [['ผัดไทย', 'phàt-thai', 'noun'], ['สาม', 'sǎam', 'num'], ['จาน', 'jaan', 'cls'], [' ไม่ใส่ถั่ว', 'mâi sài thùa']]),
  'ผัดกะเพรา': S('Just one pad kra pao, not spicy.', [['ผัดกะเพรา', 'phàt-gà-phrao', 'noun'], ['จาน', 'jaan', 'cls'], ['เดียว', 'diao', 'num'], [' ไม่เผ็ด', 'mâi phèt']]),
  'ส้มตำ': S('How many plates of som tam should we get?', [['ส้มตำ', 'sôm-dtam', 'noun'], ['กี่', 'gìi', 'num'], ['จาน', 'jaan', 'cls'], ['ดี', 'dii']], true),
  'กระเป๋า': S('I have two bags.', [['ฉันมี', 'chǎn mii'], ['กระเป๋า', 'grà-bpǎo', 'noun'], ['สอง', 'sǎawng', 'num'], ['ใบ', 'bai', 'cls']]),
  'ตั๋ว': S('Two tickets, please.', [['ขอ', 'khǎaw'], ['ตั๋ว', 'dtǔaa', 'noun'], ['สอง', 'sǎawng', 'num'], ['ใบ', 'bai', 'cls']]),
  'บัตร': S('Can I pay with two cards?', [['ใช้', 'chái'], ['บัตร', 'bàt', 'noun'], ['สอง', 'sǎawng', 'num'], ['ใบ', 'bai', 'cls'], ['ได้ไหม', 'dâai mǎi']], true),
  'หมวก': S('How much for two hats?', [['หมวก', 'mùak', 'noun'], ['สอง', 'sǎawng', 'num'], ['ใบ', 'bai', 'cls'], [' ราคาเท่าไหร่', 'raa-khaa thâo-rài']], true),
  'กล่อง': S('Two more boxes, please.', [['ขอ', 'khǎaw'], ['กล่อง', 'glàawng', 'noun'], ['เพิ่มอีก', 'phêrm ìik'], ['สอง', 'sǎawng', 'num'], ['ใบ', 'bai', 'cls']]),
  'รถ': S('How many cars can I park with this unit?', [['ห้องนี้จอด', 'hâwng níi jàawt'], ['รถ', 'rót', 'noun'], ['ได้', 'dâai'], ['กี่', 'gìi', 'num'], ['คัน', 'khan', 'cls']], true),
  'มอเตอร์ไซค์': S('Call two motorbikes.', [['เรียก', 'rîak'], ['มอเตอร์ไซค์', 'maaw-dter-sai', 'noun'], ['สอง', 'sǎawng', 'num'], ['คัน', 'khan', 'cls']]),
  'จักรยาน': S("We'd like to rent two bicycles.", [['ขอเช่า', 'khǎaw châo'], ['จักรยาน', 'jàk-grà-yaan', 'noun'], ['สอง', 'sǎawng', 'num'], ['คัน', 'khan', 'cls']]),
  'แท็กซี่': S('We need to call two taxis.', [['ต้องเรียก', 'dtâwng rîak'], ['แท็กซี่', 'tháek-sîi', 'noun'], ['สอง', 'sǎawng', 'num'], ['คัน', 'khan', 'cls']]),
  'หนังสือ': S("I've read three books this month.", [['เดือนนี้อ่าน', 'duean níi àan'], ['หนังสือ', 'nǎng-sǔue', 'noun'], ['ไป', 'bpai'], ['สาม', 'sǎam', 'num'], ['เล่ม', 'lêm', 'cls']]),
  'สมุด': S('Two notebooks, please.', [['ขอ', 'khǎaw'], ['สมุด', 'sà-mùt', 'noun'], ['สอง', 'sǎawng', 'num'], ['เล่ม', 'lêm', 'cls']]),
  'พาสปอร์ต': S('I have two passports.', [['ฉันมี', 'chǎn mii'], ['พาสปอร์ต', 'phâat-sà-bpàawt', 'noun'], ['สอง', 'sǎawng', 'num'], ['เล่ม', 'lêm', 'cls']]),
  'เค้ก': S('Two slices of cake to go, please.', [['ขอ', 'khǎaw'], ['เค้ก', 'khéek', 'noun'], ['สอง', 'sǎawng', 'num'], ['ชิ้น', 'chín', 'cls'], [' กลับบ้าน', 'glàp bâan']]),
  'พิซซ่า': S('There are two slices of pizza left.', [['พิซซ่า', 'phít-sâa', 'noun'], ['เหลือ', 'lǔea'], ['สอง', 'sǎawng', 'num'], ['ชิ้น', 'chín', 'cls']]),
  'ไก่ทอด': S('Five pieces of fried chicken, please.', [['ขอ', 'khǎaw'], ['ไก่ทอด', 'gài-thâawt', 'noun'], ['ห้า', 'hâa', 'num'], ['ชิ้น', 'chín', 'cls']]),
  // Street nouns (27 Oct panel draft; native check needed)
  'ก๋วยเตี๋ยว': S('Two bowls of noodle soup, no coriander.', [['ขอ', 'khǎaw'], ['ก๋วยเตี๋ยว', 'gǔay-dtǐao', 'noun'], ['สอง', 'sǎawng', 'num'], ['ชาม', 'chaam', 'cls'], [' ไม่ใส่ผักชี', 'mâi sài phàk-chii']]),
  'ต้มยำ': S('Just one bowl of tom yum is enough.', [['ต้มยำ', 'dtôm-yam', 'noun'], ['ชาม', 'chaam', 'cls'], ['เดียว', 'diao', 'num'], ['ก็พอ', 'gâaw phaaw']]),
  'โจ๊ก': S('One bowl of rice porridge with egg, please.', [['ขอ', 'khǎaw'], ['โจ๊ก', 'jóok', 'noun'], ['ชาม', 'chaam', 'cls'], ['นึง', 'nùeng', 'num'], ['ใส่ไข่', 'sài khài']]),
  'หมูปิ้ง': S("I'll take five pork skewers.", [['เอา', 'ao'], ['หมูปิ้ง', 'mǔu-bpîng', 'noun'], ['ห้า', 'hâa', 'num'], ['ไม้', 'máai', 'cls']]),
  'ไส้กรอก': S('Two sausage sticks to go, please.', [['ขอ', 'khǎaw'], ['ไส้กรอก', 'sâi-gràawk', 'noun'], ['สอง', 'sǎawng', 'num'], ['ไม้', 'máai', 'cls'], [' กลับบ้าน', 'glàp bâan']]),
  'สะเต๊ะ': S('I ate five satay skewers.', [['ฉันกิน', 'chǎn gin'], ['สะเต๊ะ', 'sà-dté', 'noun'], ['ไป', 'bpai'], ['ห้า', 'hâa', 'num'], ['ไม้', 'máai', 'cls']]),
  'มะม่วง': S('Three mangoes for 100, OK?', [['มะม่วง', 'má-mûang', 'noun'], ['สาม', 'sǎam', 'num'], ['ลูก', 'lûuk', 'cls'], ['ร้อย', 'rói'], ['ได้ไหม', 'dâai mǎi']], true),
  'มะพร้าว': S('Just one coconut, please.', [['ขอ', 'khǎaw'], ['มะพร้าว', 'má-práao', 'noun'], ['ลูก', 'lûuk', 'cls'], ['เดียว', 'diao', 'num']]),
  'แตงโม': S('Is this watermelon sweet?', [['แตงโม', 'dtaeng-moo', 'noun'], ['ลูก', 'lûuk', 'cls'], ['นี้', 'níi'], ['หวานไหม', 'wǎan mǎi']], true),
  'น้ำแข็ง': S('One more bag of ice, please.', [['ขอ', 'khǎaw'], ['น้ำแข็ง', 'náam-khǎeng', 'noun'], ['เพิ่มอีก', 'phêrm ìik'], ['ถุง', 'thǔng', 'cls'], ['นึง', 'nùeng', 'num']]),
  'ผลไม้': S('Two bags of cut fruit.', [['เอา', 'ao'], ['ผลไม้', 'phǒn-lá-máai', 'noun'], ['สอง', 'sǎawng', 'num'], ['ถุง', 'thǔng', 'cls']]),
  'กล้วยทอด': S('Fried bananas are 20 baht a bag, right?', [['กล้วยทอด', 'glûay-thâawt', 'noun'], ['ถุง', 'thǔng', 'cls'], ['ละ', 'lá'], ['ยี่สิบ', 'yîi-sìp'], ['ใช่ไหม', 'châi mǎi']], true),
};

// Words that may be tapped on their own inside a sentence or a tile bank
export const EXTRA_WORDS = [{ th: 'หนึ่ง', rom: 'nùeng' }, { th: 'เดียว', rom: 'diao' }, { th: 'กี่', rom: 'gìi' }];

// A sentence in the learner's register: ฉัน -> ผม for men, plus ครับ / ค่ะ / คะ.
// particleFor comes from lib/register.js (passed in so this file stays plain data).
export function renderSay(say, reg, particleFor) {
  const male = reg === 'male';
  const p = particleFor(reg, say.q);
  const parts = say.parts.map((x) => (male && x.th.includes('ฉัน')
    ? { ...x, th: x.th.replace('ฉัน', 'ผม'), rom: x.rom.replace('chǎn', 'phǒm') } : x));
  const all = [...parts, { th: p.th, rom: p.rom, role: 'ending' }];
  return { ...say, parts: all, th: all.map((x) => x.th).join(''), rom: all.map((x) => x.rom).join(' ') };
}
const neutral = (say) => say.parts.map((x) => x.th).join('');

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
  for (const say of Object.values(SAY)) {
    s.add(neutral(say)); s.add(neutral(say).replace(/\s+/g, ''));
    for (const x of say.parts) s.add(x.th.trim());
  }
  for (const w of [...NUMBERS, ...EXTRA_WORDS]) s.add(w.th);
  // The slot machine: the vendor's questions and your answers
  s.add(ASK_WHAT.th); s.add(ASK_WHAT.th.replace(/คะ$/, '')); s.add('ได้');
  for (const c of CLASSIFIERS) {
    const q = askHowMany(c.th).th; s.add(q); s.add(q.replace(/คะ$/, ''));
    for (const num of NUMBERS) s.add(`เอา${num.th}${c.th}`);
  }
  return s;
}
