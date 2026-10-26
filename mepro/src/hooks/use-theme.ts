/**
 * Theme access.
 *
 * Re-exports the tokens so a component takes everything styling-related from
 * one place, and `useTheme()` resolves the current scheme.
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export { Colors, Fonts, Radius, Spacing, Type, MaxContentWidth, BottomTabInset } from '@/constants/theme';
export type { ColorScheme, ThemeColors, ThemeColor } from '@/constants/theme';

export function useTheme() {
  const scheme = useColorScheme();
  // An unspecified scheme means the platform has not reported one yet; light is
  // the safer default and avoids a flash of the wrong palette.
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return Colors[theme];
}
