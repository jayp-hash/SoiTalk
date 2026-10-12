// One simple line icon per topic (24px grid, 2px stroke, round ends), drawn for Soi Talk.
const PATHS = {
  'Useful phrases': <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
  'Question words': <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" /><path d="M12 17h.01" /></>,
  'Numbers & counting': <><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></>,
  'Food & drink': <><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3" /></>,
  'Places & position': <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  'Time & dates': <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  'People & animals': <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9.5" r="2.4" /><path d="M16 14.5a4.5 4.5 0 0 1 5 5.5" /></>,
  'Actions': <><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></>,
  'Describing words': <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16v4M17 18h4" /></>,
  'Things & objects': <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>,
  'Body & health': <><path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.3C20 15.4 12 20 12 20z" /><path d="M7 12.5h3l1.5-2.5 2 4 1.5-1.5h2" /></>,
  'Grammar words': <><path d="M9.5 14.5 14.5 9.5" /><path d="M11 7l1.5-1.5a3.5 3.5 0 0 1 5 5L16 12M13 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 12" /></>,
  'Work & society': <><rect x="3" y="7.5" width="18" height="12" rx="2" /><path d="M8.5 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2M3 13h18" /></>,
};

export default function TopicIcon({ name, size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] || <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
