'use client';

/**
 * SVG charts. Geometry comes from `lib/chart-math` so the maths is testable
 * and the components stay declarative; motion is limited to a single draw-in so
 * the data is readable immediately.
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { lineGeometry, usablePoints, type SeriesPoint } from '@/lib/chart-math';
import { clampPercent, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';

/* --------------------------------------------------------- progress ring */

export function ProgressRing({
  percent,
  size = 132,
  thickness = 12,
  tone = 'brand',
  children,
  className,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  children?: ReactNode;
  className?: string;
}) {
  const clamped = clampPercent(percent);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const stroke = {
    brand: 'var(--c-brand)',
    success: 'var(--c-success)',
    warning: 'var(--c-warning)',
    danger: 'var(--c-danger)',
    info: 'var(--c-info)',
  }[tone];

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--c-alt)" strokeWidth={thickness} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------ trend chart */

export function TrendChart({
  points,
  height = 180,
  unit = '',
  formatValue = (value: number) => formatNumber(value),
  tone = 'brand',
  className,
}: {
  points: SeriesPoint[];
  height?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  tone?: 'brand' | 'success' | 'warning' | 'info';
  className?: string;
}) {
  const width = 640; // viewBox units; the SVG stretches to its container
  const geometry = lineGeometry(points, width, height);
  const usable = usablePoints(points);

  const stroke = {
    brand: 'var(--c-brand)',
    success: 'var(--c-success)',
    warning: 'var(--c-warning)',
    info: 'var(--c-info)',
  }[tone];

  if (!geometry || usable.length < 2) {
    return (
      <div
        className={cn('grid place-items-center rounded-xl border border-dashed border-line text-[13px] text-mute', className)}
        style={{ height }}
      >
        Not enough data yet
      </div>
    );
  }

  const first = usable[0];
  const last = usable[usable.length - 1];
  const delta = last.value - first.value;
  const deltaText = `${delta > 0 ? '+' : ''}${formatValue(delta)}${unit}`;

  return (
    <div className={cn('rounded-xl border border-line bg-surface p-3', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3 px-1">
        <span className="text-[12.5px] font-medium text-mute">
          {first.label} → {last.label}
        </span>
        <span
          className={cn(
            'text-[13px] font-bold tabular-nums',
            delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-sub',
          )}
        >
          {deltaText}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible" role="img">
        <defs>
          <linearGradient id={`fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <motion.path
          d={geometry.areaPath}
          fill={`url(#fill-${tone})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        />
        <motion.path
          d={geometry.linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.circle
          cx={geometry.lastX}
          cy={geometry.lastY}
          r={5}
          fill={stroke}
          stroke="var(--c-surface)"
          strokeWidth={2.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.85, type: 'spring', stiffness: 380, damping: 20 }}
        />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[11.5px] text-mute">
        <span>
          {first.label} · {formatValue(first.value)}
          {unit}
        </span>
        <span>
          {last.label} · {formatValue(last.value)}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- bar list */

export interface BarListItem {
  label: string;
  value: number;
  hint?: string;
}

export function BarList({
  items,
  unit = '',
  className,
  tone = 'brand',
}: {
  items: BarListItem[];
  unit?: string;
  className?: string;
  tone?: 'brand' | 'success' | 'info' | 'warning';
}) {
  if (items.length === 0) {
    return (
      <p className={cn('rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-mute', className)}>
        No activity recorded yet
      </p>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  const fill = { brand: 'bg-brand', success: 'bg-success', info: 'bg-info', warning: 'bg-warning' }[tone];

  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-semibold text-ink">{item.label}</span>
            <span className="tabular-nums text-sub">
              {formatNumber(item.value)}
              {unit}
              {item.hint ? <span className="ml-1.5 text-mute">· {item.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-alt">
            <motion.div
              className={cn('h-full rounded-full', fill)}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- week strip */

export interface WeekDay {
  day: string;
  label: string;
  /** 0..100 activity score for the column height. */
  score: number;
  detail?: string;
  active?: boolean;
  isToday?: boolean;
}

export function WeekStrip({ days, className }: { days: WeekDay[]; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between gap-2', className)}>
      {days.map((day, index) => (
        <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="relative flex h-20 w-full max-w-10 items-end justify-center rounded-lg bg-alt">
            <motion.div
              className={cn(
                'w-full rounded-lg',
                day.active || day.score > 0 ? 'bg-brand' : 'bg-line',
                day.isToday && 'ring-2 ring-brand ring-offset-2 ring-offset-[var(--c-surface)]',
              )}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(6, clampPercent(day.score))}%` }}
              transition={{ duration: 0.55, delay: 0.05 + index * 0.045, ease: [0.22, 1, 0.36, 1] }}
              title={day.detail}
            />
          </div>
          <span className={cn('text-[11px] font-semibold', day.isToday ? 'text-brand' : 'text-mute')}>
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- macro bar */

export function MacroBar({
  split,
  className,
}: {
  split: { proteinG: number; carbsG: number; fatG: number };
  className?: string;
}) {
  const segments = [
    { key: 'proteinG', label: 'Protein', percent: split.proteinG, className: 'bg-brand' },
    { key: 'carbsG', label: 'Carbs', percent: split.carbsG, className: 'bg-success' },
    { key: 'fatG', label: 'Fat', percent: split.fatG, className: 'bg-warning' },
  ];

  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-alt" role="img" aria-label="Macro split">
        {segments.map((segment, index) => (
          <motion.div
            key={segment.key}
            className={cn('h-full', segment.className)}
            initial={{ width: 0 }}
            animate={{ width: `${clampPercent(segment.percent)}%` }}
            transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1.5 text-[12px] text-sub">
            <span className={cn('h-2 w-2 rounded-full', segment.className)} />
            {segment.label} {Math.round(segment.percent)}%
          </span>
        ))}
      </div>
    </div>
  );
}
