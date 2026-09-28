import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ResendGlowCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  isActive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Resend-inspired Dark Glow Card.
 * Translated from react-bits SpotlightCard & BorderGlow adhering to dark_ui.md:
 * - Surface Raised: #1D1D1D
 * - Default Border: #191919
 * - Accent Glow: #5E6AD2 (or customizable per envelope)
 * - Border radius: 15px
 * - Snappy (<200ms) compositor-only feedback (transform, opacity)
 * - Respects prefers-reduced-motion
 */
export const ResendGlowCard: React.FC<ResendGlowCardProps> = ({
  children,
  style,
  glowColor = colors.accent,
  isActive = false,
  onPress,
  disabled = false,
}) => {
  const isReducedMotion = useReducedMotion();
  const pressProgress = useSharedValue(isActive ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    pressProgress.value = withTiming(isActive ? 1 : 0, {
      duration: isReducedMotion ? 0 : 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, isReducedMotion]);

  const handlePressIn = () => {
    if (disabled) return;
    if (!isReducedMotion) {
      scale.value = withTiming(0.99, { duration: 120, easing: Easing.out(Easing.cubic) });
      pressProgress.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    if (!isReducedMotion) {
      scale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
      if (!isActive) {
        pressProgress.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
      }
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowBorderStyle = useAnimatedStyle(() => ({
    opacity: pressProgress.value,
  }));

  const animatedAmbientGlowStyle = useAnimatedStyle(() => ({
    opacity: pressProgress.value * 0.15,
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedContainerStyle, style]}>
      {/* Outer ambient glow diffuser */}
      <Animated.View
        style={[
          styles.ambientGlow,
          { backgroundColor: glowColor },
          animatedAmbientGlowStyle,
        ]}
      />

      {/* Main card content container */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        // Web hover support
        {...(Platform.OS === 'web'
          ? {
              onMouseEnter: handlePressIn,
              onMouseLeave: handlePressOut,
            }
          : {})}
        style={styles.cardBase}
      >
        {children}

        {/* Active / hover subtle border highlight layer */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowBorder,
            { borderColor: glowColor },
            animatedGlowBorderStyle,
          ]}
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: borderRadius.default, // 15px per dark_ui.md
  },
  cardBase: {
    backgroundColor: colors.surfaceRaised, // #1D1D1D
    borderRadius: borderRadius.default, // 15px
    borderWidth: 1,
    borderColor: colors.borderDefault, // #191919
    padding: spacing.lg,
    overflow: 'hidden',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.default, // 15px
    borderWidth: 1.5,
  },
  ambientGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: borderRadius.default + 3,
  },
});
