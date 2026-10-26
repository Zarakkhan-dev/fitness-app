'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

type ThemeChoice = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'mepro.theme';

interface ThemeContextValue {
  /** What the user chose, including "follow the system". */
  theme: ThemeChoice;
  /** What is actually painted right now. */
  resolved: ResolvedTheme;
  setTheme: (next: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* The choice lives in localStorage; these module-level listeners let every
 * subscriber react to changes from this tab or another one, which is what
 * useSyncExternalStore expects of an external store. */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* storage unavailable; fall back to the system setting */
  }
  return 'system';
}

const readSystem = () => systemTheme();
const readServerChoice = (): ThemeChoice => 'system';
const readServerSystem = (): ResolvedTheme => 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readChoice, readServerChoice);
  const system = useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    readSystem,
    readServerSystem,
  );

  const resolved: ResolvedTheme = theme === 'system' ? system : theme;

  // Keep the DOM attribute in sync. The inline script in the root layout has
  // already painted the right value before hydration, so this never flashes.
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      /* private mode: the choice still applies for this visit via emit() */
    }
    emit();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolved,
      setTheme,
      toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [theme, resolved, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
