/**
 * A minimal data-fetching hook.
 *
 * Deliberately small: a request, a refetch, and a ref guard so a screen that
 * unmounts mid-flight cannot set state. It also re-runs when the screen regains
 * focus, which is how the app picks up a value changed on another screen.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';

interface QueryResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  /** True while a background refetch runs over existing data. */
  isRefreshing: boolean;
  refetch: () => void;
  setData: (updater: T | ((current: T | null) => T | null)) => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean; refetchOnFocus?: boolean } = {},
): QueryResult<T> {
  const { enabled = true, refetchOnFocus = true } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Kept in a ref so changing the fetcher identity between renders does not
  // itself trigger a request; `deps` is the explicit control. Assigning in an
  // effect rather than during render keeps the render phase pure, and because
  // this effect is declared first it has already run when the fetch effect
  // below reads the ref.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    (async () => {
      // Only show the full-screen loader on a cold fetch; a refetch keeps the
      // previous data on screen so the UI does not flash empty.
      if (data === null) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const result = await fetcherRef.current();
        if (cancelled || !alive.current) return;
        setDataState(result);
        setError(null);
      } catch (caught) {
        if (cancelled || !alive.current) return;
        setError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0, 'UNKNOWN'));
      } finally {
        if (!cancelled && alive.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus && enabled) setNonce((n) => n + 1);
    }, [refetchOnFocus, enabled]),
  );

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback((updater: T | ((current: T | null) => T | null)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: T | null) => T | null)(current) : updater,
    );
  }, []);

  // `enabled: false` must not read as "still loading", so the flag is derived
  // rather than being reset from inside the effect.
  return {
    data,
    error,
    isLoading: enabled && isLoading,
    isRefreshing: enabled && isRefreshing,
    refetch,
    setData,
  };
}
