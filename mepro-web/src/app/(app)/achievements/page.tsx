'use client';

/**
 * Achievements: the split list the API returns (earned / locked) rendered as
 * two sections behind one tier filter, plus an on-demand re-evaluation for
 * badges earned while the tab was closed.
 */

import { useState } from 'react';

import { ApiError } from '@/lib/api';
import type { Achievement, AchievementList, AchievementSummary } from '@/lib/types';
import { clampPercent, formatEnumLabel, formatNumber, formatPercent, formatRelativeDay } from '@/lib/format';
import { achievementApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { Button, Card, Chip, EnumPill, Pill, ProgressBar, StatTile } from '@/components/ui';
import { EmptyState, ErrorState, SkeletonList } from '@/components/states';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import { RefreshIcon, TrophyIcon } from '@/components/icons';

const TIERS = ['all', 'bronze', 'silver', 'gold'] as const;
type TierFilter = (typeof TIERS)[number];

/**
 * The catalogue stores icon *slugs* (`dumbbell`), not emoji, so the known set
 * is mapped here and anything new falls back to a neutral badge.
 */
const ICON_EMOJI: Record<string, string> = {
  book: '📖',
  clipboard: '📋',
  crown: '👑',
  droplet: '💧',
  dumbbell: '🏋️',
  flame: '🔥',
  flower: '🌸',
  play: '▶️',
  scale: '⚖️',
  sunrise: '🌅',
  target: '🎯',
  trophy: '🏆',
  'user-check': '✅',
};

function badgeEmoji(badge: Achievement): string {
  return ICON_EMOJI[badge.icon ?? ''] ?? '🏅';
}

function tierTone(tier: string): 'warning' | 'info' | 'brand' | 'neutral' {
  const value = tier.toLowerCase();
  if (value === 'bronze') return 'warning';
  if (value === 'silver') return 'info';
  if (value === 'gold') return 'brand';
  return 'neutral';
}

/** `earnedAt` arrives as a full ISO timestamp; the formatter wants a day. */
function earnedLabel(value?: string | null): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? formatRelativeDay(day) : null;
}

function lockedPercent(badge: Achievement): number {
  if (badge.progressPercent != null && Number.isFinite(badge.progressPercent)) {
    return clampPercent(badge.progressPercent);
  }
  if (badge.threshold && badge.progress != null) {
    return clampPercent((badge.progress / badge.threshold) * 100);
  }
  return 0;
}

function matchesTier(badge: Achievement, tier: TierFilter): boolean {
  return tier === 'all' || (badge.tier ?? '').toLowerCase() === tier;
}

/* ------------------------------------------------------------------- page */

