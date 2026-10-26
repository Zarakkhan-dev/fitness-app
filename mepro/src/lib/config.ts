/**
 * Where the app points and how it is identified.
 *
 * The API host differs per platform: the Android emulator cannot reach the
 * machine's `localhost` through its loopback, so it needs the emulator alias
 * instead. A real handset needs the machine's LAN address, which cannot be
 * guessed, so it has to be supplied at build time.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 5000;

/**
 * `localhost` works for the iOS simulator and for web served from the same
 * host. Android emulators reach the host through 10.0.2.2.
 */
export function defaultApiHost(): string {
  return Platform.OS === 'android' ? 'https://sprinkler-washbowl-sibling.ngrok-free.dev' : 'https://sprinkler-washbowl-sibling.ngrok-free.dev';
}

/** Trailing slashes would produce `//auth/login` once paths are joined. */
function normalise(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveBaseUrl(): string {
  // An explicit build-time value always wins, so a physical device or a
  // non-default deployment can be pointed at any host.
  const configured =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    'https://sprinkler-washbowl-sibling.ngrok-free.dev/api';
  if (configured) return normalise(configured);
  return normalise(`http://${defaultApiHost()}:${DEFAULT_PORT}/api`);
}

export const API_BASE_URL = resolveBaseUrl();

/** How long a single request may take before it is abandoned. */
export const REQUEST_TIMEOUT_MS = 20_000;

/** Slightly longer, because the first AI call may have to load a model. */
export const AI_REQUEST_TIMEOUT_MS = 60_000;
