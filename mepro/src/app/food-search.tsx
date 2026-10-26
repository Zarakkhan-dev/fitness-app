/**
 * Food search and logging.
 *
 * Search is debounced rather than fired per keystroke, and the grams field
 * recomputes the previewed macros from the food's per-100 g values. The server
 * recomputes and stores the totals, so the preview here is only for feedback.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { NumberField } from '@/components/field';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Divider,
  Pill,
  Screen,
  SectionHeader,
  Spacer,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/lib/api';
import { nutritionApi } from '@/lib/endpoints';
import { macrosForGrams } from '@/lib/nutrition-math';
import { MEAL_ORDER, formatCalories, formatEnumLabel, formatGrams, formatMealType } from '@/lib/format';
import type { Food } from '@/lib/types';

const SEARCH_DEBOUNCE_MS = 350;

export default function FoodSearchScreen() {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [mealType, setMealType] = useState<string>('breakfast');
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const { data, isLoading, error, refetch } = useApiQuery(
    () => nutritionApi.foods({ search: debounced || undefined, limit: 25 }),
    [debounced],
    { enabled: debounced.length > 0, refetchOnFocus: false },
  );

  const results = useMemo(() => data?.items ?? [], [data]);

  const parsedGrams = Number(grams);
  const gramsValid = Number.isFinite(parsedGrams) && parsedGrams > 0 && parsedGrams <= 5000;

  // Food values are stored per 100 g, so the preview goes through the same
  // helper the tests cover rather than repeating the scaling inline.
  const preview = useMemo(
    () => (selected && gramsValid ? macrosForGrams(selected, parsedGrams) : null),
    [selected, gramsValid, parsedGrams],
  );

  function choose(food: Food) {
    setSelected(food);
    setSaved(false);
    setSaveError(null);
    setGrams(String(food.defaultServingGrams ?? 100));
  }

  async function save() {
    if (!selected || !gramsValid) return;
    setSaving(true);
    setSaveError(null);
    try {
      await nutritionApi.logFood({
        foodId: selected._id,
        grams: Math.round(parsedGrams),
        mealType,
      });
      setSaved(true);
      // Refetch so the search list reflects the new common-food ranking.
      refetch();
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught : new ApiError('Could not log that food.', 0, 'UNKNOWN'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Body style={{ fontWeight: '700' }}>Add food</Body>
      <Caption>Search the catalogue, then pick a meal.</Caption>

      <Spacer size={Spacing.three} />

      <Card>
        <NumberField
          label="Search"
          value={term}
          onChangeText={(next) => {
            setTerm(next);
            // A new search invalidates the chosen food, so it is cleared here
            // rather than in an effect reacting to the debounced term.
            setSelected(null);
            setSaved(false);
            setSaveError(null);
          }}
          placeholder="Rice, oats, paneer…"
          autoFocus
        />
      </Card>

      <Spacer size={Spacing.three} />

      <SectionHeader title="Meal" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {MEAL_ORDER.map((value) => (
          <Chip
            key={value}
            label={formatMealType(value)}
            selected={mealType === value}
            onPress={() => setMealType(value)}
          />
        ))}
      </View>

      <Spacer size={Spacing.four} />

      {selected ? (
        <Card>
          <Body style={{ fontWeight: '600' }}>{selected.name}</Body>
          {selected.localName ? <Caption>{selected.localName}</Caption> : null}
          <Spacer size={Spacing.two} />
          <Caption>
            {formatCalories(selected.calories)} per 100 g · P {formatGrams(selected.proteinG)} · C{' '}
            {formatGrams(selected.carbsG)} · F {formatGrams(selected.fatG)}
          </Caption>
          {selected.dietTags && selected.dietTags.length > 0 ? (
            <>
              <Spacer size={Spacing.two} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }}>
                {selected.dietTags.slice(0, 4).map((tag) => (
                  <Pill key={tag} label={formatEnumLabel(tag)} />
                ))}
              </View>
            </>
          ) : null}

          <Spacer size={Spacing.three} />
          <Divider />
          <Spacer size={Spacing.three} />

          <NumberField
            label="Amount"
            value={grams}
            onChangeText={setGrams}
            suffix="g"
            error={grams.length > 0 && !gramsValid ? 'Enter between 1 and 5000 g' : undefined}
          />

          {selected.servings && selected.servings.length > 0 ? (
            <>
              <Spacer size={Spacing.two} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                {selected.servings.map((serving) => (
                  <Chip
                    key={serving.name}
                    label={serving.name}
                    selected={parsedGrams === serving.grams}
                    onPress={() => setGrams(String(serving.grams))}
                  />
                ))}
              </View>
            </>
          ) : null}

          {preview ? (
            <>
              <Spacer size={Spacing.three} />
              <Caption>
                Adds {formatCalories(preview.calories)} · P {formatGrams(preview.proteinG)} · C{' '}
                {formatGrams(preview.carbsG)} · F {formatGrams(preview.fatG)}
              </Caption>
            </>
          ) : null}

          <Spacer size={Spacing.three} />

          {saveError ? <ErrorState error={saveError} compact /> : null}

          {saved ? (
            <Caption style={{ color: '#12A150' }}>
              Added to {formatMealType(mealType)}. Pick another food to keep logging.
            </Caption>
          ) : null}

          <Spacer size={Spacing.two} />
          <Button
            label={saved ? 'Add another' : `Log to ${formatMealType(mealType)}`}
            onPress={saved ? () => setSelected(null) : save}
            disabled={!gramsValid || saving}
            loading={saving}
          />
          <Spacer size={Spacing.two} />
          <Button label="Clear selection" variant="ghost" onPress={() => setSelected(null)} />
        </Card>
      ) : null}

      <Spacer size={Spacing.four} />

      {debounced.length === 0 ? (
        <EmptyState title="Start typing" message="Search the food catalogue by name." />
      ) : isLoading ? (
        <Loading label="Searching…" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : results.length === 0 ? (
        <EmptyState title="No matches" message={`Nothing found for “${debounced}”.`} />
      ) : (
        results.map((food) => (
          <View key={food._id}>
            <Card onPress={() => choose(food)} accessibilityLabel={food.name}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Body style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {food.name}
                </Body>
                <Caption>{formatCalories(food.calories)}</Caption>
              </View>
              <Spacer size={Spacing.one} />
              <Caption>
                {formatEnumLabel(food.category)} · per 100 g · P {formatGrams(food.proteinG)}
              </Caption>
            </Card>
            <Spacer size={Spacing.two} />
          </View>
        ))
      )}
    </Screen>
  );
}
