'use client';

/**
 * Minimal data-fetching hook: one fetcher, one cache key, focus refetch, and
 * an `setData` escape hatch for optimistic updates.
 *
 * Deliberately tiny — the screens here need "give me this payload, tell me when
 * it is stale, let me patch it locally", not a cache with deduplication rules.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';

export interface QueryResult<T> {
  data: T | null;
  error: ApiError | null;
  /** True only on a cold fetch, i.e. there is nothing to show yet. */
  isLoading: boolean;
  /** True while a background refresh runs over existing data. */
  isRefreshing: boolean;
  refetch: () => void;
  setData: (updater: T | ((current: T | null) => T | null)) => void;
}

interface QueryOptions {
  enabled?: boolean;
  refetchOnFocus?: boolean;
}

type FetchState = 'idle' | 'loading' | 'refreshing';

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: QueryOptions = {},
): QueryResult<T> {
  const { enabled = true, refetchOnFocus = true } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>(enabled ? 'loading' : 'idle');
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  const hasDataRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const setData = useCallback((updater: T | ((current: T | null) => T | null)) => {
    setDataState((current) => {
      const next =
        typeof updater === 'function' ? (updater as (value: T | null) => T | null)(current) : updater;
      hasDataRef.current = next !== null;
      return next;
    });
  }, []);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setFetchState(hasDataRef.current ? 'refreshing' : 'loading');

    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setDataState(result);
        hasDataRef.current = true;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        // A caller-aborted request is a navigation, not a failure worth showing.
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(
          cause instanceof ApiError
            ? cause
            : new ApiError('Something went wrong.', 0, 'UNKNOWN'),
        );
      })
      .finally(() => {
        if (cancelled) return;
        setFetchState('idle');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const onFocus = () => {
      if (document.visibilityState === 'visible') refetch();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [enabled, refetchOnFocus, refetch]);

  return {
    data,
    error,
    isLoading: enabled && fetchState === 'loading',
    isRefreshing: fetchState === 'refreshing',
    refetch,
    setData,
  };
}
