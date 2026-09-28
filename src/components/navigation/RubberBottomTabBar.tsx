import React from 'react';
import { View, StyleSheet } from 'react-native';
export interface BottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors?: Record<string, { options: any }>;
  navigation: {
    navigate: (name: string, params?: any) => void;
    emit: (event: any) => any;
  };
  insets?: { top: number; right: number; bottom: number; left: number };
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RubberSegmentBar, RubberTabItem } from '../ui/RubberSegmentBar';
import { FolderClosed, CreditCard, User } from 'lucide-react-native';
import { colors } from '../../theme';

export const RubberBottomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const tabs: RubberTabItem[] = [
    {
      id: 'index',
      label: 'Buckets',
      icon: (color, focused) => (
        <FolderClosed size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      id: 'cards',
      label: 'Cards',
      icon: (color, focused) => (
        <CreditCard size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      id: 'settings',
      label: 'Profile',
      icon: (color, focused) => (
        <User size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
  ];

  const currentRoute = state.routes[state.index].name;

  const handleTabChange = (tabId: string) => {
    const route = state.routes.find((r: any) => r.name === tabId);
    if (!route) return;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <RubberSegmentBar
        tabs={tabs}
        activeTab={currentRoute}
        onTabChange={handleTabChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: colors.surfaceBase,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    paddingTop: 4,
  },
});
