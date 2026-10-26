/**
 * Goals.
 *
 * The server recalculates progress from the user's own logs, so this screen
 * only ever *creates* and *archives* goals; the progress numbers shown are the
 * server's and are not computed here.
 */

import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';

import { Field, NumberField } from '@/components/field';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Divider,
  Heading,
  Pill,
  ProgressBar,
  Screen,
  SectionHeader,
  Spacer,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/lib/api';
import { goalApi } from '@/lib/endpoints';
import { formatSignedWeight, todayIso } from '@/lib/format';

import { useAuth } from '@/providers/auth-provider';

const GOAL_TYPES = [
  { value: 'weight_loss', label: 'Lose weight' },
  { value: 'weight_gain', label: 'Gain weight' },
  { value: 'muscle_gain', label: 'Build muscle' },
  { value: 'workout_frequency', label: 'Train regularly' },
  { value: 'water_intake', label: 'Drink more water' },
  { value: 'calorie_target', label: 'Hit calories' },
  { value: 'general_fitness', label: 'General fitness' },
] as const;

const UNITS: Record<string, string> = {
  weight_loss: 'kg',
  weight_gain: 'kg',
  muscle_gain: 'kg',
  workout_frequency: 'sessions',
  water_intake: 'L',
  calorie_target: 'kcal',
  general_fitness: 'sessions',
};

export default function GoalsScreen() {
  const { user } = useAuth();
  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => goalApi.list({ limit: 50 }),
    [],
    { refetchOnFocus: true },
  );

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState<string>('workout_frequency');
  const [targetValue, setTargetValue] = useState('4');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);

  const goals = data?.items ?? [];
  const active = goals.filter((goal) => goal.status !== 'completed');
  const done = goals.filter((goal) => goal.status === 'completed');

  const parsedTarget = Number(targetValue);
  const unit = UNITS[goalType] ?? 'units';
  const canSave = title.trim().length > 0 && Number.isFinite(parsedTarget) && parsedTarget > 0 && !saving;

  function resetForm() {
    setTitle('');
    setTargetValue('4');
    setTargetDate('');
    setFormError(null);
  }

  async function create() {
    setSaving(true);
    setFormError(null);
    try {
      await goalApi.create({
        title: title.trim(),
        goalType,
        targetValue: parsedTarget,
        unit,
        // `todayIso` keeps the payload a plain date string the API accepts.
        targetDate: targetDate ? targetDate : undefined,
        description: undefined,
      });
      resetForm();
      setCreating(false);
      refetch();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught : new ApiError('Could not create that goal.', 0, 'UNKNOWN'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: string, goalTitle: string) {
    Alert.alert('Delete goal?', goalTitle, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalApi.remove(id);
            refetch();
          } catch {
            // The list refetch on focus will reconcile whatever happened.
          }
        },
      },
    ]);
  }

  if (isLoading && !data) return <Loading label="Loading goals…" />;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <Body style={{ fontWeight: '700' }}>Goals</Body>
      <Caption>Progress updates from your own logs.</Caption>

      <Spacer size={Spacing.four} />

      {error ? <ErrorState error={error} onRetry={refetch} /> : null}

      {!creating ? (
        <>
          {active.length === 0 && done.length === 0 ? (
            <EmptyState
              title="No goals yet"
              message="Set one and MEPro will track it as you log."
              action={{ label: 'Create a goal', onPress: () => setCreating(true) }}
            />
          ) : null}

          {active.map((goal) => (
            <View key={goal._id}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{goal.title}</Body>
                  <Pill label={Math.round(goal.progressPercent) + '%'} tone="brand" />
                </View>
                {goal.description ? <Caption>{goal.description}</Caption> : null}
                <Spacer size={Spacing.two} />
                <ProgressBar percent={goal.progressPercent} />
                <Spacer size={Spacing.two} />
                <Caption>
                  {goal.currentValue} of {goal.targetValue} {goal.unit}
                  {goal.targetDate ? ` · by ${goal.targetDate}` : ''}
                </Caption>
                <Spacer size={Spacing.two} />
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <Button
                    label="Delete"
                    variant="ghost"
                    onPress={() => confirmDelete(goal._id, goal.title)}
                  />
                </View>
              </Card>
              <Spacer size={Spacing.two} />
            </View>
          ))}

          {done.length > 0 ? (
            <>
              <SectionHeader title="Completed" />
              {done.map((goal) => (
                <View key={goal._id}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Body style={{ fontWeight: '600', flex: 1, textDecorationLine: 'line-through' }}>
                        {goal.title}
                      </Body>
                      <Pill label="Done" tone="success" />
                    </View>
                    <Spacer size={Spacing.one} />
                    <Caption>
                      Reached {goal.targetValue} {goal.unit}
                    </Caption>
                  </Card>
                  <Spacer size={Spacing.two} />
                </View>
              ))}
            </>
          ) : null}

          <Button label="Create a goal" onPress={() => setCreating(true)} />
        </>
      ) : (
        <Card style={{ gap: Spacing.three }}>
          <Heading>New goal</Heading>

          {formError ? <ErrorState error={formError} compact /> : null}

          <Field
            label="What do you want to achieve?"
            value={title}
            onChangeText={setTitle}
            placeholder="Train 4 times this week"
            autoFocus
            error={formError?.fieldErrors.title}
          />

          <View style={{ gap: Spacing.two }}>
            <Caption style={{ fontWeight: '600' }}>Type</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {GOAL_TYPES.map((type) => (
                <Chip
                  key={type.value}
                  label={type.label}
                  selected={goalType === type.value}
                  onPress={() => {
                    setGoalType(type.value);
                    // A weight goal with no current weight is rejected by the
                    // API, so warn before the round trip.
                    setFormError(null);
                  }}
                />
              ))}
            </View>
          </View>

          <NumberField
            label="Target"
            value={targetValue}
            onChangeText={setTargetValue}
            suffix={unit}
            error={targetValue.length > 0 && !Number.isFinite(parsedTarget) ? 'Enter a number' : undefined}
          />

          <Field
            label="Target date (optional)"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            hint={`Leave blank for no deadline. Today is ${todayIso()}.`}
            error={formError?.fieldErrors.targetDate}
          />

          {goalType === 'weight_loss' || goalType === 'weight_gain' ? (
            <Caption style={{ color: '#D97706' }}>
              Weight goals need a logged weight as the baseline. Log your weight first if this fails.
            </Caption>
          ) : null}

          {user && goalType === 'weight_loss' && user.weightKg && user.targetWeightKg ? (
            <>
              <Divider />
              <Caption>
                You are {user.weightKg} kg heading to {user.targetWeightKg} kg — that is{' '}
                {formatSignedWeight(user.targetWeightKg - user.weightKg)}.
              </Caption>
            </>
          ) : null}

          <Button label="Create" onPress={create} disabled={!canSave} loading={saving} />
          <Button label="Cancel" variant="ghost" onPress={() => setCreating(false)} disabled={saving} />
        </Card>
      )}
    </Screen>
  );
}
