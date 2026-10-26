'use client';

/**
 * Goals: create, nudge, complete and delete. Auto-sourced goals (weight,
 * workouts, water, streak) recompute on the server, so the page only writes
 * progress for manual goals and re-reads everything after each mutation.
 */

import { useState } from 'react';

import { ApiError } from '@/lib/api';
import type { Goal, GoalStats, Paged } from '@/lib/types';
import { clampPercent, formatEnumLabel, formatNumber, formatPercent } from '@/lib/format';
import { goalApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/providers/toast-provider';
import {
  Button,
  Card,
  Chip,
  EnumPill,
  Field,
  Modal,
  Pill,
  ProgressBar,
  SegmentedTabs,
  Select,
  TextArea,
} from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import { CheckIcon, PlusIcon, RefreshIcon, TargetIcon, TrashIcon } from '@/components/icons';

const GOAL_TYPES = [
  'weight_loss',
  'weight_gain',
  'muscle_gain',
  'general_fitness',
  'flexibility',
  'stress_reduction',
  'better_lifestyle',
] as const;

const GOAL_SOURCES = [
  'manual',
  'weight',
  'workout_count',
  'workout_minutes',
  'water_ml',
  'yoga_count',
  'streak',
] as const;

type StatusFilter = 'all' | 'active' | 'completed';
const FILTERS: StatusFilter[] = ['all', 'active', 'completed'];

type ProgressMode = 'absolute' | 'increment';

function formatTargetDate(value: string): string {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* --------------------------------------------------------------- sections */

function GoalCard({
  goal,
  busy,
  onProgress,
  onComplete,
  onDelete,
}: {
  goal: Goal;
  busy: boolean;
  onProgress: (goal: Goal) => void;
  onComplete: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}) {
  const percent = clampPercent(goal.progressPercent);
  const completed = goal.status === 'completed';

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-[15px] font-bold text-ink">{goal.title}</h3>
        <Pill tone={completed ? 'success' : goal.status === 'active' ? 'brand' : 'neutral'}>
          {formatEnumLabel(goal.status)}
        </Pill>
      </div>

      {goal.description ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-sub">{goal.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <EnumPill value={goal.goalType} />
        {goal.source && goal.source !== 'manual' ? (
          <Pill tone="info">auto-synced · {formatEnumLabel(goal.source)}</Pill>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-semibold tabular-nums text-ink">
            {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)}{' '}
            <span className="text-sub">{goal.unit}</span>
          </span>
          <span className="tabular-nums text-mute">{formatPercent(percent)}</span>
        </div>
        <ProgressBar percent={percent} tone={completed ? 'success' : 'brand'} height="h-1.5" />
      </div>

      {goal.targetDate ? (
        <p className="mt-2.5 text-[12.5px] text-mute">Target {formatTargetDate(goal.targetDate)}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3.5">
        <Button size="sm" variant="secondary" onClick={() => onProgress(goal)}>
          <PlusIcon className="h-4 w-4" />
          Progress
        </Button>
        {goal.status === 'active' ? (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => onComplete(goal)}>
            <CheckIcon className="h-4 w-4" />
            Complete
          </Button>
        ) : null}
        <Button size="sm" variant="danger" className="ml-auto" onClick={() => onDelete(goal)}>
          <TrashIcon className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- page */

export default function GoalsPage() {
  usePageTitle('Goals');
  const toast = useToast();

  const goals = useApiQuery<Paged<Goal>>(() => goalApi.list({ limit: 50 }), []);
  const stats = useApiQuery<GoalStats>(() => goalApi.stats(), []);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState<string>(GOAL_TYPES[3]);
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<string>('manual');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [weightNotice, setWeightNotice] = useState<string | null>(null);

  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressMode, setProgressMode] = useState<ProgressMode>('absolute');
  const [progressValue, setProgressValue] = useState('');
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressBusy, setProgressBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const parsedTarget = Number(targetValue);
  const targetValid = Number.isFinite(parsedTarget) && parsedTarget > 0;
  const canSave = title.trim().length >= 3 && targetValid && !saving;

  const parsedProgress = Number(progressValue);
  const progressValid =
    Number.isFinite(parsedProgress) &&
    parsedProgress !== 0 &&
    (progressMode === 'increment' || parsedProgress >= 0);

  function refetchAll() {
    goals.refetch();
    stats.refetch();
  }

  function resetForm() {
    setTitle('');
    setGoalType(GOAL_TYPES[3]);
    setTargetValue('');
    setUnit('');
    setTargetDate('');
    setDescription('');
    setSource('manual');
    setFieldErrors({});
    setFormError(null);
    setWeightNotice(null);
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function closeCreate() {
    if (saving) return;
    setCreateOpen(false);
    resetForm();
  }

  async function syncGoals() {
    if (syncing) return;
    setSyncing(true);
    try {
      await goalApi.sync();
      toast.success('Goals synced');
      refetchAll();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not sync goals.');
    } finally {
      setSyncing(false);
    }
  }

  async function createGoal() {
    if (!canSave) return;
    setSaving(true);
    setFormError(null);
    setFieldErrors({});
    setWeightNotice(null);
    try {
      const created = await goalApi.create({
        title: title.trim(),
        goalType,
        targetValue: parsedTarget,
        unit: unit.trim(),
        source,
        targetDate: targetDate || undefined,
        description: description.trim() || undefined,
      });
      toast.success('Goal created', created.title);
      setCreateOpen(false);
      resetForm();
      refetchAll();
    } catch (cause) {
      if (cause instanceof ApiError) {
        const errors = cause.fieldErrors;
        setFieldErrors(errors);
        const weightField = [errors.targetValue, errors.currentValue].find((message) =>
          message?.toLowerCase().includes('weight'),
        );
        // The server rejects a weight goal with no logged weight either as a
        // field error or as a bare 400; both mean "log a weight first".
        if (weightField) setWeightNotice(weightField);
        else if (Object.keys(errors).length === 0 && /weight/i.test(cause.message))
          setWeightNotice(cause.message);
        else if (Object.keys(errors).length === 0) setFormError(cause.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  function openProgress(goal: Goal) {
    setProgressGoal(goal);
    setProgressMode('absolute');
    setProgressValue(String(goal.currentValue ?? 0));
    setProgressError(null);
  }

  function changeProgressMode(mode: ProgressMode) {
    setProgressMode(mode);
    setProgressValue(mode === 'absolute' ? String(progressGoal?.currentValue ?? 0) : '1');
  }

  async function saveProgress() {
    if (!progressGoal || !progressValid || progressBusy) return;
    setProgressBusy(true);
    setProgressError(null);
    try {
      await goalApi.setProgress(
        progressGoal._id,
        progressMode === 'absolute'
          ? { currentValue: parsedProgress }
          : { increment: parsedProgress },
      );
      toast.success('Progress updated', progressGoal.title);
      setProgressGoal(null);
      refetchAll();
    } catch (cause) {
      setProgressError(
        cause instanceof ApiError ? cause.message : 'Could not update progress.',
      );
    } finally {
      setProgressBusy(false);
    }
  }

  async function completeGoal(goal: Goal) {
    if (busyId) return;
    setBusyId(goal._id);
    try {
      await goalApi.update(goal._id, { status: 'completed' });
      toast.success('Goal completed', goal.title);
      refetchAll();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not complete that goal.');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await goalApi.remove(deleteTarget._id);
      toast.success('Goal deleted', deleteTarget.title);
      setDeleteTarget(null);
      refetchAll();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not delete that goal.');
    } finally {
      setDeleteBusy(false);
    }
  }

  if (goals.isLoading && !goals.data) {
    return (
      <PageBody className="space-y-4">
        <div className="card h-28" />
        <SkeletonList rows={4} />
      </PageBody>
    );
  }

  if (goals.error && !goals.data) {
    return (
      <PageBody>
        <ErrorState error={goals.error} onRetry={goals.refetch} />
      </PageBody>
    );
  }

  if (!goals.data) return null;

  const items = goals.data.items;
  const filtered = filter === 'all' ? items : items.filter((goal) => goal.status === filter);
  const hasWeightGoal = items.some((goal) => goal.source === 'weight');

  return (
    <PageBody className="space-y-5">
      {/* ---------------------------------------------------------- header */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-mute">
            {stats.data
              ? `${formatNumber(stats.data.total)} goals on file`
              : 'Weight, training and lifestyle targets'}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
            Goals
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.data ? (
            <>
              <Pill tone="brand">{stats.data.active} active</Pill>
              <Pill tone="success">{stats.data.completed} completed</Pill>
              <Pill tone="neutral">{formatPercent(clampPercent(stats.data.completionRate))} done</Pill>
              <Pill tone="warning">{formatNumber(stats.data.points)} pts</Pill>
            </>
          ) : null}
          <Button variant="secondary" size="sm" loading={syncing} onClick={() => void syncGoals()}>
            <RefreshIcon className="h-4 w-4" />
            Sync
          </Button>
          <Button size="sm" onClick={createOpen ? closeCreate : openCreate}>
            <PlusIcon className="h-4 w-4" />
            New goal
          </Button>
        </div>
      </FadeIn>

      {/* ---------------------------------------------------- create form */}
      {createOpen ? (
        <FadeIn delay={0.05}>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[13.5px] font-bold tracking-wide text-mute uppercase">
                New goal
              </h3>
              <Button variant="ghost" size="sm" onClick={closeCreate} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="space-y-4">
              {formError ? <InlineNotice tone="error" message={formError} /> : null}
              {weightNotice ? <InlineNotice tone="warning" message={weightNotice} /> : null}
              {source === 'weight' || hasWeightGoal ? (
                <InlineNotice
                  tone="info"
                  message="Weight goals follow your logged weights — log at least one weight before creating one."
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Title"
                  placeholder="Lose 5 kg"
                  value={title}
                  error={
                    fieldErrors.title ??
                    (title.length > 0 && title.trim().length < 3 ? 'Use at least 3 characters.' : null)
                  }
                  onChange={(event) => setTitle(event.target.value)}
                />
                <Select
                  label="Goal type"
                  value={goalType}
                  onChange={(event) => setGoalType(event.target.value)}
                >
                  {GOAL_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {formatEnumLabel(value)}
                    </option>
                  ))}
                </Select>

                <Field
                  label="Target"
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step="any"
                  placeholder="5"
                  value={targetValue}
                  error={
                    fieldErrors.targetValue ??
                    (targetValue !== '' && !targetValid ? 'Enter a target greater than 0.' : null)
                  }
                  onChange={(event) => setTargetValue(event.target.value)}
                />
                <Field
                  label="Unit"
                  placeholder="kg / sessions / minutes"
                  value={unit}
                  error={fieldErrors.unit ?? null}
                  onChange={(event) => setUnit(event.target.value)}
                />

                <Field
                  label="Target date"
                  type="date"
                  value={targetDate}
                  error={fieldErrors.targetDate ?? null}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
                <Select
                  label="Source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                >
                  {GOAL_SOURCES.map((value) => (
                    <option key={value} value={value}>
                      {formatEnumLabel(value)}
                    </option>
                  ))}
                </Select>
              </div>

              <TextArea
                label="Description"
                placeholder="Why this target matters"
                value={description}
                error={fieldErrors.description ?? null}
                onChange={(event) => setDescription(event.target.value)}
              />

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={closeCreate} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void createGoal()} loading={saving} disabled={!canSave}>
                  <PlusIcon className="h-4 w-4" />
                  Create goal
                </Button>
              </div>
            </div>
          </Card>
        </FadeIn>
      ) : null}

      {/* --------------------------------------------------------- filters */}
      <FadeIn delay={0.08} className="flex flex-wrap items-center gap-2">
        {FILTERS.map((value) => (
          <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
            {formatEnumLabel(value)}
          </Chip>
        ))}
        <span className="ml-auto text-[12.5px] text-mute">
          {filtered.length} of {items.length} shown
        </span>
      </FadeIn>

      {/* ------------------------------------------------------ goal cards */}
      {filtered.length === 0 ? (
        <FadeIn delay={0.1}>
          <EmptyState
            title={items.length === 0 ? 'No goals yet' : 'Nothing matches this filter'}
            message={
              items.length === 0
                ? 'Set a target — weight, sessions or minutes — and progress fills itself in.'
                : 'Switch the filter to see your other goals.'
            }
            icon={<TargetIcon className="h-5 w-5" />}
            action={
              items.length === 0 ? (
                <Button size="sm" onClick={openCreate}>
                  <PlusIcon className="h-4 w-4" />
                  Create a goal
                </Button>
              ) : undefined
            }
          />
        </FadeIn>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {filtered.map((goal) => (
            <StaggerItem key={goal._id}>
              <GoalCard
                goal={goal}
                busy={busyId === goal._id}
                onProgress={openProgress}
                onComplete={(target) => void completeGoal(target)}
                onDelete={setDeleteTarget}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <FadeIn delay={0.14}>
        <p className="pb-2 text-center text-[11.5px] text-mute">
          Auto-sourced goals refresh whenever you sync or log new data.
        </p>
      </FadeIn>

      {/* --------------------------------------------------- progress modal */}
      <Modal
        open={progressGoal !== null}
        onClose={() => setProgressGoal(null)}
        title={progressGoal ? `Update progress · ${progressGoal.title}` : 'Update progress'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setProgressGoal(null)} disabled={progressBusy}>
              Cancel
            </Button>
            <Button onClick={() => void saveProgress()} loading={progressBusy} disabled={!progressValid}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {progressError ? <InlineNotice tone="error" message={progressError} /> : null}

          <SegmentedTabs
            value={progressMode}
            onChange={changeProgressMode}
            options={[
              { value: 'absolute', label: 'Current value' },
              { value: 'increment', label: 'Add' },
            ]}
          />

          <Field
            label={progressMode === 'absolute' ? 'Current value' : 'Amount to add'}
            type="number"
            inputMode="decimal"
            step="any"
            suffix={progressGoal?.unit}
            value={progressValue}
            onChange={(event) => setProgressValue(event.target.value)}
            autoFocus
          />

          {progressGoal ? (
            <p className="text-[12.5px] text-mute">
              Currently {formatNumber(progressGoal.currentValue)} /{' '}
              {formatNumber(progressGoal.targetValue)} {progressGoal.unit} ·{' '}
              {formatPercent(clampPercent(progressGoal.progressPercent))} done
            </p>
          ) : null}
        </div>
      </Modal>

      {/* ---------------------------------------------------- delete modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this goal?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleteBusy}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-sub">
          {deleteTarget ? `“${deleteTarget.title}” and its progress will be removed.` : ''} This
          cannot be undone.
        </p>
      </Modal>

      {goals.isRefreshing ? (
        <span className="sr-only" aria-live="polite">
          Refreshing
        </span>
      ) : null}
    </PageBody>
  );
}
