import Deck from './Deck';
import { loadWords } from '../lib/words';
import { ProgressProvider } from '../lib/progress';

// Re-check the database at most once an hour. So after you re-run the
// import script, the live site picks up the changes within the hour —
// no redeploy needed. (Without this, Next.js would freeze the word list
// at whatever it was on the day the site was built.)
export const revalidate = 3600;

export default async function VocabularyPage() {
  // If the database can't be reached, this throws on purpose: on the live
  // site Next.js then keeps showing the last good version of the page
  // instead of caching an error message for an hour.
  const words = await loadWords();

  return (
    <main className="page">
      {/* Compact title, so the whole card fits on screen without scrolling */}
      {/* The header already says Vocabulary; the title stays for screen readers only */}
      <h1 className="sr-only">Vocabulary flashcards, most useful first</h1>

      <ProgressProvider>
        <Deck words={words} />
      </ProgressProvider>
    </main>
  );
}
