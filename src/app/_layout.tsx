import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { DecryptedSplashOverlay } from '../components/common/DecryptedSplashOverlay';

// Keep the native static splash screen visible until our app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isInitialized, loadInitialData } = useAppStore();
  const [appReady, setAppReady] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await loadInitialData();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setAppReady(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!appReady) return;

    const inOnboarding = segments[0] === '(onboarding)';

    if (!isInitialized && !inOnboarding) {
      // Redirect to onboarding
      router.replace('/(onboarding)/username');
    } else if (isInitialized && inOnboarding) {
      // Already initialized, go to dashboard
      router.replace('/(tabs)');
    }
  }, [appReady, isInitialized, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.surfaceBase },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="activity"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="payment/scan"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="payment/confirm"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="payment/result"
            options={{
              animation: 'fade',
            }}
          />
        </Stack>

        {!splashAnimationDone && (
          <DecryptedSplashOverlay
            isReady={appReady}
            onAnimationComplete={() => setSplashAnimationDone(true)}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
});
