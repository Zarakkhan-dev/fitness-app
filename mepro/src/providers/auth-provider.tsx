/**
 * Session state.
 *
 * Owns the token pair and the cached profile, and is the only place that
 * decides whether the app shows the auth screens or the tabs. It also registers
 * the API client's "session expired" hook, so a refresh failure anywhere in the
 * app lands the user back on the login screen exactly once.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { setSessionExpiredListener } from '@/lib/api';
import { authApi, userApi } from '@/lib/endpoints';
import { getTokenStore } from '@/lib/token-store';
import type { Tokens, User } from '@/lib/types';

interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<User | null>(null);
  // Guards against two concurrent bootstrap calls (React strict mode mounts
  // effects twice in development) racing to overwrite each other.
  const bootstrapped = useRef(false);

  /**
   * Store a token pair and mark the session live.
   *
   * `user` is passed when the caller already has it (login and register both
   * return it), which avoids a second round trip. On a cold start only the
   * tokens were persisted, so the profile has to be fetched.
   */
  const establishSession = useCallback(async (tokens: Tokens, user: User | null) => {
    await getTokenStore().set(tokens);

    if (user) {
      setUser(user);
      setStatus('authenticated');
      return;
    }

    try {
      const profile = await userApi.profile();
      setUser(profile);
      setStatus('authenticated');
    } catch {
      // The token was stored but the profile could not be read; treat the
      // session as unusable rather than showing a half-loaded app.
      await getTokenStore().clear();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  // Restore an existing session on cold start.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;
    (async () => {
      const tokens = await getTokenStore().get();
      if (cancelled) return;
      if (!tokens) {
        setStatus('anonymous');
        return;
      }
      await establishSession(tokens, null);
    })();

    return () => {
      cancelled = true;
    };
  }, [establishSession]);

  // A refresh failure anywhere in the app must clear local state too.
  useEffect(() => {
    setSessionExpiredListener(() => {
      setUser(null);
      setStatus('anonymous');
    });
    return () => setSessionExpiredListener(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      // The response nests the user and the token pair; neither is at the top level.
      const { user, tokens } = await authApi.login(email.trim(), password);
      await establishSession(tokens, user);
    },
    [establishSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { user, tokens } = await authApi.register(name.trim(), email.trim(), password);
      await establishSession(tokens, user);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    const tokens = await getTokenStore().get();
    // Clear locally first: signing out must work even with no network, and a
    // failed revoke must not strand the user in a signed-in state.
    await getTokenStore().clear();
    setUser(null);
    setStatus('anonymous');
    if (tokens) {
      try {
        await authApi.logout(tokens.refreshToken);
      } catch {
        // Already signed out locally; the server-side revoke is best effort.
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await userApi.profile();
      setUser(profile);
      return profile;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, login, register, logout, refreshUser, setUser }),
    [status, user, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
