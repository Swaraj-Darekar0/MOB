import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors, borderRadius } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface QRScannerReticleProps {
  size?: number;
  isProcessing?: boolean;
  hasError?: boolean;
}

/**
 * QR Scanner Targeting Reticle & Laser Beam.
 * Translates TargetCursor, Crosshair, and LaserFlow from react-bits into
 * a native 60fps compositor-only camera scanner overlay adhering to dark_ui.md:
 * - 15px corner border radius
 * - Resend accent #5E6AD2 / statusSuccess #1DB954
 * - Strictly compositor props: translateY and opacity
 * - Snappy target lock feedback when isProcessing = true
 * - Respects prefers-reduced-motion
 */
export const QRScannerReticle: React.FC<QRScannerReticleProps> = ({
  size = 260,
  isProcessing = false,
  hasError = false,
}) => {
  const isReducedMotion = useReducedMotion();
  const scanProgress = useSharedValue(0);
  const reticleScale = useSharedValue(1);
  const laserOpacity = useSharedValue(1);

  const laserColor = hasError
    ? colors.statusError
    : isProcessing
    ? colors.statusSuccess
    : colors.accent;

  useEffect(() => {
    if (isReducedMotion) {
      cancelAnimation(scanProgress);
      cancelAnimation(reticleScale);
      scanProgress.value = 0.5;
      laserOpacity.value = 0.4;
      return;
    }

    if (isProcessing) {
      // Snappy lock animation (<150ms)
      cancelAnimation(scanProgress);
      reticleScale.value = withTiming(0.95, { duration: 140, easing: Easing.out(Easing.cubic) });
      laserOpacity.value = withTiming(0.8, { duration: 140 });
    } else {
      reticleScale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
      laserOpacity.value = withTiming(1, { duration: 160 });

      // Continuous laser sweep (transform: translateY only)
      scanProgress.value = 0;
      scanProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    }

    return () => {
      cancelAnimation(scanProgress);
    };
  }, [isProcessing, isReducedMotion, hasError]);

  const animatedReticleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reticleScale.value }],
  }));

  const animatedLaserStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scanProgress.value, [0, 1], [8, size - 12]);
    // Fade out at extreme top/bottom edges
    const edgeFade = interpolate(
      scanProgress.value,
      [0, 0.08, 0.92, 1],
      [0.2, 1, 1, 0.2]
    );

    return {
      transform: [{ translateY }],
      opacity: laserOpacity.value * edgeFade,
    };
  });

  return (
    <Animated.View style={[styles.viewfinder, { width: size, height: size }, animatedReticleStyle]}>
      {/* 4 Corner L-brackets with 15px radius */}
      <View
        style={[
          styles.corner,
          styles.topLeft,
          { borderColor: laserColor },
        ]}
      />
      <View
        style={[
          styles.corner,
          styles.topRight,
          { borderColor: laserColor },
        ]}
      />
      <View
        style={[
          styles.corner,
          styles.bottomLeft,
          { borderColor: laserColor },
        ]}
      />
      <View
        style={[
          styles.corner,
          styles.bottomRight,
          { borderColor: laserColor },
        ]}
      />

      {/* Subtle Center Crosshair Alignment Guides */}
      <View style={styles.crosshairCenter}>
        <View style={[styles.crosshairH, { backgroundColor: laserColor }]} />
        <View style={[styles.crosshairV, { backgroundColor: laserColor }]} />
      </View>

      {/* Sweeping Laser Beam (Compositor-only translateY) */}
      <Animated.View
        style={[
          styles.laserBeamContainer,
          { width: size - 24 },
          animatedLaserStyle,
        ]}
      >
        {/* Soft Laser Glow Trail */}
        <View style={[styles.laserGlow, { backgroundColor: laserColor }]} />
        {/* Sharp Core Laser Line */}
        <View style={[styles.laserLine, { backgroundColor: '#FFFFFF' }]} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  viewfinder: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: borderRadius.default, // 15px per dark_ui.md
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: borderRadius.default, // 15px
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: borderRadius.default, // 15px
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: borderRadius.default, // 15px
  },
  crosshairCenter: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.25,
  },
  crosshairH: {
    position: 'absolute',
    width: 14,
    height: 1,
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 14,
  },
  laserBeamContainer: {
    position: 'absolute',
    top: 0,
    left: 12,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserGlow: {
    position: 'absolute',
    width: '100%',
    height: 6,
    borderRadius: 3,
    opacity: 0.45,
  },
  laserLine: {
    width: '92%',
    height: 1.5,
    borderRadius: 1,
  },
});
