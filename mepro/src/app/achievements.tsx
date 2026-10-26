/**
 * Achievements.
 *
 * The API returns earned and locked as two arrays rather than one list with a
 * flag, so the two groups are rendered separately rather than merged.
 */

import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { ErrorState, Loading } from '@/components/states';
import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Pill,
  ProgressBar,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  Row,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { achievementApi } from '@/lib/endpoints';
import { formatEnumLabel } from '@/lib/format';
import type { Achievement } from '@/lib/types';

const TIERS = ['all', 'bronze', 'silver', 'gold'] as const;

export default function AchievementsScreen() {
  const [tier, setTier] = useState<string>('all');

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => achievementApi.list(),
    [],
    { refetchOnFocus: true },
  );

  if (isLoading && !data) return <Loading label="Loading achievements…" />;

  if (error && !data) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data) return null;

  const total = data.earned.length + data.locked.length;
  const matches = (item: Achievement) => tier === 'all' || item.tier === tier;

  const earned = data.earned.filter(matches);
  const locked = data.locked.filter(matches);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <Body style={{ fontWeight: '700' }}>Achievements</Body>
      <Caption>Badges you have earned and what is still ahead.</Caption>

      <Spacer size={Spacing.four} />

      <Row gap={Spacing.two}>
        <StatTile label="Earned" value={`${data.earned.length}`} hint={`of ${total}`} />
        <StatTile label="Points" value={`${data.totalPoints}`} />
        <StatTile
          label="Completion"
          value={`${total > 0 ? Math.round((data.earned.length / total) * 100) : 0}%`}
        />
      </Row>

      <Spacer size={Spacing.four} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {TIERS.map((value) => (
          <Chip
            key={value}
            label={value === 'all' ? 'All' : formatEnumLabel(value)}
            selected={tier === value}
            onPress={() => setTier(value)}
          />
        ))}
      </View>

      <Spacer size={Spacing.four} />

      {error ? <ErrorState error={error} onRetry={refetch} compact /> : null}

      {earned.length > 0 ? (
        <>
          <SectionHeader title="Earned" />
          {earned.map((item) => (
            <View key={item.key}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{item.title}</Body>
                  <Pill label={formatEnumLabel(item.tier)} tone="success" />
                </View>
                <Spacer size={Spacing.one} />
                <Caption>{item.description}</Caption>
                <Spacer size={Spacing.two} />
                <Caption>
                  {item.points} points
                  {item.earnedAt ? ` · earned ${new Date(item.earnedAt).toLocaleDateString()}` : ''}
                </Caption>
              </Card>
              <Spacer size={Spacing.two} />
            </View>
          ))}
          <Spacer size={Spacing.two} />
        </>
      ) : null}

      {locked.length > 0 ? (
        <>
          <SectionHeader title="Still to earn" />
          {locked.map((item) => (
            <View key={item.key}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{item.title}</Body>
                  <Pill label={formatEnumLabel(item.tier)} />
                </View>
                <Spacer size={Spacing.one} />
                <Caption>{item.description}</Caption>
                {(item.progressPercent ?? 0) > 0 ? (
                  <>
                    <Spacer size={Spacing.two} />
                    <ProgressBar percent={item.progressPercent ?? 0} tint="#8A94A3" />
                    <Spacer size={Spacing.one} />
                    <Caption>
                      {item.progress ?? 0} of {item.threshold ?? 0}
                    </Caption>
                  </>
                ) : null}
              </Card>
              <Spacer size={Spacing.two} />
            </View>
          ))}
        </>
      ) : null}

      {earned.length === 0 && locked.length === 0 ? (
        <Button label="Show all tiers" variant="secondary" onPress={() => setTier('all')} />
      ) : null}
    </Screen>
  );
}
