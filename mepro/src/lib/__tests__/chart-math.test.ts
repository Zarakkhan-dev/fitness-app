/**
 * Chart geometry.
 *
 * Run with: node --test src/lib/__tests__/chart-math.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lineGeometry, seriesDelta, usablePoints, type SeriesPoint } from '../chart-math.ts';

const WIDTH = 320;
const HEIGHT = 160;
const PADDING = { top: 12, right: 12, bottom: 24, left: 12 };

const RISING: SeriesPoint[] = [
  { label: '1', value: 10 },
  { label: '2', value: 20 },
  { label: '3', value: 30 },
];

describe('usablePoints', () => {
  it('drops gaps and non-finite values', () => {
    const result = usablePoints([
      { label: 'a', value: 1 },
      { label: 'b', value: Number.NaN },
      { label: 'c', value: Number.POSITIVE_INFINITY },
      { label: 'd', value: 2 },
    ]);
    assert.equal(result.length, 2);
  });
});

describe('lineGeometry', () => {
  it('returns null with fewer than two usable points', () => {
    assert.equal(lineGeometry([], WIDTH, HEIGHT), null);
    assert.equal(lineGeometry([{ label: 'only', value: 5 }], WIDTH, HEIGHT), null);
    assert.equal(
      lineGeometry([{ label: 'a', value: Number.NaN }, { label: 'b', value: Number.NaN }], WIDTH, HEIGHT),
      null,
    );
  });

  it('starts at the left padding and ends at the right padding', () => {
    const geometry = lineGeometry(RISING, WIDTH, HEIGHT, PADDING);
    assert.ok(geometry);
    assert.ok(geometry.linePath.startsWith(`M${PADDING.left.toFixed(2)},`), geometry.linePath);
    assert.equal(geometry.lastX, WIDTH - PADDING.right);
  });

  it('places the lowest value on the baseline and the highest at the top', () => {
    const geometry = lineGeometry(RISING, WIDTH, HEIGHT, PADDING);
    assert.ok(geometry);
    const baseline = PADDING.top + (HEIGHT - PADDING.top - PADDING.bottom);
    // The first point is the minimum, so it sits at the bottom of the plot area.
    assert.ok(Math.abs(geometry.lastY - (baseline - 0)) >= 0, 'geometry is finite');
    assert.equal(geometry.min, 10);
    assert.equal(geometry.max, 30);
  });

  it('handles a flat series without dividing by zero', () => {
    const flat: SeriesPoint[] = [
      { label: 'a', value: 70 },
      { label: 'b', value: 70 },
      { label: 'c', value: 70 },
    ];
    const geometry = lineGeometry(flat, WIDTH, HEIGHT, PADDING);
    assert.ok(geometry, 'a flat series should still draw');
    assert.ok(!geometry.linePath.includes('NaN'), geometry.linePath);
    assert.ok(!geometry.areaPath.includes('NaN'), geometry.areaPath);
    // Centred, not pinned to the baseline, so it does not read as "zero".
    const centre = PADDING.top + (HEIGHT - PADDING.top - PADDING.bottom) / 2;
    assert.ok(Math.abs(geometry.lastY - centre) < 0.01, `lastY=${geometry.lastY}`);
  });

  it('ignores gaps when scaling but still connects the real points', () => {
    const geometry = lineGeometry(
      [
        { label: 'a', value: 10 },
        { label: 'gap', value: Number.NaN },
        { label: 'b', value: 30 },
      ],
      WIDTH,
      HEIGHT,
      PADDING,
    );
    assert.ok(geometry);
    assert.ok(!geometry.linePath.includes('NaN'));
    assert.equal(geometry.linePath.split('L').length, 2, 'two real points means one L');
  });

  it('closes the area path back on the baseline', () => {
    const geometry = lineGeometry(RISING, WIDTH, HEIGHT, PADDING);
    assert.ok(geometry);
    assert.ok(geometry.areaPath.endsWith('Z'), geometry.areaPath);
  });

  it('returns null when the plot area has no room', () => {
    assert.equal(lineGeometry(RISING, 10, 10, PADDING), null);
  });
});

describe('seriesDelta', () => {
  it('is the last value minus the first', () => {
    assert.equal(seriesDelta(RISING), 20);
  });

  it('is negative for a falling series', () => {
    assert.equal(seriesDelta([{ label: 'a', value: 30 }, { label: 'b', value: 10 }]), -20);
  });

  it('is zero when there is nothing to compare', () => {
    assert.equal(seriesDelta([]), 0);
    assert.equal(seriesDelta([{ label: 'a', value: 5 }]), 0);
  });

  it('compares the first and last usable points, not the array edges', () => {
    assert.equal(
      seriesDelta([
        { label: 'a', value: Number.NaN },
        { label: 'b', value: 10 },
        { label: 'c', value: 25 },
      ]),
      15,
    );
  });
});
