'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ApiError } from '@/lib/api';
import { formatCalories, formatGrams, formatEnumLabel, MEAL_ORDER } from '@/lib/format';
import { macroSplit } from '@/lib/nutrition-math';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { nutritionApi, hydrationApi, progressApi } from '@/lib/endpoints';
import type { NutritionToday, HydrationToday, ProgressSummary, FoodLog } from '@/lib/types';
import {
  Button,
  Card,
  ProgressBar,
} from '@/components/ui';
import { ErrorState, SkeletonList } from '@/components/states';
import { LogFoodModal } from '@/components/log-modals';
import { MacroBar, ProgressRing, TrendChart } from '@/components/charts';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import { DropIcon, SearchIcon, TrashIcon } from '@/components/icons';

export default function NutritionPage() {
  usePageTitle('Nutrition');
  const toast = useToast();

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogMeal, setQuickLogMeal] = useState('breakfast');

  const nutritionQuery = useApiQuery<NutritionToday>(
    () => nutritionApi.today(),
    [],
    { refetchOnFocus: true },
  );

  const hydrationQuery = useApiQuery<HydrationToday>(
    () => hydrationApi.today(),
    [],
    { refetchOnFocus: true },
  );

  const summaryQuery = useApiQuery<ProgressSummary>(
    () => progressApi.summary(),
    [],
    { refetchOnFocus: true },
  );

  const handleHydrate = async (amountMl: number) => {
    try {
      await hydrationApi.add(amountMl, amountMl === 250 ? 'quick_add' : 'custom');
      toast.success('Water logged', `${amountMl} ml added to today.`);
      hydrationQuery.refetch();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not log water.');
    }
  };

  const handleRemoveLog = async (id: string) => {
    try {
      await nutritionApi.deleteFoodLog(id);
      toast.success('Food log removed');
      nutritionQuery.refetch();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not remove log.');
    }
  };

  const nutrition = nutritionQuery.data;
  const hydration = hydrationQuery.data;

  const caloriePercent = useMemo(() => {
    if (!nutrition) return 0;
    return nutrition.target > 0 ? (nutrition.consumed / nutrition.target) * 100 : 0;
  }, [nutrition]);

  const split = useMemo(() => {
    if (!nutrition) return null;
    return macroSplit({
      proteinG: nutrition.proteinG ?? 0,
      carbsG: nutrition.carbsG ?? 0,
      fatG: nutrition.fatG ?? 0,
    });
  }, [nutrition]);

  const hydrationPercent = useMemo(() => {
    if (!hydration) return 0;
    return hydration.targetMl > 0 ? (hydration.totalMl / hydration.targetMl) * 100 : hydration.percent;
  }, [hydration]);

  const nutritionHistoryPoints = useMemo(() => {
    const history = summaryQuery.data?.nutritionHistory ?? [];
    return history.slice(-14).map((entry) => ({
      label: entry.day,
      value: entry.calories,
    }));
  }, [summaryQuery.data?.nutritionHistory]);

  if (nutritionQuery.isLoading && !nutritionQuery.data) {
    return (
      <PageBody className="space-y-4">
        <div className="card h-28" />
        <SkeletonList rows={4} />
      </PageBody>
    );
  }

  if (nutritionQuery.error && !nutritionQuery.data) {
    return (
      <PageBody>
        <ErrorState error={nutritionQuery.error} onRetry={nutritionQuery.refetch} />
      </PageBody>
    );
  }

  if (!nutrition) return null;

  const remainingCalories = nutrition.target - nutrition.consumed;
  const mealsByType = new Map<string, FoodLog[]>();
  for (const m of nutrition.byMeal || []) {
    mealsByType.set(m.mealType, m.items);
  }

  return (
    <PageBody className="space-y-5">
      {/* header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">Nutrition</h1>
          <p className="text-[13px] font-medium text-mute">
            Fuel your training — log meals, hit your targets
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/nutrition/search">
            <Button size="sm">
              <SearchIcon className="h-4 w-4" />
              Search foods
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setQuickLogOpen(true)}>
            Log food
          </Button>
        </div>
      </FadeIn>

      {/* hero row */}
      <Stagger className="grid gap-4 md:grid-cols-3">
        <StaggerItem>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[13.5px] font-bold uppercase tracking-wide text-mute">Calories</h3>
            </div>
            <div className="flex items-center gap-5">
              <ProgressRing percent={caloriePercent} size={124} thickness={12}>
                <div>
                  <p className="text-[21px] font-bold leading-none text-ink">
                    {Math.round(nutrition.consumed)}
                  </p>
                  <p className="mt-1 text-[11px] text-mute">of {nutrition.target} kcal</p>
                </div>
              </ProgressRing>
              <div className="min-w-0 flex-1 space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Remaining</dt>
                  <dd className="font-semibold text-ink">
                    {remainingCalories >= 0
                      ? `${Math.round(remainingCalories)} kcal remaining`
                      : `${Math.round(Math.abs(remainingCalories))} kcal over`}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-sub">Burned</dt>
                  <dd className="font-semibold text-ink">{formatCalories(nutrition.burned)}</dd>
                </div>
                {split ? <MacroBar split={split} /> : null}
              </div>
            </div>
            <p className="mt-3 text-[12px] text-mute">
              {formatGrams(nutrition.proteinG)} protein · {formatGrams(nutrition.carbsG)} carbs ·{' '}
              {formatGrams(nutrition.fatG)} fat · {formatGrams(nutrition.fiberG)} fibre
            </p>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[13.5px] font-bold uppercase tracking-wide text-mute">Macros</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-sub">Protein</span>
                <span className="font-semibold text-ink">{formatGrams(nutrition.proteinG)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-sub">Carbs</span>
                <span className="font-semibold text-ink">{formatGrams(nutrition.carbsG)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-sub">Fat</span>
                <span className="font-semibold text-ink">{formatGrams(nutrition.fatG)}</span>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[13.5px] font-bold uppercase tracking-wide text-mute">Water</h3>
              <Button variant="ghost" size="sm" onClick={() => handleHydrate(250)}>
                <DropIcon className="h-4 w-4" />
                + 250 ml
              </Button>
            </div>
            <div className="space-y-3">
              <ProgressBar percent={hydrationPercent} tone="info" />
              <p className="text-[13px] text-sub">
                {hydration?.totalMl ?? 0} / {hydration?.targetMl ?? 0} ml
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleHydrate(250)}>
                  + 250 ml
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleHydrate(500)}>
                  + 500 ml
                </Button>
              </div>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* meals */}
      <section className="space-y-4">
        {MEAL_ORDER.map((mealType) => {
          const items = mealsByType.get(mealType) || [];
          const mealTotals = nutrition.byMeal?.find((m) => m.mealType === mealType);
          return (
            <Card key={mealType} className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold text-ink">{formatEnumLabel(mealType)}</h2>
                  <p className="text-[12.5px] text-mute">
                    {items.length} item{items.length === 1 ? '' : 's'} ·{' '}
                    {formatCalories(mealTotals?.calories || 0)}
                    {mealTotals ? (
                      <span className="ml-1">
                        ({formatGrams(mealTotals.calories * 0.25)} P ·{' '}
                        {formatGrams(mealTotals.calories * 0.5)} C ·{' '}
                        {formatGrams(mealTotals.calories * 0.25)} F approximation)
                      </span>
                    ) : null}
                  </p>
                </div>
                <Link href={`/nutrition/search?meal=${mealType}`}>
                  <Button variant="secondary" size="sm">
                    Add
                  </Button>
                </Link>
              </div>
              {items.length === 0 ? (
                <p className="text-[13px] text-mute">Nothing logged yet</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-alt p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {item.foodName}
                        </p>
                        <p className="text-[12px] text-mute">
                          {item.grams ? `${Math.round(item.grams)} g` : ''}
                          {item.nutrition ? ` · ${formatCalories(item.nutrition.calories)}` : ''}
                          {item.nutrition ? (
                            <>
                              {' · '}
                              {formatGrams(item.nutrition.proteinG)} P ·{' '}
                              {formatGrams(item.nutrition.carbsG)} C ·{' '}
                              {formatGrams(item.nutrition.fatG)} F
                            </>
                          ) : null}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLog(item._id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </section>

      {/* insight */}
      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Daily insight</h2>
        <p className="mt-2 text-[13.5px] text-sub">
          Remaining calories: {Math.round(remainingCalories)} kcal
        </p>
        <p className="mt-1 text-[12px] text-mute">
          Nutrition figures are estimates from logged foods — not medical advice.
        </p>
      </Card>

      {nutritionHistoryPoints.length >= 2 ? (
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Last 7-14 days calories</h2>
          <div className="mt-3">
            <TrendChart
              points={nutritionHistoryPoints}
              unit=" kcal"
              tone="success"
            />
          </div>
        </Card>
      ) : null}
    
      <LogFoodModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        mealType={quickLogMeal}
        onMealChange={setQuickLogMeal}
        onSaved={() => nutritionQuery.refetch()}
      />

    </PageBody>
  );
}
