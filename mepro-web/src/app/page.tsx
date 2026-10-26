'use client';

/**
 * Public landing page. Deliberately not a route into the app: it exists to
 * explain the product and hand visitors to /login or /register.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';

import { useTheme } from '@/providers/theme-provider';
import { Avatar, Button, Card, Pill, ProgressBar } from '@/components/ui';
import { ProgressRing, TrendChart, BarList } from '@/components/charts';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import { BrandMark } from '@/components/shell';
import {
  BoltIcon,
  ChartIcon,
  DropIcon,
  DumbbellIcon,
  FireIcon,
  MoonIcon,
  NutritionIcon,
  SparkIcon,
  SunIcon,
  TargetIcon,
  TrophyIcon,
} from '@/components/icons';

const FEATURES = [
  {
    icon: DumbbellIcon,
    title: 'Workouts & yoga',
    body: 'A guided catalogue with sessions you can start, resume and finish — every rep rolls into your history and goals.',
  },
  {
    icon: NutritionIcon,
    title: 'Nutrition logging',
    body: 'Search a food database, pick a serving, and watch calories and macros land in the right meal automatically.',
  },
  {
    icon: DropIcon,
    title: 'Hydration',
    body: 'Quick water adds with a daily target, history and reminders that keep the streak alive.',
  },
  {
    icon: ChartIcon,
    title: 'Progress that reads',
    body: 'Weight trends, weekly rollups, streaks and category breakdowns — the numbers that actually change behaviour.',
  },
  {
    icon: TargetIcon,
    title: 'Goals & achievements',
    body: 'Manual goals or ones that sync themselves from your weight, workouts and streak. Badges included.',
  },
  {
    icon: SparkIcon,
    title: 'On-device AI coach',
    body: 'Recommendations and a chat assistant that answer from your own logged data — no external AI service, works offline.',
  },
];

const HERO_POINTS = [
  { label: 'Sessions logged', value: '12,400+' },
  { label: 'Foods in catalogue', value: '900+' },
  { label: 'Demo history', value: '45 days' },
];

export default function LandingPage() {
  const { resolved, toggle } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--c-canvas)_85%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="text-[16px] font-bold tracking-tight text-ink">MEPro</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-lg text-sub transition-colors hover:bg-alt hover:text-ink"
            >
              {resolved === 'dark' ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
            </button>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--c-brand) 0%, transparent 65%)' }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <FadeIn>
            <Pill tone="brand" className="mb-5">
              <BoltIcon className="h-3.5 w-3.5" />
              Fitness · Nutrition · Wellness
            </Pill>
            <h1 className="text-[38px] leading-[1.06] font-bold tracking-tight text-ink sm:text-[52px]">
              Train, eat and recover with a plan that{' '}
              <span className="text-brand">remembers everything</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-sub">
              MEPro connects your workouts, meals, water and weight into one daily picture — with goals,
              streaks, achievements, a community feed and an AI coach that answers from your own data.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg">
                  Start free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Try the demo account
                </Button>
              </Link>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {HERO_POINTS.map((point) => (
                <div key={point.label}>
                  <dt className="text-[12px] font-semibold tracking-wide text-mute uppercase">{point.label}</dt>
                  <dd className="mt-0.5 text-[20px] font-bold text-ink">{point.value}</dd>
                </div>
              ))}
            </dl>
          </FadeIn>

          {/* dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 26, rotate: -1.2 }}
            animate={{ opacity: 1, y: 0, rotate: -1.2 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name="Aarav Sharma" size={40} />
                  <div>
                    <p className="text-[14px] font-bold text-ink">Good evening, Aarav</p>
                    <p className="flex items-center gap-1.5 text-[12px] text-sub">
                      <FireIcon className="h-3.5 w-3.5 text-warning" />
                      12-day streak
                    </p>
                  </div>
                </div>
                <Pill tone="success">On track</Pill>
              </div>

              <div className="mt-5 flex items-center gap-5">
                <ProgressRing percent={72} size={112} thickness={11}>
                  <div>
                    <p className="text-[19px] leading-none font-bold text-ink">1,640</p>
                    <p className="mt-0.5 text-[10.5px] text-mute">of 2,280 kcal</p>
                  </div>
                </ProgressRing>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="text-sub">Protein</span>
                      <span className="font-semibold text-ink">128 / 165 g</span>
                    </div>
                    <ProgressBar percent={78} tone="brand" height="h-1.5" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="text-sub">Water</span>
                      <span className="font-semibold text-ink">1.75 / 2.5 L</span>
                    </div>
                    <ProgressBar percent={70} tone="info" height="h-1.5" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="text-sub">Move</span>
                      <span className="font-semibold text-ink">34 / 45 min</span>
                    </div>
                    <ProgressBar percent={75} tone="success" height="h-1.5" />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-3">
                  <p className="mb-1 text-[11.5px] font-semibold text-mute uppercase">This week</p>
                  <TrendChart
                    points={[
                      { label: 'Mon', value: 68 },
                      { label: 'Tue', value: 74 },
                      { label: 'Wed', value: 71 },
                      { label: 'Thu', value: 82 },
                      { label: 'Fri', value: 79 },
                      { label: 'Sat', value: 88 },
                      { label: 'Sun', value: 92 },
                    ]}
                    height={96}
                    unit="%"
                    className="border-0 p-0"
                  />
                </div>
                <div className="rounded-xl border border-line p-3">
                  <p className="mb-2 text-[11.5px] font-semibold text-mute uppercase">Minutes by focus</p>
                  <BarList
                    items={[
                      { label: 'Strength', value: 128 },
                      { label: 'Cardio', value: 86 },
                      { label: 'Yoga', value: 54 },
                    ]}
                    unit=" min"
                    className="space-y-2.5"
                  />
                </div>
              </div>
            </Card>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 22 }}
              className="card absolute -top-6 -left-4 hidden px-3.5 py-2.5 sm:block"
            >
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                <TrophyIcon className="h-4 w-4 text-warning" />
                Badge unlocked · 7-day streak
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.68, type: 'spring', stiffness: 260, damping: 22 }}
              className="card absolute -right-4 -bottom-6 hidden px-3.5 py-2.5 sm:block"
            >
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                <SparkIcon className="h-4 w-4 text-brand" />
                Coach: add 10 min of mobility today
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <FadeIn className="mb-9 max-w-2xl">
          <h2 className="text-[28px] font-bold tracking-tight text-ink sm:text-[32px]">
            Everything a training week needs
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-sub">
            The same API powers the mobile app and this web client, so your sessions, logs and streaks stay
            in sync wherever you train.
          </p>
        </FadeIn>

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.title}>
                <Card className="h-full p-5 transition-transform hover:-translate-y-1">
                  <span className="mb-3.5 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand dark:text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-[15.5px] font-bold text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-sub">{feature.body}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* --------------------------------------------------------- how it works */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
          <FadeIn className="mb-8">
            <h2 className="text-[24px] font-bold tracking-tight text-ink">From sign-in to streak in minutes</h2>
          </FadeIn>
          <Stagger className="grid gap-5 md:grid-cols-3" gap={0.12}>
            {[
              {
                step: '01',
                title: 'Create your profile',
                body: 'Height, weight, activity level and goals — the targets for calories and water are computed for you.',
              },
              {
                step: '02',
                title: 'Log the day',
                body: 'Start a workout, add meals from the catalogue, drink water with one tap, weigh in when you like.',
              },
              {
                step: '03',
                title: 'Watch it compound',
                body: 'Streaks, goals and achievements update as you go; the coach suggests what to do next.',
              },
            ].map((item) => (
              <StaggerItem key={item.step}>
                <div className="relative h-full rounded-card border border-line bg-canvas p-6">
                  <span className="text-[34px] leading-none font-bold text-brand/25">{item.step}</span>
                  <h3 className="mt-3 text-[16px] font-bold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-sub">{item.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <FadeIn>
          <div
            className="relative overflow-hidden rounded-[26px] px-6 py-12 text-center sm:px-12"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--c-brand) 92%, #000) 0%, color-mix(in srgb, var(--c-brand) 65%, #001a3a) 100%)',
            }}
          >
            <h2 className="text-[28px] font-bold tracking-tight text-white sm:text-[34px]">
              Your next session starts here
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-white/85">
              Create an account, or explore the seeded demo profile with 45 days of realistic history.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white">
                  Create free account
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" className="bg-white text-brand-strong hover:bg-white/90">
                  Open demo
                </Button>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="mt-auto border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span className="text-[13.5px] font-bold text-ink">MEPro</span>
            <span className="text-[12.5px] text-mute">Fitness & wellness tracker</span>
          </div>
          <p className="text-[12.5px] text-mute">
            Estimates only — not medical advice, diagnosis or treatment.
          </p>
        </div>
      </footer>
    </div>
  );
}
