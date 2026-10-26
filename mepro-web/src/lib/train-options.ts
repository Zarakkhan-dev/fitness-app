/**
 * The filter and form vocabulary for the Train screens.
 *
 * These mirror the server's enums (see mepro-backend/src/types/enums.ts) so a
 * locally written entry is indistinguishable from a seeded one once it reaches
 * the API, and so the chips on the list page and the selects in the create
 * forms can never drift apart.
 */

export const WORKOUT_CATEGORIES = [
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
] as const;

export const YOGA_CATEGORIES = [
  'beginner',
  'flexibility',
  'relaxation',
  'morning',
  'evening',
  'stress_relief',
  'back_friendly',
] as const;

export const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
