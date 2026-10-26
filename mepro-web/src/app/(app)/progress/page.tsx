'use client';

/**
 * Progress: the window `/progress` was designed around. The range chips
 * re-request the overview, while the summary (nutrition + hydration history)
 * always covers its own fixed server-side window, so it is fetched once.
 */

import { useState } from 'react';

import { ApiError } from '@/lib/api';
import type { Paged, Progress, ProgressSummary, WorkoutSession } from '@/lib/types';
import {
  clampPercent,
  formatCalories,
  formatEnumLabel,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatRelativeDay,
} from '@/lib/format';
import { progressApi, workoutApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { Button, Card, Chip, Pill, ProgressBar, StatTile } from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { BarList, TrendChart, type BarListItem } from '@/components/charts';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import { LogWeightModal } from '@/components/log-modals';
import { ChartIcon, DumbbellIcon, FireIcon, RefreshIcon, ScaleIcon } from '@/components/icons';

const RANGES = [7, 30, 90] as const;
type RangeDays = (typeof RANGES)[number];

function sessionTone(status?: string): 'success' | 'brand' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'brand';
  return 'neutral';
}

/* ------------------------------------------------------------------- page */

export default function ProgressPage() {
  usePageTitle('Progress');
  const toast = useToast();

  const [days, setDays] = useState<RangeDays>(30);
  const [weightOpen, setWeightOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const overview = useApiQuery<Progress>(() => progressApi.overview(days), [days]);
  const summary = useApiQuery<ProgressSummary>(() => progressApi.summary(), []);
  const history = useApiQuery<Paged<WorkoutSession>>(
    () => workoutApi.history({ limit: 6, type: 'all' }),
    [],
  );

  const series = overview.data?.series ?? [];
  const workoutStats = overview.data?.workoutStats;

  const weightPoints = (overview.data?.weightHistory ?? []).map((entry) => ({
    label: entry.day,
    // A missing weight is a gap in the line, not a zero — NaN drops it.
    value: entry.weightKg ?? Number.NaN,
  }));
  const usableWeights = weightPoints.filter((point) => Number.isFinite(point.value));

  const nutritionPoints = (summary.data?.nutritionHistory ?? []).map((entry) => ({
    label: entry.day,
    value: entry.calories,
  }));

  const hydrationItems: BarListItem[] = (summary.data?.hydrationHistory ?? [])
    .slice(-7)
    .map((entry) => ({
      label: entry.day,
      value: entry.totalMl,
      hint: `${entry.percent}%`,
    }));

  const categoryItems: BarListItem[] = (workoutStats?.byCategory ?? []).map((entry) => ({
    label: formatEnumLabel(entry.category),
    value: entry.minutes,
    hint: `${entry.count} session${entry.count === 1 ? '' : 's'}`,
  }));

  const activeDays = series.filter(
    (entry) =>
      (entry.workoutCount ?? 0) > 0 ||
      (entry.yogaCount ?? 0) > 0 ||
      (entry.foodLogs ?? 0) > 0 ||
      (entry.waterMl ?? 0) > 0,
  ).length;

  const consistency = days > 0 ? clampPercent((activeDays / days) * 100) : 0;
  const hasActivity = activeDays > 0 || usableWeights.length > 0;

  async function syncToday() {
    if (syncing) return;
    setSyncing(true);
    try {
      await progressApi.sync();
      toast.success('Streak updated');
      overview.refetch();
      summary.refetch();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not sync today.');
    } finally {
      setSyncing(false);
    }
  }

  if (overview.isLoading && !overview.data) {
    return (
      <PageBody className="space-y-4">
        <div className="card h-28" />
        <SkeletonList rows={4} />
      </PageBody>
    );
  }

  if (overview.error && !overview.data) {
    return (
      <PageBody>
        <ErrorState error={overview.error} onRetry={overview.refetch} />
      </PageBody>
    );
  }

  if (!overview.data) return null;

  const { range, streak } = overview.data;
  const sessions = history.data?.items ?? [];

  return (
    <PageBody className="space-y-5">
      {/* ---------------------------------------------------------- header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-mute">
            {range.from && range.to ? `${range.from} → ${range.to}` : `Last ${days} days`}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">Progress</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {RANGES.map((value) => (
              <Chip key={value} active={days === value} onClick={() => setDays(value)}>
                {value} days
              </Chip>
            ))}
          </div>
          <Button size="sm" onClick={() => setWeightOpen(true)}>
            <ScaleIcon className="h-4 w-4" />
            Log weight
          </Button>
          <Button variant="secondary" size="sm" loading={syncing} onClick={() => void syncToday()}>
            <RefreshIcon className="h-4 w-4" />
            Sync today
          </Button>
        </div>
      </FadeIn>

      {/* ---------------------------------------------------------- stats */}
      {/* workoutStats come from /workouts/stats and are all-time, so only the
          active-days tile actually follows the selected range. */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatTile
            label="Sessions"
            value={formatNumber(workoutStats?.totalSessions)}
            hint="completed to date"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Minutes trained"
            value={formatMinutes(workoutStats?.totalMinutes)}
            hint="all sessions"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Calories burned"
            value={formatCalories(workoutStats?.totalCalories)}
            tone="success"
            hint="from training"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Active days"
            value={formatNumber(activeDays)}
            tone="warning"
            hint={`of the last ${days} days`}
          />
        </StaggerItem>
      </Stagger>

      {!hasActivity ? (
        <FadeIn delay={0.08}>
          <EmptyState
            title="Nothing logged yet"
            message="Log a weight, finish a workout or drink a glass of water — this page fills itself in."
            icon={<ChartIcon className="h-5 w-5" />}
            action={
              <Button size="sm" onClick={() => setWeightOpen(true)}>
                <ScaleIcon className="h-4 w-4" />
                Log weight
              </Button>
            }
          />
        </FadeIn>
      ) : (
        <>
          {/* -------------------------------------- weight + consistency */}
          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn delay={0.06}>
              <Card className="h-full p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">Weight</h3>
                  <Pill tone="neutral">{usableWeights.length} logged</Pill>
                </div>
                {usableWeights.length >= 2 ? (
                  <TrendChart
                    points={weightPoints}
                    unit=" kg"
                    formatValue={(value) => value.toFixed(1)}
                  />
                ) : (
                  <InlineNotice message="Log your weight to see the trend." />
                )}
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="h-full p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">
                    Consistency
                  </h3>
                  <Pill tone={streak.activeToday ? 'success' : 'neutral'}>
                    <FireIcon className="h-3.5 w-3.5" />
                    {streak.current}-day streak
                  </Pill>
                </div>

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

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="text-sub">Consistency</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {formatPercent(consistency)}
                    </span>
                  </div>
                  <ProgressBar percent={consistency} tone="success" height="h-1.5" />
                  <p className="mt-1.5 text-[12px] text-mute">
                    Activity on {activeDays} of the last {days} days
                  </p>
                </div>

                {streak.milestones && streak.milestones.length > 0 ? (
                  <ul className="mt-4 space-y-2.5 border-t border-line pt-3.5">
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
              </Card>
            </FadeIn>
          </div>

          {/* ------------------------------------- calories + hydration */}
          {summary.isLoading && !summary.data ? (
            <SkeletonList rows={3} />
          ) : summary.error && !summary.data ? (
            <ErrorState error={summary.error} onRetry={summary.refetch} compact />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <FadeIn delay={0.12}>
                <Card className="h-full p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">
                      Calories eaten
                    </h3>
                    <Pill tone="neutral">30-day history</Pill>
                  </div>
                  {nutritionPoints.length >= 2 ? (
                    <TrendChart points={nutritionPoints} tone="success" unit=" kcal" />
                  ) : (
                    <InlineNotice tone="info" message="Log a meal to start the calorie trend." />
                  )}
                </Card>
              </FadeIn>

              <FadeIn delay={0.16}>
                <Card className="h-full p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">
                      Water
                    </h3>
                    <Pill tone="info">last 7 days</Pill>
                  </div>
                  <BarList items={hydrationItems} unit=" ml" tone="info" />
                </Card>
              </FadeIn>
            </div>
          )}

          {/* --------------------------- time by category + recent sessions */}
          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn delay={0.2}>
              <Card className="h-full p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">
                    Time by category
                  </h3>
                  <Pill tone="neutral">all time</Pill>
                </div>
                <BarList items={categoryItems} unit=" min" />
              </Card>
            </FadeIn>

            <FadeIn delay={0.24}>
              <Card className="h-full p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">
                    Recent sessions
                  </h3>
                  <Pill tone="neutral">{sessions.length}</Pill>
                </div>

                {history.isLoading && !history.data ? (
                  <SkeletonList rows={3} />
                ) : history.error && !history.data ? (
                  <ErrorState error={history.error} onRetry={history.refetch} compact />
                ) : sessions.length === 0 ? (
                  <EmptyState
                    title="No sessions yet"
                    message="Finish a workout and it lands here."
                    icon={<DumbbellIcon className="h-5 w-5" />}
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {sessions.map((session) => (
                      <li
                        key={session._id}
                        className="flex items-center gap-3 rounded-xl bg-alt/70 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-ink">
                            {session.title ?? 'Session'}
                          </p>
                          <p className="truncate text-[12px] text-sub">
                            {session.day ? formatRelativeDay(session.day) : '—'} ·{' '}
                            {formatMinutes(session.durationMinutes)} ·{' '}
                            {formatCalories(session.caloriesBurned)}
                          </p>
                        </div>
                        <Pill tone={sessionTone(session.status)}>
                          {session.status ? formatEnumLabel(session.status) : '—'}
                        </Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </FadeIn>
          </div>
        </>
      )}

      <FadeIn delay={0.28}>
        <p className="pb-2 text-center text-[11.5px] text-mute">
          Weight, calorie and streak figures come from your own logs — estimates, not medical advice.
        </p>
      </FadeIn>

      <LogWeightModal
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        onSaved={() => {
          overview.refetch();
          summary.refetch();
        }}
      />
      {overview.isRefreshing ? (
        <span className="sr-only" aria-live="polite">
          Refreshing
        </span>
      ) : null}
    </PageBody>
  );
}
