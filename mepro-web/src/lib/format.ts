/**
 * Display helpers.
 *
 * These are pure so they can be unit tested, which matters because a formatter
 * that renders `NaN kcal` or `1200 ml` in a health app is a real defect.
 */

/** A "day" string, matching the API's UTC day boundary. */
export function todayIso(now: Date = new Date()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function shiftIsoDate(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatNumber(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Rounds for display but keeps the number plausible: a 0.4 kg change is real
 * and worth showing, and a negative zero is not.
 */
export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} kg`;
}

export function formatSignedWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0.0 kg';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)} kg`;
}

export function formatCalories(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString()} kcal`;
}

export function formatGrams(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value)} g`;
}

export function formatMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const minutes = Math.round(value);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatVolume(ml: number | null | undefined): string {
  if (ml === null || ml === undefined || !Number.isFinite(ml)) return '—';
  if (ml >= 1000) {
    const litres = ml / 1000;
    return `${Number.isInteger(litres) ? litres : litres.toFixed(1)} L`;
  }
  return `${Math.round(ml)} ml`;
}

/**
 * Percentage for a progress ring.
 *
 * Values outside 0..100 are clamped, and an impossible target reads as 0 rather
 * than NaN, so the UI never renders a broken ring.
 */
export function clampPercent(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

export function formatBmi(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(1);
}

export function formatLevel(level: number | null | undefined): string {
  if (level === null || level === undefined || !Number.isFinite(level)) return '—';
  return `Level ${Math.floor(level)}`;
}

/** "3 days ago" style relative label, for history rows. */
export function formatRelativeDay(day: string, now: Date = new Date()): string {
  const target = new Date(`${day}T00:00:00.000Z`).getTime();
  const base = new Date(`${todayIso(now)}T00:00:00.000Z`).getTime();
  const diffDays = Math.round((base - target) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return 'Last week';

  const date = new Date(`${day}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** `undefined` for an absent value, so callers can omit optional query params. */
export function optionalQuery(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

/** Turns a CSV query value into an array, dropping empties. */
export function parseCsv(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

/** Meal order matters: a day is read top to bottom. */
export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

/**
 * The unmapped fallback is stringified rather than passed through, so a value
 * of an unexpected type cannot reach the tree as a non-string and fail during
 * render the way an object child does.
 */
export function formatMealType(mealType: unknown): string {
  if (typeof mealType !== 'string') return '';
  return MEAL_LABELS[mealType] ?? mealType;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Turn an API enum value into a human label.
 *
 * This is the boundary between untyped server data and the UI, so it accepts
 * `unknown`: a wrong type from the API must render as a blank row rather than
 * throwing during render and taking the whole screen down with it. Numbers and
 * booleans are still shown, since silently dropping a value is worse than
 * showing an unformatted one.
 */
export function formatEnumLabel(value: unknown): string {
  if (typeof value === 'string') return titleCase(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Label a list of enum values, e.g. `['gym', 'home']` -> `Gym, Home`.
 *
 * Several profile fields are arrays, so this is what callers should reach for
 * rather than passing an array to `formatEnumLabel` by mistake.
 */
export function formatEnumList(values: unknown): string {
  if (!Array.isArray(values)) return formatEnumLabel(values);
  return values
    .map((value) => formatEnumLabel(value))
    .filter((label) => label.length > 0)
    .join(', ');
}

export function initials(name: string | null | undefined): string {
  // Trim before the emptiness check: a name of only spaces is truthy, and
  // without this it would produce an empty string and a blank avatar.
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  return letters || '?';
}
