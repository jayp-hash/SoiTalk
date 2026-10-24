import Classifiers from './Classifiers';
import './classifiers.css';

export const metadata = { title: 'Classifiers · Soi Talk' };

// Classifiers: learn the 10 you'll use this week, then practise them
export default function ClassifiersPage() {
  return (
    <main className="page">
      <Classifiers />
    </main>
  );
}
