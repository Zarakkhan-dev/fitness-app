import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * A subscription that never fires: this value is only read once, on the first
 * client render.
 */
const noopSubscribe = () => () => {};

/**
 * Colour scheme for static web rendering.
 *
 * The server has no way to know the visitor's OS, so it must render the light
 * palette and the client has to correct it after hydration. Doing that with a
 * `useState` + `useEffect` pair causes an extra render on every page load;
 * `useSyncExternalStore` returns the server snapshot during SSR and the client
 * snapshot on hydration in a single pass.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
