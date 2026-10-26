/**
 * Nutrition arithmetic.
 *
 * Run with: node --test src/lib/__tests__/nutrition-math.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  caloriesFromMacros,
  macroCalories,
  macroSplit,
  macrosForGrams,
} from '../nutrition-math.ts';

const OATS = { calories: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9 };

describe('macrosForGrams', () => {
  it('returns the food unchanged at 100 g', () => {
    const result = macrosForGrams(OATS, 100);
    assert.equal(result.calories, 389);
    assert.equal(result.proteinG, 16.9);
  });

  it('scales linearly', () => {
    const half = macrosForGrams(OATS, 50);
    assert.equal(half.calories, 194.5);
    assert.equal(half.proteinG, 8.45);
  });

  it('doubles at 200 g, the bug a user would actually hit', () => {
    const double = macrosForGrams(OATS, 200);
    assert.equal(double.calories, 778);
    assert.equal(double.carbsG, 132.6);
  });

  it('handles a serving size that is not a round number', () => {
    const serving = macrosForGrams(OATS, 37);
    assert.ok(Math.abs(serving.calories - 143.93) < 0.01);
  });

  it('returns zeroes rather than NaN for a missing amount', () => {
    for (const grams of [Number.NaN, 0, -50, Number.POSITIVE_INFINITY]) {
      const result = macrosForGrams(OATS, grams);
      assert.equal(result.calories, 0, `grams=${grams}`);
      assert.ok(Number.isFinite(result.proteinG), `grams=${grams}`);
    }
  });
});

describe('macroCalories', () => {
  it('weights fat at 9 kcal per gram and the others at 4', () => {
    const result = macroCalories({ proteinG: 10, carbsG: 20, fatG: 5 });
    assert.deepEqual(result, { proteinG: 40, carbsG: 80, fatG: 45 });
  });

  it('treats a missing value as zero instead of producing NaN', () => {
    const result = macroCalories({
      proteinG: 10,
      carbsG: undefined as unknown as number,
      fatG: 0,
    });
    assert.equal(result.carbsG, 0);
    assert.ok(Number.isFinite(result.proteinG));
  });
});

describe('macroSplit', () => {
  it('sums to 100 percent', () => {
    const split = macroSplit({ proteinG: 30, carbsG: 50, fatG: 20 });
    const total = split.proteinG + split.carbsG + split.fatG;
    assert.ok(Math.abs(total - 100) < 1e-9, `total was ${total}`);
  });

  it('gives fat a larger share than an equal weight of carbs', () => {
    const split = macroSplit({ proteinG: 0, carbsG: 10, fatG: 10 });
    assert.ok(split.fatG > split.carbsG, 'fat should outweigh carbs by energy');
    // 90 kcal of fat against 40 kcal of carbs.
    assert.ok(Math.abs(split.fatG - (90 / 130) * 100) < 1e-9);
  });

  it('returns zeroes for an empty day instead of dividing by zero', () => {
    const split = macroSplit({ proteinG: 0, carbsG: 0, fatG: 0 });
    assert.deepEqual(split, { proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('caloriesFromMacros', () => {
  it('sums the energy from each macro', () => {
    assert.equal(caloriesFromMacros({ proteinG: 10, carbsG: 20, fatG: 5 }), 165);
  });

  it('is zero for an empty day', () => {
    assert.equal(caloriesFromMacros({ proteinG: 0, carbsG: 0, fatG: 0 }), 0);
  });
});
