/**
 * Chart geometry.
 *
 * Kept separate from the SVG component so the coordinate maths can be tested. A
 * chart that silently draws the wrong line is worse than one that draws nothing,
 * and the interesting cases here — a flat series, a single point, gaps in the
 * data — are all things a render test would not reliably catch.
 */

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LineGeometry {
  /** SVG path for the line itself. */
  linePath: string;
  /** SVG path for the filled area between the line and the baseline. */
  areaPath: string;
  /** The final point, for the marker dot. */
  lastX: number;
  lastY: number;
  min: number;
  max: number;
}

/** Points with a usable numeric value; gaps and non-finite values drop out. */
export function usablePoints(points: SeriesPoint[]): SeriesPoint[] {
  return points.filter((point) => Number.isFinite(point.value));
}

/**
 * Build the path data for a trend line.
 *
 * Returns `null` when there are fewer than two usable points: a single point
 * cannot describe a trend, and a flat series would divide by zero. Callers render
 * an empty state instead.
 */
export function lineGeometry(
  points: SeriesPoint[],
  width: number,
  height: number,
  padding: ChartPadding = { top: 12, right: 12, bottom: 24, left: 12 },
): LineGeometry | null {
  const usable = usablePoints(points);
  if (usable.length < 2) return null;

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const values = usable.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  // A flat series has no vertical extent, so scaling by it would divide by zero.
  // Drawing it down the bottom of the plot area would read as "zero", so it is
  // centred instead.
  const isFlat = span === 0;

  const x = (index: number) => padding.left + (index / (usable.length - 1)) * innerWidth;
  const y = (value: number) => {
    if (isFlat) return padding.top + innerHeight / 2;
    return padding.top + innerHeight - ((value - min) / span) * innerHeight;
  };
  const baseline = padding.top + innerHeight;

  const linePath = usable
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(2)},${y(point.value).toFixed(2)}`)
    .join(' ');

  const areaPath =
    `${linePath} ` +
    `L${x(usable.length - 1).toFixed(2)},${baseline.toFixed(2)} ` +
    `L${x(0).toFixed(2)},${baseline.toFixed(2)} Z`;

  const lastIndex = usable.length - 1;
  return {
    linePath,
    areaPath,
    lastX: x(lastIndex),
    lastY: y(usable[lastIndex].value),
    min,
    max,
  };
}

/** Signed change across the series, or 0 when there is nothing to compare. */
export function seriesDelta(points: SeriesPoint[]): number {
  const usable = usablePoints(points);
  if (usable.length < 2) return 0;
  return usable[usable.length - 1].value - usable[0].value;
}
