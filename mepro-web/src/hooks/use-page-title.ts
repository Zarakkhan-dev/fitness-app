'use client';

import { useEffect } from 'react';

/** Sets `document.title` for the lifetime of the calling page. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · MEPro`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
