/**
 * Progress.
 *
 * One `/progress` request covers the range switch: the weight series, the
 * workout breakdown and the streak all come from it, so changing the range never
 * leaves the screen showing two different periods.
 */

import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { BarList, TrendChart } from '@/components/chart';
import { ErrorState, Loading } from '@/components/states';
import {
  Body,
  Caption,
  Card,
  Chip,
  Heading,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { progressApi } from '@/lib/endpoints';
import { clampPercent, formatEnumLabel, formatMinutes, formatVolume, formatWeight } from '@/lib/format';

const RANGES = [7, 30, 90] as const;

export default function ProgressScreen() {
  const [days, setDays] = useState<number>(30);

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => progressApi.overview(days),
    [days],
    { refetchOnFocus: false },
  );

  if (isLoading && !data) return <Loading label="Loading your progress…" />;

  if (error && !data) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data) return null;

  const weightPoints = data.weightHistory.map((entry) => ({
    label: entry.day,
    value: entry.weightKg ?? Number.NaN,
  }));

  const activeDays = data.series.filter(
    (day) => (day.workoutCount ?? 0) + (day.yogaCount ?? 0) > 0,
  ).length;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <Body style={{ fontWeight: '700' }}>Progress</Body>
      <Caption>
        {formatRelativeRange(data.range.from, data.range.to)}
      </Caption>

      <Spacer size={Spacing.three} />

      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {RANGES.map((value) => (
          <Chip
            key={value}
            label={`${value} days`}
            selected={days === value}
            onPress={() => setDays(value)}
          />
        ))}
      </View>

      <Spacer size={Spacing.four} />

      {error ? <ErrorState error={error} onRetry={refetch} compact /> : null}

      <Row gap={Spacing.two}>
        <StatTile label="Sessions" value={String(data.workoutStats.totalSessions)} />
        <StatTile label="Minutes" value={formatMinutes(data.workoutStats.totalMinutes)} />
        <StatTile label="Active days" value={`${activeDays}/${data.range.days}`} />
      </Row>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Weight" />
      <Card>
        <TrendChart
          points={weightPoints}
          unit=" kg"
          formatValue={(value) => formatWeight(value)}
        />
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Where the time went" />
      <Card>
        <BarList
          items={data.workoutStats.byCategory.map((entry) => ({
            label: formatEnumLabel(entry.category),
            value: entry.minutes,
            hint: formatMinutes(entry.minutes),
          }))}
        />
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Streak" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading>{data.streak.current} days</Heading>
          <Caption>Best: {data.streak.longest}</Caption>
        </View>
        <Spacer size={Spacing.two} />
        <ProgressBar
          percent={clampPercent(
            (data.streak.current / Math.max(1, data.streak.milestones?.at(-1)?.days ?? data.streak.current)) * 100,
          )}
        />
        {data.streak.milestones && data.streak.milestones.length > 0 ? (
          <>
            <Spacer size={Spacing.three} />
            {data.streak.milestones.map((milestone) => (
              <View
                key={milestone.days}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.one,
                }}>
                <Caption style={{ fontWeight: milestone.reached ? '600' : '400' }}>
                  {milestone.label}
                </Caption>
                <Caption style={{ color: milestone.reached ? '#12A150' : undefined }}>
                  {milestone.reached ? 'Reached' : `${milestone.days} days`}
                </Caption>
              </View>
            ))}
          </>
        ) : null}
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Water and food" />
      <Card>
        <BarList
          items={data.series
            .filter((day) => (day.waterMl ?? 0) > 0)
            .slice(-7)
            .map((day) => ({
              label: day.day,
              value: day.waterMl ?? 0,
              hint: formatVolume(day.waterMl ?? 0),
            }))}
        />
      </Card>
    </Screen>
  );
}

function formatRelativeRange(from: string, to: string): string {
  return `${from} to ${to}`;
}
