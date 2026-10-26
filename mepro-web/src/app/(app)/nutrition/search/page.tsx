'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { ApiError } from '@/lib/api';
import { formatCalories, formatGrams, formatEnumLabel, MEAL_ORDER } from '@/lib/format';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { useDebounce } from '@/hooks/use-client';
import { nutritionApi } from '@/lib/endpoints';
import type { Food, Paged } from '@/lib/types';
import {
  Button,
  Card,
  Field,
  Modal,
  Select,
} from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import { LogFoodModal } from '@/components/log-modals';
import { ChevronLeftIcon, SearchIcon, CloseIcon, PlusIcon } from '@/components/icons';

function SearchContent() {
  usePageTitle('Search foods');
  const searchParams = useSearchParams();
  const toast = useToast();

  const mealFromParam = searchParams.get('meal') || 'breakfast';

  const [query, setQuery] = useState('');
  // Derived from the URL until the user picks a different meal themselves.
  const [mealOverride, setMealOverride] = useState<string | null>(null);
  const mealType = mealOverride ?? mealFromParam;
  const [page] = useState(1);
  const [selected, setSelected] = useState<Food | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [busy, setBusy] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  const searchQuery = useApiQuery<Paged<Food>>(
    () => nutritionApi.foods({ search: debouncedQuery || undefined, limit: 25 }),
    [debouncedQuery, page],
    { enabled: debouncedQuery.length >= 2, refetchOnFocus: false },
  );

  const foods = useMemo(() => searchQuery.data?.items ?? [], [searchQuery.data]);

  const openLogModal = (food: Food) => {
    setSelected(food);
    setQuantity('1');
    setUnit(food.servings?.[0]?.name || 'serving');
    setLogOpen(true);
    setSuccessNotice(false);
  };

  const handleLog = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await nutritionApi.logFood({
        foodId: selected._id,
        mealType,
        servings: Number(quantity) || 1,
        servingName: unit,
      });
      toast.success(`Logged ${selected.name}`);
      setLogOpen(false);
      setSuccessNotice(true);
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not log food.');
    } finally {
      setBusy(false);
    }
  };

  const clearQuery = () => setQuery('');

  return (
    <PageBody className="space-y-5">
      {/* header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/nutrition">
            <Button variant="ghost" size="sm">
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">Search foods</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={mealType}
            onChange={(e) => setMealOverride(e.target.value)}
            className="w-36"
          >
            {MEAL_ORDER.map((m) => (
              <option key={m} value={m}>
                {formatEnumLabel(m)}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" onClick={() => setCustomOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Add food
          </Button>
        </div>
      </FadeIn>

      {/* search */}
      <Card className="p-4">
        <Field
          placeholder="Search foods..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          suffix={
            query ? (
              <button type="button" onClick={clearQuery} className="text-sub hover:text-ink">
                <CloseIcon className="h-4 w-4" />
              </button>
            ) : (
              <SearchIcon className="h-4 w-4 text-sub" />
            )
          }
        />
      </Card>

      {successNotice ? (
        <InlineNotice
          message={
            <span>
              Food logged.{' '}
              <Link href="/nutrition" className="font-semibold text-brand underline">
                View today
              </Link>
            </span>
          }
          tone="success"
        />
      ) : null}

      {/* results */}
      {debouncedQuery.length < 2 ? (
        <EmptyState
          title="Start searching"
          message="Type at least 2 characters to search our food database, or add your own food."
        />
      ) : searchQuery.isLoading ? (
        <SkeletonList rows={5} />
      ) : searchQuery.error ? (
        <ErrorState error={searchQuery.error} onRetry={searchQuery.refetch} />
      ) : foods.length === 0 ? (
        <EmptyState
          title="No foods match"
          message={`No results for "${debouncedQuery}". Use Add food to log it yourself.`}
        />
      ) : (
        <Stagger className="space-y-3">
          {foods.map((food) => (
            <StaggerItem key={food._id}>
              <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink">{food.name}</p>
                  <p className="text-[12px] text-mute">
                    {food.category ? formatEnumLabel(food.category) : ''}
                    {food.defaultServingGrams ? ` · ${food.defaultServingGrams} g` : ''}
                    {food.calories ? ` · ${formatCalories(food.calories)} / 100g` : ''}
                  </p>
                  <p className="text-[11.5px] text-mute">
                    P {formatGrams(food.proteinG)} · C {formatGrams(food.carbsG)} · F {formatGrams(food.fatG)}
                  </p>
                </div>
                <Button size="sm" onClick={() => openLogModal(food)}>
                  <PlusIcon className="h-4 w-4" />
                  Log
                </Button>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* pagination hint */}
      {searchQuery.data?.meta?.totalPages && searchQuery.data.meta.totalPages > 1 ? (
        <p className="text-center text-[12px] text-mute">More results available via API pagination</p>
      ) : null}

      <p className="text-[11.5px] text-mute">Values are estimates. Check labels when you can.</p>

      {/* log modal */}
      <Modal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log food"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => handleLog()} loading={busy}>
              Add to {formatEnumLabel(mealType)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selected ? (
            <div>
              <p className="text-[14px] font-semibold text-ink">{selected.name}</p>
              <p className="text-[12px] text-mute">
                {formatCalories(selected.calories)} / 100g · P {formatGrams(selected.proteinG)} · C{' '}
                {formatGrams(selected.carbsG)} · F {formatGrams(selected.fatG)}
              </p>
            </div>
          ) : null}
          <Field
            label="Quantity"
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Field
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <Select
            label="Meal"
            value={mealType}
            onChange={(e) => setMealOverride(e.target.value)}
          >
            {MEAL_ORDER.map((m) => (
              <option key={m} value={m}>
                {formatEnumLabel(m)}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <LogFoodModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        defaultMeal={mealType}
        onSaved={() => setSuccessNotice(true)}
      />
    </PageBody>
  );
}

export default function NutritionSearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
