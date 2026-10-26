/**
 * Root layout.
 *
 * Owns the splash screen, the theme, and the auth gate. The gate is the reason
 * this file is not just a navigator: a cold start has to wait for the stored
 * tokens to be read before it can decide between the auth and the tab stack,
 * and rendering the tabs first would flash the wrong screen.
 */

import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unsupported: the app still works without it.
});

function RootNavigator() {
  const { status } = useAuth();
  const theme = useTheme();
  const colorScheme = useColorScheme();

  // Redirecting in an effect (rather than during render) is what expo-router
  // expects, and it keeps the splash up until a destination exists.
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous') {
      router.replace('/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === 'loading') return <AnimatedSplashOverlay />;

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Create account' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
        <Stack.Screen name="yoga/[id]" options={{ title: 'Yoga routine' }} />
        <Stack.Screen name="food-search" options={{ title: 'Add food' }} />
        <Stack.Screen name="goals" options={{ title: 'Goals' }} />
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="assistant" options={{ title: 'Coach' }} />
        <Stack.Screen name="log-weight" options={{ title: 'Log weight', presentation: 'modal' }} />
        <Stack.Screen name="log-water" options={{ title: 'Add water', presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
