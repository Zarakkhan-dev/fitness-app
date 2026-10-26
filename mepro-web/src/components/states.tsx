'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button, Card } from '@/components/ui';

/** Centered spinner for full-screen waits. */
export function Loading({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-14 text-sub', className)} role="status">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-brand" />
      <p className="text-[13px] font-medium">{label}</p>
    </div>
  );
}

export function Skeleton({ className, height = 16 }: { className?: string; height?: number }) {
  return <div className={cn('skeleton-block', className)} style={{ height }} aria-hidden />;
}

/** Skeleton placeholders shaped like the content they stand in for. */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card flex items-center gap-4 p-4">
          <Skeleton height={40} className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton height={13} className="h-3.5 w-2/5" />
            <Skeleton height={11} className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Failure card. Rate limits get the retry delay surfaced, because "try again"
 * without a countdown sends people into a wall of 429s.
 */
export function ErrorState({
  error,
  onRetry,
  compact = false,
  className,
}: {
  error: ApiError | Error | null;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  if (!error) return null;
  const apiError = error instanceof ApiError ? error : null;

  const offline = apiError?.isOffline;
  const retryIn =
    apiError?.retryAfterSeconds != null
      ? apiError.retryAfterSeconds >= 60
        ? `in about ${Math.ceil(apiError.retryAfterSeconds / 60)} min`
        : `in ${apiError.retryAfterSeconds}s`
      : null;

  return (
    <Card
      className={cn(
        'border-danger/30 bg-danger-soft/60 p-4',
        compact ? 'shadow-none' : 'p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-danger text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 8v5M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {offline ? 'Cannot reach the server' : 'Something went wrong'}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-sub">{error.message}</p>
          {retryIn ? <p className="mt-1 text-[12.5px] font-medium text-warning">You can retry {retryIn}.</p> : null}
          {onRetry ? (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className,
}: {
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('card flex flex-col items-center px-6 py-10 text-center', className)}
    >
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand dark:text-brand">
        {icon ?? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h16M4 12h10M4 18h7" />
          </svg>
        )}
      </span>
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-sub">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </motion.div>
  );
}

export function InlineNotice({
  message,
  tone = 'info',
  className,
}: {
  message: ReactNode;
  tone?: 'info' | 'error' | 'success' | 'warning';
  className?: string;
}) {
  const styles = {
    info: 'bg-brand-soft text-brand-strong dark:text-brand border-brand/25',
    error: 'bg-danger-soft text-danger border-danger/25',
    success: 'bg-success-soft text-success border-success/25',
    warning: 'bg-warning-soft text-warning border-warning/30',
  }[tone];

  return (
    <div className={cn('rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed font-medium', styles, className)} role="status">
      {message}
    </div>
  );
}
