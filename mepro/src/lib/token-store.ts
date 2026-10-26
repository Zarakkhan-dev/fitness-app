/**
 * Token persistence.
 *
 * Tokens go in the platform keystore (Keychain on iOS, the Android Keystore via
 * `expo-secure-store`). `expo-secure-store` has no web implementation, so the
 * web build falls back to AsyncStorage, which is an ordinary store and is only
 * used when running the app in a browser.
 *
 * The interface exists so the API client and the auth provider can be tested
 * without touching either native module.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Tokens } from '@/lib/types';

const STORAGE_KEY = 'mepro.auth.tokens';

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

function isUsable(value: unknown): value is Tokens {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Tokens>;
  return typeof candidate.accessToken === 'string' && typeof candidate.refreshToken === 'string';
}

/**
 * Keystore-backed store for iOS and Android.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the tokens off backups and out of the
 * keychain after a restore to a different handset.
 */
export const secureTokenStore: TokenStore = {
  async get() {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isUsable(parsed) ? parsed : null;
    } catch {
      // A corrupt value is not recoverable; drop it rather than failing boot.
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      return null;
    }
  },

  async set(tokens) {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async clear() {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
};

/** Browser fallback: SecureStore is unavailable on web. */
export const webTokenStore: TokenStore = {
  async get() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isUsable(parsed) ? parsed : null;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  async set(tokens) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

/** In-memory store, used when neither native option is available. */
export function createMemoryTokenStore(): TokenStore {
  let current: Tokens | null = null;
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

let store: TokenStore = Platform.OS === 'web' ? webTokenStore : secureTokenStore;

/** Swaps the backing store. Used by tests. */
export function setTokenStore(next: TokenStore): void {
  store = next;
}

export function getTokenStore(): TokenStore {
  return store;
}
