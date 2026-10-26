'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useToast } from '@/providers/toast-provider';

import type { Paged, Workout, YogaRoutine } from '@/lib/types';
import { formatCalories, formatEnumLabel, formatMinutes } from '@/lib/format';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { workoutApi, yogaApi } from '@/lib/endpoints';
import {
  isLocalId,
  removeCustomWorkout,
  removeCustomYoga,
  useCustomCatalog,
} from '@/lib/custom-catalog';
import { FITNESS_LEVELS, WORKOUT_CATEGORIES } from '@/lib/train-options';
import { AddWorkoutModal, AddYogaModal } from '@/components/train-modals';
import {
  Button,
  Card,
  Chip,
  EnumPill,
  Field,
  Pill,
  SegmentedTabs,
} from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import {
  DumbbellIcon,
  LeafIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons';

type Mode = 'workouts' | 'yoga';

/** Case-insensitive "does this entry match the search box" test. */
function matchesSearch(
  entry: { title: string; description?: string; category?: string; level?: string; difficulty?: string; muscleGroups?: string[]; equipment?: string[]; focusAreas?: string[] },
  needle: string,
): boolean {
  if (!needle) return true;
  const haystack = [
    entry.title,
    entry.description ?? '',
    entry.category ?? '',
    entry.level ?? '',
    entry.difficulty ?? '',
    ...(entry.muscleGroups ?? []),
    ...(entry.equipment ?? []),
    ...(entry.focusAreas ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle.toLowerCase());
}

export default function TrainPage() {
  usePageTitle('Train');
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('workouts');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [page] = useState(1);

  const catalog = useCustomCatalog();

  const workoutsQuery = useApiQuery<Paged<Workout>>(
    () =>
      workoutApi.list({
        page,
        limit: 12,
        search: search || undefined,
        category: activeCategory || undefined,
        difficulty: activeDifficulty || undefined,
      }),
    [mode, page, search, activeCategory, activeDifficulty],
    { enabled: mode === 'workouts' },
  );

  const yogaQuery = useApiQuery<Paged<YogaRoutine>>(
    () =>
      yogaApi.list({
        page,
        limit: 12,
        search: search || undefined,
        difficulty: activeDifficulty || undefined,
      }),
    [mode, page, search, activeDifficulty],
    { enabled: mode === 'yoga' },
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const isLoading =
    (mode === 'workouts' && workoutsQuery.isLoading && !workoutsQuery.data) ||
    (mode === 'yoga' && yogaQuery.isLoading && !yogaQuery.data);
  const error =
    mode === 'workouts' && workoutsQuery.error && !workoutsQuery.data
      ? workoutsQuery.error
      : mode === 'yoga' && yogaQuery.error && !yogaQuery.data
        ? yogaQuery.error
        : null;
  const refetch =
    mode === 'workouts' ? workoutsQuery.refetch : yogaQuery.refetch;

  // Locally written entries filter here rather than on the server, and always
  // sit above the catalogue so the user's own work is what they see first.
  const customItems = useMemo(() => {
    if (mode === 'workouts') {
      return catalog.workouts.filter(
        (workout) =>
          matchesSearch(workout, search) &&
          (!activeCategory || workout.category === activeCategory) &&
          (!activeDifficulty || workout.difficulty === activeDifficulty),
      );
    }
    return catalog.yoga.filter(
      (routine) =>
        matchesSearch(routine, search) &&
        (!activeDifficulty || (routine.level ?? routine.difficulty) === activeDifficulty),
    );
  }, [catalog, mode, search, activeCategory, activeDifficulty]);

  const serverItems: (Workout | YogaRoutine)[] =
    mode === 'workouts' ? (workoutsQuery.data?.items ?? []) : (yogaQuery.data?.items ?? []);

  const items: (Workout | YogaRoutine)[] = [...customItems, ...serverItems];

  // The catalogue is optional: an unreachable server must not hide what the
  // user has written on this device.
  const showError = !!error && !isLoading && items.length === 0;
  const showServerNotice = !!error && !isLoading && items.length > 0;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function requestDelete(item: Workout | YogaRoutine) {
    if (confirmDeleteId === item._id) {
      setConfirmDeleteId(null);
      if (mode === 'workouts') removeCustomWorkout(item._id);
      else removeCustomYoga(item._id);
      toast.success('Removed', `${item.title} was deleted from this device.`);
      return;
    }
    setConfirmDeleteId(item._id);
    window.setTimeout(() => setConfirmDeleteId((current) => (current === item._id ? null : current)), 4000);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
            Train
          </h1>
          <p className="mt-0.5 text-[13.5px] text-sub">
            Workouts and yoga built from your goals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon className="h-4 w-4" />
            Add {mode === 'workouts' ? 'workout' : 'yoga'}
          </Button>
          <SegmentedTabs
            value={mode}
            onChange={(v) => {
              setMode(v);
              setActiveCategory(null);
              setActiveDifficulty(null);
              setSearch('');
              setConfirmDeleteId(null);
            }}
            options={[
              { value: 'workouts', label: 'Workouts' },
              { value: 'yoga', label: 'Yoga' },
            ]}
          />
        </div>
      </FadeIn>

      {/* Filter bar */}
      <FadeIn delay={0.05}>
        <Card className="space-y-3 p-4">
          <form onSubmit={handleSearchSubmit} className="w-full">
            <Field
              placeholder={
                mode === 'workouts'
                  ? 'Search workouts by name or muscle group'
                  : 'Search yoga sequences'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          {mode === 'workouts' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
                All
              </Chip>
              {WORKOUT_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                >
                  {formatEnumLabel(cat)}
                </Chip>
              ))}
            </div>
          )}

          {mode === 'yoga' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip active={activeDifficulty === null} onClick={() => setActiveDifficulty(null)}>
                All
              </Chip>
              {FITNESS_LEVELS.map((diff) => (
                <Chip
                  key={diff}
                  active={activeDifficulty === diff}
                  onClick={() =>
                    setActiveDifficulty(diff === activeDifficulty ? null : diff)
                  }
                >
                  {formatEnumLabel(diff)}
                </Chip>
              ))}
            </div>
          )}
        </Card>
      </FadeIn>

      {isLoading && (
        <SkeletonList rows={6} />
      )}

      {showError && (
        <ErrorState error={error} onRetry={refetch} />
      )}

      {showServerNotice && (
        <InlineNotice
          tone="warning"
          message="Cannot reach the server, so only your saved workouts are shown."
        />
      )}

      {!isLoading && !showError && items.length === 0 && (
        <EmptyState
          title={mode === 'workouts' ? 'No workouts found' : 'No yoga sequences found'}
          message="Try adjusting your filters or search terms."
          icon={mode === 'workouts' ? <DumbbellIcon className="h-5 w-5" /> : <LeafIcon className="h-5 w-5" />}
        />
      )}

      {!isLoading && !showError && items.length > 0 && (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mode === 'workouts' &&
            (items as Workout[]).map((workout) => (
              <StaggerItem key={workout._id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="truncate text-[15px] font-bold text-ink">
                      {workout.title}
                    </h3>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {isLocalId(workout._id) && <Pill tone="brand">Mine</Pill>}
                      {workout.category && (
                        <EnumPill value={workout.category} />
                      )}
                      {workout.difficulty && (
                        <Pill tone="neutral">{formatEnumLabel(workout.difficulty)}</Pill>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-sub">
                    <span>{formatMinutes(workout.durationMinutes)}</span>
                    <span>•</span>
                    <span>{formatCalories(workout.estimatedCalories)}</span>
                    <span>•</span>
                    <span>
                      {(workout.exercises?.length ?? 0)} exercise
                      {(workout.exercises?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {workout.equipment && workout.equipment.length > 0 && (
                    <p className="mb-3 line-clamp-2 text-[12.5px] text-mute">
                      {workout.equipment.join(', ')}
                    </p>
                  )}
                  {!workout.equipment?.length && (
                    <p className="mb-3 text-[12.5px] text-mute">bodyweight</p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/train/workout/${workout._id}`)}
                    >
                      <PlayIcon className="h-4 w-4" />
                      Start
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/train/session?workoutId=${workout._id}`)}
                    >
                      Quick start
                    </Button>
                    {isLocalId(workout._id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-sub hover:text-danger"
                        aria-label={`Delete ${workout.title}`}
                        onClick={() => requestDelete(workout)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {confirmDeleteId === workout._id ? 'Sure?' : 'Delete'}
                      </Button>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            ))}

          {mode === 'yoga' &&
            (items as YogaRoutine[]).map((yoga) => (
              <StaggerItem key={yoga._id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="truncate text-[15px] font-bold text-ink">
                      {yoga.title}
                    </h3>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {isLocalId(yoga._id) && <Pill tone="brand">Mine</Pill>}
                      {(yoga.level || yoga.difficulty) && (
                        <Pill tone="neutral">
                          {formatEnumLabel(yoga.level || yoga.difficulty)}
                        </Pill>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-sub">
                    <span>{formatMinutes(yoga.durationMinutes)}</span>
                    <span>•</span>
                    <span>
                      {(yoga.asanas?.length ?? 0)} pose
                      {(yoga.asanas?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {yoga.focusAreas && yoga.focusAreas.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {yoga.focusAreas.slice(0, 3).map((focus) => (
                        <Pill key={focus} tone="neutral" className="!px-2 !py-0.5">
                          {formatEnumLabel(focus)}
                        </Pill>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/train/yoga/${yoga._id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/train/session?yogaId=${yoga._id}`)}
                    >
                      Start session
                    </Button>
                    {isLocalId(yoga._id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-sub hover:text-danger"
                        aria-label={`Delete ${yoga.title}`}
                        onClick={() => requestDelete(yoga)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {confirmDeleteId === yoga._id ? 'Sure?' : 'Delete'}
                      </Button>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            ))}
        </Stagger>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-center pt-2">
          <Button variant="secondary" size="sm">
            Load more
          </Button>
        </div>
      )}

      {mode === 'workouts' ? (
        <AddWorkoutModal open={addOpen} onClose={() => setAddOpen(false)} />
      ) : (
        <AddYogaModal open={addOpen} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}