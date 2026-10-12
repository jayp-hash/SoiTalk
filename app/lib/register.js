// ---------------------------------------------------------------------
// Speaking as a man or a woman (chosen once, at the start; changeable in Aa).
//
// The course stores one neutral version of every sentence (ฉัน for "I",
// no polite ending). The learner sees and hears it in their own register,
// following claude/gender-register-rules.md:
//   - man:   ฉัน -> ผม, and every sentence ends with ครับ
//   - woman: ฉัน stays, statements end with ค่ะ, questions with คะ
// The same choice picks the voice (woman = Amy, man = Chris).
// One form everywhere: never "ครับ/ค่ะ".
// ---------------------------------------------------------------------
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

const HELP_KEY = 'tsc-help';
const CHOSEN_KEY = 'tsc-register-chosen';

export const getRegister = () => (readStore(HELP_KEY, {}).voice === 'male' ? 'male' : 'female');
export const registerChosen = () => !!readStore(CHOSEN_KEY, false);
export function setRegister(reg) {
  writeStore(HELP_KEY, { ...readStore(HELP_KEY, {}), voice: reg === 'male' ? 'male' : 'female' });
  writeStore(CHOSEN_KEY, true);
}

const ENDINGS = /(ครับ|ค่ะ|คะ)$/;
const QUESTION = /(ไหม|มั้ย|หรือ(เปล่า)?|หรือยัง|ใคร|อะไร|ที่ไหน|ไหน|เมื่อไหร่|เท่าไหร่|ยังไง|อย่างไร|ทำไม|กี่\S*)$/;
export const isQuestion = (thai, type) => (type ? type === 'Question' : QUESTION.test(thai.trim()) || /\?$/.test(thai.trim()));

export const particleFor = (reg, question) =>
  reg === 'male' ? { th: 'ครับ', rom: 'khráp', en: 'polite ending (men)' }
    : question ? { th: 'คะ', rom: 'khá', en: 'polite ending (women, questions)' }
      : { th: 'ค่ะ', rom: 'khâ', en: 'polite ending (women)' };

const ME = { th: 'ผม', rom: 'phǒm', en: 'I (men)' };

// A sentence { thai, romanization, words? } in the learner's register.
// type: 'Statement' | 'Question' (from the workbook) or left out to guess from the Thai.
export function renderSentence(s, reg = getRegister(), type) {
  if (!s?.thai) return s;
  const male = reg === 'male';
  const hasEnding = ENDINGS.test(s.thai.trim());
  const p = particleFor(reg, isQuestion(s.thai, type || s.sentence_type));
  const swap = (t) => (male ? t.replace(/ฉัน/g, ME.th) : t);
  const swapRom = (r) => (male ? r.replace(/\bchǎn\b/g, ME.rom) : r);
  const thai = swap(s.thai) + (hasEnding ? '' : p.th);
  const romanization = s.romanization ? swapRom(s.romanization) + (hasEnding ? '' : ` ${p.rom}`) : s.romanization;
  const words = s.words
    ? [...s.words.map((w) => (male && w.th === 'ฉัน' ? { ...w, th: ME.th, rom: ME.rom } : w)), ...(hasEnding ? [] : [{ th: p.th, rom: p.rom, en: p.en, ending: true }])]
    : s.words;
  return { ...s, thai, romanization, words };
}

// For /api/speak: turn a rendered sentence back into its neutral stored form(s)
export function neutralForms(text) {
  const out = new Set([text]);
  const bare = text.replace(ENDINGS, '');
  out.add(bare);
  for (const t of [text, bare]) if (t.includes('ผม')) out.add(t.replace(/ผม/g, 'ฉัน'));
  return [...out].filter(Boolean);
}
