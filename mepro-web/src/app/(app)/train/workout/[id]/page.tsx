'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import type { Workout } from '@/lib/types';
import { formatCalories, formatEnumLabel, formatMinutes } from '@/lib/format';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { workoutApi } from '@/lib/endpoints';
import {
  Button,
  Card,
  EnumPill,
  Pill,
} from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import { ChevronLeftIcon, PlayIcon } from '@/components/icons';

function formatExercisePrescription(ex: {
  sets?: number;
  reps?: string | number;
  durationSeconds?: number;
  holdSeconds?: number;
  restSeconds?: number;
}): string {
  if (ex.durationSeconds && ex.durationSeconds > 0) {
    return `${formatMinutes(ex.durationSeconds / 60)}`;
  }
  if (ex.sets && ex.reps != null) {
    return `${ex.sets} × ${ex.reps}`;
  }
  if (ex.sets) {
    return `${ex.sets} sets`;
  }
  return '—';
}

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const workoutQuery = useApiQuery<Workout>(
    () => workoutApi.detail(id),
    [id],
    { enabled: !!id },
  );

  usePageTitle(workoutQuery.data?.title || 'Workout');

  const workout = workoutQuery.data;

  const isLoading = workoutQuery.isLoading && !workoutQuery.data;
  const error = workoutQuery.error && !workoutQuery.data ? workoutQuery.error : null;

  if (isLoading) {
    return <SkeletonList rows={4} />;
  }

  if (error && !workoutQuery.data) {
    return <ErrorState error={error} onRetry={workoutQuery.refetch} />;
  }

  if (!workout) {
    return (
      <EmptyState
        title="Workout not found"
        message="This workout may have been removed."
        action={
          <Link href="/train">
            <Button variant="secondary" size="sm">
              Back to train
            </Button>
          </Link>
        }
      />
    );
  }

  const exercises = workout.exercises ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <FadeIn>
        <Link href="/train" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <ChevronLeftIcon className="h-4 w-4" />
          Back to train
        </Link>
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
                {workout.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {workout.category && <EnumPill value={workout.category} />}
                {workout.difficulty && (
                  <Pill tone="neutral">{formatEnumLabel(workout.difficulty)}</Pill>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/train/session?workoutId=${workout._id}`)}
            >
              <PlayIcon className="h-4 w-4" />
              Start workout
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-sub">
            <span>{formatMinutes(workout.durationMinutes)}</span>
            <span>•</span>
            <span>{formatCalories(workout.estimatedCalories)}</span>
            <span>•</span>
            <span>
              {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
            </span>
            {workout.equipment && workout.equipment.length > 0 && (
              <>
                <span>•</span>
                <span>{workout.equipment.join(', ')}</span>
              </>
            )}
          </div>
        </Card>
      </FadeIn>

      {/* Description */}
      {workout.description && (
        <FadeIn delay={0.05}>
          <Card className="p-5">
            <h3 className="mb-2 text-[14px] font-bold text-ink">Description</h3>
            <p className="text-[13.5px] leading-relaxed text-sub whitespace-pre-line">
              {workout.description}
            </p>
          </Card>
        </FadeIn>
      )}

      {/* Exercises */}
      <FadeIn delay={0.1}>
        <Card className="p-5">
          <h3 className="mb-3 text-[14px] font-bold text-ink">Exercises</h3>
          <Stagger className="space-y-2.5">
            {exercises
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((ex, idx) => (
                <StaggerItem key={`${ex.order}-${ex.name}`}>
                  <div className="flex items-start gap-3 rounded-xl bg-alt/70 px-3 py-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-[12.5px] font-bold text-sub">
                      {(ex.order ?? idx + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{ex.name}</p>
                      <p className="text-[12.5px] text-sub">
                        {formatExercisePrescription(ex)}
                        {ex.restSeconds ? ` · rest ${ex.restSeconds}s` : ''}
                      </p>
                      {ex.description && (
                        <p className="text-[12px] text-mute">{ex.description}</p>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              ))}
          </Stagger>
        </Card>
      </FadeIn>

      <FadeIn delay={0.15}>
        <InlineNotice
          tone="warning"
          message="Start within your capacity. Stop if something hurts."
        />
      </FadeIn>
    </div>
  );
}