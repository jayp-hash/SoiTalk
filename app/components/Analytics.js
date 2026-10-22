'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track, listenForErrors } from '../lib/analytics';

// Logs a page view on every page change, and starts the error log
export default function Analytics() {
  const path = usePathname();
  useEffect(() => { listenForErrors(); }, []);
  useEffect(() => { track('$pageview'); }, [path]);
  return null;
}
