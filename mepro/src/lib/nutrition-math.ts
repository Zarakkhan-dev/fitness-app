/**
 * Nutrition arithmetic.
 *
 * The API stores food values per 100 g, so every number the user sees has to be
 * scaled. That scaling is easy to get wrong in a way that is invisible in review
 * but obvious to a user ("I logged 200 g and it added the calories of 200 g"),
 * so it lives here, free of React, and is unit tested.
 *
 * Per the US National Food Composition Tables, 4 kcal per gram of protein and
 * carbohydrate and 9 per gram of fat. A macro split by grams alone would make a
 * high-fat day look carb-heavy, so the energy split weights by calories.
 */

export interface MacrosPer100g {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const KCAL_PER_GRAM = { proteinG: 4, carbsG: 4, fatG: 9 } as const;

export type MacroKey = keyof typeof KCAL_PER_GRAM;

/**
 * Scale a per-100 g food to a logged amount.
 *
 * Returns zeroes for a non-positive or non-finite amount rather than NaN, so a
 * malformed `grams` cannot put `NaN kcal` in front of a user.
 */
export function macrosForGrams(food: MacrosPer100g, grams: number): Macros {
  if (!Number.isFinite(grams) || grams <= 0) {
    return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  }
  const factor = grams / 100;
  return {
    calories: food.calories * factor,
    proteinG: food.proteinG * factor,
    carbsG: food.carbsG * factor,
    fatG: food.fatG * factor,
  };
}

/** Energy from each macro, for pie and bar splits. */
export function macroCalories(macros: Pick<Macros, MacroKey>): Record<MacroKey, number> {
  return {
    proteinG: (macros.proteinG || 0) * KCAL_PER_GRAM.proteinG,
    carbsG: (macros.carbsG || 0) * KCAL_PER_GRAM.carbsG,
    fatG: (macros.fatG || 0) * KCAL_PER_GRAM.fatG,
  };
}

/**
 * Each macro's share of total energy, as percentages summing to 100.
 *
 * Returns zeroes when nothing is logged, which lets the caller render an empty
 * bar without a divide-by-zero guard of its own.
 */
export function macroSplit(macros: Pick<Macros, MacroKey>): Record<MacroKey, number> {
  const kcal = macroCalories(macros);
  const total = kcal.proteinG + kcal.carbsG + kcal.fatG;
  if (total <= 0) return { proteinG: 0, carbsG: 0, fatG: 0 };

  return {
    proteinG: (kcal.proteinG / total) * 100,
    carbsG: (kcal.carbsG / total) * 100,
    fatG: (kcal.fatG / total) * 100,
  };
}

/** Energy implied by the macros, which rarely matches the food's own calorie value. */
export function caloriesFromMacros(macros: Pick<Macros, MacroKey>): number {
  const kcal = macroCalories(macros);
  return kcal.proteinG + kcal.carbsG + kcal.fatG;
}
