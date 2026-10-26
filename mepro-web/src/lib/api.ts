/**
 * HTTP client for the MEPro API.
 *
 * Responsibilities, in order of importance:
 *  1. Unwrap the response envelope and turn failures into a typed `ApiError`.
 *  2. Attach the access token, and refresh it exactly once on a 401 before
 *     retrying the original request.
 *  3. Never retry a non-idempotent request blindly, so a POST cannot be applied
 *     twice.
 */

import { AI_REQUEST_TIMEOUT_MS, API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/lib/config';
import { getTokenStore } from '@/lib/token-store';
import type { ApiEnvelope, ApiErrorDetail, Tokens } from '@/lib/types';

export type QueryValue = string | number | boolean | null | undefined | (string | number)[];

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Set false for the credential endpoints, which must not send a token. */
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Internal: prevents an infinite refresh/retry loop. */
  isRetry?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ApiErrorDetail[];
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN',
    errors: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    const retry = errors.find((e) => typeof e.retryAfterSeconds === 'number');
    this.retryAfterSeconds = retry?.retryAfterSeconds ?? null;
  }

  /** True when the session is gone and the user has to sign in again. */
  get isAuthFailure(): boolean {
    return this.status === 401;
  }

  /** True when the API could not be reached at all. */
  get isOffline(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }

  /** Field-level messages, keyed by field name, for form display. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const error of this.errors) {
      if (error.field) out[error.field] = error.message;
    }
    return out;
  }
}

/** Notifies the app that the session cannot be recovered. */
type SessionListener = () => void;
let onSessionExpired: SessionListener | null = null;

export function setSessionExpiredListener(listener: SessionListener | null): void {
  onSessionExpired = listener;
}

/**
 * A single in-flight refresh shared by every caller.
 *
 * Without this, several screens mounting at once would each see a 401 and each
 * rotate the same refresh token. The API treats a replayed token as a possible
 * theft and revokes the whole family, so a race here would sign the user out.
 */
let refreshInFlight: Promise<Tokens | null> | null = null;

export function buildQueryString(query: Record<string, QueryValue> | undefined): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && 'success' in body;
}

/** Rotates the token pair, coalescing concurrent attempts into one. */
export async function refreshSession(): Promise<Tokens | null> {
  if (refreshInFlight) return refreshInFlight;

  const store = getTokenStore();
  const current = await store.get();
  if (!current) return null;

  refreshInFlight = (async () => {
    try {
      // The API nests the rotated pair under `tokens`, alongside the user.
      const { tokens } = await request<{ tokens: Tokens }>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: current.refreshToken },
        auth: false,
      });
      await store.set(tokens);
      return tokens;
    } catch {
      // The refresh token is spent or revoked: the family is gone, so the
      // session has to be cleared rather than retried.
      await store.clear();
      onSessionExpired?.();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    auth = true,
    timeoutMs = REQUEST_TIMEOUT_MS,
    signal,
    isRetry = false,
  } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const tokens = await getTokenStore().get();
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQueryString(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    // Distinguish "the caller navigated away" from "the request timed out".
    if (signal?.aborted) throw cause;
    if (controller.signal.aborted) {
      throw new ApiError('The request timed out. Check your connection and try again.', 0, 'TIMEOUT');
    }
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (response.status === 401 && auth && !isRetry) {
    // Try exactly one refresh, then replay the original request once.
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, { ...options, isRetry: true });
    throw new ApiError('Your session has expired. Please sign in again.', 401, 'UNAUTHORIZED');
  }

  if (!response.ok) {
    if (isEnvelope(payload)) {
      throw new ApiError(
        payload.message || 'Something went wrong.',
        response.status,
        payload.code ?? 'ERROR',
        payload.errors ?? [],
      );
    }
    throw new ApiError(`Request failed (${response.status}).`, response.status, 'ERROR');
  }

  if (!isEnvelope(payload)) {
    throw new ApiError('The server returned an unexpected response.', response.status, 'BAD_RESPONSE');
  }

  if (!payload.success) {
    throw new ApiError(
      payload.message || 'Something went wrong.',
      response.status,
      payload.code ?? 'ERROR',
      payload.errors ?? [],
    );
  }

  return payload.data as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options: RequestOptions = {}) => request<T>(path, { ...options, method: 'DELETE' }),
};

/** The assistant may need to load a model on first use, so it gets longer. */
export function aiRequest<T>(path: string, body?: unknown, options: RequestOptions = {}) {
  return request<T>(path, {
    ...options,
    method: 'POST',
    body,
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
  });
}
