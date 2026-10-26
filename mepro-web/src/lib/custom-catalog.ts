'use client';

/**
 * The user's own workouts and yoga routines.
 *
 * The server catalogue is read-only — there is no POST /workouts — so anything
 * the user writes lives here instead. Storage is localStorage: it survives a
 * reload, needs no account, and — unlike the API — is still there when the
 * backend is unreachable, which is exactly when a hand-entered session matters
 * most.
 *
 * Ids minted here start with `local-` so every other screen can tell a
 * user-written entry from a server one without a round trip.
 */

import { useSyncExternalStore } from 'react';

import type { Asana, Exercise, Workout, YogaRoutine } from '@/lib/types';

const STORAGE_KEY = 'mepro.custom-catalog.v1';

export const LOCAL_ID_PREFIX = 'local-';

/** Keeps one bad paste from filling localStorage; oldest entries drop off. */
const MAX_ENTRIES_PER_COLLECTION = 50;

export interface CustomCatalog {
  workouts: Workout[];
  yoga: YogaRoutine[];
}

const EMPTY_CATALOG: CustomCatalog = { workouts: [], yoga: [] };

const listeners = new Set<() => void>();

/**
 * `useSyncExternalStore` needs the snapshot to be referentially stable between
 * changes, so the parsed value is cached and only rebuilt on write.
 */
let snapshot: CustomCatalog | null = null;

function read(): CustomCatalog {
  if (typeof window === 'undefined') return EMPTY_CATALOG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CATALOG;
    const parsed = JSON.parse(raw) as Partial<CustomCatalog>;
    return {
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      yoga: Array.isArray(parsed.yoga) ? parsed.yoga : [],
    };
  } catch {
    // Corrupt or unavailable storage should never break the Train screen.
    return EMPTY_CATALOG;
  }
}

function getSnapshot(): CustomCatalog {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** Used during SSR and hydration, where localStorage does not exist. */
function getServerSnapshot(): CustomCatalog {
  return EMPTY_CATALOG;
}

function commit(next: CustomCatalog): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the entry still shows for this render pass.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other open tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = read();
    listeners.forEach((entry) => entry());
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** True when this id was written on the device rather than served by the API. */
export function isLocalId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(LOCAL_ID_PREFIX);
}

function newLocalId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${LOCAL_ID_PREFIX}${random}`;
}

/* ------------------------------------------------------------------ reads */

export function useCustomCatalog(): CustomCatalog {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getCustomWorkout(id: string): Workout | undefined {
  return getSnapshot().workouts.find((workout) => workout._id === id);
}

export function getCustomYoga(id: string): YogaRoutine | undefined {
  return getSnapshot().yoga.find((routine) => routine._id === id);
}

/* ----------------------------------------------------------------- writes */

export interface CustomWorkoutInput {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  estimatedCalories: number;
  equipment: string[];
  exercises: Exercise[];
}

export function addCustomWorkout(input: CustomWorkoutInput): Workout {
  const now = new Date().toISOString();
  const workout: Workout = {
    _id: newLocalId(),
    slug: slugify(input.title),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    difficulty: input.difficulty,
    durationMinutes: input.durationMinutes,
    estimatedCalories: input.estimatedCalories,
    equipment: input.equipment,
    exercises: input.exercises,
    isActive: true,
  };
  const current = getSnapshot();
  commit({
    ...current,
    workouts: [workout, ...current.workouts].slice(0, MAX_ENTRIES_PER_COLLECTION),
  });
  return workout;
}

export interface CustomYogaInput {
  title: string;
  description: string;
  category: string;
  level: string;
  durationMinutes: number;
  focusAreas: string[];
  benefits: string[];
  precautions: string[];
  asanas: Asana[];
}

export function addCustomYoga(input: CustomYogaInput): YogaRoutine {
  const routine: YogaRoutine = {
    _id: newLocalId(),
    slug: slugify(input.title),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    level: input.level,
    durationMinutes: input.durationMinutes,
    focusAreas: input.focusAreas,
    benefits: input.benefits,
    precautions: input.precautions,
    asanas: input.asanas,
    isActive: true,
  };
  const current = getSnapshot();
  commit({
    ...current,
    yoga: [routine, ...current.yoga].slice(0, MAX_ENTRIES_PER_COLLECTION),
  });
  return routine;
}

export function removeCustomWorkout(id: string): void {
  const current = getSnapshot();
  const workouts = current.workouts.filter((workout) => workout._id !== id);
  if (workouts.length === current.workouts.length) return;
  commit({ ...current, workouts });
}

export function removeCustomYoga(id: string): void {
  const current = getSnapshot();
  const yoga = current.yoga.filter((routine) => routine._id !== id);
  if (yoga.length === current.yoga.length) return;
  commit({ ...current, yoga });
}

/* ---------------------------------------------------------------- parsing */

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'custom'
  );
}

/** Splits a pasted block into non-empty lines, dropping bullets and numbering. */
export function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•●▪]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function parseList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Accepts "Push ups 3x12" as well as a bare name, so a pasted routine keeps its
 * prescription without needing a separate grid of number inputs.
 */
const PRESCRIPTION = /(?:\s+[·•,–—-]?\s*)(\d+)\s*[x×]\s*(\d+(?:\s*(?:s|sec|secs|seconds?|min|mins|minutes?))?)\s*$/i;

const HOLD = /(?:\s+[·•,–—-]?\s*)(\d+)\s*(s|sec|secs|seconds?|min|mins|minutes?)\s*$/i;

export function parseExerciseLines(value: string): Exercise[] {
  return parseLines(value).map((line, index) => {
    const match = PRESCRIPTION.exec(line);
    if (!match) return { name: line, order: index + 1 };
    return {
      name: line.slice(0, match.index).trim() || line,
      order: index + 1,
      sets: Number(match[1]),
      reps: match[2].trim(),
    };
  });
}

export function parsePoseLines(value: string): Asana[] {
  return parseLines(value).map((line, index) => {
    const match = HOLD.exec(line);
    if (!match) return { name: line, order: index + 1 };
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    return {
      name: line.slice(0, match.index).trim() || line,
      order: index + 1,
      holdSeconds: unit.startsWith('m') ? amount * 60 : amount,
    };
  });
}
