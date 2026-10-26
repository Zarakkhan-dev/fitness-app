'use client';

/**
 * The two "write your own" modals on the Train screen.
 *
 * The server catalogue is read-only, so these save to the on-device catalog
 * (see `@/lib/custom-catalog`) instead of calling the API. That is also why
 * there is no error path here beyond validation: a save cannot fail because
 * the backend is down.
 */

import { useState } from 'react';

import {
  addCustomWorkout,
  addCustomYoga,
  parseExerciseLines,
  parseList,
  parseLines,
  parsePoseLines,
} from '@/lib/custom-catalog';
import { formatEnumLabel } from '@/lib/format';
import { useToast } from '@/providers/toast-provider';
import { Button, Field, Modal, Select, TextArea } from '@/components/ui';
import { InlineNotice } from '@/components/states';
import { DumbbellIcon, LeafIcon } from '@/components/icons';
import { FITNESS_LEVELS, WORKOUT_CATEGORIES, YOGA_CATEGORIES } from '@/lib/train-options';

const MAX_TITLE = 80;
const MAX_DURATION = 600;
const MAX_CALORIES = 5000;

export function AddWorkoutModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('full_body');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [duration, setDuration] = useState('30');
  const [calories, setCalories] = useState('200');
  const [equipment, setEquipment] = useState('');
  const [exerciseLines, setExerciseLines] = useState('');

  const parsedDuration = Number(duration);
  const parsedCalories = Number(calories);
  const valid =
    title.trim().length > 0 &&
    title.trim().length <= MAX_TITLE &&
    Number.isFinite(parsedDuration) &&
    parsedDuration >= 1 &&
    parsedDuration <= MAX_DURATION &&
    Number.isFinite(parsedCalories) &&
    parsedCalories >= 0 &&
    parsedCalories <= MAX_CALORIES;

  // The form is only reset on close, so a re-render never wipes what is typed.
  function close() {
    setTitle('');
    setDescription('');
    setCategory('full_body');
    setDifficulty('beginner');
    setDuration('30');
    setCalories('200');
    setEquipment('');
    setExerciseLines('');
    onClose();
  }

  function save() {
    if (!valid) return;
    const workout = addCustomWorkout({
      title,
      description,
      category,
      difficulty,
      durationMinutes: Math.round(parsedDuration),
      estimatedCalories: Math.round(parsedCalories),
      equipment: parseList(equipment),
      exercises: parseExerciseLines(exerciseLines),
    });
    toast.success('Workout added', `${workout.title} is saved on this device.`);
    onSaved?.();
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a workout"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            <DumbbellIcon className="h-4 w-4" />
            Add workout
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <InlineNotice message="Saved on this device, so it works even when the server is offline." />

        <Field
          label="Name"
          placeholder="Morning circuit"
          value={title}
          maxLength={MAX_TITLE}
          onChange={(event) => setTitle(event.target.value)}
          error={title.length > MAX_TITLE ? `Keep it under ${MAX_TITLE} characters.` : null}
          autoFocus
        />

        <TextArea
          label="What is it?"
          placeholder="A short full-body circuit to start the day."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Muscle group" value={category} onChange={(event) => setCategory(event.target.value)}>
            {WORKOUT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {formatEnumLabel(value)}
              </option>
            ))}
          </Select>
          <Select label="Level" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            {FITNESS_LEVELS.map((value) => (
              <option key={value} value={value}>
                {formatEnumLabel(value)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Duration"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DURATION}
            suffix="min"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            error={
              duration !== '' && (!Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > MAX_DURATION)
                ? `Enter 1–${MAX_DURATION} minutes.`
                : null
            }
          />
          <Field
            label="Estimated calories"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_CALORIES}
            suffix="kcal"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            error={
              calories !== '' && (!Number.isFinite(parsedCalories) || parsedCalories < 0 || parsedCalories > MAX_CALORIES)
                ? `Enter 0–${MAX_CALORIES} kcal.`
                : null
            }
          />
        </div>

        <Field
          label="Equipment"
          placeholder="Dumbbells, mat"
          value={equipment}
          onChange={(event) => setEquipment(event.target.value)}
          hint="Comma separated. Leave empty for bodyweight."
        />

        <TextArea
          label="Exercises"
          placeholder={'Goblet squat 3x12\nPush ups 3x15\nPlank 3x45s'}
          value={exerciseLines}
          onChange={(event) => setExerciseLines(event.target.value)}
          hint="One per line. Add sets and reps after the name, e.g. “Push ups 3x15”."
        />
      </div>
    </Modal>
  );
}

export function AddYogaModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('beginner');
  const [level, setLevel] = useState<string>('beginner');
  const [duration, setDuration] = useState('20');
  const [focusAreas, setFocusAreas] = useState('');
  const [benefits, setBenefits] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [poseLines, setPoseLines] = useState('');

  const parsedDuration = Number(duration);
  const valid =
    title.trim().length > 0 &&
    title.trim().length <= MAX_TITLE &&
    Number.isFinite(parsedDuration) &&
    parsedDuration >= 1 &&
    parsedDuration <= MAX_DURATION;

  function close() {
    setTitle('');
    setDescription('');
    setCategory('beginner');
    setLevel('beginner');
    setDuration('20');
    setFocusAreas('');
    setBenefits('');
    setPrecautions('');
    setPoseLines('');
    onClose();
  }

  function save() {
    if (!valid) return;
    const routine = addCustomYoga({
      title,
      description,
      category,
      level,
      durationMinutes: Math.round(parsedDuration),
      focusAreas: parseList(focusAreas),
      benefits: parseLines(benefits),
      precautions: parseLines(precautions),
      asanas: parsePoseLines(poseLines),
    });
    toast.success('Yoga routine added', `${routine.title} is saved on this device.`);
    onSaved?.();
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a yoga routine"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            <LeafIcon className="h-4 w-4" />
            Add routine
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <InlineNotice message="Saved on this device, so it works even when the server is offline." />

        <Field
          label="Name"
          placeholder="Evening wind-down"
          value={title}
          maxLength={MAX_TITLE}
          onChange={(event) => setTitle(event.target.value)}
          error={title.length > MAX_TITLE ? `Keep it under ${MAX_TITLE} characters.` : null}
          autoFocus
        />

        <TextArea
          label="What is it?"
          placeholder="Slow floor poses to close the day."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Focus" value={category} onChange={(event) => setCategory(event.target.value)}>
            {YOGA_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {formatEnumLabel(value)}
              </option>
            ))}
          </Select>
          <Select label="Level" value={level} onChange={(event) => setLevel(event.target.value)}>
            {FITNESS_LEVELS.map((value) => (
              <option key={value} value={value}>
                {formatEnumLabel(value)}
              </option>
            ))}
          </Select>
        </div>

        <Field
          label="Duration"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DURATION}
          suffix="min"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          error={
            duration !== '' && (!Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > MAX_DURATION)
              ? `Enter 1–${MAX_DURATION} minutes.`
              : null
          }
        />

        <Field
          label="Focus areas"
          placeholder="Back, hips"
          value={focusAreas}
          onChange={(event) => setFocusAreas(event.target.value)}
          hint="Comma separated."
        />

        <TextArea
          label="Poses"
          placeholder={'Cat-cow 60s\nChild pose 90s\nSupine twist'}
          value={poseLines}
          onChange={(event) => setPoseLines(event.target.value)}
          hint="One per line. Add a hold after the name, e.g. “Child pose 90s”."
        />

        <TextArea
          label="Benefits"
          placeholder="Releases lower back tension"
          value={benefits}
          onChange={(event) => setBenefits(event.target.value)}
          hint="One per line."
        />

        <TextArea
          label="Precautions"
          placeholder="Skip if you feel sharp pain"
          value={precautions}
          onChange={(event) => setPrecautions(event.target.value)}
          hint="One per line."
        />
      </div>
    </Modal>
  );
}
