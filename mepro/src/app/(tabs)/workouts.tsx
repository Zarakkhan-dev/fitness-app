/**
 * Train.
 *
 * The tab shows two collections with different shapes, so the query result is a
 * tagged union rather than a bare list. A plain `Paged<Workout> | Paged<YogaRoutine>`
 * would leave the renderer unable to narrow, and casting would hide real drift
 * between the two types.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Body, Caption, Card, Chip, Pill, Screen, Spacer } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { workoutApi, yogaApi } from '@/lib/endpoints';
import { formatEnumLabel, formatMinutes } from '@/lib/format';
import type { Workout, YogaRoutine } from '@/lib/types';

type Mode = 'strength' | 'yoga';

type TrainEntry =
  | { kind: 'workout'; workout: Workout }
  | { kind: 'yoga'; routine: YogaRoutine };

const CATEGORIES = ['all', 'lower_body', 'upper_body', 'core', 'hiit', 'mobility', 'stretching'] as const;
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'] as const;

export default function WorkoutsScreen() {
  const [mode, setMode] = useState<Mode>('strength');
  const [category, setCategory] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');

  // `deps` is the whole cache key: the mode and the filters are what the
  // request depends on, so changing any of them refetches.
  const { data: entries, isLoading, isRefreshing, error, refetch } = useApiQuery(
    async (): Promise<TrainEntry[]> => {
      if (mode === 'strength') {
        const page = await workoutApi.list({
          limit: 30,
          category: category === 'all' ? undefined : category,
          difficulty: difficulty === 'all' ? undefined : difficulty,
        });
        return page.items.map((workout) => ({ kind: 'workout', workout }));
      }
      const page = await yogaApi.list({
        limit: 30,
        category: category === 'all' ? undefined : category,
      });
      return page.items.map((routine) => ({ kind: 'yoga', routine }));
    },
    [mode, category, difficulty],
    { refetchOnFocus: false },
  );

  const items = entries ?? [];
  const hasFilters = category !== 'all' || difficulty !== 'all';

  function clearFilters() {
    setCategory('all');
    setDifficulty('all');
  }

  if (isLoading && !entries) return <Loading label="Loading sessions…" />;

  if (error && !entries) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <Body style={{ fontWeight: '700' }}>Train</Body>
      <Caption>Pick a session and start when you are ready.</Caption>

      <Spacer size={Spacing.three} />

      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Chip label="Strength" selected={mode === 'strength'} onPress={() => setMode('strength')} />
        <Chip label="Yoga" selected={mode === 'yoga'} onPress={() => setMode('yoga')} />
      </View>

      <Spacer size={Spacing.three} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {CATEGORIES.map((value) => (
          <Chip
            key={value}
            label={value === 'all' ? 'All' : formatEnumLabel(value)}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </View>

      {/* Yoga has no difficulty filter, so it is only offered in strength mode. */}
      {mode === 'strength' ? (
        <>
          <Spacer size={Spacing.two} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {DIFFICULTIES.map((value) => (
              <Chip
                key={value}
                label={value === 'all' ? 'Any level' : formatEnumLabel(value)}
                selected={difficulty === value}
                onPress={() => setDifficulty(value)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Spacer size={Spacing.four} />

      {error ? <ErrorState error={error} onRetry={refetch} compact /> : null}

      {items.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          message="Try a different category or level."
          action={hasFilters ? { label: 'Clear filters', onPress: clearFilters } : undefined}
        />
      ) : (
        items.map((entry) =>
          entry.kind === 'workout' ? (
            <WorkoutRow key={entry.workout._id} workout={entry.workout} />
          ) : (
            <YogaRow key={entry.routine._id} routine={entry.routine} />
          ),
        )
      )}
    </Screen>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  return (
    <View>
      <Card
        onPress={() => router.push(`/workout/${workout._id}`)}
        accessibilityLabel={`${workout.title}, ${formatMinutes(workout.durationMinutes)}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Pill label={formatEnumLabel(workout.category)} tone="brand" />
          <Pill label={formatEnumLabel(workout.difficulty)} />
        </View>
        <Spacer size={Spacing.two} />
        <Body style={{ fontWeight: '600' }}>{workout.title}</Body>
        <Spacer size={Spacing.one} />
        <Caption>{workout.description}</Caption>
        <Spacer size={Spacing.two} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Caption>{formatMinutes(workout.durationMinutes)}</Caption>
          <Caption>{workout.estimatedCalories} kcal</Caption>
        </View>
      </Card>
      <Spacer size={Spacing.two} />
    </View>
  );
}

function YogaRow({ routine }: { routine: YogaRoutine }) {
  return (
    <View>
      <Card
        onPress={() => router.push(`/yoga/${routine._id}`)}
        accessibilityLabel={routine.title}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Pill label={formatEnumLabel(routine.category)} tone="brand" />
          <Pill label={formatEnumLabel(routine.level ?? routine.difficulty ?? 'all levels')} />
        </View>
        <Spacer size={Spacing.two} />
        <Body style={{ fontWeight: '600' }}>{routine.title}</Body>
        <Spacer size={Spacing.one} />
        <Caption>{routine.description}</Caption>
        <Spacer size={Spacing.two} />
        <Caption>{formatMinutes(routine.durationMinutes)}</Caption>
      </Card>
      <Spacer size={Spacing.two} />
    </View>
  );
}
