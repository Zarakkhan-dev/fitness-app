/**
 * Minimal SVG charts.
 *
 * Only what the app needs: a filled trend line and a set of horizontal bars.
 * Drawn with react-native-svg rather than a charting library so the bundle stays
 * small and the visuals match the theme tokens exactly.
 */

import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Caption } from '@/components/ui';
import { Radius, Spacing, useTheme } from '@/hooks/use-theme';
import { lineGeometry, seriesDelta, usablePoints, type ChartPadding, type SeriesPoint } from '@/lib/chart-math';


/** The chart is drawn in a fixed viewBox and scaled to the available width. */
const WIDTH = 320;
const PADDING: ChartPadding = { top: 12, right: 12, bottom: 24, left: 12 };

/**
 * A trend line over time.
 *
 * Geometry comes from `lineGeometry` so the coordinate maths is unit tested
 * rather than only exercised by a render.
 */
export function TrendChart({
  points,
  height = 160,
  unit = '',
  formatValue,
}: {
  points: SeriesPoint[];
  height?: number;
  unit?: string;
  formatValue?: (value: number) => string;
}) {
  const theme = useTheme();
  const geometry = lineGeometry(points, WIDTH, height);

  // Fewer than two usable values cannot describe a trend.
  if (!geometry) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Caption>Not enough data to chart yet</Caption>
      </View>
    );
  }

  const { linePath, areaPath, lastX, lastY } = geometry;
  const first = usablePoints(points)[0];
  const last = usablePoints(points).at(-1)!;
  const change = seriesDelta(points);

  return (
    <View style={{ gap: Spacing.two }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.brand} stopOpacity="0.28" />
            <Stop offset="1" stopColor={theme.brand} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Path d={areaPath} fill="url(#trendFill)" />
        <Path d={linePath} stroke={theme.brand} strokeWidth={2.5} fill="none" strokeLinejoin="round" />

        <Circle cx={lastX} cy={lastY} r={4.5} fill={theme.brand} />

        <SvgText
          x={PADDING.left}
          y={height - 6}
          fill={theme.textMuted}
          fontSize={10}>
          {first.label}
        </SvgText>
        <SvgText
          x={WIDTH - PADDING.right}
          y={height - 6}
          fill={theme.textMuted}
          fontSize={10}
          textAnchor="end">
          {last.label}
        </SvgText>
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Caption>
          {formatValue ? formatValue(first.value) : first.value}
          {unit}
        </Caption>
        <Caption>
          {formatValue ? formatValue(last.value) : last.value}
          {unit}
        </Caption>
        <Caption style={{ color: change > 0 ? theme.success : change < 0 ? theme.danger : theme.textMuted }}>
          {change > 0 ? '+' : ''}
          {Math.round(change * 10) / 10}
          {unit} over the period
        </Caption>
      </View>
    </View>
  );
}

/** Horizontal bars, used for the per-category workout breakdown. */
export function BarList({ items }: { items: { label: string; value: number; hint?: string }[] }) {
  const theme = useTheme();
  if (items.length === 0) return <Caption>No activity recorded yet.</Caption>;

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <View style={{ gap: Spacing.three }}>
      {items.map((item) => (
        <View key={item.label} style={{ gap: Spacing.one }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Caption style={{ fontWeight: '600' }}>{item.label}</Caption>
            <Caption>{item.hint ?? item.value}</Caption>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: Radius.pill,
              backgroundColor: theme.surfaceAlt,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: `${(item.value / max) * 100}%`,
                height: '100%',
                borderRadius: Radius.pill,
                backgroundColor: theme.brand,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Ring used for the calorie target; `percent` is clamped by the caller. */
export function ProgressRing({
  percent,
  size = 132,
  thickness = 12,
  children,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.surfaceAlt}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.brand}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          strokeLinecap="round"
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
