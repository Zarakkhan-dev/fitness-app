/**
 * Token persistence for the browser.
 *
 * The API hands out an access/refresh pair in the response body and accepts the
 * refresh token back in the body, so the web client owns storage the same way
 * the mobile client does. localStorage is used deliberately: it is synchronous,
 * survives reloads, and the refresh token is rotated on every use, so a stolen
 * value is short lived. Anything that must never leave the process belongs on
 * the server, not here.
 */

import type { Tokens } from '@/lib/types';

const STORAGE_KEY = 'mepro.auth.tokens';

function isTokens(value: unknown): value is Tokens {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Tokens>;
  return typeof candidate.accessToken === 'string' && typeof candidate.refreshToken === 'string';
}

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory fallback for tests and non-browser contexts. */
export function createMemoryTokenStore(initial: Tokens | null = null): TokenStore {
  let current = initial;
  return {
    async get() {
      return current;
    },
    async set(tokens) {
      current = tokens;
    },
    async clear() {
      current = null;
    },
  };
}

const webStore: TokenStore = {
  async get() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isTokens(parsed)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      // A corrupt entry must not block sign-in.
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  async set(tokens) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  },
  async clear() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

let store: TokenStore = webStore;

/** Replaces the active store; used by tests. */
export function setTokenStore(next: TokenStore): void {
  store = next;
}

export function getTokenStore(): TokenStore {
  return store;
}
