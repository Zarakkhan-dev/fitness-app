'use client';

/**
 * The authenticated chrome: desktop sidebar, top bar, and the mobile bottom
 * bar + drawer. Navigation config lives here so every surface agrees on order
 * and labelling.
 */

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { notificationApi } from '@/lib/endpoints';
import { Avatar, Button } from '@/components/ui';
import {
  BellIcon,
  ChartIcon,
  ChevronRightIcon,
  CloseIcon,
  DumbbellIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  NutritionIcon,
  SparkIcon,
  SunIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from '@/components/icons';

export interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
}

export const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/dashboard', label: 'Today', icon: HomeIcon },
      { href: '/train', label: 'Train', icon: DumbbellIcon },
      { href: '/nutrition', label: 'Nutrition', icon: NutritionIcon },
      { href: '/progress', label: 'Progress', icon: ChartIcon },
    ],
  },
  {
    title: 'Connect',
    items: [
      { href: '/community', label: 'Community', icon: UsersIcon },
      { href: '/coach', label: 'AI Coach', icon: SparkIcon },
    ],
  },
  {
    title: 'Personal',
    items: [
      { href: '/goals', label: 'Goals', icon: TargetIcon },
      { href: '/achievements', label: 'Achievements', icon: TrophyIcon },
      { href: '/profile', label: 'Profile', icon: UserIcon },
    ],
  },
];

const PAGE_TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/dashboard$/, title: 'Today' },
  { pattern: /^\/train$/, title: 'Train' },
  { pattern: /^\/train\/workout\//, title: 'Workout' },
  { pattern: /^\/train\/yoga\//, title: 'Yoga routine' },
  { pattern: /^\/train\/session/, title: 'Session' },
  { pattern: /^\/nutrition$/, title: 'Nutrition' },
  { pattern: /^\/nutrition\/search/, title: 'Log food' },
  { pattern: /^\/progress$/, title: 'Progress' },
  { pattern: /^\/goals/, title: 'Goals' },
  { pattern: /^\/achievements/, title: 'Achievements' },
  { pattern: /^\/community/, title: 'Community' },
  { pattern: /^\/coach/, title: 'AI Coach' },
  { pattern: /^\/notifications/, title: 'Notifications' },
  { pattern: /^\/profile/, title: 'Profile' },
];

export function pageTitle(pathname: string): string {
  return PAGE_TITLES.find((entry) => entry.pattern.test(pathname))?.title ?? 'MEPro';
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------------ brand */

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-brand text-white shadow-[0_8px_20px_-12px_var(--c-brand)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
      </svg>
    </span>
  );
}

/* --------------------------------------------------------------- nav list */

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 scrollbar-slim">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.title ?? index}>
          {group.title ? (
            <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-mute uppercase">
              {group.title}
            </p>
          ) : null}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                      active ? 'text-brand-strong dark:text-brand' : 'text-sub hover:bg-alt hover:text-ink',
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-brand-soft"
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      />
                    ) : null}
                    <Icon className="relative h-[18px] w-[18px]" />
                    <span className="relative">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ---------------------------------------------------------------- sidebar */

function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <BrandMark />
        <div>
          <p className="text-[15px] leading-tight font-bold tracking-tight text-ink">MEPro</p>
          <p className="text-[11px] leading-tight text-mute">Fitness & wellness</p>
        </div>
      </div>

      <NavList />

      <div className="border-t border-line p-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-alt"
        >
          <Avatar name={user?.name} url={user?.avatarUrl} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-ink">{user?.name}</span>
            <span className="block truncate text-[11.5px] text-mute">{user?.email}</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 text-mute" />
        </Link>
        <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={() => void logout()}>
          <LogoutIcon className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ topbar */

function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      notificationApi
        .unreadCount()
        .then((result) => {
          if (!cancelled) setCount(result.unreadCount);
        })
        .catch(() => {
          /* a missing badge is not worth surfacing */
        });
    };

    load();
    const onFocus = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const timer = setInterval(load, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(timer);
    };
  }, []);

  return count;
}

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const unread = useUnreadCount();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--c-canvas)_86%,transparent)] backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-lg text-sub transition-colors hover:bg-alt hover:text-ink lg:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="lg:hidden">
          <BrandMark size={30} />
        </Link>

        <h1 className="hidden text-[16px] font-bold tracking-tight text-ink sm:block lg:text-[17px]">
          {pageTitle(pathname)}
        </h1>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="grid h-9 w-9 place-items-center rounded-lg text-sub transition-colors hover:bg-alt hover:text-ink"
          >
            {resolved === 'dark' ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
          </button>

          <Link
            href="/notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-sub transition-colors hover:bg-alt hover:text-ink"
          >
            <BellIcon className="h-[18px] w-[18px]" />
            {unread > 0 ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9.5px] font-bold text-white"
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            ) : null}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="ml-0.5 rounded-full ring-brand/40 transition hover:ring-2"
            >
              <Avatar name={user?.name} url={user?.avatarUrl} size={34} />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="card absolute right-0 z-20 mt-2 w-56 p-1.5"
                  >
                    <div className="border-b border-line px-3 py-2.5">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{user?.name}</p>
                      <p className="truncate text-[11.5px] text-mute">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-sub transition-colors hover:bg-alt hover:text-ink"
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile & settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-danger transition-colors hover:bg-danger-soft"
                    >
                      <LogoutIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------- bottom nav */

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: HomeIcon },
  { href: '/train', label: 'Train', icon: DumbbellIcon },
  { href: '/nutrition', label: 'Eat', icon: NutritionIcon },
  { href: '/progress', label: 'Progress', icon: ChartIcon },
  { href: '/profile', label: 'You', icon: UserIcon },
];

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--c-surface)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors',
                  active ? 'text-brand' : 'text-mute',
                )}
              >
                <span className={cn('relative grid h-7 w-12 place-items-center rounded-full transition-colors', active && 'bg-brand-soft')}>
                  <Icon className="h-[19px] w-[19px]" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ drawer */

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Navigating closes the drawer.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-[var(--c-overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="absolute inset-y-0 left-0 flex w-[268px] flex-col border-r border-line bg-surface"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2.5">
                <BrandMark size={30} />
                <p className="text-[15px] font-bold tracking-tight text-ink">MEPro</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className="grid h-8 w-8 place-items-center rounded-lg text-sub hover:bg-alt"
              >
                <CloseIcon className="h-4.5 w-4.5" />
              </button>
            </div>
            <NavList onNavigate={onClose} />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ shell */

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-canvas">
      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-60">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full  px-4 pt-6 pb-28 sm:px-6 lg:pb-14">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
