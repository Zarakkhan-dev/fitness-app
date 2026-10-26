/**
 * Workout detail and session control.
 *
 * Starting a session is the only write on this screen, so the three states a
 * session can be in (idle, active, just finished) are handled explicitly rather
 * than inferred.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { ErrorState, Loading } from '@/components/states';
import {
  Body,
  Button,
  Caption,
  Card,
  Divider,
  Heading,
  Pill,
  Screen,
  SectionHeader,
  Spacer,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { workoutApi } from '@/lib/endpoints';
import { elapsedSessionMinutes } from '@/lib/session-math';
import { formatEnumLabel, formatMinutes } from '@/lib/format';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const workoutQuery = useApiQuery(() => workoutApi.detail(id), [id], { refetchOnFocus: false });
  const sessionQuery = useApiQuery(() => workoutApi.activeSession(), []);

  const workout = workoutQuery.data;
  const activeSession = sessionQuery.data;

  async function start() {
    if (!workout) return;
    setBusy(true);
    setActionError(null);
    try {
      // The server resumes an in-progress session for this workout rather than
      // rejecting a second start, so the response tells us which happened.
      const result = await workoutApi.startSession(workout._id);
      setNotice(result.resumed ? 'Resumed your earlier session.' : 'Session started.');
      sessionQuery.refetch();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught : new ApiError('Could not start the session.', 0, 'UNKNOWN'));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    // Completion is keyed by the workout id, so both must be present.
    if (!activeSession || !workout) return;
    setBusy(true);
    setActionError(null);
    try {
      // Completion is keyed by the workout id and the server requires a
      // duration, so the elapsed time since the session started is sent.
      const durationMinutes = elapsedSessionMinutes(activeSession.startedAt);
      await workoutApi.completeSession(workout._id, { durationMinutes });
      setNotice(`Logged ${durationMinutes} min. Nice work.`);
      sessionQuery.refetch();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught : new ApiError('Could not log the session.', 0, 'UNKNOWN'));
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    if (!activeSession) return;
    setBusy(true);
    setActionError(null);
    try {
      await workoutApi.abandonSession(activeSession._id);
      sessionQuery.refetch();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught : new ApiError('Could not discard the session.', 0, 'UNKNOWN'));
    } finally {
      setBusy(false);
    }
  }

  if (workoutQuery.isLoading && !workout) return <Loading />;

  if (workoutQuery.error && !workout) {
    return (
      <Screen>
        <ErrorState error={workoutQuery.error} onRetry={workoutQuery.refetch} />
      </Screen>
    );
  }

  if (!workout) return null;

  const hasActiveSession = Boolean(activeSession);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={workoutQuery.isRefreshing}
          onRefresh={workoutQuery.refetch}
          tintColor="#208AEF"
        />
      }>
      <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
        <Pill label={formatEnumLabel(workout.category)} tone="brand" />
        <Pill label={formatEnumLabel(workout.difficulty)} />
        {workout.location ? <Pill label={formatEnumLabel(workout.location)} /> : null}
      </View>

      <Spacer size={Spacing.two} />
      <Heading>{workout.title}</Heading>
      <Spacer size={Spacing.one} />
      <Body muted>{workout.description}</Body>

      <Spacer size={Spacing.three} />
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Caption>{formatMinutes(workout.durationMinutes)}</Caption>
        <Caption>·</Caption>
        <Caption>{workout.estimatedCalories} kcal</Caption>
      </View>

      <Spacer size={Spacing.four} />

      {actionError ? <ErrorState error={actionError} compact /> : null}
      {notice ? <Caption style={{ color: theme.success }}>{notice}</Caption> : null}

      {hasActiveSession ? (
        <Card>
          <Body style={{ fontWeight: '600' }}>Session in progress</Body>
          <Spacer size={Spacing.one} />
          <Caption>
            {activeSession?.title ?? workout.title} · started{' '}
            {activeSession?.startedAt ? new Date(activeSession.startedAt).toLocaleTimeString() : 'recently'}
          </Caption>
          <Spacer size={Spacing.three} />
          <Button label="Log it as done" onPress={complete} disabled={busy} loading={busy} />
          <Spacer size={Spacing.two} />
          <Button label="Discard" variant="ghost" onPress={abandon} disabled={busy} />
        </Card>
      ) : (
        <Button label="Start session" onPress={start} disabled={busy} loading={busy} />
      )}

      {workout.exercises && workout.exercises.length > 0 ? (
        <>
          <Spacer size={Spacing.four} />
          <SectionHeader title="Exercises" />
          {workout.exercises.map((exercise) => (
            <View key={`${exercise.order}-${exercise.name}`}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{exercise.name}</Body>
                  <Caption>{exercise.restSeconds ? `${exercise.restSeconds}s rest` : ''}</Caption>
                </View>
                <Spacer size={Spacing.one} />
                <Caption>
                  {[
                    exercise.sets ? `${exercise.sets} sets` : null,
                    exercise.reps,
                    exercise.holdSeconds ? `${exercise.holdSeconds}s hold` : null,
                    exercise.durationSeconds ? `${exercise.durationSeconds}s` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Caption>
                {exercise.instructions && exercise.instructions.length > 0 ? (
                  <>
                    <Spacer size={Spacing.two} />
                    {exercise.instructions.map((step, index) => (
                      <Caption key={index} style={{ marginTop: Spacing.one }}>
                        {index + 1}. {step}
                      </Caption>
                    ))}
                  </>
                ) : null}
              </Card>
              <Spacer size={Spacing.two} />
            </View>
          ))}
        </>
      ) : null}

      {workout.warmup && workout.warmup.length > 0 ? (
        <>
          <SectionHeader title="Warm up" />
          <Card>
            {workout.warmup.map((step, index) => (
              <Caption key={index} style={{ marginTop: index === 0 ? 0 : Spacing.one }}>
                · {step}
              </Caption>
            ))}
          </Card>
          <Spacer size={Spacing.three} />
        </>
      ) : null}

      {workout.cooldown && workout.cooldown.length > 0 ? (
        <>
          <SectionHeader title="Cool down" />
          <Card>
            {workout.cooldown.map((step, index) => (
              <Caption key={index} style={{ marginTop: index === 0 ? 0 : Spacing.one }}>
                · {step}
              </Caption>
            ))}
          </Card>
          <Spacer size={Spacing.three} />
        </>
      ) : null}

      {workout.contraindications && workout.contraindications.length > 0 ? (
        <>
          <SectionHeader title="Skip this if" />
          <Card>
            <Caption style={{ color: '#D97706' }}>
              {workout.contraindications.join(' · ')}
            </Caption>
          </Card>
          <Spacer size={Spacing.three} />
        </>
      ) : null}

      {workout.benefits && workout.benefits.length > 0 ? (
        <>
          <SectionHeader title="Why it helps" />
          <Card>
            {workout.benefits.map((benefit, index) => (
              <View key={index}>
                {index > 0 ? <Divider /> : null}
                <Caption style={{ marginTop: index === 0 ? 0 : Spacing.two }}>{benefit}</Caption>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Spacer size={Spacing.four} />
      <Button label="Back to workouts" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
