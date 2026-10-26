'use client';

/**
 * Today: the one-request dashboard the API was designed around. Everything on
 * this screen comes from `GET /api/dashboard` plus two optimistic quick-log
 * modals, so it stays fast and coherent.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Dashboard, Goal, ProgressDay } from '@/lib/types';
import {
  clampPercent,
  formatCalories,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatVolume,
} from '@/lib/format';
import { macroSplit } from '@/lib/nutrition-math';
import { useApiQuery } from '@/hooks/use-api-query';
import { useNow } from '@/hooks/use-client';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuth } from '@/providers/auth-provider';
import { dashboardApi } from '@/lib/endpoints';
import { Button, Card, Pill, ProgressBar, Section } from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { MacroBar, ProgressRing, WeekStrip, type WeekDay } from '@/components/charts';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import { LogWaterModal, LogWeightModal } from '@/components/log-modals';
import {
  BoltIcon,
  ChevronRightIcon,
  DumbbellIcon,
  DropIcon,
  FireIcon,
  NutritionIcon,
  PlayIcon,
  ScaleIcon,
  SparkIcon,
  TargetIcon,
  TrophyIcon,
} from '@/components/icons';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekDays(days: ProgressDay[]): WeekDay[] {
  return days.map((entry) => {
    const day = entry.day ?? entry.date ?? '';
    const weekday = Number.isNaN(Date.parse(`${day}T00:00:00Z`))
      ? 0
      : new Date(`${day}T00:00:00Z`).getUTCDay();

    const workoutScore = entry.workoutMinutes
      ? Math.min(60, ((entry.workoutMinutes ?? 0) / 45) * 60)
      : 0;
    const nutritionScore = (entry.foodLogs ?? 0) > 0 || (entry.caloriesConsumed ?? 0) > 0 ? 20 : 0;
    const waterTarget = entry.waterTargetMl || 2000;
    const waterScore = Math.min(20, ((entry.waterMl ?? 0) / waterTarget) * 20);

    const score = Math.round(workoutScore + nutritionScore + waterScore);

    return {
      day,
      label: DAY_LABELS[weekday] ?? day.slice(8),
      score,
      active: score > 0,
      detail: `${formatMinutes(entry.workoutMinutes)} · ${formatCalories(entry.caloriesConsumed)}`,
    };
  });
}

function greetingByHour(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* --------------------------------------------------------------- sections */

function MetricTile({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const percent = clampPercent(goal.progressPercent);
  const tone = goal.status === 'completed' ? 'success' : percent >= 75 ? 'success' : 'brand';

  return (
    <li>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-[13.5px] font-semibold text-ink">{goal.title}</span>
        <span className="shrink-0 text-[12.5px] tabular-nums text-sub">
          {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)} {goal.unit}
        </span>
      </div>
      <ProgressBar percent={percent} tone={tone} height="h-1.5" />
    </li>
  );
}

/* ------------------------------------------------------------------- page */

