/**
 * Display formatters.
 *
 * Run with: node --test src/lib/__tests__/format.test.ts
 *
 * The theme is not imported here, which is deliberate: `format.ts` is dependency
 * free so it can run under plain Node with no React Native transform.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampPercent,
  formatBmi,
  formatCalories,
  formatEnumLabel,
  formatEnumList,
  formatGrams,
  formatLevel,
  formatMealType,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatRelativeDay,
  formatSignedWeight,
  formatVolume,
  formatWeight,
  initials,
  optionalQuery,
  parseCsv,
  shiftIsoDate,
  todayIso,
} from '../format.ts';

describe('formatNumber', () => {
  it('formats an integer', () => {
    assert.equal(formatNumber(1234), '1,234');
  });

  it('respects the requested precision', () => {
    assert.equal(formatNumber(78.567, 1), '78.6');
  });

  it('never prints NaN for a missing value', () => {
    // A formatter that renders "NaN kcal" in a health app is a real defect.
    assert.equal(formatNumber(null), '—');
    assert.equal(formatNumber(undefined), '—');
    assert.equal(formatNumber(Number.NaN), '—');
  });

  it('renders zero as zero, not as a dash', () => {
    assert.equal(formatNumber(0), '0');
  });
});

describe('weight and calorie formatting', () => {
  it('formats a weight with a unit', () => {
    assert.equal(formatWeight(78.5), '78.5 kg');
  });

  it('signs a weight delta', () => {
    assert.equal(formatSignedWeight(-1.2), '-1.2 kg');
    assert.equal(formatSignedWeight(0.5), '+0.5 kg');
    assert.equal(formatSignedWeight(0), '0.0 kg');
  });

  it('formats calories, including the unit', () => {
    assert.equal(formatCalories(2267), '2,267 kcal');
  });

  it('rounds grams to a whole number and carries the unit', () => {
    assert.equal(formatGrams(31.25), '31 g');
    assert.equal(formatGrams(0), '0 g');
  });

  it('returns a dash for a missing volume', () => {
    assert.equal(formatVolume(null), '—');
  });

  it('shows litres once there are a few of them', () => {
    assert.equal(formatVolume(500), '500 ml');
    assert.equal(formatVolume(3400), '3.4 L');
  });
});

describe('formatMinutes', () => {
  it('leaves a short session in minutes', () => {
    assert.equal(formatMinutes(45), '45 min');
  });

  it('converts to hours past 60', () => {
    assert.equal(formatMinutes(90), '1 h 30 min');
    assert.equal(formatMinutes(60), '1 h');
    assert.equal(formatMinutes(0), '0 min');
  });

  it('handles a missing value', () => {
    assert.equal(formatMinutes(null), '—');
  });
});

describe('percentages', () => {
  it('rounds to a whole number', () => {
    assert.equal(formatPercent(66.6), '67%');
  });

  it('clamps out-of-range values to a number a progress bar can use', () => {
    assert.equal(clampPercent(120), 100);
    assert.equal(clampPercent(-5), 0);
    assert.equal(clampPercent(null), 0);
    assert.equal(clampPercent(Number.NaN), 0);
  });

  it('adds the sign in formatPercent, not clampPercent', () => {
    assert.equal(formatPercent(100), '100%');
    assert.equal(formatPercent(null), '—');
  });
});

describe('formatLevel', () => {
  it('describes a numeric level', () => {
    assert.equal(formatLevel(1), 'Level 1');
    assert.equal(formatLevel(3.9), 'Level 3');
  });

  it('handles a missing level', () => {
    assert.equal(formatLevel(null), '—');
  });
});

describe('formatBmi', () => {
  it('formats a BMI with one decimal', () => {
    assert.equal(formatBmi(25.44), '25.4');
  });
});

describe('meal types', () => {
  it('title-cases the known meals in order', () => {
    assert.equal(formatMealType('breakfast'), 'Breakfast');
    assert.equal(formatMealType('lunch'), 'Lunch');
  });

  it('passes an unknown meal through rather than guessing', () => {
    assert.equal(formatMealType('brunch'), 'brunch');
  });
});

describe('formatEnumLabel', () => {
  it('turns a snake_case value into a label', () => {
    assert.equal(formatEnumLabel('lower_body'), 'Lower Body');
    assert.equal(formatEnumLabel('hiit'), 'Hiit');
  });

  it('leaves an already-formatted value alone', () => {
    assert.equal(formatEnumLabel('Yoga'), 'Yoga');
  });

  // Regression: the API returns `preferredWorkoutLocation` as an array, and
  // passing that array straight in used to throw `value.replace is not a
  // function` during render, which unmounted the whole Profile tab.
  it('never throws on a non-string value', () => {
    for (const value of [undefined, null, 0, 42, true, {}, ['gym', 'home']]) {
      assert.doesNotThrow(() => formatEnumLabel(value));
    }
  });

  it('renders an absent value as an empty string', () => {
    assert.equal(formatEnumLabel(undefined), '');
    assert.equal(formatEnumLabel(null), '');
    assert.equal(formatEnumLabel(''), '');
  });

  it('shows a number or boolean rather than dropping it', () => {
    assert.equal(formatEnumLabel(3), '3');
    assert.equal(formatEnumLabel(true), 'true');
  });

  it('renders a list of enum values as one label', () => {
    assert.equal(formatEnumList(['gym', 'home']), 'Gym, Home');
    assert.equal(formatEnumList(['gym']), 'Gym');
  });

  it('renders an empty or mixed list without stray separators', () => {
    assert.equal(formatEnumList([]), '');
    assert.equal(formatEnumList(undefined), '');
    assert.equal(formatEnumList(['gym', null, 'home']), 'Gym, Home');
  });

  it('accepts a single value where a list is expected', () => {
    assert.equal(formatEnumList('gym'), 'Gym');
  });
});

describe('formatMealType', () => {
  it('labels the known meals', () => {
    assert.equal(formatMealType('breakfast'), 'Breakfast');
    assert.equal(formatMealType('snack'), 'Snacks');
  });

  it('falls back to the raw value when it is a string', () => {
    assert.equal(formatMealType('brunch'), 'brunch');
  });

  // The fallback must never hand a non-string to the tree: React throws on an
  // object child, which would blank the whole Nutrition tab.
  it('returns an empty string for a non-string instead of passing it through', () => {
    assert.equal(formatMealType(undefined), '');
    assert.equal(formatMealType(null), '');
    assert.equal(formatMealType(['lunch']), '');
    assert.equal(formatMealType({ meal: 'lunch' }), '');
  });
});

describe('formatRelativeDay', () => {
  it('names today and yesterday', () => {
    const now = new Date('2026-09-26T10:00:00.000Z');
    assert.equal(formatRelativeDay('2026-09-26', now), 'Today');
    assert.equal(formatRelativeDay('2026-09-25', now), 'Yesterday');
  });

  it('uses a relative description for anything older', () => {
    const now = new Date('2026-09-26T10:00:00.000Z');
    assert.equal(formatRelativeDay('2026-09-20', now), '6 days ago');
  });
});

describe('dates', () => {
  it('returns a YYYY-MM-DD string', () => {
    assert.equal(todayIso(new Date('2026-09-26T10:48:31.258Z')), '2026-09-26');
  });

  it('shifts a day forwards and backwards', () => {
    assert.equal(shiftIsoDate('2026-09-26', 1), '2026-09-27');
    assert.equal(shiftIsoDate('2026-09-26', -1), '2026-09-25');
  });

  it('rolls across a month boundary', () => {
    assert.equal(shiftIsoDate('2026-09-30', 1), '2026-10-01');
  });
});

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    assert.equal(initials('Aarav Sharma'), 'AS');
    assert.equal(initials('Priya'), 'P');
  });

  it('handles a missing or blank name', () => {
    assert.equal(initials(null), '?');
    assert.equal(initials(undefined), '?');
    // A whitespace-only name must not produce an empty avatar.
    assert.equal(initials('   '), '?');
    assert.notEqual(initials('   '), '');
  });

  it('ignores extra words beyond two', () => {
    assert.equal(initials('Aarav Kumar Sharma'), 'AK');
  });
});

describe('query helpers', () => {
  it('drops empty values so the query string stays clean', () => {
    assert.equal(optionalQuery(''), undefined);
    assert.equal(optionalQuery(undefined), undefined);
    assert.equal(optionalQuery('all'), 'all');
    // 0 is a meaningful value (a zero-day range), so it is not dropped.
    assert.equal(optionalQuery(0), 0);
  });

  it('parses a comma list and drops blanks', () => {
    assert.deepEqual(parseCsv('a, b ,,c'), ['a', 'b', 'c']);
    assert.deepEqual(parseCsv(''), []);
    assert.deepEqual(parseCsv(null), []);
  });
});
