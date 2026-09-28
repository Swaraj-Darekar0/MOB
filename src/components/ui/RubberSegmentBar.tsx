import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface RubberTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: (color: string, focused: boolean) => React.ReactNode;
  badge?: string | number;
}

export interface RubberSegmentBarProps<T extends string = string> {
  tabs: RubberTabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T, index: number) => void;
  variant?: 'bottomNav' | 'inline' | 'compact';
  style?: StyleProp<ViewStyle>;
}

const SPRING_CONFIG = {
  mass: 0.8,
  damping: 14,
  stiffness: 160,
};

export function RubberSegmentBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = 'bottomNav',
  style,
}: RubberSegmentBarProps<T>): React.ReactElement {
  const isReducedMotion = useReducedMotion();
  const isCompact = variant === 'compact';
  const isInline = variant === 'inline' || isCompact;
  const inset = isCompact ? 2 : isInline ? 3 : 4;
  const [containerWidth, setContainerWidth] = React.useState(0);

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const prevIndex = React.useRef(activeIndex);

  // Animated values (Compositor only: translateX, scaleX, scaleY)
  const translateX = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  const numTabs = tabs.length || 1;
  const slotWidth = containerWidth > 0 ? (containerWidth - inset * 2) / numTabs : 0;

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setContainerWidth(width);
    const initialSlotW = (width - inset * 2) / numTabs;
    translateX.value = inset + activeIndex * initialSlotW;
  };

  useEffect(() => {
    if (slotWidth === 0) return;

    const targetX = inset + activeIndex * slotWidth;
    const distance = Math.abs(activeIndex - prevIndex.current);
    prevIndex.current = activeIndex;

    if (isReducedMotion) {
      translateX.value = targetX;
      scaleX.value = 1;
      scaleY.value = 1;
      return;
    }

    if (distance === 0) {
      translateX.value = targetX;
      return;
    }

    // 1. Move position via snappy spring
    translateX.value = withSpring(targetX, SPRING_CONFIG);

    // 2. Dynamic rubber squash & stretch:
    // Scale stretch scales with jump distance (e.g. 1 tab vs 2 tabs)
    const stretchFactor = Math.min(1.28, 1 + 0.12 * distance);
    const squashFactor = Math.max(0.82, 1 - 0.08 * distance);

    // Sequence: Rest -> Stretch mid-flight -> Compress/Squash on impact -> Relax
    scaleX.value = withSequence(
      withTiming(stretchFactor, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0.94, { duration: 80, easing: Easing.inOut(Easing.quad) }),
      withSpring(1.0, { damping: 12, stiffness: 200 })
    );

    scaleY.value = withSequence(
      withTiming(squashFactor, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1.06, { duration: 80, easing: Easing.inOut(Easing.quad) }),
      withSpring(1.0, { damping: 12, stiffness: 200 })
    );
  }, [activeIndex, slotWidth, isReducedMotion, inset]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  const trackStyle = isCompact
    ? styles.trackCompact
    : isInline
    ? styles.trackInline
    : styles.track;

  const indicatorStyle = isCompact
    ? styles.indicatorCompact
    : isInline
    ? styles.indicatorInline
    : styles.indicator;

  return (
    <View
      onLayout={onContainerLayout}
      style={[trackStyle, style]}
      accessible={true}
      accessibilityRole="tablist"
    >
      {/* Elastic Rubber Pill Indicator */}
      {slotWidth > 0 && (
        <Animated.View
          style={[
            indicatorStyle,
            { width: slotWidth },
            animatedIndicatorStyle,
          ]}
        />
      )}

      {/* Segment Tabs */}
      <View style={styles.slotsRow}>
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          const hasLabel = Boolean(tab.label && tab.label.trim().length > 0);
          const iconColor = isActive
            ? colors.textPrimary
            : isInline
            ? colors.textSecondary
            : colors.textTertiary;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id, idx)}
              style={[
                styles.tabSlot,
                isInline && styles.tabSlotInline,
                isCompact && styles.tabSlotCompact,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label || tab.id}
            >
              {tab.icon && (
                <View
                  style={[
                    styles.iconContainer,
                    isInline && styles.iconContainerInline,
                    (!hasLabel || isCompact) && styles.iconContainerNoLabel,
                  ]}
                >
                  {tab.icon(iconColor, isActive)}
                </View>
              )}
              {hasLabel && (
                <Text
                  style={[
                    styles.tabLabel,
                    isInline && styles.tabLabelInline,
                    isCompact && styles.tabLabelCompact,
                    isActive
                      ? styles.labelActive
                      : isInline
                      ? styles.labelInactiveInline
                      : styles.labelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              )}

              {tab.badge !== undefined && tab.badge !== null && (
                <View
                  style={[
                    styles.badge,
                    isInline && styles.badgeInline,
                    isActive && (isInline ? styles.badgeActiveInline : styles.badgeActive),
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isInline && styles.badgeTextInline,
                      isActive &&
                        (isInline ? styles.badgeTextActiveInline : styles.badgeTextActive),
                    ]}
                  >
                    {tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 60,
    backgroundColor: colors.surfaceElevated, // #141414
    borderRadius: borderRadius.pill, // 24px pill shape per dark_ui.md
    borderWidth: 1,
    borderColor: colors.borderDefault, // #191919
    padding: 4,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: spacing.lg,
    marginBottom: Platform.OS === 'ios' ? spacing.xs : spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  trackInline: {
    height: 42,
    backgroundColor: colors.surfaceElevated, // #141414
    borderRadius: borderRadius.default, // 15px per dark_ui.md
    borderWidth: 1,
    borderColor: colors.borderDefault, // #191919
    padding: 3,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 0,
    marginBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  trackCompact: {
    height: 32,
    backgroundColor: '#121316',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22242B',
    padding: 2,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    backgroundColor: colors.surfaceRaised, // #1D1D1D active indicator
    borderRadius: borderRadius.pill - 2,
    borderWidth: 1,
    borderColor: colors.borderHighlight, // #2A2A2A
    zIndex: 0,
  },
  indicatorInline: {
    position: 'absolute',
    left: 0,
    top: 3,
    bottom: 3,
    backgroundColor: colors.surfaceRaised, // #1D1D1D active indicator
    borderRadius: borderRadius.default - 2, // 13px nested radius
    borderWidth: 1,
    borderColor: colors.borderHighlight, // #2A2A2A
    zIndex: 0,
  },
  indicatorCompact: {
    position: 'absolute',
    left: 0,
    top: 2,
    bottom: 2,
    backgroundColor: '#23252E',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#323542',
    zIndex: 0,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    height: '100%',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 2,
  },
  tabSlotInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
  },
  tabSlotCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  iconContainer: {
    marginBottom: 2,
  },
  iconContainerInline: {
    marginBottom: 0,
    marginRight: 6,
  },
  iconContainerNoLabel: {
    marginBottom: 0,
    marginRight: 0,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelInline: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  tabLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: colors.textPrimary, // #FFFFFF
    fontWeight: '700',
  },
  labelInactive: {
    color: colors.textTertiary, // #6E6E6E
    fontWeight: '500',
  },
  labelInactiveInline: {
    color: colors.textSecondary, // #BBBBBB per dark_ui.md
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeInline: {
    position: 'relative',
    top: 0,
    right: 0,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeActive: {
    backgroundColor: colors.accent,
  },
  badgeActiveInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  badgeText: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
    color: colors.textSecondary,
    fontWeight: '700',
  },
  badgeTextInline: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    color: colors.textTertiary,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: colors.accentDark,
  },
  badgeTextActiveInline: {
    color: colors.textPrimary,
  },
});
