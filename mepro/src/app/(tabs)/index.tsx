/**
 * Today.
 *
 * One request drives the whole screen: the dashboard already carries the day's
 * calories, water, workout totals, the week, the active goals and a
 * recommendation, so the screen stays fast and cannot show two inconsistent
 * snapshots of the same day.
 */

import { router } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { ErrorState, Loading } from '@/components/states';


import {
  Body,
  Button,
  Caption,
  Card,
  Divider,
  Pill,
  ProgressBar,
  Screen,
  SectionHeader,
  Spacer,
  Title,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { dashboardApi } from '@/lib/endpoints';
import { formatCalories, formatMinutes, formatRelativeDay, formatVolume } from '@/lib/format';
import type { ProgressDay } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function TodayScreen() {
  const { user } = useAuth();
  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => dashboardApi.get(),
    [],
    { refetchOnFocus: true },
  );

  if (isLoading && !data) return <Loading label="Loading your day…" />;

  if (error && !data) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data) return null;

  const { today, streak, week, goals, recommendation, achievementSummary, notifications } = data;
  const activeGoals = goals.filter((goal) => goal.status !== 'completed' || goal.progressPercent < 100);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <Caption>{data.greeting}</Caption>
          <Title>{data.userName || user?.name || 'there'}</Title>
        </View>
        <Button
          label={notifications.unreadCount > 0 ? `Alerts (${notifications.unreadCount})` : 'Alerts'}
          variant="ghost"
          onPress={() => router.push('/notifications')}
        />
      </View>

      {error ? <ErrorState error={error} onRetry={refetch} compact /> : null}

      <Spacer size={Spacing.four} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Caption>Current streak</Caption>
          <Pill label={`${streak.current} day${streak.current === 1 ? '' : 's'}`} tone={streak.activeToday ? 'success' : 'neutral'} />
        </View>
        <Spacer size={Spacing.two} />
        <Body muted>
          {streak.activeToday
            ? 'Logged today. Nice work keeping it going.'
            : 'Nothing logged yet today. Any activity counts.'}
        </Body>
        {streak.longest > streak.current ? (
          <Caption style={{ marginTop: Spacing.two }}>Best so far: {streak.longest} days</Caption>
        ) : null}
      </Card>

      <Spacer size={Spacing.three} />

      <View style={{ gap: Spacing.two }}>
        <MetricRow
          label="Calories"
          value={`${formatCalories(today.calories.consumed)} / ${formatCalories(today.calories.target)}`}
          percent={today.calories.percent}
        />
        <MetricRow
          label="Water"
          value={`${(today.water.totalMl / 1000).toFixed(1)} / ${(today.water.targetMl / 1000).toFixed(1)} L`}
          percent={today.water.percent}
        />
        <MetricRow
          label="Movement"
          value={`${formatMinutes(today.workout.minutes)} / ${formatMinutes(today.workout.targetMinutes)}`}
          percent={today.workout.percent}
        />
      </View>

      <Spacer size={Spacing.four} />

      <Button label="Log water" variant="secondary" onPress={() => router.push('/log-water')} />
      <Spacer size={Spacing.two} />
      <Button label="Log weight" variant="secondary" onPress={() => router.push('/log-weight')} />

      <Spacer size={Spacing.four} />

      {recommendation ? (
        <>
          <SectionHeader title="Suggested for you" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Pill label={recommendation.type} />
            </View>
            <Spacer size={Spacing.two} />
            <Body style={{ fontWeight: '600' }}>{recommendation.title}</Body>
            <Spacer size={Spacing.one} />
            <Body muted>{recommendation.recommendation}</Body>
            <Spacer size={Spacing.two} />
            <Caption>{recommendation.reason}</Caption>
          </Card>
          <Spacer size={Spacing.four} />
        </>
      ) : null}

      <SectionHeader title="This week" action={{ label: 'See progress', onPress: () => router.push('/(tabs)/progress') }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((day) => (
            <DayColumn key={day.day} day={day} isToday={day.day === data.date} />
          ))}
        </View>
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Goals" action={{ label: 'Manage', onPress: () => router.push('/goals') }} />
      {activeGoals.length === 0 ? (
        <Card>
          <Body muted>No active goals yet.</Body>
        </Card>
      ) : (
        activeGoals.slice(0, 3).map((goal) => (
          <View key={goal._id}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Body style={{ fontWeight: '600', flex: 1 }}>{goal.title}</Body>
                <Caption>{Math.round(goal.progressPercent)}%</Caption>
              </View>
              <Spacer size={Spacing.two} />
              <ProgressBar percent={goal.progressPercent} />
              <Spacer size={Spacing.one} />
              <Caption>
                {goal.currentValue} of {goal.targetValue} {goal.unit}
              </Caption>
            </Card>
            <Spacer size={Spacing.two} />
          </View>
        ))
      )}

      <Spacer size={Spacing.four} />

      <SectionHeader
        title="Achievements"
        action={{ label: 'All', onPress: () => router.push('/achievements') }}
      />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Pill label={`${achievementSummary.earnedCount}/${achievementSummary.totalCount}`} tone="success" />
          <Caption>{achievementSummary.totalPoints} points</Caption>
        </View>
        {achievementSummary.recent.length > 0 ? (
          <>
            <Spacer size={Spacing.two} />
            <Divider />
            <Spacer size={Spacing.two} />
            {achievementSummary.recent.slice(0, 3).map((item) => (
              <View key={item.key} style={{ paddingVertical: Spacing.one }}>
                <Caption style={{ fontWeight: '600' }}>{item.title}</Caption>
                <Caption>{item.description}</Caption>
              </View>
            ))}
          </>
        ) : null}
      </Card>

      {data.disclaimer ? (
        <>
          <Spacer size={Spacing.four} />
          <Caption style={{ textAlign: 'center' }}>{data.disclaimer}</Caption>
        </>
      ) : null}
    </Screen>
  );
}

function MetricRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Body style={{ fontWeight: '600' }}>{label}</Body>
        <Caption>{value}</Caption>
      </View>
      <Spacer size={Spacing.two} />
      {/* The server's percent can exceed 100 after a surplus; the bar clamps so
          it never renders past its track. */}
      <ProgressBar percent={percent} />
    </Card>
  );
}

function DayColumn({ day, isToday }: { day: ProgressDay; isToday: boolean }) {
  const active = (day.workoutCount ?? 0) + (day.yogaCount ?? 0) > 0;
  const logged = active || (day.foodLogs ?? 0) > 0 || (day.waterMl ?? 0) > 0;
  return (
    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <Caption style={{ fontWeight: isToday ? '700' : '400' }}>{formatRelativeDay(day.day)}</Caption>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 1.5,
          borderColor: isToday ? '#208AEF' : logged ? '#9BB4CC' : '#D8E2EC',
          backgroundColor: isToday ? '#208AEF' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <Caption>{formatVolume(day.waterMl ?? 0)}</Caption>
    </View>
  );
}
