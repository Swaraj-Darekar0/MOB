import React from 'react';
import { Tabs } from 'expo-router';
import { RubberBottomTabBar } from '../../components/navigation/RubberBottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <RubberBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buckets',
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
