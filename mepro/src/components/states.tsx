/**
 * Loading, empty and error states.
 *
 * Kept together so a screen never has to hand-roll a spinner, and so the
 * "something went wrong, here is the reason, here is what to do" path looks
 * the same everywhere.
 */

import { ActivityIndicator, View } from 'react-native';

import { Body, Button, Caption, Card, Spacer } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
      <ActivityIndicator color={theme.brand} />
      <Caption>{label}</Caption>
    </View>
  );
}

export function Skeleton({ height = 72 }: { height?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: 12,
        backgroundColor: theme.skeleton,
        opacity: 0.7,
      }}
    />
  );
}

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: ApiError | Error | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  // Declared before the early return: a conditional hook call would break as
  // soon as `error` goes from null to a value.
  const theme = useTheme();
  if (!error) return null;
  const isApi = error instanceof ApiError;

  // A 429 already carries a retry time; a timeout is already explained. Only
  // add a hint where it genuinely helps the user.
  const detail = isApi && error.retryAfterSeconds
    ? `Too many attempts. Try again in ${Math.ceil(error.retryAfterSeconds / 60)} min.`
    : undefined;

  return (
    <Card style={compact ? undefined : { alignItems: 'flex-start' }}>
      <Body style={{ color: theme.danger, fontWeight: '600' }}>
        {error.message || 'Something went wrong.'}
      </Body>
      {detail ? <Caption>{detail}</Caption> : null}
      {onRetry ? (
        <>
          <Spacer size={Spacing.one} />
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: Spacing.four }}>
      <Body style={{ fontWeight: '600' }}>{title}</Body>
      {message ? (
        <Caption style={{ textAlign: 'center' }}>{message}</Caption>
      ) : null}
      {action ? (
        <>
          <Spacer size={Spacing.two} />
          <Button label={action.label} variant="secondary" onPress={action.onPress} />
        </>
      ) : null}
    </Card>
  );
}

/** Small inline banner for a non-blocking problem, e.g. a failed refetch. */
export function InlineNotice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'error' }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: tone === 'error' ? theme.danger : theme.brandMuted,
        borderRadius: 10,
        padding: Spacing.two,
      }}>
      <Caption style={{ color: tone === 'error' ? '#FFFFFF' : theme.textSecondary }}>{message}</Caption>
    </View>
  );
}
