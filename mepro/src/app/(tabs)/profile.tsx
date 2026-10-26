/**
 * Profile and settings.
 *
 * The cached profile from the auth provider is shown first so the screen is
 * useful immediately, then refreshed in the background so an edit made
 * elsewhere shows up on the next visit.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';

import { ErrorState, Loading } from '@/components/states';
import {
  Body,
  Button,
  Caption,
  Card,
  Divider,
  Heading,
  Pill,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { userApi } from '@/lib/endpoints';
import { formatBmi, formatEnumLabel, formatEnumList, formatMinutes, formatVolume, formatWeight, initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { user: cached, logout } = useAuth();
  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => userApi.profile(),
    [],
    { refetchOnFocus: true },
  );

  const [signingOut, setSigningOut] = useState(false);
  const user = data ?? cached;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again to see your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await logout();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  if (isLoading && !user) return <Loading label="Loading your profile…" />;

  if (!user) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#E7F1FD',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Heading>{initials(user.name)}</Heading>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Heading>{user.name}</Heading>
          <Caption>{user.email}</Caption>
        </View>
      </View>

      <Spacer size={Spacing.four} />

      <Row gap={Spacing.two}>
        <StatTile label="Streak" value={`${user.streak}`} hint="days" />
        <StatTile label="Points" value={`${user.achievementPoints ?? 0}`} />
        <StatTile label="Workouts" value={`${user.totalWorkouts ?? 0}`} />
      </Row>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Body" />
      <Card>
        <DetailRow label="Height" value={user.heightCm ? `${user.heightCm} cm` : 'Not set'} />
        <Divider />
        <DetailRow label="Weight" value={formatWeight(user.weightKg)} />
        <Divider />
        <DetailRow label="Target weight" value={formatWeight(user.targetWeightKg)} />
        <Divider />
        <DetailRow
          label="BMI"
          value={user.bmi ? `${formatBmi(user.bmi)}${user.bmiCategory ? ` · ${formatEnumLabel(user.bmiCategory)}` : ''}` : 'Not set'}
        />
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Goals and activity" />
      <Card>
        <DetailRow label="Daily calories" value={user.dailyCalorieTarget ? `${user.dailyCalorieTarget} kcal` : 'Not set'} />
        <Divider />
        <DetailRow label="Daily water" value={formatVolume(user.dailyWaterTargetMl ?? null)} />
        <Divider />
        <DetailRow label="Activity level" value={formatEnumLabel(user.activityLevel ?? 'Not set')} />
        <Divider />
        <DetailRow label="Fitness level" value={formatEnumLabel(user.fitnessLevel ?? 'Not set')} />
        <Divider />
        <DetailRow label="Diet" value={formatEnumLabel(user.dietPreference ?? 'Not set')} />
        <Divider />
        <DetailRow
          label="Preferred session"
          value={
            user.preferredWorkoutMinutes
              ? `${formatMinutes(user.preferredWorkoutMinutes)}${user.preferredWorkoutLocation?.length ? ` · ${formatEnumList(user.preferredWorkoutLocation)}` : ''}`
              : 'Not set'
          }
        />
        <Divider />
        <DetailRow label="Total training" value={formatMinutes(user.totalWorkoutMinutes ?? null)} />
      </Card>

      {user.allergies && user.allergies.length > 0 ? (
        <>
          <Spacer size={Spacing.four} />
          <SectionHeader title="Allergies" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {user.allergies.map((allergy) => (
              <Pill key={allergy} label={allergy} tone="warning" />
            ))}
          </View>
        </>
      ) : null}

      <Spacer size={Spacing.four} />

      <SectionHeader title="Explore" />
      <Card style={{ gap: 0, paddingVertical: Spacing.one }}>
        <NavRow label="Goals" onPress={() => router.push('/goals')} />
        <Divider />
        <NavRow label="Achievements" onPress={() => router.push('/achievements')} />
        <Divider />
        <NavRow label="Ask the coach" onPress={() => router.push('/assistant')} />
        <Divider />
        <NavRow label="Notifications" onPress={() => router.push('/notifications')} />
        <Divider />
        <NavRow label="Log weight" onPress={() => router.push('/log-weight')} />
      </Card>

      <Spacer size={Spacing.four} />

      {!user.onboardingCompleted ? (
        <>
          <Card>
            <Body style={{ fontWeight: '600' }}>Finish setting up</Body>
            <Spacer size={Spacing.one} />
            <Caption>
              Recommendations get more accurate once your height, weight and goals are filled in.
            </Caption>
            <Spacer size={Spacing.two} />
            <Button label="Complete profile" variant="secondary" onPress={() => router.push('/goals')} />
          </Card>
          <Spacer size={Spacing.four} />
        </>
      ) : null}

      {error ? <ErrorState error={error} onRetry={refetch} compact /> : null}

      <Button
        label="Sign out"
        variant="ghost"
        onPress={confirmSignOut}
        loading={signingOut}
      />

      <Spacer size={Spacing.two} />
      <Caption style={{ textAlign: 'center' }}>
        MEPro gives general wellness estimates, not medical advice.
      </Caption>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.two,
      }}>
      <Caption>{label}</Caption>
      <Body style={{ fontWeight: '600' }}>{value}</Body>
    </View>
  );
}

function NavRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Card
      style={{ borderWidth: 0, backgroundColor: 'transparent', paddingVertical: Spacing.three }}
      onPress={onPress}
      accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Body>{label}</Body>
        <Caption>›</Caption>
      </View>
    </Card>
  );
}
