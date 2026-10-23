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
    plate: { th: 'เซเว่น', rom: 'see-wên', en: '7-Eleven' }, // district-plate tag (Thai above English, like a street sign)
    promise: 'Turn down a bag in Thai',
    minutes: 2,
    // The other person (always the female voice: most cashiers are women)
    staff: { who: 'The cashier', ask: (it) => ({ th: `รับ${it.th}ไหมคะ`, rom: `ráp ${it.rom} mǎi khá`, en: `Do you want ${it.a}?`, words: [{ th: 'รับ', rom: 'ráp' }, ...(it.parts || [it]), { th: 'ไหม', rom: 'mǎi' }, { th: 'คะ', rom: 'khá' }] }) },
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
    plate: { th: 'ร้านอาหาร', rom: 'ráan-aa-hǎan', en: 'Thai restaurant' },
    promise: 'Order Thai food your way',
    minutes: 3,
    staff: { who: 'The waitress', ask: () => ({ th: 'รับอะไรดีคะ', rom: 'ráp à-rai dii khá', en: 'What would you like?', words: [{ th: 'รับ', rom: 'ráp' }, { th: 'อะไร', rom: 'à-rai' }, { th: 'ดี', rom: 'dii' }, { th: 'คะ', rom: 'khá' }] }) },
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
      staff: { th: 'เผ็ดไหมคะ', rom: 'phèt mǎi khá', en: 'Spicy?', words: [{ th: 'เผ็ด', rom: 'phèt' }, { th: 'ไหม', rom: 'mǎi' }, { th: 'คะ', rom: 'khá' }] },
      answers: [
        { key: 'none', parts: [{ th: 'ไม่', rom: 'mâi', en: 'not' }, { th: 'เผ็ด', rom: 'phèt', en: 'spicy' }], en: 'Not spicy.' },
        { key: 'little', parts: [{ th: 'เผ็ด', rom: 'phèt', en: 'spicy' }, { th: 'นิดหน่อย', rom: 'nít-nàawi', en: 'a little' }], en: 'A little spicy.' },
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
    plate: { th: 'ร้านกาแฟ', rom: 'ráan gaa-faae', en: 'Coffee shop' },
    promise: 'Order coffee your way',
    minutes: 3,
    staff: { who: 'The barista', ask: () => ({ th: 'รับอะไรดีคะ', rom: 'ráp à-rai dii khá', en: 'What would you like?', words: [{ th: 'รับ', rom: 'ráp' }, { th: 'อะไร', rom: 'à-rai' }, { th: 'ดี', rom: 'dii' }, { th: 'คะ', rom: 'khá' }] }) },
    reply: [
      { th: 'ขอ', rom: 'khǎaw', en: 'may I have' },
      { slot: true },
    ],
    replyEn: (it) => `${it.en.charAt(0).toUpperCase()}${it.en.slice(1)}, please.`,
    slotLabel: 'the drink',
    items: [
      { th: 'กาแฟเย็น', rom: 'gaa-faae yen', en: 'iced coffee', a: 'iced coffee', parts: [{ th: 'กาแฟ', rom: 'gaa-faae', en: 'coffee' }, { th: 'เย็น', rom: 'yen', en: 'iced' }] },
      { th: 'กาแฟร้อน', rom: 'gaa-faae ráawn', en: 'hot coffee', a: 'hot coffee', parts: [{ th: 'กาแฟ', rom: 'gaa-faae', en: 'coffee' }, { th: 'ร้อน', rom: 'ráawn', en: 'hot' }] },
      { th: 'ชาเย็น', rom: 'chaa-yen', en: 'Thai iced tea', a: 'Thai iced tea', parts: [{ th: 'ชา', rom: 'chaa', en: 'Thai tea' }, { th: 'เย็น', rom: 'yen', en: 'iced' }] },
      // Spare
      { th: 'ชาร้อน', rom: 'chaa ráawn', en: 'hot tea', a: 'hot tea', parts: [{ th: 'ชา', rom: 'chaa', en: 'tea' }, { th: 'ร้อน', rom: 'ráawn', en: 'hot' }] },
    ],
    // Sweetness, not size: the question baristas really ask, and no pair of
    // opposites on the same day (Learning Scientist, Jay, 13 Oct). Size moves to day 4.
    followUp: {
      staff: { th: 'หวานปกติไหมคะ', rom: 'wǎan bpòk-gà-dtì mǎi khá', en: 'Normal sweetness?', words: [{ th: 'หวาน', rom: 'wǎan' }, { th: 'ปกติ', rom: 'bpòk-gà-dtì' }, { th: 'ไหม', rom: 'mǎi' }, { th: 'คะ', rom: 'khá' }] },
      answers: [
        { key: 'less', adj: 'less sweet', parts: [{ th: 'หวาน', rom: 'wǎan', en: 'sweet' }, { th: 'น้อย', rom: 'náawi', en: 'less' }], en: 'Less sweet.' },
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
  // Day 4 (22 Oct outline): "Two of everything" at a drinks stall. Order Thai
  // iced tea by the glass (number + แก้ว, the counting word for glasses), swap
  // the number, then the vendor asks the size. One pair of opposites today
  // (ใหญ่ / เล็ก); sweetness was yesterday. Opens with yesterday's coffee order.
  stall: {
    id: 'stall',
    place: 'At a drinks stall',
    plate: { th: 'ร้านน้ำ', rom: 'ráan-náam', en: 'Drinks stall' },
    promise: 'Order two drinks',
    minutes: 3,
    staff: { who: 'The vendor', ask: () => ({ th: 'รับอะไรดีคะ', rom: 'ráp à-rai dii khá', en: 'What would you like?', words: [{ th: 'รับ', rom: 'ráp' }, { th: 'อะไร', rom: 'à-rai' }, { th: 'ดี', rom: 'dii' }, { th: 'คะ', rom: 'khá' }] }) },
    reply: [
      { th: 'ขอ', rom: 'khǎaw', en: 'may I have' },
      { th: 'ชา', rom: 'chaa', en: 'tea' },
      { th: 'เย็น', rom: 'yen', en: 'iced' },
      { slot: true },
      { th: 'แก้ว', rom: 'gâaew', en: 'glasses' },
    ],
    replyEn: (it) => `${it.en.charAt(0).toUpperCase()}${it.en.slice(1)} Thai iced teas, please.`,
    slotLabel: 'the number',
    items: [
      { th: 'สอง', rom: 'sǎawng', en: 'two', a: 'two' },
      { th: 'สาม', rom: 'sǎam', en: 'three', a: 'three' },
      { th: 'สี่', rom: 'sìi', en: 'four', a: 'four' },
    ],
    followUp: {
      // Vendors drop the repeated แก้ว (Thai Teacher, 22 Oct)
      staff: { th: 'ใหญ่หรือเล็กคะ', rom: 'yài rǔue lék khá', en: 'Large or small?', words: [{ th: 'ใหญ่', rom: 'yài' }, { th: 'หรือ', rom: 'rǔue' }, { th: 'เล็ก', rom: 'lék' }, { th: 'คะ', rom: 'khá' }] },
      answers: [
        { key: 'large', adj: 'large', parts: [{ th: 'แก้ว', rom: 'gâaew', en: 'glass' }, { th: 'ใหญ่', rom: 'yài', en: 'large' }], en: 'Large ones.' },
        { key: 'small', adj: 'small', parts: [{ th: 'แก้ว', rom: 'gâaew', en: 'glass' }, { th: 'เล็ก', rom: 'lék', en: 'small' }], en: 'Small ones.' },
      ],
      wrong: 'Medium ones.', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'cafe',
    // The whole order in one line, size before the number: ขอชาเย็นแก้วใหญ่สองแก้วค่ะ
    missionOf: (item, idx, reg) => [
      { th: 'ขอ', rom: 'khǎaw', en: 'may I have' }, { th: 'ชา', rom: 'chaa', en: 'tea' }, { th: 'เย็น', rom: 'yen', en: 'iced' },
      ...SIZE_PARTS(idx), item, { th: 'แก้ว', rom: 'gâaew', en: 'glasses' }, { ...endingFor(reg), ending: true },
    ],
    missionEnOf: (item, idx) => `${item.en.charAt(0).toUpperCase()}${item.en.slice(1)} ${idx === 1 ? 'small' : 'large'} Thai iced teas, please.`,
    mission: 'Next time you buy drinks for you and a friend.',
    tomorrow: 'Ask how much',
    teaser: { title: 'Tomorrow: ask how much', th: 'อันนี้เท่าไหร่', rom: 'an-níi thâo-rài', en: 'How much is this one?', question: true },
  },
  // Day 5: the market. Point and ask the price (the swap is the thing), then the
  // vendor gives a price per kilo and you say how much you'll take. Your line is
  // a question, so women end with คะ (khá), not ค่ะ.
  market: {
    id: 'market',
    place: 'At a market stall',
    plate: { th: 'ตลาด', rom: 'dtà-làat', en: 'Market' },
    promise: 'Ask how much',
    minutes: 3,
    staff: { who: 'The vendor', ask: () => ({ th: 'เลือกได้เลยค่ะ', rom: 'lûeaak dâai loeei khâ', en: 'Pick whatever you like!', words: [{ th: 'เลือก', rom: 'lûeaak' }, { th: 'ได้', rom: 'dâai' }, { th: 'เลย', rom: 'loeei' }, { th: 'ค่ะ', rom: 'khâ' }] }) },
    question: true,
    reply: [
      { slot: true },
      { th: 'เท่าไหร่', rom: 'thâo-rài', en: 'how much' },
    ],
    replyEn: (it) => it.q,
    slotLabel: 'the thing',
    items: [
      { th: 'อันนี้', rom: 'an-níi', en: 'this one', a: 'this one', q: 'How much is this one?' },
      { th: 'มะม่วง', rom: 'má-mûang', en: 'mangoes', a: 'mangoes', q: 'How much are the mangoes?' },
      { th: 'ส้ม', rom: 'sôm', en: 'oranges', a: 'oranges', q: 'How much are the oranges?' },
      { th: 'ทุเรียน', rom: 'thú-riian', en: 'durian', a: 'durian', q: 'How much is the durian?' },
    ],
    followUp: {
      staff: { th: 'กิโลละห้าสิบบาทค่ะ', rom: 'gì-loo lá hâa-sìp bàat khâ', en: 'Fifty baht a kilo.', words: [{ th: 'กิโล', rom: 'gì-loo' }, { th: 'ละ', rom: 'lá' }, { th: 'ห้าสิบ', rom: 'hâa-sìp' }, { th: 'บาท', rom: 'bàat' }, { th: 'ค่ะ', rom: 'khâ' }] },
      answers: [
        // Spoken Thai: เอากิโลนึง, not the textbook เอาหนึ่งกิโล (Thai Teacher, 22 Oct)
        { key: 'one', adj: 'a kilo', parts: [{ th: 'เอา', rom: 'ao', en: 'take' }, { th: 'กิโล', rom: 'gì-loo', en: 'kilo' }, { th: 'นึง', rom: 'nueng', en: 'one' }], en: "I'll take a kilo." },
        { key: 'half', adj: 'half a kilo', parts: [{ th: 'เอา', rom: 'ao', en: 'take' }, { th: 'ครึ่ง', rom: 'khrûeng', en: 'half' }, { th: 'กิโล', rom: 'gì-loo', en: 'kilo' }], en: "I'll take half a kilo." },
      ],
      wrong: 'Too expensive.', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'stall',
    // The line to use for real: point at anything and ask
    missionOf: (item, idx, reg) => replyParts(SCENES.market, SCENES.market.items[0], reg),
    missionEnOf: () => 'How much is this one?',
    mission: 'Next time you see something without a price, point and ask.',
    tomorrow: "When you don't catch it",
    teaser: { title: "Tomorrow: when you don't catch it", th: 'พูดช้าๆหน่อยได้ไหม', rom: 'phûut cháa-cháa nàawi dâai mǎi', en: 'Could you say it a bit slower?', question: true },
  },
  // Day 6: when you're stuck (merges "I don't understand", "say it slowly" and
  // "can you speak English?"). The cashier asks the question expats never catch,
  // you ask her to say it slowly / again / in English, then you answer it.
  stuck: {
    id: 'stuck',
    place: 'At the 7-Eleven counter',
    plate: { th: 'เซเว่น', rom: 'see-wên', en: '7-Eleven' },
    promise: "When you don't catch it",
    minutes: 2,
    // What cashiers really say, fast (Thai Teacher, 22 Oct)
    staff: { who: 'The cashier', ask: () => ({ th: 'สะสมแต้มไหมคะ', rom: 'sà-sǒm dtâaem mǎi khá', en: 'Collecting points?', words: [{ th: 'สะสม', rom: 'sà-sǒm' }, { th: 'แต้ม', rom: 'dtâaem' }, { th: 'ไหม', rom: 'mǎi' }, { th: 'คะ', rom: 'khá' }] }) },
    question: true,
    reply: [
      { slot: true },
      { th: 'ได้ไหม', rom: 'dâai mǎi', en: 'can you?' },
    ],
    replyEn: (it) => `Could you ${it.en}?`,
    slotLabel: 'what you ask for',
    items: [
      // หน่อย softens it: พูดช้าๆ on its own sounds like an order (Thai Teacher)
      { th: 'พูดช้าๆหน่อย', rom: 'phûut cháa-cháa nàawi', en: 'say it a bit slower', a: 'say it a bit slower', parts: [{ th: 'พูด', rom: 'phûut', en: 'speak' }, { th: 'ช้าๆหน่อย', rom: 'cháa-cháa nàawi', en: 'a bit slower' }] },
      { th: 'พูดอีกที', rom: 'phûut ìik thii', en: 'say it again', a: 'say it again', parts: [{ th: 'พูด', rom: 'phûut', en: 'speak' }, { th: 'อีกที', rom: 'ìik thii', en: 'again' }] },
      { th: 'พูดภาษาอังกฤษ', rom: 'phûut phaa-sǎa ang-grìt', en: 'speak English', a: 'speak English', parts: [{ th: 'พูด', rom: 'phûut', en: 'speak' }, { th: 'ภาษาอังกฤษ', rom: 'phaa-sǎa ang-grìt', en: 'English' }] },
    ],
    followUp: {
      staff: { th: 'มีบัตรไหมคะ', rom: 'mii bàt mǎi khá', en: 'Do you have a card?', words: [{ th: 'มี', rom: 'mii' }, { th: 'บัตร', rom: 'bàt' }, { th: 'ไหม', rom: 'mǎi' }, { th: 'คะ', rom: 'khá' }] },
      answers: [
        { key: 'no', adj: "don't have one", parts: [{ th: 'ไม่', rom: 'mâi', en: 'not' }, { th: 'มี', rom: 'mii', en: 'have' }], en: "No, I don't." },
        { key: 'yes', adj: 'have one', parts: [{ th: 'มี', rom: 'mii', en: 'have' }], en: 'Yes, I do.' },
      ],
      wrong: 'No bag, thanks.', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'market',
    missionOf: (item, idx, reg) => replyParts(SCENES.stuck, SCENES.stuck.items[0], reg),
    missionEnOf: () => 'Could you say it a bit slower?',
    mission: 'Next time someone talks too fast for you.',
    tomorrow: 'Find the bathroom',
    teaser: { title: 'Tomorrow: find the bathroom', th: 'ห้องน้ำอยู่ไหน', rom: 'hâawng-náam yùu nǎi', en: 'Where is the bathroom?', question: true },
  },
  // Day 7: where is ___? Ask staff in a mall, swap the place, follow the
  // directions, then check back ("Left, right?") or say thank you.
  where: {
    id: 'where',
    place: 'At a shopping mall',
    plate: { th: 'ห้าง', rom: 'hâang', en: 'Shopping mall' },
    promise: 'Find the bathroom',
    minutes: 3,
    staff: { who: 'The staff member', ask: () => ({ th: 'มีอะไรให้ช่วยไหมคะ', rom: 'mii à-rai hâi chûaai mǎi khá', en: 'Can I help you?', words: [{ th: 'มี', rom: 'mii' }, { th: 'อะไร', rom: 'à-rai' }, { th: 'ให้', rom: 'hâi' }, { th: 'ช่วย', rom: 'chûaai' }, { th: 'ไหม', rom: 'mǎi' }, { th: 'คะ', rom: 'khá' }] }) },
    question: true,
    reply: [
      { slot: true },
      { th: 'อยู่', rom: 'yùu', en: 'is (at)' },
      { th: 'ไหน', rom: 'nǎi', en: 'where' },
    ],
    replyEn: (it) => `Where is the ${it.en}?`,
    slotLabel: 'the place',
    items: [
      { th: 'ห้องน้ำ', rom: 'hâawng-náam', en: 'bathroom', a: 'the bathroom' },
      { th: 'ลิฟต์', rom: 'líp', en: 'lift', a: 'the lift' },
      { th: 'ทางออก', rom: 'thaang-àawk', en: 'exit', a: 'the exit' },
      { th: 'ร้านขายยา', rom: 'ráan-khǎai-yaa', en: 'pharmacy', a: 'the pharmacy' },
    ],
    followUp: {
      staff: { th: 'เดินตรงไปแล้วเลี้ยวซ้ายค่ะ', rom: 'doeen dtrong-bpai láaeo líaao sáai khâ', en: 'Walk straight, then turn left.', words: [{ th: 'เดิน', rom: 'doeen' }, { th: 'ตรงไป', rom: 'dtrong-bpai' }, { th: 'แล้ว', rom: 'láaeo' }, { th: 'เลี้ยว', rom: 'líaao' }, { th: 'ซ้าย', rom: 'sáai' }, { th: 'ค่ะ', rom: 'khâ' }] },
      answers: [
        { key: 'check', adj: 'check', question: true, parts: [{ th: 'ซ้าย', rom: 'sáai', en: 'left' }, { th: 'ใช่', rom: 'châi', en: 'correct' }, { th: 'ไหม', rom: 'mǎi', en: '(question)' }], en: 'Left, is that right?' },
        { key: 'thanks', adj: 'thanks', parts: [{ th: 'ขอบคุณ', rom: 'khàawp-khun', en: 'thank you' }], en: 'Thank you.' },
      ],
      wrong: 'Turn right.', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'stuck',
    missionOf: (item, idx, reg) => replyParts(SCENES.where, SCENES.where.items[0], reg),
    missionEnOf: () => 'Where is the bathroom?',
    mission: 'Next time you need the bathroom in a mall or a café.',
    tomorrow: 'Get home by motorbike taxi',
    teaser: { title: 'Tomorrow: get home by motorbike taxi', th: 'ไปซอยสิบเอ็ด', rom: 'bpai saawy sìp-èt', en: 'To Soi 11, please.' },
  },
  // Day 8: the motorbike taxi stand. Say where you're going (your soi), then where
  // to stop. The driver is a man, so his lines end with ครับ and use the male voice.
  taxi: {
    id: 'taxi',
    place: 'At the motorbike taxi stand',
    plate: { th: 'วินมอเตอร์ไซค์', rom: 'win maaw-dtoe-sai', en: 'Motorbike taxi' },
    promise: 'Get home by motorbike taxi',
    minutes: 2,
    staffVoice: 'male',
    staff: { who: 'The driver', ask: () => ({ th: 'ไปไหนครับ', rom: 'bpai nǎi khráp', en: 'Where to?', words: [{ th: 'ไป', rom: 'bpai' }, { th: 'ไหน', rom: 'nǎi' }, { th: 'ครับ', rom: 'khráp' }] }) },
    reply: [
      { th: 'ไป', rom: 'bpai', en: 'go (to)' },
      { slot: true },
    ],
    replyEn: (it) => `To ${it.en}, please.`,
    slotLabel: 'the place',
    items: [
      { th: 'ซอยสิบเอ็ด', rom: 'saawy sìp-èt', en: 'Soi 11', a: 'Soi 11', parts: [{ th: 'ซอย', rom: 'saawy', en: 'soi (lane)' }, { th: 'สิบเอ็ด', rom: 'sìp-èt', en: 'eleven' }] },
      { th: 'ซอยยี่สิบ', rom: 'saawy yîi-sìp', en: 'Soi 20', a: 'Soi 20', parts: [{ th: 'ซอย', rom: 'saawy', en: 'soi (lane)' }, { th: 'ยี่สิบ', rom: 'yîi-sìp', en: 'twenty' }] },
      { th: 'ปากซอย', rom: 'bpàak saawy', en: 'the soi entrance', a: 'the soi entrance', parts: [{ th: 'ปาก', rom: 'bpàak', en: 'mouth (of)' }, { th: 'ซอย', rom: 'saawy', en: 'soi (lane)' }] },
    ],
    followUp: {
      staff: { th: 'จอดตรงไหนครับ', rom: 'jàawt dtrong nǎi khráp', en: 'Where do I stop?', words: [{ th: 'จอด', rom: 'jàawt' }, { th: 'ตรง', rom: 'dtrong' }, { th: 'ไหน', rom: 'nǎi' }, { th: 'ครับ', rom: 'khráp' }] },
      answers: [
        { key: 'here', adj: 'stop here', parts: [{ th: 'จอด', rom: 'jàawt', en: 'stop' }, { th: 'ตรงนี้', rom: 'dtrong-níi', en: 'right here' }], en: 'Stop right here.' },
        { key: 'ahead', adj: 'up ahead', parts: [{ th: 'จอด', rom: 'jàawt', en: 'stop' }, { th: 'ข้างหน้า', rom: 'khâang-nâa', en: 'up ahead' }], en: 'Stop up ahead.' },
      ],
      wrong: 'Turn left.', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'where',
    // Say your own soi: the one you swapped to last
    missionOf: (item, idx, reg) => replyParts(SCENES.taxi, item, reg),
    missionEnOf: (item) => `To ${item.en}, please.`,
    mission: 'On your next ride home, say your soi.',
    tomorrow: 'Small talk with a neighbour',
    teaser: { title: 'Tomorrow: small talk with a neighbour', th: 'มาจากแคนาดา', rom: 'maa jàak khaae-naa-daa', en: "I'm from Canada." },
  },
  // Day 9: small talk (merges "where are you from?" and "have you eaten yet?").
  // กินข้าวหรือยัง is a greeting, like "how's it going?", not an invitation.
  smalltalk: {
    id: 'smalltalk',
    place: 'In the condo lobby',
    plate: { th: 'คอนโด', rom: 'khaawn-doo', en: 'Condo' },
    promise: 'Small talk with a neighbour',
    minutes: 2,
    // มาจากไหน can mean "where have you just been?" in a lobby: ask the country (Thai Teacher)
    staff: { who: 'Your neighbour', ask: () => ({ th: 'มาจากประเทศอะไรคะ', rom: 'maa jàak bprà-thêet à-rai khá', en: 'Which country are you from?', words: [{ th: 'มา', rom: 'maa' }, { th: 'จาก', rom: 'jàak' }, { th: 'ประเทศ', rom: 'bprà-thêet' }, { th: 'อะไร', rom: 'à-rai' }, { th: 'คะ', rom: 'khá' }] }) },
    reply: [
      { th: 'มา', rom: 'maa', en: 'come' },
      { th: 'จาก', rom: 'jàak', en: 'from' },
      { slot: true },
    ],
    replyEn: (it) => `I'm from ${it.en}.`,
    slotLabel: 'the country',
    items: [
      { th: 'แคนาดา', rom: 'khaae-naa-daa', en: 'Canada', a: 'Canada', name: true },
      { th: 'อเมริกา', rom: 'à-mee-rí-gaa', en: 'America', a: 'America', name: true },
      { th: 'อังกฤษ', rom: 'ang-grìt', en: 'England', a: 'England', name: true },
      { th: 'ออสเตรเลีย', rom: 'àawt-sà-dtree-liia', en: 'Australia', a: 'Australia', name: true },
    ],
    followUp: {
      staff: { th: 'กินข้าวหรือยังคะ', rom: 'gin khâao rǔue yang khá', en: 'Have you eaten yet?', words: [{ th: 'กิน', rom: 'gin' }, { th: 'ข้าว', rom: 'khâao' }, { th: 'หรือ', rom: 'rǔue' }, { th: 'ยัง', rom: 'yang' }, { th: 'คะ', rom: 'khá' }] },
      answers: [
        { key: 'yes', adj: 'eaten', parts: [{ th: 'กิน', rom: 'gin', en: 'eat' }, { th: 'แล้ว', rom: 'láaeo', en: 'already' }], en: 'Yes, I have.' },
        { key: 'notyet', adj: 'not yet', parts: [{ th: 'ยัง', rom: 'yang', en: 'not yet' }, { th: 'เลย', rom: 'loeei', en: '(at all)' }], en: 'Not yet.' },
      ],
      wrong: "I'm from Canada.", // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'taxi',
    missionOf: (item, idx, reg) => replyParts(SCENES.smalltalk, item, reg),
    missionEnOf: (item) => `I'm from ${item.en}.`,
    mission: 'Next time someone asks where you are from. Taxi drivers always do.',
    tomorrow: 'Bargain at the weekend market',
    teaser: { title: 'Tomorrow: bargain at the weekend market', th: 'ร้อยยี่สิบได้ไหม', rom: 'ráawi yîi-sìp dâai mǎi', en: 'Can you do 120?', question: true },
  },
  // Day 10: market level 2, bargaining. Only where it's normal (weekend markets,
  // clothes and souvenir stalls), never at 7-Eleven, malls or street food (Thai Teacher).
  bargain: {
    id: 'bargain',
    place: 'At the weekend market',
    plate: { th: 'ตลาดนัด', rom: 'dtà-làat-nát', en: 'Weekend market' },
    promise: 'Bargain at the weekend market',
    minutes: 3,
    staff: { who: 'The vendor', ask: () => ({ th: 'ตัวนี้ร้อยห้าสิบค่ะ', rom: 'dtuaa níi ráawi hâa-sìp khâ', en: 'This one is 150.', verb: 'says', words: [{ th: 'ตัว', rom: 'dtuaa' }, { th: 'นี้', rom: 'níi' }, { th: 'ร้อย', rom: 'ráawi' }, { th: 'ห้าสิบ', rom: 'hâa-sìp' }, { th: 'ค่ะ', rom: 'khâ' }] }) },
    question: true,
    reply: [
      { slot: true },
      { th: 'ได้ไหม', rom: 'dâai mǎi', en: 'can you?' },
    ],
    replyEn: (it) => `Can you do ${it.en}?`,
    slotLabel: 'your price',
    items: [
      // Every offer is below her 130, so her answer always makes sense (Thai Teacher)
      { th: 'ร้อยยี่สิบ', rom: 'ráawi yîi-sìp', en: '120', a: '120', parts: [{ th: 'ร้อย', rom: 'ráawi', en: 'hundred' }, { th: 'ยี่สิบ', rom: 'yîi-sìp', en: 'twenty' }] },
      { th: 'ร้อยสิบ', rom: 'ráawi sìp', en: '110', a: '110', parts: [{ th: 'ร้อย', rom: 'ráawi', en: 'hundred' }, { th: 'สิบ', rom: 'sìp', en: 'ten' }] },
      { th: 'หนึ่งร้อย', rom: 'nùeng ráawi', en: '100', a: '100', parts: [{ th: 'หนึ่ง', rom: 'nùeng', en: 'one' }, { th: 'ร้อย', rom: 'ráawi', en: 'hundred' }] },
    ],
    followUp: {
      staff: { th: 'ร้อยสามสิบก็แล้วกันค่ะ', rom: 'ráawi sǎam-sìp gâaw láaeo gan khâ', en: "Let's say 130.", verb: 'says', words: [{ th: 'ร้อย', rom: 'ráawi' }, { th: 'สามสิบ', rom: 'sǎam-sìp' }, { th: 'ก็', rom: 'gâaw' }, { th: 'แล้วกัน', rom: 'láaeo gan' }, { th: 'ค่ะ', rom: 'khâ' }] },
      answers: [
        { key: 'deal', adj: 'deal', parts: [{ th: 'ตกลง', rom: 'dtòk-long', en: 'deal / OK' }], en: 'Deal.' },
        { key: 'no', adj: 'no thanks', parts: [{ th: 'ไม่เป็นไร', rom: 'mâi-bpen-rai', en: 'never mind' }], en: 'Never mind, thanks.' },
      ],
      wrong: 'How much is this one?', // a listening option only
    },
    listen: ['reply', 'spice', 'reply'],
    recall: 'smalltalk',
    missionOf: (item, idx, reg) => replyParts(SCENES.bargain, item, reg),
    missionEnOf: (item) => `Can you do ${item.en}?`,
    mission: 'At a weekend market or clothes stall, with a smile. Never at 7-Eleven, malls or street food.',
    tomorrow: 'New words and a sentence pattern',
    teaser: { title: 'Tomorrow: new words and a sentence pattern', th: 'ชอบกินส้มตำ', rom: 'châawp gin sôm-dtam', en: 'I like eating som tam.' },
  },
};
const SIZE_PARTS = (idx) => (idx === 1
  ? [{ th: 'แก้ว', rom: 'gâaew', en: 'glass' }, { th: 'เล็ก', rom: 'lék', en: 'small' }]
  : [{ th: 'แก้ว', rom: 'gâaew', en: 'glass' }, { th: 'ใหญ่', rom: 'yài', en: 'large' }]);

export const DEFAULT_SCENE = '7eleven';

// One new lesson a day, in this order, after the first session (7-Eleven)
export const SCENE_DAYS = ['restaurant', 'cafe', 'stall', 'market', 'stuck', 'where', 'taxi', 'smalltalk', 'bargain'];

// Where the learner is in the daily lessons. One answer for every screen, so
// Today and the Word library never disagree ("one finish line a day").
//   firstSession: { scene, day } or null; scenesDone: { id: day }; today: "2026-10-23"
export function lessonState(firstSession, scenesDone = {}, today) {
  const doneToday = !!firstSession && (firstSession.day === today || Object.values(scenesDone).includes(today));
  const nextId = SCENE_DAYS.find((id) => !scenesDone[id]) || null;
  return { doneToday, nextId };
}

// The "Tomorrow:" line after today's lesson, the same on Today and in the Word library
export const tomorrowLine = (next) => (next ? `${next.promise}, about ${next.minutes} minutes.` : 'a review day. New lessons arrive every week.');

const ENDING = {
  male: { th: 'ครับ', rom: 'khráp', en: 'polite ending (men)' },
  female: { th: 'ค่ะ', rom: 'khâ', en: 'polite ending (women)' },
  // Women end a question with คะ (high tone), a statement with ค่ะ (Thai Teacher)
  femaleQ: { th: 'คะ', rom: 'khá', en: 'polite ending (women, question)' },
};
export const endingFor = (reg, question = false) => (reg === 'male' ? ENDING.male : question ? ENDING.femaleQ : ENDING.female);

// The reply as word pieces, in the learner's register
export function replyParts(scene, item, reg) {
  return [
    ...scene.reply.flatMap((p) => (p.slot ? (item.parts ? item.parts.map((x) => ({ ...x, slot: true })) : [{ ...item, slot: true }]) : [p])),
    { ...endingFor(reg, scene.question), ending: true },
  ];
}
// The spice answer (or other follow-up) as word pieces, in the learner's register
export function followParts(scene, idx, reg) {
  const a = scene.followUp.answers[idx];
  return [...a.parts, { ...endingFor(reg, a.question), ending: true }];
}
// The line the mission asks you to say for real
export function missionParts(scene, reg, idx = 0, item = scene.items[0]) {
  if (scene.missionOf) return scene.missionOf(item, idx, reg);
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
    for (const reg of ['male', 'female']) { out.add(s.teaser.th + endingFor(reg, s.teaser.question).th); if (s.alsoHeard) out.add(s.alsoHeard.th + endingFor(reg).th); }
    if (s.followUp) {
      out.add(s.followUp.staff.th);
      if (s.next) out.add(s.next.th);
      s.followUp.answers.forEach((a, i) => {
        for (const p of a.parts) out.add(p.th);
        for (const reg of ['male', 'female']) out.add(joinTh(followParts(s, i, reg)));
        if (s.missionFull || s.missionOf) for (const it of s.items) for (const reg of ['male', 'female']) out.add(joinTh(missionParts(s, reg, i, it)));
      });
    }
    out.add(s.teaser.th);
  }
  cache = out;
  return out;
}