export default function DashboardPage() {
  usePageTitle('Today');
  const { user } = useAuth();
  const [waterOpen, setWaterOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  // Refreshes every minute so the "started N min ago" line stays honest.
  const now = useNow(60_000);

  const { data, error, isLoading, isRefreshing, refetch } = useApiQuery<Dashboard>(
    () => dashboardApi.get(),
    [],
    { refetchOnFocus: true },
  );

  const week = useMemo(() => weekDays(data?.week ?? []), [data?.week]);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="card h-28" />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  if (!data) return null;

  const { today, streak, goals, achievementSummary, activeSession, week: weekRaw } = data;
  const nutrition = today.nutrition;
  const caloriePercent =
    today.calories.target > 0 ? (today.calories.consumed / today.calories.target) * 100 : today.calories.percent;

  const split = nutrition
    ? macroSplit({
        proteinG: nutrition.proteinG ?? 0,
        carbsG: nutrition.carbsG ?? 0,
        fatG: nutrition.fatG ?? 0,
      })
    : null;

  const activeGoals = goals.filter((goal) => goal.status === 'active').slice(0, 3);
  const recentAchievements = achievementSummary.recent.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-mute">
            {new Date(`${data.date}T00:00:00Z`).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
            {greetingByHour()}, {data.userName?.split(' ')[0] || 'there'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={streak.activeToday ? 'success' : 'neutral'} className="!px-3 !py-1.5 !text-[12.5px]">
            <FireIcon className="h-3.5 w-3.5" />
            {streak.current}-day streak
          </Pill>
          <Button variant="secondary" size="sm" onClick={() => setWeightOpen(true)}>
            <ScaleIcon className="h-4 w-4" />
            Log weight
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWaterOpen(true)}>
            <DropIcon className="h-4 w-4" />
            Log water
          </Button>
          <Link href="/nutrition/search">
            <Button size="sm">
              <NutritionIcon className="h-4 w-4" />
              Log food
            </Button>
          </Link>
        </div>
      </FadeIn>

      {activeSession ? (
        <FadeIn>
          <Link href="/train/session" className="block">
            <Card className="flex items-center gap-4 border-brand/40 bg-brand-soft/60 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <PlayIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">Workout in progress: {activeSession.title}</p>
                <p className="text-[13px] text-sub">Started {formatMinutes(Math.max(1, Math.round((now - new Date(activeSession.startedAt ?? now).getTime()) / 60000)))} ago — resume where you left off.</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-brand" />
            </Card>
          </Link>
        </FadeIn>
      ) : null}

      {data.recommendation ? (
        <FadeIn delay={0.05}>
          <Card className="p-5">
            <div className="flex items-start gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand dark:text-brand">
                <SparkIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14.5px] font-bold text-ink">{data.recommendation.title}</h3>
                  <Pill tone="neutral">
                    {data.recommendationProvider === 'transformers' ? 'local model' : 'rules engine'}
                  </Pill>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-sub">{data.recommendation.reason}</p>
                <p className="mt-2 rounded-lg bg-alt px-3 py-2 text-[13.5px] leading-relaxed font-medium text-ink">
                  {data.recommendation.recommendation}
                </p>
                {data.disclaimer ? (
                  <p className="mt-2 text-[11.5px] leading-relaxed text-mute">{data.disclaimer}</p>
                ) : null}
              </div>
            </div>
          </Card>
        </FadeIn>
      ) : null}

      {/* ---------------------------------------------------------- metrics */}
      <Stagger className="grid gap-4 lg:grid-cols-3">
        {/* calories */}
        <StaggerItem className="lg:col-span-1">
          <MetricTile
            title="Calories"
            action={
              <Pill tone={today.calories.remaining >= 0 ? 'success' : 'warning'}>
                {today.calories.remaining >= 0
                  ? `${formatCalories(today.calories.remaining)} left`
                  : `${formatCalories(Math.abs(today.calories.remaining))} over`}
              </Pill>
            }
          >
            <div className="flex items-center gap-5">
              <ProgressRing percent={caloriePercent} size={124} thickness={12}>
                <div>
                  <p className="text-[21px] leading-none font-bold text-ink">
                    {formatNumber(today.calories.consumed)}
                  </p>
                  <p className="mt-1 text-[11px] text-mute">of {formatNumber(today.calories.target)} kcal</p>
                </div>
              </ProgressRing>
              <dl className="min-w-0 flex-1 space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Burned</dt>
                  <dd className="font-semibold text-ink">{formatCalories(today.calories.burned)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Net</dt>
                  <dd className="font-semibold text-ink">
                    {formatCalories(today.calories.consumed - today.calories.burned)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Progress</dt>
                  <dd className="font-semibold text-ink">{formatPercent(clampPercent(caloriePercent))}</dd>
                </div>
                {split ? (
                  <div className="pt-1">
                    <MacroBar split={split} />
                  </div>
                ) : null}
              </dl>
            </div>
            {nutrition ? (
              <p className="mt-3 text-[12px] text-mute">
                {formatNumber(nutrition.proteinG)} g protein · {formatNumber(nutrition.carbsG)} g carbs ·{' '}
                {formatNumber(nutrition.fatG)} g fat
              </p>
            ) : null}
          </MetricTile>
        </StaggerItem>

        {/* water */}
        <StaggerItem>
          <MetricTile
            title="Hydration"
            action={
              <Button variant="ghost" size="sm" onClick={() => setWaterOpen(true)}>
                <DropIcon className="h-4 w-4" />
                Add
              </Button>
            }
          >
            <div className="flex items-center gap-5">
              <ProgressRing percent={today.water.percent} size={112} thickness={11} tone="info">
                <div>
                  <p className="text-[17px] leading-none font-bold text-ink">{formatVolume(today.water.totalMl)}</p>
                  <p className="mt-1 text-[10.5px] text-mute">of {formatVolume(today.water.targetMl)}</p>
                </div>
              </ProgressRing>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-[13.5px] leading-relaxed text-sub">
                  {today.water.remainingMl > 0
                    ? `${formatVolume(today.water.remainingMl)} to go — about ${Math.max(1, Math.round(today.water.remainingMl / 250))} glasses.`
                    : 'Target reached. Nicely done.'}
                </p>
                <ProgressBar percent={today.water.percent} tone="info" />
                <div className="flex gap-2">
                  {[250, 500].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="chip"
                      onClick={() => setWaterOpen(true)}
                    >
                      +{formatVolume(amount)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </MetricTile>
        </StaggerItem>

        {/* movement */}
        <StaggerItem>
          <MetricTile
            title="Movement"
            action={<Pill tone="neutral">{today.workout.sessions} session{today.workout.sessions === 1 ? '' : 's'}</Pill>}
          >
            <div className="flex items-center gap-5">
              <ProgressRing percent={today.workout.percent} size={112} thickness={11} tone="success">
                <div>
                  <p className="text-[17px] leading-none font-bold text-ink">{today.workout.minutes}</p>
                  <p className="mt-1 text-[10.5px] text-mute">of {today.workout.targetMinutes} min</p>
                </div>
              </ProgressRing>
              <dl className="min-w-0 flex-1 space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Calories burned</dt>
                  <dd className="font-semibold text-ink">{formatCalories(today.workout.caloriesBurned)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Remaining</dt>
                  <dd className="font-semibold text-ink">
                    {formatMinutes(Math.max(0, today.workout.targetMinutes - today.workout.minutes))}
                  </dd>
                </div>
                <div className="pt-1">
                  <Link href="/train">
                    <Button variant="secondary" size="sm" className="w-full">
                      <DumbbellIcon className="h-4 w-4" />
                      Start a workout
                    </Button>
                  </Link>
                </div>
              </dl>
            </div>
          </MetricTile>
        </StaggerItem>
      </Stagger>

      {/* ------------------------------------------------------ week + streak */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <FadeIn delay={0.08}>
          <MetricTile
            title="This week"
            action={
              <Link href="/progress" className="text-[12.5px] font-semibold text-brand hover:underline">
                Full progress
              </Link>
            }
          >
            {weekRaw.length > 0 ? (
              <>
                <WeekStrip days={week} />
                <p className="mt-3 text-[12.5px] text-mute">
                  Bar height blends training minutes, logged meals and water — a full day fills the column.
                </p>
              </>
            ) : (
              <EmptyState
                title="No week to show yet"
                message="Log a workout, a meal or a glass of water and your week starts filling in."
              />
            )}
          </MetricTile>
        </FadeIn>

        <FadeIn delay={0.12}>
          <MetricTile
            title="Streak"
            action={
              <Pill tone={streak.activeToday ? 'success' : 'neutral'}>
                {streak.activeToday ? 'Active today' : 'Not yet today'}
              </Pill>
            }
          >
            <div className="flex items-end gap-6">
              <div>
                <p className="text-[34px] leading-none font-bold text-ink">{streak.current}</p>
                <p className="mt-1 text-[12.5px] text-sub">current days</p>
              </div>
              <div>
                <p className="text-[24px] leading-none font-bold text-sub">{streak.longest}</p>
                <p className="mt-1 text-[12.5px] text-mute">personal best</p>
              </div>
            </div>
            {streak.milestones && streak.milestones.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {streak.milestones.slice(-3).map((milestone) => (
                  <li key={milestone.days} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-sub">{milestone.label}</span>
                    {milestone.reached ? (
                      <Pill tone="success">Reached</Pill>
                    ) : (
                      <span className="text-[12.5px] text-mute">
                        {Math.max(0, milestone.days - streak.current)} days to go
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </MetricTile>
        </FadeIn>
      </div>

      {/* -------------------------------------------- goals + achievements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <Section
            title="Goals"
            action={
              <Link href="/goals" className="flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
                All goals
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <Card className="p-5">
              {activeGoals.length > 0 ? (
                <ul className="space-y-4">
                  {activeGoals.map((goal) => (
                    <GoalRow key={goal._id} goal={goal} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No active goals"
                  message="Set a target — weight, sessions, minutes — and progress fills itself in."
                  action={
                    <Link href="/goals">
                      <Button size="sm">
                        <TargetIcon className="h-4 w-4" />
                        Create a goal
                      </Button>
                    </Link>
                  }
                  icon={<TargetIcon className="h-5 w-5" />}
                />
              )}
            </Card>
          </Section>
        </FadeIn>

        <FadeIn delay={0.14}>
          <Section
            title="Achievements"
            action={
              <Link
                href="/achievements"
                className="flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline"
              >
                All badges
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning-soft text-warning">
                  <TrophyIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[19px] leading-tight font-bold text-ink">
                    {formatNumber(achievementSummary.totalPoints)} pts
                  </p>
                  <p className="text-[12.5px] text-sub">
                    {achievementSummary.earnedCount} of {achievementSummary.totalCount} badges earned
                  </p>
                </div>
                <div className="ml-auto hidden text-right sm:block">
                  <p className="text-[16px] font-bold text-brand">
                    {formatPercent(
                      achievementSummary.totalCount
                        ? (achievementSummary.earnedCount / achievementSummary.totalCount) * 100
                        : 0,
                    )}
                  </p>
                  <p className="text-[11.5px] text-mute">complete</p>
                </div>
              </div>

              {recentAchievements.length > 0 ? (
                <ul className="space-y-2.5">
                  {recentAchievements.map((achievement) => (
                    <li key={achievement.key} className="flex items-center gap-3 rounded-xl bg-alt/70 px-3 py-2.5">
                      <span className="text-[17px]" aria-hidden>
                        {achievement.icon ?? '🏅'}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">
                          {achievement.title}
                        </span>
                        <span className="block truncate text-[12px] text-sub">{achievement.description}</span>
                      </span>
                      <Pill tone="brand" className="ml-auto shrink-0">
                        +{achievement.points}
                      </Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-mute">
                  Finish a session or keep your streak going to earn the first badge.
                </p>
              )}
            </Card>
          </Section>
        </FadeIn>
      </div>

      {/* ---------------------------------------------------- notifications */}
      {data.notifications.unreadCount > 0 ? (
        <FadeIn delay={0.16}>
          <Link href="/notifications" className="block">
            <Card className="flex items-center gap-3.5 border-warning/35 bg-warning-soft/60 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warning text-white">
                <BoltIcon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">
                  {data.notifications.unreadCount} unread notification
                  {data.notifications.unreadCount === 1 ? '' : 's'}
                </p>
                <p className="text-[13px] text-sub">Reminders, achievements and coach suggestions.</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-warning" />
            </Card>
          </Link>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.18}>
        <p className="pb-2 text-center text-[11.5px] text-mute">
          {user ? 'Targets are computed from your profile. ' : ''}
          Health figures are population estimates, not medical advice.
        </p>
      </FadeIn>

      <LogWaterModal open={waterOpen} onClose={() => setWaterOpen(false)} onSaved={refetch} />
      <LogWeightModal open={weightOpen} onClose={() => setWeightOpen(false)} onSaved={refetch} />
      {isRefreshing ? <span className="sr-only" aria-live="polite">Refreshing</span> : null}
      {!data ? <InlineNotice message="No data" /> : null}
    </div>
  );
}
