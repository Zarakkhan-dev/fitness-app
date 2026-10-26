/**
 * Design tokens.
 *
 * Colours are defined per scheme so every screen can read the same token names
 * in light and dark mode. The spacing scale and radii are shared so components
 * stay visually consistent without each one inventing its own numbers.
 */

import { Platform } from 'react-native';

import '@/global.css';

/** Brand accent, plus the semantic colours the UI leans on. */
const Palette = {
  brand: '#208AEF',
  brandDark: '#0B63C4',
  success: '#12A150',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0891B2',
} as const;

export const Colors = {
  light: {
    text: '#0B1220',
    textSecondary: '#5B6675',
    textMuted: '#8A94A3',
    background: '#F6F8FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2F7',
    backgroundElement: '#EEF2F7',
    backgroundSelected: '#E1E8F1',
    border: '#DDE3EC',
    brand: Palette.brand,
    brandMuted: '#E7F1FD',
    success: Palette.success,
    successMuted: '#E6F6EC',
    warning: Palette.warning,
    warningMuted: '#FDF3E4',
    danger: Palette.danger,
    dangerMuted: '#FDECEC',
    info: Palette.info,
    overlay: 'rgba(11, 18, 32, 0.45)',
    skeleton: '#E6EBF2',
  },
  dark: {
    text: '#F5F7FA',
    textSecondary: '#A7B0BE',
    textMuted: '#78828F',
    background: '#0A0E14',
    surface: '#151A22',
    surfaceAlt: '#1D242E',
    backgroundElement: '#1D242E',
    backgroundSelected: '#28313D',
    border: '#28313D',
    brand: '#5AA9FF',
    brandMuted: '#12243A',
    success: '#34D399',
    successMuted: '#12291D',
    warning: '#FBBF24',
    warningMuted: '#2E2413',
    danger: '#F87171',
    dangerMuted: '#2C1618',
    info: '#38BDF8',
    overlay: 'rgba(0, 0, 0, 0.6)',
    skeleton: '#1F2731',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)['light'];
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

/** Font size / weight pairs, so text styling is named rather than numeric. */
export const Type = {
  display: { fontSize: 30, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

/** Colour per goal/metric status, so a component never hard-codes a hue. */
export const StatusColors = {
  active: Palette.brand,
  completed: Palette.success,
  archived: '#8A94A3',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
