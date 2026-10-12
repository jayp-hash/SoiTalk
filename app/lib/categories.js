// The 13 word categories (12 + Useful phrases) and their colours.
//
// The NAMES must match the "Category" dropdown in the curriculum workbook
// (Vocabulary tab, list kept on the "Lists" tab). To rename a category,
// change it in both places, then re-run the import.
//
// color = the card's band and play button; edge = the darker "3D" edge
// under buttons. Picked so all 12 are easy to tell apart.
export const CATEGORIES = {
  'People & animals':   { color: '#E8604C', edge: '#B8442F' },
  'Food & drink':       { color: '#F08A1C', edge: '#B9640A' },
  'Time & dates':       { color: '#2B86E8', edge: '#1D62AE' },
  'Places & position':  { color: '#21A867', edge: '#16794A' },
  'Actions':            { color: '#8B5CF6', edge: '#6439C9' },
  'Describing words':   { color: '#E2488F', edge: '#AE2F6A' },
  'Numbers & counting': { color: '#11A79A', edge: '#0B7A70' },
  'Question words':     { color: '#D9A400', edge: '#A07800' },
  'Grammar words':      { color: '#4F5BD5', edge: '#353FA6' },
  'Things & objects':   { color: '#B0743F', edge: '#82532A' },
  'Body & health':      { color: '#E04848', edge: '#AA2E2E' },
  'Work & society':     { color: '#5F6B80', edge: '#434C5C' },
  // Whole phrases taught as one card (survival phrase pack)
  'Useful phrases':     { color: '#1B2A4A', edge: '#0E1730' },
};

// Words with no category (or a misspelled one) get a neutral band.
const FALLBACK = { color: '#5F6B80', edge: '#434C5C' };

export function categoryFor(name) {
  const c = CATEGORIES[name];
  return { name: c ? name : 'Vocabulary', ...(c || FALLBACK) };
}

// Topics grouped by when a learner needs them (topic page and menu).
export const TOPIC_GROUPS = [
  { label: 'Start here', names: ['Useful phrases', 'Question words', 'Numbers & counting', 'Food & drink', 'Places & position', 'Time & dates', 'People & animals'] },
  { label: 'Building blocks', names: ['Actions', 'Describing words', 'Things & objects', 'Body & health', 'Grammar words'] },
  { label: 'Formal Thai', names: ['Work & society'] },
];

// One plain line per topic for the topic page
export const TOPIC_BLURB = {
  'Useful phrases': 'Hello, thank you, sorry and the lines you need on day one.',
  'Question words': 'What, where, how much and when.',
  'Numbers & counting': 'Prices, times and counting words.',
  'Food & drink': 'Order at a stall, a café or a restaurant.',
  'Places & position': 'Getting around, directions and where things are.',
  'Time & dates': 'Days, times and when things happen.',
  'People & animals': 'Family, friends, people around you, pets.',
  'Actions': 'The verbs you use every day.',
  'Describing words': 'Hot, cheap, far, delicious and more.',
  'Things & objects': 'Everyday things at home and out.',
  'Body & health': 'The body, feeling sick, the pharmacy.',
  'Grammar words': 'The small words that hold sentences together.',
  'Work & society': 'Work, news and formal Thai. Save these for later.',
};
