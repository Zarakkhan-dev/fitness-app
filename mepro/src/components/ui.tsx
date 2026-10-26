/**
 * Shared UI primitives.
 *
 * Every component reads colour and spacing from the theme rather than taking
 * them as props, so a screen only chooses what it means (a title, a value), not
 * how it looks.
 */

import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Type, useTheme } from '@/hooks/use-theme';

export function Screen({
  children,
  scroll = true,
  refreshControl,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingLeft: Math.max(insets.left, Spacing.three),
    paddingRight: Math.max(insets.right, Spacing.three),
    // The tab bar sits on top of the scroll area, so the bottom inset keeps the
    // last row clear of it.
    paddingBottom: insets.bottom + Spacing.four,
  };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: theme.background }, padding, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[padding, { gap: Spacing.three }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}>
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: Spacing.three,
    gap: Spacing.two,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[Type.title, { color: theme.text }, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[Type.heading, { color: theme.text }, style]}>{children}</Text>;
}

export function Body({
  children,
  muted = false,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[Type.body, { color: muted ? theme.textSecondary : theme.text }, style]}>
      {children}
    </Text>
  );
}

export function Caption({
  children,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[Type.caption, { color: theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[Type.label, { color: theme.textSecondary }, style]}>{children}</Text>;
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.sectionHeader}>
        <Text style={[Type.heading, { color: theme.text, flexShrink: 1 }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.brand, fg: '#FFFFFF' },
    secondary: { bg: theme.surfaceAlt, fg: theme.text },
    ghost: { bg: 'transparent', fg: theme.brand },
    danger: { bg: theme.danger, fg: '#FFFFFF' },
  };
  const tone = palette[variant] as { bg: string; fg: string; border?: string };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          backgroundColor: tone.bg,
          borderRadius: Radius.md,
          paddingVertical: Spacing.three - 2,
          paddingHorizontal: Spacing.three,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <Text style={[Type.bodyStrong, { color: tone.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        paddingHorizontal: Spacing.three - 2,
        paddingVertical: Spacing.two,
        borderRadius: Radius.pill,
        backgroundColor: selected ? theme.brand : theme.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? theme.brand : theme.border,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={[Type.label, { color: selected ? '#FFFFFF' : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

/** Horizontal bar for a 0..100 value, used where a ring would be too heavy. */
export function ProgressBar({ percent, tint }: { percent: number; tint?: string }) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{
        height: 8,
        borderRadius: Radius.pill,
        backgroundColor: theme.surfaceAlt,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: Radius.pill,
          backgroundColor: tint ?? theme.brand,
        }}
      />
    </View>
  );
}

export function StatTile({
  label,
  value,
  tint,
  hint,
}: {
  label: string;
  value: string;
  tint?: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 96,
        backgroundColor: theme.surfaceAlt,
        borderRadius: Radius.md,
        padding: Spacing.three - 2,
        gap: 2,
      }}>
      <Text style={[Type.caption, { color: theme.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[Type.heading, { color: tint ?? theme.text }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[Type.caption, { color: theme.textMuted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Row({ children, gap = Spacing.two }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>{children}</View>;
}

export function Spacer({ size = Spacing.three }: { size?: number }) {
  return <View style={{ height: size }} />;
}

/**
 * A section title with an optional trailing action.
 *
 * Distinct from `Chip`: this is a read-only status badge, where `Chip` is a
 * control the user can press to change a filter.
 */
export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'brand';
}) {
  const theme = useTheme();
  const palette = {
    neutral: { background: theme.surfaceAlt, text: theme.textSecondary },
    success: { background: theme.successMuted, text: theme.success },
    warning: { background: theme.warningMuted, text: theme.warning },
    brand: { background: theme.brandMuted, text: theme.brand },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.background,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.two + 2,
        paddingVertical: Spacing.one,
      }}>
      <Text style={[Type.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: Spacing.two }]}>
      <Heading>{title}</Heading>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="link" hitSlop={8}>
          <Text style={[Type.label, { color: theme.brand }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
