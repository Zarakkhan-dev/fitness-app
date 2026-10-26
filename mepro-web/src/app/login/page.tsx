'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { usePageTitle } from '@/hooks/use-page-title';
import { Button, Field } from '@/components/ui';
import { InlineNotice } from '@/components/states';
import { BrandMark } from '@/components/shell';

const DEMO_EMAIL = 'aarav@mepro.app';
const DEMO_PASSWORD = 'Demo@12345';

function LoginForm() {
  usePageTitle('Sign in');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const next = searchParams.get('next') || '/dashboard';
  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  // Already signed in? Go where the visitor was headed.
  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, next, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (cause) {
      if (cause instanceof ApiError) {
        const errors = cause.fieldErrors;
        setFieldErrors(errors);
        if (Object.keys(errors).length === 0) setFormError(cause.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setFormError(null);
    setFieldErrors({});
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="text-[15px] font-bold tracking-tight text-ink">MEPro</span>
        </Link>
        <Link href="/register" className="text-[13.5px] font-semibold text-brand hover:underline">
          Create account
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-7 text-center">
            <h1 className="text-[26px] font-bold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-1.5 text-[14px] text-sub">Sign in to pick up your training day.</p>
          </div>

          <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
            {formError ? <InlineNotice tone="error" message={formError} /> : null}

            <Field
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              error={fieldErrors.email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              error={fieldErrors.password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!canSubmit}>
              Sign in
            </Button>

            <div className="rounded-xl border border-dashed border-line bg-alt/60 p-3.5">
              <p className="text-[12.5px] font-semibold text-sub">Try the demo account</p>
              <p className="mt-0.5 text-[12px] text-mute">
                {DEMO_EMAIL} · {DEMO_PASSWORD}
              </p>
              <Button type="button" variant="secondary" size="sm" className="mt-2.5" onClick={fillDemo}>
                Fill demo credentials
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-[13.5px] text-sub">
            New here?{' '}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
