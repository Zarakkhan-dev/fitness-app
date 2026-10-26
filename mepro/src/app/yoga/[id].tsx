/**
 * Yoga routine detail.
 *
 * Yoga has no session tracking in the API, so this screen is read-only: it
 * shows the asana sequence with hold times and safety notes.
 */

import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { ErrorState, Loading } from '@/components/states';
import {
  Body,
  Caption,
  Card,
  Heading,
  Pill,
  Screen,
  SectionHeader,
  Spacer,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { yogaApi } from '@/lib/endpoints';
import { formatEnumLabel, formatMinutes } from '@/lib/format';

export default function YogaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: routine, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => yogaApi.detail(id),
    [id],
    { refetchOnFocus: false },
  );

  if (isLoading && !routine) return <Loading />;

  if (error && !routine) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  if (!routine) return null;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
        <Pill label={formatEnumLabel(routine.category)} tone="brand" />
        <Pill label={formatEnumLabel(routine.level ?? routine.difficulty ?? 'all levels')} />
        {routine.bestTimeOfDay ? <Pill label={formatEnumLabel(routine.bestTimeOfDay)} /> : null}
      </View>

      <Spacer size={Spacing.two} />
      <Heading>{routine.title}</Heading>
      <Spacer size={Spacing.one} />
      <Body muted>{routine.description}</Body>
      <Spacer size={Spacing.three} />
      <Caption>{formatMinutes(routine.durationMinutes)}</Caption>

      {routine.asanas && routine.asanas.length > 0 ? (
        <>
          <Spacer size={Spacing.four} />
          <SectionHeader title={`Sequence (${routine.asanas.length})`} />
          {routine.asanas.map((asana) => (
            <View key={`${asana.order}-${asana.name}`}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{asana.name}</Body>
                  <Caption>{asana.holdSeconds ? `${asana.holdSeconds}s` : ''}</Caption>
                </View>
                {asana.sanskritName ? <Caption>{asana.sanskritName}</Caption> : null}
                {asana.side ? <Caption>{formatEnumLabel(asana.side)} side</Caption> : null}

                {asana.instructions && asana.instructions.length > 0 ? (
                  <>
                    <Spacer size={Spacing.two} />
                    {asana.instructions.map((step, index) => (
                      <Caption key={index} style={{ marginTop: Spacing.one }}>
                        {index + 1}. {step}
                      </Caption>
                    ))}
                  </>
                ) : null}

                {asana.precautions && asana.precautions.length > 0 ? (
                  <>
                    <Spacer size={Spacing.two} />
                    <Caption style={{ color: '#D97706' }}>
                      Careful: {asana.precautions.join(' · ')}
                    </Caption>
                  </>
                ) : null}
              </Card>
              <Spacer size={Spacing.two} />
            </View>
          ))}
        </>
      ) : null}

      {routine.precautions && routine.precautions.length > 0 ? (
        <>
          <SectionHeader title="Before you start" />
          <Card>
            {routine.precautions.map((note, index) => (
              <Caption key={index} style={{ marginTop: index === 0 ? 0 : Spacing.one }}>
                · {note}
              </Caption>
            ))}
          </Card>
          <Spacer size={Spacing.three} />
        </>
      ) : null}

      {routine.benefits && routine.benefits.length > 0 ? (
        <>
          <SectionHeader title="Why it helps" />
          <Card>
            {routine.benefits.map((benefit, index) => (
              <Caption key={index} style={{ marginTop: index === 0 ? 0 : Spacing.one }}>
                · {benefit}
              </Caption>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
