import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
}

interface AnimatedPillTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  variant?: 'fill' | 'accent' | 'subtle';
  style?: StyleProp<ViewStyle>;
}

interface TabLayout {
  x: number;
  width: number;
}

/**
 * Animated Pill Tabs for React Native / Reanimated.
 * Translated from react-bits PillNav adhering to dark_ui.md:
 * - 15px border radius scale (or pill shape)
 * - Compositor-only translation (translateX, scaleX)
 * - Snappy (<200ms) interaction feedback (160ms ease-out)
 * - Dark theme tokens: #141414 base, #1D1D1D raised, #5E6AD2 accent
 * - Tabular nums for counts / badges
 * - Respects prefers-reduced-motion
 */
export function AnimatedPillTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = 'subtle',
  style,
}: AnimatedPillTabsProps<T>) {
  const isReducedMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  const handleTabLayout = (tabId: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => ({
      ...prev,
      [tabId]: { x, width },
    }));
  };

  useEffect(() => {
    const currentLayout = layouts[activeTab];
    if (!currentLayout) return;

    if (isReducedMotion) {
      translateX.value = currentLayout.x;
      indicatorWidth.value = currentLayout.width;
      opacity.value = 1;
      return;
    }

    const duration = 160; // Snappy < 200ms per dark_ui.md
    const easing = Easing.out(Easing.cubic);

    translateX.value = withTiming(currentLayout.x, { duration, easing });
    indicatorWidth.value = withTiming(currentLayout.width, { duration, easing });
    opacity.value = withTiming(1, { duration: 120 });
  }, [activeTab, layouts, isReducedMotion]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: indicatorWidth.value,
    opacity: opacity.value,
  }));

  const indicatorBackground =
    variant === 'accent'
      ? colors.accent
      : variant === 'fill'
      ? colors.surfaceRaised
      : colors.surfaceRaised;

  const indicatorBorder =
    variant === 'accent'
      ? colors.accentHover
      : colors.borderHighlight;

  return (
    <View style={[styles.container, style]}>
      {/* Sliding Active Pill Background (Compositor-only translateX) */}
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: indicatorBackground,
            borderColor: indicatorBorder,
          },
          animatedIndicatorStyle,
        ]}
      />

      {/* Tab Buttons */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              onLayout={(e) => handleTabLayout(tab.id, e)}
              style={styles.tabButton}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  variant === 'accent' && isActive && styles.tabLabelAccentActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>

              {tab.badge !== undefined && tab.badge !== null ? (
                <View
                  style={[
                    styles.badge,
                    isActive && styles.badgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isActive && styles.badgeTextActive,
                    ]}
                  >
                    {tab.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated, // #141414
    borderRadius: borderRadius.default, // 15px per dark_ui.md
    padding: spacing.xxs + 1,
    borderWidth: 1,
    borderColor: colors.borderDefault, // #191919
    position: 'relative',
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  indicator: {
    position: 'absolute',
    top: spacing.xxs + 1,
    bottom: spacing.xxs + 1,
    left: 0,
    borderRadius: borderRadius.default - 2, // 13px nested radius
    borderWidth: 1,
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.default - 2,
    minHeight: 36,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.textPrimary, // #FFFFFF
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: colors.textSecondary, // #BBBBBB
  },
  tabLabelAccentActive: {
    color: colors.accentDark, // #060606 on accent background
  },
  badge: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  badgeTextActive: {
    color: colors.textPrimary,
  },
});
