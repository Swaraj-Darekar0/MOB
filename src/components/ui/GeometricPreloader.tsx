import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface GeometricPreloaderProps {
  size?: number;
  label?: string;
  theme?: 'dark' | 'monochrome';
}

export const GeometricPreloader: React.FC<GeometricPreloaderProps> = ({
  size = 72,
  label = 'Initialising secure virtual ledger...',
  theme = 'monochrome',
}) => {
  const isReduced = useReducedMotion();

  // Animations
  const morphProgress = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const dotOrbit = useSharedValue(0);

  useEffect(() => {
    if (isReduced) return;

    // Morph cycle: Square (0) -> Diamond (0.33) -> Circle (0.66) -> Hex-cut (1.0)
    morphProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    // Continuous 360 rotation
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse scale
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.9, { duration: 1200, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    // Satellites orbit
    dotOrbit.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [isReduced]);

  // Morphing Core Animated Style
  const coreShapeStyle = useAnimatedStyle(() => {
    if (isReduced) {
      return {
        borderRadius: size * 0.25,
        transform: [{ rotate: '0deg' }, { scale: 1 }],
      };
    }

    const borderRadius = interpolate(
      morphProgress.value,
      [0, 0.33, 0.66, 1],
      [4, size * 0.2, size * 0.5, size * 0.15]
    );

    const rotation = interpolate(
      morphProgress.value,
      [0, 0.5, 1],
      [0, 180, 360]
    );

    const scale = interpolate(
      morphProgress.value,
      [0, 0.5, 1],
      [1, 0.85, 1]
    );

    return {
      borderRadius,
      transform: [{ rotate: `${rotation}deg` }, { scale }],
    };
  });

  // Outer Pulse Ring Style
  const ringStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${ringRotation.value}deg` },
        { scale: pulseScale.value },
      ],
    };
  });

  // Orbiting dots style
  const orbitStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${-dotOrbit.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.stage, { width: size * 2, height: size * 2 }]}>
        {/* Outer Pulsing Geometric Ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              width: size * 1.6,
              height: size * 1.6,
              borderRadius: size * 0.4,
              borderColor: theme === 'monochrome' ? '#333333' : colors.accent,
            },
            ringStyle,
          ]}
        />

        {/* Orbiting Satellite Container */}
        <Animated.View
          style={[
            styles.orbitContainer,
            { width: size * 1.8, height: size * 1.8 },
            orbitStyle,
          ]}
        >
          <View style={[styles.satelliteDot, styles.satTop]} />
          <View style={[styles.satelliteDot, styles.satBottom]} />
        </Animated.View>

        {/* Inner Morphing Shape */}
        <Animated.View
          style={[
            styles.morphCore,
            {
              width: size,
              height: size,
              backgroundColor: theme === 'monochrome' ? colors.textPrimary : colors.accent,
            },
            coreShapeStyle,
          ]}
        >
          {/* Inner High-contrast cutout */}
          <View
            style={[
              styles.innerCutout,
              {
                width: size * 0.35,
                height: size * 0.35,
                borderRadius: size * 0.1,
              },
            ]}
          />
        </Animated.View>
      </View>

      {label ? <Text style={styles.labelText}>{label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  orbitContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  satelliteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  satTop: {
    marginTop: 2,
  },
  satBottom: {
    marginBottom: 2,
  },
  morphCore: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  innerCutout: {
    backgroundColor: colors.surfaceBase,
  },
  labelText: {
    marginTop: spacing.xl,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
