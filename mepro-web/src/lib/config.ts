/** Build-time configuration for the web client. */

const normalize = (value: string): string => value.replace(/\/+$/, '');

/** The MEPro API origin, without a trailing slash. */
export const API_BASE_URL = normalize(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api',
);

/** Normal requests give up after 20 s. */
export const REQUEST_TIMEOUT_MS = 20_000;

/** The assistant may have to load a local model on first use. */
export const AI_REQUEST_TIMEOUT_MS = 60_000;
