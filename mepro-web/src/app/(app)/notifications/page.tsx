'use client';

/**
 * Notifications: the bell's inbox. Read state is patched optimistically so the
 * badge in the shell never lags behind a tap, with every mutation rolled back
 * against a snapshot if the server disagrees.
 */

import Link from 'next/link';
import { useState } from 'react';

import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { AppNotification, NotificationPage } from '@/lib/types';
import { formatRelativeDay } from '@/lib/format';
import { notificationApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { Button, Card, Chip, EnumPill, Modal, Pill } from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import {
  BellIcon,
  CheckIcon,
  DropIcon,
  FireIcon,
  NutritionIcon,
  SparkIcon,
  TrashIcon,
  TrophyIcon,
} from '@/components/icons';

/** Sub-minute, sub-hour and sub-day labels; older stamps fall back to a day. */
function timeAgo(value?: string | null): string {
  if (!value) return '';
  const stamp = Date.parse(value);
  if (Number.isNaN(stamp)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - stamp) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatRelativeDay(value.slice(0, 10));
}

/** Icon spot by type; `ai_recommendation` matches on either half of its name. */
function typeIcon(type: string) {
  const value = type.toLowerCase();
  if (value.includes('workout') || value.includes('streak')) return <FireIcon className="h-5 w-5" />;
  if (value.includes('water')) return <DropIcon className="h-5 w-5" />;
  if (value.includes('meal')) return <NutritionIcon className="h-5 w-5" />;
  if (value.includes('achievement')) return <TrophyIcon className="h-5 w-5" />;
  if (value.includes('ai') || value.includes('recommendation')) return <SparkIcon className="h-5 w-5" />;
  return <BellIcon className="h-5 w-5" />;
}

/* --------------------------------------------------------------- sections */

function NotificationRow({
  notification,
  busy,
  onOpen,
  onDelete,
}: {
  notification: AppNotification;
  busy: boolean;
  onOpen: (notification: AppNotification) => void;
  onDelete: (notification: AppNotification) => void;
}) {
  const unread = !notification.read;
  const time = timeAgo(notification.createdAt);
  const actionLabel = notification.actionLabel;
  const actionUrl = notification.actionUrl;

  return (
    <Card className={cn('flex items-start gap-2 p-4', unread && 'bg-brand-soft/50')}>
      {/* whole row marks an unread notification as read; the buttons stay out
          of this wrapper so they do not bubble into it */}
      <div
        className={cn('min-w-0 flex-1', unread && 'cursor-pointer')}
        onClick={unread ? () => onOpen(notification) : undefined}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brand',
              unread ? 'bg-surface' : 'bg-brand-soft',
            )}
          >
            {typeIcon(notification.type)}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-[14px] font-bold',
                unread ? 'text-ink' : 'text-sub',
              )}
            >
              {notification.title}
            </p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-sub">{notification.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EnumPill value={notification.type} />
              {time ? <span className="text-[12px] text-mute">{time}</span> : null}
              {unread ? <Pill tone="brand">New</Pill> : null}
              {actionLabel && actionUrl ? (
                actionUrl.startsWith('/') ? (
                  <Link
                    href={actionUrl}
                    className="text-[12.5px] font-semibold text-brand hover:underline"
                  >
                    {actionLabel}
                  </Link>
                ) : (
                  <a
                    href={actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] font-semibold text-brand hover:underline"
                  >
                    {actionLabel}
                  </a>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {unread ? (
          <Button variant="ghost" size="sm" loading={busy} onClick={() => onOpen(notification)}>
            Mark read
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Delete notification"
          disabled={busy}
          onClick={() => onDelete(notification)}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- page */

export default function NotificationsPage() {
  usePageTitle('Notifications');
  const toast = useToast();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  const { data, error, isLoading, isRefreshing, refetch, setData } = useApiQuery<NotificationPage>(
    () => notificationApi.list({ limit: 50, unreadOnly: unreadOnly || undefined }),
    [unreadOnly],
    { refetchOnFocus: true },
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.items ?? [];

  /* ------------------------------------------------------------ mutations */
  async function markRead(notification: AppNotification) {
    if (notification.read || pending[notification._id] || !data) return;
    const before = data;
    setPending((current) => ({ ...current, [notification._id]: true }));
    setData((current) =>
      current
        ? {
            ...current,
            unreadCount: Math.max(0, (current.unreadCount ?? 0) - 1),
            items: current.items.map((item) =>
              item._id === notification._id
                ? { ...item, read: true, readAt: new Date().toISOString() }
                : item,
            ),
          }
        : current,
    );
    try {
      await notificationApi.markRead(notification._id);
    } catch (cause) {
      setData(before);
      toast.error(cause instanceof ApiError ? cause.message : 'Could not mark as read.');
    } finally {
      setPending((current) => {
        const next = { ...current };
        delete next[notification._id];
        return next;
      });
    }
  }

  async function markAllRead() {
    if (markAllBusy || unreadCount === 0 || !data) return;
    const before = data;
    setMarkAllBusy(true);
    setData((current) =>
      current
        ? {
            ...current,
            unreadCount: 0,
            items: current.items.map((item) =>
              item.read ? item : { ...item, read: true, readAt: new Date().toISOString() },
            ),
          }
        : current,
    );
    try {
      await notificationApi.markAllRead();
      toast.success('All caught up', 'Every notification is marked as read.');
      refetch();
    } catch (cause) {
      setData(before);
      toast.error(cause instanceof ApiError ? cause.message : 'Could not mark all as read.');
    } finally {
      setMarkAllBusy(false);
    }
  }

  async function removeNotification(notification: AppNotification) {
    if (pending[notification._id] || !data) return;
    const before = data;
    setPending((current) => ({ ...current, [notification._id]: true }));
    setData((current) =>
      current
        ? {
            ...current,
            unreadCount: notification.read
              ? (current.unreadCount ?? 0)
              : Math.max(0, (current.unreadCount ?? 0) - 1),
            items: current.items.filter((item) => item._id !== notification._id),
          }
        : current,
    );
    try {
      await notificationApi.remove(notification._id);
      toast.success('Notification deleted');
    } catch (cause) {
      setData(before);
      toast.error(cause instanceof ApiError ? cause.message : 'Could not delete that notification.');
    } finally {
      setPending((current) => {
        const next = { ...current };
        delete next[notification._id];
        return next;
      });
    }
  }

  async function clearAll() {
    if (clearBusy) return;
    setClearBusy(true);
    try {
      await notificationApi.clearAll();
      toast.success('Notifications cleared');
      setClearOpen(false);
      refetch();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not clear notifications.');
    } finally {
      setClearBusy(false);
    }
  }

  if (isLoading && !data) {
    return (
      <PageBody className="space-y-4">
        <SkeletonList rows={6} />
      </PageBody>
    );
  }

  if (error && !data) {
    return (
      <PageBody>
        <ErrorState error={error} onRetry={refetch} />
      </PageBody>
    );
  }

  return (
    <PageBody className="space-y-5">
      {/* ---------------------------------------------------------- header */}
      <FadeIn className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-mute">
            Reminders, achievements and coach suggestions
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <Pill tone="danger" className="!px-3 !py-1 !text-[12.5px]">
                {unreadCount} unread
              </Pill>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={unreadOnly} onClick={() => setUnreadOnly((value) => !value)}>
            Unread only
          </Chip>
          <Button
            variant="secondary"
            size="sm"
            loading={markAllBusy}
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            <CheckIcon className="h-4 w-4" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!text-danger"
            disabled={notifications.length === 0}
            onClick={() => setClearOpen(true)}
          >
            <TrashIcon className="h-4 w-4" />
            Clear all
          </Button>
        </div>
      </FadeIn>

      {error && data ? (
        <FadeIn>
          <InlineNotice tone="error" message={error.message} />
        </FadeIn>
      ) : null}

      {/* ------------------------------------------------------------ list */}
      {notifications.length === 0 ? (
        <FadeIn delay={0.05}>
          <EmptyState
            title={unreadOnly ? 'No unread notifications' : "You're all caught up"}
            message={
              unreadOnly
                ? 'Everything in your feed has been read.'
                : 'New reminders, achievements and coach suggestions will land here.'
            }
            icon={<BellIcon className="h-5 w-5" />}
          />
        </FadeIn>
      ) : (
        <Stagger className="space-y-3">
          {notifications.map((notification) => (
            <StaggerItem key={notification._id}>
              <NotificationRow
                notification={notification}
                busy={pending[notification._id] ?? false}
                onOpen={(target) => void markRead(target)}
                onDelete={(target) => void removeNotification(target)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <FadeIn delay={0.1}>
        <p className="pb-2 text-center text-[11.5px] text-mute">
          {unreadOnly
            ? `Showing unread only · ${notifications.length} of ${data?.total ?? notifications.length}`
            : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
        </p>
      </FadeIn>

      {/* ---------------------------------------------------- clear modal */}
      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear all notifications?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClearOpen(false)} disabled={clearBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void clearAll()} loading={clearBusy}>
              Clear all
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-sub">
          Every notification in your history will be removed. This cannot be undone.
        </p>
      </Modal>

      {isRefreshing ? (
        <span className="sr-only" aria-live="polite">
          Refreshing
        </span>
      ) : null}
    </PageBody>
  );
}
