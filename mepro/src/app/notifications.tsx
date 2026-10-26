/**
 * Notifications.
 *
 * Marking as read is optimistic: the row dims immediately and the change is
 * rolled back if the request fails, so a tap feels instant without leaving the
 * list in a state the server disagrees with.
 */

import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Body, Button, Caption, Card, Pill, Screen, Spacer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { notificationApi } from '@/lib/endpoints';
import { formatEnumLabel } from '@/lib/format';
import type { AppNotification } from '@/lib/types';

export default function NotificationsScreen() {
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const { data, isLoading, isRefreshing, error, refetch, setData } = useApiQuery(
    () => notificationApi.list({ limit: 50 }),
    [],
    { refetchOnFocus: true },
  );

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? items.filter((item) => !item.read).length;

  async function markRead(notification: AppNotification) {
    if (notification.read || pending[notification._id]) return;

    const previous = data;
    setPending((current) => ({ ...current, [notification._id]: true }));
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item._id === notification._id ? { ...item, read: true } : item,
            ),
            unreadCount: Math.max(0, (current.unreadCount ?? 1) - 1),
          }
        : current,
    );

    try {
      await notificationApi.markRead(notification._id);
    } catch {
      // Roll back so the list matches the server again.
      setData(() => previous);
    } finally {
      setPending((current) => {
        const next = { ...current };
        delete next[notification._id];
        return next;
      });
    }
  }

  async function markAllRead() {
    const previous = data;
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => ({ ...item, read: true })),
            unreadCount: 0,
          }
        : current,
    );
    try {
      await notificationApi.markAllRead();
    } catch {
      setData(() => previous);
    }
  }

  if (isLoading && !data) return <Loading label="Loading notifications…" />;

  if (error && !data) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Body style={{ fontWeight: '700' }}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </Body>
        {unreadCount > 0 ? (
          <Button label="Mark all read" variant="ghost" onPress={markAllRead} />
        ) : null}
      </View>

      <Spacer size={Spacing.three} />

      {error ? <ErrorState error={error} onRetry={refetch} compact /> : null}

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" message="Reminders and milestones will show up here." />
      ) : (
        items.map((item) => (
          <View key={item._id}>
            <Card
              onPress={item.read ? undefined : () => markRead(item)}
              style={item.read ? undefined : { borderColor: '#E7F1FD' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Body style={{ fontWeight: item.read ? '400' : '600', flex: 1 }}>{item.title}</Body>
                {!item.read ? <Pill label="New" tone="brand" /> : null}
              </View>
              <Spacer size={Spacing.one} />
              <Caption>{item.body}</Caption>
              <Spacer size={Spacing.two} />
              <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                <Pill label={formatEnumLabel(item.type)} />
                {item.createdAt ? (
                  <Caption>{new Date(item.createdAt).toLocaleDateString()}</Caption>
                ) : null}
                {item.pushStatus && item.pushStatus !== 'sent' && item.pushStatus !== 'skipped' ? (
                  <Caption>Push not delivered</Caption>
                ) : null}
              </View>
              {item.actionLabel ? (
                <>
                  <Spacer size={Spacing.two} />
                  <Caption style={{ color: '#208AEF', fontWeight: '600' }}>{item.actionLabel}</Caption>
                </>
              ) : null}
            </Card>
            <Spacer size={Spacing.two} />
          </View>
        ))
      )}
    </Screen>
  );
}
