import Today from './Today';
import { loadWords, coverageCurve } from '../lib/words';
import { ProgressProvider } from '../lib/progress';

export const revalidate = 3600;
export const metadata = { title: 'Today · Soi Talk' };

// The daily session: words due for review plus a few new ones.
export default async function TodayPage() {
  const words = await loadWords();
  // Street-meter milestones: everyday Thai understood after this many words
  const milestones = coverageCurve(words, [50, 120, 300, 500, words.length]);
  return (
    <main className="page">
      <ProgressProvider>
        <Today words={words} milestones={milestones} />
      </ProgressProvider>
    </main>
  );
}
