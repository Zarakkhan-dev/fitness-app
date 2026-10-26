/**
 * Bottom tabs.
 *
 * Tabs are ordered by how often they are reached in a day. `href: null` hides a
 * screen from the bar while keeping the route reachable, which is what the
 * modal and detail routes use.
 */

import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Text, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * The SF Symbol names used here.
 *
 * `SymbolViewProps['name']` also accepts a per-platform object
 * (`{ ios?, android?, web? }`), so deriving this union from the prop type would
 * make the glyph lookup untyped. Naming the five literals we actually use keeps
 * both the lookup and the `SymbolView` call checked.
 */
type TabGlyph =
  | 'house.fill'
  | 'figure.strengthtraining.traditional'
  | 'fork.knife'
  | 'chart.xyaxis.line'
  | 'person.fill';

/** Text stand-ins, because Material icons are Apple-platform only. */
const ANDROID_GLYPHS: Record<TabGlyph, string> = {
  'house.fill': '⌂',
  'figure.strengthtraining.traditional': '⚋',
  'fork.knife': '◍',
  'chart.xyaxis.line': '◫',
  'person.fill': '◉',
};

function TabIcon({ name, color }: { name: TabGlyph; color: ColorValue }) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView name={name} tintColor={color} resizeMode="scaleAspectFit" style={{ width: 24, height: 24 }} />
    );
  }
  // Material icons ship with Apple platforms only, so Android and web use a
  // glyph rather than shipping another icon font.
  return <Text style={{ fontSize: 20, color }}>{ANDROID_GLYPHS[name] ?? '●'}</Text>;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabIcon name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Train',
          tabBarIcon: ({ color }) => <TabIcon name="figure.strengthtraining.traditional" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => <TabIcon name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TabIcon name="chart.xyaxis.line" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => <TabIcon name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
