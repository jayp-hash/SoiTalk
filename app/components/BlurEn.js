'use client';
import { useEffect, useState } from 'react';
import { readStore } from '../lib/progress';

// The "English sentence: Blur" setting (Aa on the word cards) applies
// everywhere a Thai sentence shows its English (Jay, 21 Oct). Blurred until
// tapped; a new sentence starts blurred again. "Auto" only blurs on the word
// cards (where it follows how well you know the card); elsewhere it shows.
// Quiz answers are never blurred: they are the answer.
export function useEnglishBlur() {
  const [blur, setBlur] = useState(false);
  useEffect(() => { setBlur(readStore('tsc-help', {}).english === 'tap'); }, []);
  return blur;
}

export default function BlurEn({ text, as: Tag = 'p', className = '' }) {
  const blur = useEnglishBlur();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [text]);
  if (!blur || open || !text || text === ' ') return <Tag className={className}>{text}</Tag>;
  return (
    <Tag className={className}>
      <button type="button" className="blur-en" aria-label="Show the English" title="Tap to show the English"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <span aria-hidden="true">{text}</span>
      </button>
    </Tag>
  );
}
