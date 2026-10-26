'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Paged, Workout, YogaRoutine } from '@/lib/types';
import { formatCalories, formatEnumLabel, formatMinutes } from '@/lib/format';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { workoutApi, yogaApi } from '@/lib/endpoints';
import {
  Button,
  Card,
  Chip,
  EnumPill,
  Field,
  Pill,
  SegmentedTabs,
} from '@/components/ui';
import { EmptyState, ErrorState, SkeletonList } from '@/components/states';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import {
  DumbbellIcon,
  LeafIcon,
  PlayIcon,
} from '@/components/icons';

type Mode = 'workouts' | 'yoga';

const WORKOUT_CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'cardio',
  'full_body',
  'mobility',
  'balance',
];

const YOGA_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export default function TrainPage() {
  usePageTitle('Train');
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('workouts');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [page] = useState(1);

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

  const items =
    mode === 'workouts' ? (workoutsQuery.data?.items ?? []) : (yogaQuery.data?.items ?? []);

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
        <SegmentedTabs
          value={mode}
          onChange={(v) => {
            setMode(v);
            setActiveCategory(null);
            setActiveDifficulty(null);
            setSearch('');
          }}
          options={[
            { value: 'workouts', label: 'Workouts' },
            { value: 'yoga', label: 'Yoga' },
          ]}
        />
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
              {YOGA_DIFFICULTIES.map((diff) => (
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

      {error && !isLoading && (
        <ErrorState error={error} onRetry={refetch} />
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title={mode === 'workouts' ? 'No workouts found' : 'No yoga sequences found'}
          message="Try adjusting your filters or search terms."
          icon={mode === 'workouts' ? <DumbbellIcon className="h-5 w-5" /> : <LeafIcon className="h-5 w-5" />}
        />
      )}

      {!isLoading && !error && items.length > 0 && (
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
    </div>
  );
}