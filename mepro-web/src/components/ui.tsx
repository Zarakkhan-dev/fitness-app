'use client';

/**
 * The design-system primitives shared by every screen. Class names only, so
 * they stay cheap to render and easy to scan; behaviour (focus traps, toasts)
 * lives in the few components that need it.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import { formatEnumLabel, initials } from '@/lib/format';

/* ------------------------------------------------------------------ button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-strong active:scale-[0.985] shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--c-brand)_85%,transparent)]',
  secondary: 'bg-alt text-ink border border-line hover:border-brand/50 hover:text-brand-strong',
  ghost: 'bg-transparent text-sub hover:bg-alt hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90 active:scale-[0.985]',
  success: 'bg-success text-white hover:opacity-90 active:scale-[0.985]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const sizes = {
    sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
    md: 'h-10 px-4 text-sm rounded-xl gap-2',
    lg: 'h-12 px-5 text-[15px] rounded-xl gap-2',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all select-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        sizes,
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------- cards */

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <Tag className={cn('card', className)}>{children}</Tag>;
}

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            {title ? <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-[13px] text-sub">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ inputs */

interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  suffix?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, hint, error, suffix, children, className }: FieldShellProps) {
  return (
    <label className={cn('block', className)}>
      {label ? <span className="mb-1.5 block text-[13px] font-semibold text-sub">{label}</span> : null}
      <span className="relative block">
        {children}
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-mute">
            {suffix}
          </span>
        ) : null}
      </span>
      {error ? (
        <span className="mt-1.5 block text-[12.5px] font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12.5px] text-mute">{hint}</span>
      ) : null}
    </label>
  );
}

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  suffix?: ReactNode;
}

export function Field({ label, hint, error, suffix, className, ...rest }: FieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} suffix={suffix} className={className}>
      <input aria-invalid={error ? 'true' : undefined} className={cn('input', suffix ? 'pr-14' : undefined)} {...rest} />
    </FieldShell>
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}

export function TextArea({ label, hint, error, className, ...rest }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      <textarea aria-invalid={error ? 'true' : undefined} className={cn('input min-h-24 resize-y')} {...rest} />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}

export function Select({ label, hint, error, className, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      <select className={cn('input appearance-none pr-9')} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------- chips */

export function Chip({
  children,
  active = false,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  if (!onClick) {
    return <span className={cn('chip', className)}>{children}</span>;
  }
  return (
    <button type="button" data-active={active} onClick={onClick} className={cn('chip', className)}>
      {children}
    </button>
  );
}

type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const PILL_TONES: Record<PillTone, string> = {
  neutral: 'bg-alt text-sub',
  brand: 'bg-brand-soft text-brand-strong dark:text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export function Pill({ children, tone = 'neutral', className }: { children: ReactNode; tone?: PillTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Enum value in, human label out, in a pill. */
export function EnumPill({ value, tone }: { value: unknown; tone?: PillTone }) {
  const label = formatEnumLabel(value);
  if (!label) return null;
  return <Pill tone={tone}>{label}</Pill>;
}

/* --------------------------------------------------------------- progress */

export function ProgressBar({
  percent,
  tone = 'brand',
  className,
  height = 'h-2',
}: {
  percent: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  height?: string;
}) {
  const clamped = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const fill = {
    brand: 'bg-brand',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full bg-alt', height, className)}
    >
      <motion.div
        className={cn('h-full rounded-full', fill)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'brand',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'ink';
  className?: string;
}) {
  const valueTone = {
    brand: 'text-brand',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    ink: 'text-ink',
  }[tone];

  return (
    <div className={cn('card p-4', className)}>
      <p className="text-[12px] font-semibold tracking-wide text-mute uppercase">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tracking-tight', valueTone)}>{value}</p>
      {hint ? <p className="mt-1 text-[12.5px] text-sub">{hint}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- avatar */

export function Avatar({
  name,
  url,
  size = 40,
  className,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.36) };

  if (url) {
    return (
      // Avatars come from arbitrary user-supplied URLs; next/image would need
      // a remotePatterns entry per host, so a plain img is the honest choice.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? 'Profile'}
        style={style}
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-line', className)}
      />
    );
  }

  return (
    <span
      style={style}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-strong dark:text-brand',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ tabs */

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
            value === option.value ? 'bg-brand-soft text-brand-strong dark:text-brand' : 'text-sub hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[var(--c-overlay)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'card relative z-10 max-h-[92vh] w-full overflow-y-auto scrollbar-slim sm:max-w-lg',
              className,
            )}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-bold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-sub transition-colors hover:bg-alt hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
