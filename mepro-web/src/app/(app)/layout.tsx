'use client';

/**
 * Authenticated shell. The guard runs client-side because the session lives in
 * localStorage: while the stored token is being verified the app shows a branded
 * splash (no flash of the login screen), and an anonymous visitor is redirected.
 */

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { BrandMark, Shell } from '@/components/shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'anonymous') return;
    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-4" role="status">
          <span className="animate-pulse">
            <BrandMark size={46} />
          </span>
          <span className="text-[13px] font-medium text-sub">Preparing your day…</span>
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    // Redirecting; keep the background so nothing flashes.
    return <div className="min-h-dvh bg-canvas" />;
  }

  return <Shell>{children}</Shell>;
}
