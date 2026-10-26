/**
 * Nutrition.
 *
 * `/nutrition/today` already returns the totals *and* a per-meal breakdown, so
 * logging a meal only needs a refetch rather than a second aggregation on the
 * client.
 */

import { router } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { ErrorState, Loading } from '@/components/states';
import {
  Body,
  Button,
  Caption,
  Card,
  ProgressBar,
  Screen,
  SectionHeader,
  Spacer,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { nutritionApi } from '@/lib/endpoints';
import { macroSplit } from '@/lib/nutrition-math';
import { formatCalories, formatGrams, formatMealType, formatRelativeDay } from '@/lib/format';


/** Macros as a share of their grams, for the stacked bar. */
const MACROS = [
  { key: 'proteinG', label: 'Protein', tint: '#208AEF' },
  { key: 'carbsG', label: 'Carbs', tint: '#12A150' },
  { key: 'fatG', label: 'Fat', tint: '#D97706' },
] as const;

export default function NutritionScreen() {
  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery(
    () => nutritionApi.today(),
    [],
    { refetchOnFocus: true },
  );

  if (isLoading && !data) return <Loading label="Loading your nutrition…" />;

  if (error && !data) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data) return null;

  // Split by energy rather than grams, so a high-fat day is not misrepresented.
  const split = macroSplit(data);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor="#208AEF" />
      }>
      <Body style={{ fontWeight: '700' }}>Nutrition</Body>
      <Caption>{formatRelativeDay(data.day)}</Caption>

      <Spacer size={Spacing.four} />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Body style={{ fontWeight: '600' }}>Calories</Body>
          <Caption>
            {formatCalories(data.consumed)} / {formatCalories(data.target)}
          </Caption>
        </View>
        <Spacer size={Spacing.two} />
        <ProgressBar percent={data.target > 0 ? (data.consumed / data.target) * 100 : 0} />
        <Spacer size={Spacing.two} />
        <Caption>
          {data.remaining >= 0
            ? `${formatCalories(data.remaining)} left today`
            : `${formatCalories(Math.abs(data.remaining))} kcal over target`}
          {data.burned > 0 ? ` · ${formatCalories(data.burned)} burned` : ''}
        </Caption>
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Macros" />
      <Card>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden' }}>
          {MACROS.map((macro) => (
            <View
              key={macro.key}
              style={{ flex: Math.max(split[macro.key], 0.0001), backgroundColor: macro.tint }}
            />
          ))}
        </View>
        <Spacer size={Spacing.three} />
        {MACROS.map((macro) => (
          <View
            key={macro.key}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: Spacing.one,
            }}>
            <Caption style={{ color: macro.tint, fontWeight: '600' }}>{macro.label}</Caption>
            <Caption>{formatGrams(data[macro.key])}</Caption>
          </View>
        ))}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: Spacing.two,
          }}>
          <Caption>Fibre</Caption>
          <Caption>{formatGrams(data.fiberG)}</Caption>
        </View>
      </Card>

      <Spacer size={Spacing.four} />

      <SectionHeader title="Meals" />
      {data.byMeal.map((meal) => (
        <View key={meal.mealType}>
          <Card
            onPress={() => router.push('/food-search')}
            accessibilityLabel={`Add to ${formatMealType(meal.mealType)}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Body style={{ fontWeight: '600' }}>{formatMealType(meal.mealType)}</Body>
              <Caption>{meal.calories > 0 ? `${formatCalories(meal.calories)}` : 'Nothing logged'}</Caption>
            </View>
            {meal.items.length > 0 ? (
              <>
                <Spacer size={Spacing.two} />
                {meal.items.map((item) => (
                  <View
                    key={item._id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 2,
                    }}>
                    <Caption style={{ flex: 1 }} numberOfLines={1}>
                      {item.foodName}
                    </Caption>
                    <Caption>{formatGrams(item.grams)}</Caption>
                  </View>
                ))}
              </>
            ) : null}
          </Card>
          <Spacer size={Spacing.two} />
        </View>
      ))}

      <Button label="Add food" onPress={() => router.push('/food-search')} />

      {data.disclaimer ? (
        <>
          <Spacer size={Spacing.four} />
          <Caption style={{ textAlign: 'center' }}>{data.disclaimer}</Caption>
        </>
      ) : null}
    </Screen>
  );
}
