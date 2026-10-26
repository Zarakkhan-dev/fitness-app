'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { usePageTitle } from '@/hooks/use-page-title';
import { Button, Field } from '@/components/ui';
import { InlineNotice } from '@/components/states';
import { BrandMark } from '@/components/shell';

export default function RegisterPage() {
  usePageTitle('Create account');
  const router = useRouter();
  const { register, status } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  // The server policy is authoritative (8+, letter, number) — showing a hint
  // once the user starts typing avoids a round trip to learn about it.
  const passwordHint =
    password.length > 0 && password.length < 8
      ? 'Use at least 8 characters, with a letter and a number.'
      : undefined;

  const canSubmit = name.trim().length >= 2 && email.trim().length > 0 && password.length >= 8 && !submitting;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/dashboard');
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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="text-[15px] font-bold tracking-tight text-ink">MEPro</span>
        </Link>
        <Link href="/login" className="text-[13.5px] font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-7 text-center">
            <h1 className="text-[26px] font-bold tracking-tight text-ink">Create your account</h1>
            <p className="mt-1.5 text-[14px] text-sub">
              Workouts, nutrition, hydration and progress — one place.
            </p>
          </div>

          <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
            {formError ? <InlineNotice tone="error" message={formError} /> : null}

            <Field
              label="Name"
              autoComplete="name"
              placeholder="How should we greet you?"
              value={name}
              error={fieldErrors.name}
              onChange={(event) => setName(event.target.value)}
            />
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              error={fieldErrors.password}
              hint={fieldErrors.password ? undefined : passwordHint}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!canSubmit}>
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-[13.5px] text-sub">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