export default function AchievementsPage() {
  usePageTitle('Achievements');
  const toast = useToast();

  const [tier, setTier] = useState<TierFilter>('all');
  const [checking, setChecking] = useState(false);

  const list = useApiQuery<AchievementList>(() => achievementApi.list(), []);
  const summary = useApiQuery<AchievementSummary>(() => achievementApi.summary(), []);

  async function checkForNew() {
    if (checking) return;
    setChecking(true);
    try {
      const result = await achievementApi.evaluate();
      if (result.count > 0) {
        toast.success(
          `${result.count} new badge${result.count === 1 ? '' : 's'} unlocked!`,
        );
      } else {
        toast.push({ title: 'Nothing new yet', tone: 'info' });
      }
      list.refetch();
      summary.refetch();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not check for new badges.');
    } finally {
      setChecking(false);
    }
  }

  if (list.isLoading && !list.data) {
    return (
      <PageBody className="space-y-4">
        <div className="card h-28" />
        <SkeletonList rows={4} />
      </PageBody>
    );
  }

  if (list.error && !list.data) {
    return (
      <PageBody>
        <ErrorState error={list.error} onRetry={list.refetch} />
      </PageBody>
    );
  }

  if (!list.data) return null;

  const totalCount = list.data.earned.length + list.data.locked.length;
  const completionPercent =
    totalCount > 0 ? clampPercent((list.data.earned.length / totalCount) * 100) : 0;

  const earned = list.data.earned.filter((badge) => matchesTier(badge, tier));
  const locked = list.data.locked.filter((badge) => matchesTier(badge, tier));

  return (
    <PageBody className="space-y-5">
      {/* ---------------------------------------------------------- header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-mute">
            {summary.data
              ? `${formatNumber(summary.data.earnedCount)} of ${formatNumber(summary.data.totalCount)} badges earned`
              : 'Badges for showing up'}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
            Achievements
          </h1>
        </div>
        <Button size="sm" loading={checking} onClick={() => void checkForNew()}>
          <RefreshIcon className="h-4 w-4" />
          Check for new badges
        </Button>
      </FadeIn>

      {/* -------------------------------------------------- summary tiles */}
      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatTile
            label="Earned"
            value={`${formatNumber(list.data.earned.length)} / ${formatNumber(totalCount)}`}
            hint="badges unlocked"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Points"
            value={formatNumber(list.data.totalPoints)}
            tone="warning"
            hint="from achievements"
          />
        </StaggerItem>
        <StaggerItem>
          <div className="card h-full p-4">
            <p className="text-[12px] font-semibold tracking-wide text-mute uppercase">
              Completion
            </p>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="text-2xl font-bold tracking-tight text-brand">
                {formatPercent(completionPercent)}
              </span>
              <span className="text-[12.5px] text-sub">of the catalogue</span>
            </div>
            <ProgressBar percent={completionPercent} className="mt-2.5" height="h-1.5" />
          </div>
        </StaggerItem>
      </Stagger>

      {/* ---------------------------------------------------- tier filter */}
      <FadeIn delay={0.08} className="flex flex-wrap items-center gap-2">
        {TIERS.map((value) => (
          <Chip key={value} active={tier === value} onClick={() => setTier(value)}>
            {value === 'all' ? 'All' : formatEnumLabel(value)}
          </Chip>
        ))}
        <span className="ml-auto text-[12.5px] text-mute">
          {earned.length} earned · {locked.length} to go
        </span>
      </FadeIn>

      {/* ---------------------------------------------------------- earned */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Earned</h2>
          <span className="text-[12.5px] text-mute">
            {earned.length} badge{earned.length === 1 ? '' : 's'}
          </span>
        </div>

        {earned.length === 0 ? (
          <EmptyState
            title={tier === 'all' ? 'No badges yet' : `No ${formatEnumLabel(tier)} badges yet`}
            message="Finish a workout, keep a streak or log a meal — the first one is close."
            icon={<TrophyIcon className="h-5 w-5" />}
          />
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((badge) => (
              <StaggerItem key={badge.key}>
                <Card className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[34px] leading-none" aria-hidden>
                      {badgeEmoji(badge)}
                    </span>
                    <Pill tone="brand">+{badge.points}</Pill>
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold text-ink">{badge.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-sub">{badge.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <EnumPill value={badge.tier} tone={tierTone(badge.tier)} />
                    {earnedLabel(badge.earnedAt) ? (
                      <span className="text-[12px] text-mute">{earnedLabel(badge.earnedAt)}</span>
                    ) : null}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      {/* ---------------------------------------------------- still to earn */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Still to earn</h2>
          <span className="text-[12.5px] text-mute">
            {locked.length} badge{locked.length === 1 ? '' : 's'}
          </span>
        </div>

        {locked.length === 0 ? (
          <EmptyState
            title="Everything is unlocked"
            message="You have cleared this part of the catalogue — new badges show up as the app grows."
            icon={<TrophyIcon className="h-5 w-5" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((badge) => {
              const percent = lockedPercent(badge);
              const hasFraction = badge.progress != null && badge.threshold != null;

              return (
                <Card key={badge.key} className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[34px] leading-none opacity-60" aria-hidden>
                      {badgeEmoji(badge)}
                    </span>
                    <Pill tone="neutral">+{badge.points}</Pill>
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold text-sub">{badge.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-mute">{badge.description}</p>
                  <div className="mt-4">
                    <ProgressBar percent={percent} height="h-1.5" />
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-[12px] text-mute">
                      {hasFraction ? (
                        <span className="tabular-nums">
                          {formatNumber(badge.progress)} / {formatNumber(badge.threshold)}
                        </span>
                      ) : (
                        <span>{badge.category ? formatEnumLabel(badge.category) : 'Locked'}</span>
                      )}
                      <span className="tabular-nums">{formatPercent(percent)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <FadeIn delay={0.16}>
        <p className="pb-2 text-center text-[11.5px] text-mute">
          Badges re-check automatically after workouts, logs and streak updates.
        </p>
      </FadeIn>

      {list.isRefreshing ? (
        <span className="sr-only" aria-live="polite">
          Refreshing
        </span>
      ) : null}
    </PageBody>
  );
}
