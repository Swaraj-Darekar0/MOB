import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surfaceBase },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="username" />
      <Stack.Screen name="balance" />
      <Stack.Screen name="allocation" />
    </Stack>
  );
}
