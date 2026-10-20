import Patterns from './Simple';
import { loadWords } from '../lib/words';
import { ProgressProvider } from '../lib/progress';

export const revalidate = 3600;
export const metadata = { title: 'Sentence patterns · Soi Talk' };

// Sentence patterns: build real sentences from words you've already met
export default async function PatternsPage() {
  const words = await loadWords();
  // Only what the patterns need: romanization and meaning per Thai word
  const lex = Object.fromEntries(words.map((w) => [w.thai, { rom: w.romanization, en: w.english }]));
  return (
    <main className="page">
      <ProgressProvider>
        <Patterns lex={lex} />
      </ProgressProvider>
    </main>
  );
}
