'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import type { Workout, WorkoutSession, WorkoutStartResult, YogaRoutine } from '@/lib/types';
import { formatMinutes } from '@/lib/format';
import { elapsedSessionMinutes } from '@/lib/session-math';
import { ApiError } from '@/lib/api';
import { getCustomWorkout, getCustomYoga, isLocalId } from '@/lib/custom-catalog';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import { workoutApi, yogaApi } from '@/lib/endpoints';
import {
  Button,
  Card,
  Modal,
  Pill,
  ProgressBar,
} from '@/components/ui';
import {
  EmptyState,
  ErrorState,
  InlineNotice,
  SkeletonList,
} from '@/components/states';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import { ChevronLeftIcon, CloseIcon } from '@/components/icons';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

/** The fields the runner reads; both Exercise and Asana satisfy this shape. */
interface SessionExercise {
  name: string;
  order?: number;
  sets?: number;
  reps?: string;
  durationSeconds?: number;
  holdSeconds?: number;
  restSeconds?: number;
  description?: string;
}

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    return () => {};
  }, [delay]);
}

function SessionContent() {
  usePageTitle('Session');
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const workoutId = searchParams.get('workoutId');
  const yogaId = searchParams.get('yogaId');
  const sessionIdParam = searchParams.get('sessionId');

  const kind = workoutId ? 'workout' : yogaId ? 'yoga' : null;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [yoga, setYoga] = useState<YogaRoutine | null>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);

  const workoutDetailQuery = useApiQuery<Workout>(
    () => workoutApi.detail(workoutId!),
    [workoutId],
    { enabled: !!workoutId && !workout && !isLocalId(workoutId) },
  );

  const yogaDetailQuery = useApiQuery<YogaRoutine>(
    () => yogaApi.detail(yogaId!),
    [yogaId],
    { enabled: !!yogaId && !yoga && !isLocalId(yogaId) },
  );

  // Load session if sessionId provided
  useEffect(() => {
    async function loadSession() {
      if (!sessionIdParam || session) return;
      try {
        const s = await workoutApi.session(sessionIdParam);
        setSession(s);
        setError(null);
        if (s.workoutId) {
          const w = await workoutApi.detail(s.workoutId).catch(() => null);
          if (w) setWorkout(w);
        }
        if (s.startedAt) {
          const startMs = new Date(s.startedAt).getTime();
          setStartedAtMs(startMs);
          setElapsedSeconds((Date.now() - startMs) / 1000);
        }
      } catch (e) {
        const err = e instanceof ApiError ? e : new Error('Failed to load session');
        setError(err);
        toast.error(err.message);
        if (err instanceof ApiError && err.status === 404) {
          router.push('/train');
        }
      }
    }
    loadSession();
  }, [sessionIdParam, session, router, toast]);

  // Initialize from details and maybe active session
  useEffect(() => {
    async function init() {
      if (session || starting || completing) return;
      if (kind === 'workout' && workoutId && workout && !isLocalId(workoutId)) {
        try {
          const active = await workoutApi.activeSession().catch(() => null);
          if (active && active.workoutId === workoutId && active.status === 'in_progress') {
            setSession(active);
            if (active.startedAt) {
              const startMs = new Date(active.startedAt).getTime();
              setStartedAtMs(startMs);
              setElapsedSeconds((Date.now() - startMs) / 1000);
            }
            return;
          }
        } catch {
          // ignore — no active session for this workout
        }
      }
    }
    init();
  }, [kind, workoutId, workout, session, starting, completing]);

  // Start session if needed
  useEffect(() => {
    async function startIfNeeded() {
      if (session || starting || completing || !kind) return;

      // A `local-` entry is already on the device, so its session starts right
      // away without the API — which is the point of writing your own routine.
      if (isLocalId(workoutId)) {
        const local = getCustomWorkout(workoutId!);
        if (!local) {
          setError(new Error('This workout is no longer saved on this device.'));
          return;
        }
        setWorkout(local);
        setSession({
          _id: 'local-session',
          workoutId,
          title: local.title,
          startedAt: new Date().toISOString(),
          status: 'in_progress',
          exercisesTotal: local.exercises?.length ?? 0,
          exercisesCompleted: 0,
        } as WorkoutSession);
        setStartedAtMs(Date.now());
        setElapsedSeconds(0);
        return;
      }

      if (isLocalId(yogaId)) {
        const local = getCustomYoga(yogaId!);
        if (!local) {
          setError(new Error('This routine is no longer saved on this device.'));
          return;
        }
        setYoga(local);
        setSession({
          _id: 'local-session',
          yogaId,
          title: local.title,
          startedAt: new Date().toISOString(),
          status: 'in_progress',
          exercisesTotal: local.asanas?.length ?? 0,
          exercisesCompleted: 0,
        } as WorkoutSession);
        setStartedAtMs(Date.now());
        setElapsedSeconds(0);
        return;
      }

      if (kind === 'workout' && workoutId) {
        if (workoutDetailQuery.isLoading) return;
        setStarting(true);
        try {
          const res: WorkoutStartResult = await workoutApi.startSession(workoutId);
          setSession(res.session);
          setWorkout(res.workout);
          if (res.session.startedAt) {
            const startMs = new Date(res.session.startedAt).getTime();
            setStartedAtMs(startMs);
            setElapsedSeconds((Date.now() - startMs) / 1000);
          } else {
            setStartedAtMs(Date.now());
            setElapsedSeconds(0);
          }
          setError(null);
        } catch (e) {
          const err = e instanceof ApiError ? e : new Error('Failed to start workout');
          setError(err);
          toast.error(err.message);
        } finally {
          setStarting(false);
        }
      } else if (kind === 'yoga' && yogaId) {
        if (yogaDetailQuery.isLoading) return;
        setYoga(yogaDetailQuery.data ?? null);
        // Yoga API may not have explicit start - create a local session representation
        setStarting(true);
        try {
          setSession({
            _id: 'local-yoga-session',
            yogaId,
            title: yogaDetailQuery.data?.title,
            startedAt: new Date().toISOString(),
            status: 'in_progress',
            exercisesTotal: yogaDetailQuery.data?.asanas?.length ?? 0,
            exercisesCompleted: 0,
          } as WorkoutSession);
          setStartedAtMs(Date.now());
          setElapsedSeconds(0);
        } catch (e) {
          const err = e instanceof ApiError ? e : new Error('Failed to start yoga');
          setError(err);
          toast.error(err.message);
        } finally {
          setStarting(false);
        }
      }
    }
    startIfNeeded();
  }, [session, starting, completing, kind, workoutId, yogaId, workoutDetailQuery.isLoading, workoutDetailQuery.data, yogaDetailQuery.isLoading, yogaDetailQuery.data, toast]);

  // Timer
  useInterval(
    () => {
      if (!paused && startedAtMs) {
        setElapsedSeconds((Date.now() - startedAtMs) / 1000);
      } else if (!paused && session?.startedAt) {
        setElapsedSeconds((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      }
    },
    paused ? null : 1000,
  );

  // Rest timer
  useInterval(
    () => {
      if (restSecondsRemaining > 0) {
        setRestSecondsRemaining((r) => Math.max(0, r - 1));
      }
    },
    restSecondsRemaining > 0 ? 1000 : null,
  );

  const exercises = useMemo<SessionExercise[]>(() => {
    if (kind === 'workout' && workout?.exercises) {
      return [...workout.exercises].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (kind === 'yoga' && yoga?.asanas) {
      return [...yoga.asanas].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return [];
  }, [kind, workout, yoga]);

  const totalExercises = exercises.length;
  const completedCount = completedExercises.size;
  const progressPercent = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const currentExercise = exercises[currentExerciseIndex];
  const allDone = totalExercises > 0 && completedCount === totalExercises;

  const handleLogSet = () => {
    if (!currentExercise) return;
    const exIndex = currentExerciseIndex;
    setCompletedExercises((prev) => new Set(prev).add(exIndex));
    const rest = currentExercise.restSeconds ?? 0;
    if (rest > 0 && currentExerciseIndex < totalExercises - 1) {
      setRestSecondsRemaining(rest);
    }
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((i) => i + 1);
    }
  };

  const handleMarkPoseDone = () => {
    handleLogSet();
  };

  const handleFinish = async () => {
    if (completing) return;
    setCompleting(true);
    setError(null);
    try {
      const durationMinutes = elapsedSessionMinutes(session?.startedAt, new Date());
      if (isLocalId(workoutId) || isLocalId(yogaId)) {
        // Nothing to persist server-side: the routine itself lives on device.
        toast.success('Session complete', 'Kept on this device — no server needed.');
        router.push('/train');
        return;
      }
      if (kind === 'workout' && workoutId) {
        await workoutApi.completeSession(workoutId, {
          durationMinutes,
        });
        toast.success('Session saved');
        router.push('/dashboard');
      } else if (kind === 'yoga' && yogaId) {
        await yogaApi.complete(yogaId, {
          durationMinutes,
        });
        toast.success('Yoga sequence completed');
        router.push('/dashboard');
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : new Error('Failed to complete session');
      setError(err);
      toast.error(err.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleFinishEarly = handleFinish;

  const handleAbandon = async () => {
    if (abandoning || !session?._id) return;
    setAbandoning(true);
    try {
      if (kind === 'workout' && !isLocalId(workoutId)) {
        await workoutApi.abandonSession(session._id);
      }
      toast.success('Session abandoned');
      router.push('/train');
    } catch (e) {
      const err = e instanceof ApiError ? e : new Error('Failed to abandon session');
      toast.error(err.message);
    } finally {
      setAbandoning(false);
      setShowAbandonModal(false);
    }
  };

  if (!kind && !sessionIdParam) {
    return (
      <EmptyState
        title="Nothing to train"
        message="Choose a workout or yoga sequence from the train page."
        action={
          <Button onClick={() => router.push('/train')}>Go to train</Button>
        }
      />
    );
  }

  if ((workoutDetailQuery.isLoading && kind === 'workout' && !workout) ||
      (yogaDetailQuery.isLoading && kind === 'yoga' && !yoga) ||
      starting ||
      (!session && sessionIdParam)) {
    return <SkeletonList rows={4} />;
  }

  if (error && !session) {
    return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <FadeIn>
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/train')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowAbandonModal(true)}
            >
              <CloseIcon className="h-4 w-4" />
              Abandon
            </Button>
          </div>
        </div>
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] uppercase tracking-wide text-mute">
                {kind === 'workout' ? 'Workout' : kind === 'yoga' ? 'Yoga' : 'Session'}
              </p>
              <h1 className="truncate text-[20px] font-bold text-ink sm:text-[24px]">
                {workout?.title || yoga?.title || session?.title || 'Session'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="neutral">{formatTime(elapsedSeconds)}</Pill>
              <Pill tone="brand">
                {completedCount}/{totalExercises}
              </Pill>
            </div>
          </div>
          <ProgressBar percent={progressPercent} />
        </Card>
      </FadeIn>

      {error && (
        <FadeIn delay={0.05}>
          <InlineNotice tone="error" message={error.message} />
        </FadeIn>
      )}

      {restSecondsRemaining > 0 && (
        <FadeIn delay={0.05}>
          <Card className="border-brand/40 bg-brand-soft/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-ink">Rest</p>
                <p className="text-[20px] font-bold tabular-nums text-brand">
                  {formatTime(restSecondsRemaining)}
                </p>
              </div>
              <Button size="sm" onClick={() => setRestSecondsRemaining(0)}>
                Skip
              </Button>
            </div>
          </Card>
        </FadeIn>
      )}

      {!allDone && currentExercise && (
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <p className="mb-1 text-[12.5px] uppercase tracking-wide text-mute">
              Current exercise
            </p>
            <h2 className="text-[18px] font-bold text-ink">
              {currentExercise.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-sub">
              {currentExercise.sets != null && currentExercise.reps != null && (
                <span>
                  Set {(completedCount % (currentExercise.sets || 1)) + 1} of{' '}
                  {currentExercise.sets}
                </span>
              )}
              {currentExercise.reps != null && (
                <span>• Target: {currentExercise.reps}</span>
              )}
              {currentExercise.durationSeconds != null && currentExercise.durationSeconds > 0 && (
                <span>• {formatMinutes(currentExercise.durationSeconds / 60)}</span>
              )}
              {currentExercise.restSeconds != null && currentExercise.restSeconds > 0 && (
                <span>• Rest: {currentExercise.restSeconds}s</span>
              )}
            </div>
            {currentExercise.description && (
              <p className="mt-1 text-[12.5px] text-mute">
                {currentExercise.description}
              </p>
            )}
            <div className="mt-4">
              {kind === 'workout' ? (
                <Button size="lg" className="w-full" onClick={handleLogSet}>
                  Log set
                </Button>
              ) : (
                <Button size="lg" className="w-full" onClick={handleMarkPoseDone}>
                  Mark pose done
                </Button>
              )}
            </div>
          </Card>
        </FadeIn>
      )}

      {allDone && (
        <FadeIn delay={0.1}>
          <Card className="p-5">
            <h2 className="text-[18px] font-bold text-ink">All done</h2>
            <p className="mt-1 text-[13.5px] text-sub">
              Great work! Your session is complete.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                onClick={handleFinish}
                loading={completing}
              >
                Finish
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleFinishEarly}
                loading={completing}
              >
                Finish early
              </Button>
            </div>
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={0.15}>
        <Card className="p-5">
          <h3 className="mb-3 text-[14px] font-bold text-ink">Upcoming</h3>
          <Stagger className="space-y-2.5">
            {exercises.map((ex, idx) => {
              const isCompleted = completedExercises.has(idx);
              const isCurrent = idx === currentExerciseIndex && !isCompleted;
              return (
                <StaggerItem key={`${idx}-${ex.name}`}>
                  <div
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      isCompleted
                        ? 'bg-success-soft/60 text-success'
                        : isCurrent
                          ? 'bg-brand-soft/60'
                          : 'bg-alt/70'
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-[12.5px] font-bold text-sub">
                      {idx + 1}
                    </span>
                    <span className="truncate text-[13.5px] font-medium text-ink">
                      {ex.name}
                    </span>
                    {isCompleted && (
                      <Pill tone="success" className="ml-auto">
                        Done
                      </Pill>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Card>
      </FadeIn>

      <Modal
        open={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        title="Abandon session"
      >
        <div className="space-y-4 p-5">
          <p className="text-[13.5px] text-sub">
            Are you sure you want to abandon this session? Progress will not be saved.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAbandonModal(false)}
              disabled={abandoning}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleAbandon}
              loading={abandoning}
            >
              Abandon
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense>
      <SessionContent />
    </Suspense>
  );
}