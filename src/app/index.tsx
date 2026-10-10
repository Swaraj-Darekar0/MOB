import React from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
  const isInitialized = useAppStore((state) => state.isInitialized);

  if (!isInitialized) {
    return <Redirect href={"/(onboarding)/phone" as any} />;
  }

  return <Redirect href="/(tabs)" />;
}
