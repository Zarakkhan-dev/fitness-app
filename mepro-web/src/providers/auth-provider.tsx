'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setSessionExpiredListener } from '@/lib/api';
import { authApi, userApi } from '@/lib/endpoints';
import { getTokenStore } from '@/lib/token-store';
import type { AuthResult, User } from '@/lib/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Re-reads `/auth/me`; returns the fresh profile for callers that need it. */
  refreshUser: () => Promise<User | null>;
  /** Local patch after a profile update, so every screen sees it at once. */
  patchUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Bootstrap: any stored session is verified against /auth/me before the app
  // decides whether to show the shell or send the visitor to /login.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokens = await getTokenStore().get();
      if (!tokens) {
        if (!cancelled) setStatus('anonymous');
        return;
      }
      try {
        const me = await authApi.me();
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      } catch {
        // The api client already tried one refresh; a 401 here means the
        // session is truly gone.
        if (cancelled) return;
        await getTokenStore().clear();
        setUser(null);
        setStatus('anonymous');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The api client calls this when a refresh attempt has definitively failed.
  useEffect(() => {
    setSessionExpiredListener(() => {
      if (!mounted.current) return;
      setUser(null);
      setStatus('anonymous');
    });
    return () => setSessionExpiredListener(null);
  }, []);

  // Login and register return the user *and* the token pair. The tokens must be
  // persisted here, otherwise every later request goes out unauthenticated.
  const persist = useCallback(async (result: AuthResult) => {
    await getTokenStore().set(result.tokens);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => persist(await authApi.login(email, password)),
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) =>
      persist(await authApi.register(name, email, password)),
    [persist],
  );

  const logout = useCallback(async () => {
    const tokens = await getTokenStore().get();
    if (tokens) {
      try {
        await authApi.logout(tokens.refreshToken);
      } catch {
        // A failed server-side revoke must not block signing out locally.
      }
    }
    await getTokenStore().clear();
    if (!mounted.current) return;
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const me = await authApi.me();
      if (mounted.current) setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  const patchUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, refreshUser, patchUser }),
    [status, user, login, register, logout, refreshUser, patchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/**
 * Keeps `userApi.profile()` results in one place: screens that mutate the
 * profile call `syncProfile` so the shell badge and profile page agree.
 */
export async function fetchProfile(): Promise<User> {
  return userApi.profile();
}
