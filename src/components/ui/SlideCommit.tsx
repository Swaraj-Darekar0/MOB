import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
  Vibration,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { ArrowRight, Check, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type SlideCommitPhase = 'idle' | 'loading' | 'completed' | 'error';

export interface SlideCommitProps {
  /** Callback triggered when handle is slid to completion */
  onCommit: () => Promise<void> | void;
  /** Initial prompt label (default: "Slide to commit" or "Slide to Pay ₹...") */
  label?: string;
  /** Label shown upon success (default: "Paid") */
  completedLabel?: string;
  /** Label shown while awaiting onCommit promise (default: "Processing payment...") */
  loadingLabel?: string;
  /** Optional rupee amount to display inside */
  amount?: number;
  /** Disables sliding and dims opacity */
  disabled?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Height of the slider track (default: 56) */
  height?: number;
  /** Custom track background color */
  trackColor?: string;
  /** Custom handle background color */
  handleColor?: string;
  /** Custom success color */
  successColor?: string;
  /** Custom danger / error color */
  dangerColor?: string;
  /**
   * When set to true, triggers the slider to smoothly reset from
   * its completed/loading state back to idle. Use this when the user
   * returns from Google Pay after a cancelled/failed payment.
   */
  reset?: boolean;
}

const PAD = 4;
const DEFAULT_HEIGHT = 56;
const THUMB_SIZE = 48; // Circular handle: 48x48 with borderRadius 24
const THRESHOLD_RATIO = 0.85;

/**
 * SlideCommit Micro-interaction Component
 * Inspired by React Bits `slide-commit` & Resend Dark UI:
 * - Fluid gesture handling with Reanimated & PanResponder
 * - Sleek pill track with dark elevated surface and subtle border
 * - Circular vibrant handle with ArrowRight icon and squash/stretch response
 * - Dynamic fill track expanding behind the thumb as you drag
 * - Shimmering center text that fades out smoothly as thumb slides over it
 * - Snap-to-end physics with haptic feedback at >=85% threshold
 * - Smooth spring-back with `{ damping: 20, stiffness: 200 }` if released early
 * - Post-commit: thumb morphs from right edge to center → green check circle
 * - Reset: smooth spring-back from center to start when parent triggers reset
 * - Squash & shake animation on error before returning home
 * - Full accessibility and reduced motion support
 */
export const SlideCommit: React.FC<SlideCommitProps> = ({
  onCommit,
  label,
  completedLabel = 'Paid',
  loadingLabel = 'Processing payment...',
  amount,
  disabled = false,
  style,
  height = DEFAULT_HEIGHT,
  trackColor = colors.surfaceElevated,
  handleColor = colors.accent,
  successColor = colors.statusSuccess,
  dangerColor = colors.statusError,
  reset = false,
}) => {
  const isReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SlideCommitPhase>('idle');
  const [trackWidth, setTrackWidth] = useState(0);

  const phaseRef = useRef<SlideCommitPhase>('idle');
  const disabledRef = useRef<boolean>(disabled);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // Derived label text
  const displayLabel = useMemo(() => {
    if (label) return label;
    if (amount !== undefined) {
      return `Slide to Pay ₹${amount.toLocaleString('en-IN')}`;
    }
    return 'Slide to commit';
  }, [label, amount]);

  // Reanimated shared values
  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const thumbScale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const travelDist = useSharedValue(0);
  const shimmer = useSharedValue(0.65);
  // Morph progress: 0 = at right edge (end of slide), 1 = centered in track
  const morphProgress = useSharedValue(0);
  // Fill opacity for smooth fade during morph
  const fillOpacity = useSharedValue(1);

  // Shimmer pulse animation for initial prompt text
  useEffect(() => {
    if (isReducedMotion || disabled || phase !== 'idle') {
      shimmer.value = 1;
      return;
    }

    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [isReducedMotion, disabled, phase]);

  const triggerHaptic = (pattern?: number | number[]) => {
    try {
      if (Platform.OS !== 'web' && typeof Vibration !== 'undefined' && Vibration.vibrate) {
        if (Array.isArray(pattern)) {
          Vibration.vibrate(pattern);
        } else {
          Vibration.vibrate(pattern ?? 15);
        }
      }
    } catch {
      // Graceful fallback on devices without vibration hardware
    }
  };

  const resetToIdle = () => {
    setPhase('idle');
    phaseRef.current = 'idle';
  };

  /**
   * Reset handler: When parent sets reset=true, smoothly animate
   * from completed/loading state back to idle.
   */
  useEffect(() => {
    if (!reset) return;
    if (phaseRef.current === 'idle') return;

    // Cancel any in-progress morph
    cancelAnimation(morphProgress);
    cancelAnimation(fillOpacity);

    if (isReducedMotion) {
      translateX.value = 0;
      morphProgress.value = 0;
      fillOpacity.value = 1;
      thumbScale.value = 1;
      resetToIdle();
    } else {
      // First: un-morph back to right edge (if morphed to center)
      morphProgress.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      fillOpacity.value = withTiming(1, { duration: 200 });

      // Then: spring the thumb from right edge back to start
      setTimeout(() => {
        translateX.value = withSpring(
          0,
          { damping: 18, stiffness: 160, mass: 0.9 },
          (finished) => {
            if (finished) {
              runOnJS(resetToIdle)();
            }
          }
        );
        thumbScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }, 220);
    }
  }, [reset]);

  const handleCommit = async () => {
    if (phaseRef.current !== 'idle') return;

    const maxT = travelDist.value;
    setPhase('loading');
    phaseRef.current = 'loading';
    triggerHaptic(20);

    // Snap thumb to end of track
    if (isReducedMotion) {
      translateX.value = maxT;
    } else {
      translateX.value = withTiming(maxT, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      });
    }

    try {
      const commitRes = onCommitRef.current();
      if (commitRes && typeof (commitRes as Promise<void>).then === 'function') {
        await commitRes;
      }

      // Success phase → morph thumb to center
      setPhase('completed');
      phaseRef.current = 'completed';
      triggerHaptic([0, 20, 40, 25]);

      if (!isReducedMotion) {
        // After a brief pause at the right edge, morph to center
        morphProgress.value = withDelay(
          180,
          withSpring(1, {
            damping: 16,
            stiffness: 120,
            mass: 0.8,
          })
        );
        // Fade out the fill track as the thumb moves to center
        fillOpacity.value = withDelay(
          180,
          withTiming(0, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          })
        );
      } else {
        morphProgress.value = 1;
        fillOpacity.value = 0;
      }
    } catch {
      // Error phase: shake & spring back
      setPhase('error');
      phaseRef.current = 'error';
      triggerHaptic([0, 35, 35, 35]);

      if (isReducedMotion) {
        translateX.value = 0;
        resetToIdle();
      } else {
        // Squash and shake animation
        shakeX.value = withSequence(
          withTiming(-8, { duration: 40 }),
          withTiming(8, { duration: 40 }),
          withTiming(-6, { duration: 40 }),
          withTiming(6, { duration: 40 }),
          withTiming(-3, { duration: 40 }),
          withTiming(0, { duration: 40 })
        );

        // Spring back home after shake
        setTimeout(() => {
          translateX.value = withSpring(
            0,
            { damping: 20, stiffness: 200 },
            (finished) => {
              if (finished) {
                runOnJS(resetToIdle)();
              }
            }
          );
        }, 400);
      }
    }
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (disabledRef.current || phaseRef.current !== 'idle') return false;
        // Start if user touches thumb or near thumb area
        const touchX = evt.nativeEvent.locationX;
        const currentThumbRight = translateX.value + THUMB_SIZE + PAD * 2 + 28;
        return touchX <= Math.max(90, currentThumbRight);
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (disabledRef.current || phaseRef.current !== 'idle') return false;
        const isHorizontal =
          Math.abs(gestureState.dx) > 6 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const touchX = evt.nativeEvent.locationX;
        const currentThumbRight = translateX.value + THUMB_SIZE + PAD * 2 + 36;
        return isHorizontal && touchX <= Math.max(100, currentThumbRight);
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (disabledRef.current || phaseRef.current !== 'idle') return false;
        const isHorizontal =
          Math.abs(gestureState.dx) > 6 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const touchX = evt.nativeEvent.locationX;
        const currentThumbRight = translateX.value + THUMB_SIZE + PAD * 2 + 36;
        return isHorizontal && touchX <= Math.max(100, currentThumbRight);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragStartX.value = translateX.value;
        if (!isReducedMotion) {
          thumbScale.value = withSpring(1.06, { damping: 15, stiffness: 300 });
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (phaseRef.current !== 'idle') return;
        const maxT = travelDist.value;
        if (maxT <= 0) return;

        const rawX = dragStartX.value + gestureState.dx;
        let nextX: number;
        if (rawX < 0) {
          nextX = 0;
        } else if (rawX > maxT) {
          nextX = maxT + (rawX - maxT) * 0.12; // Elastic stretch resistance
        } else {
          nextX = rawX;
        }
        translateX.value = nextX;
      },
      onPanResponderRelease: () => {
        if (phaseRef.current !== 'idle') return;
        if (!isReducedMotion) {
          thumbScale.value = withSpring(1.0, { damping: 15, stiffness: 300 });
        }

        const maxT = travelDist.value;
        const currentX = translateX.value;
        const threshold = maxT * THRESHOLD_RATIO;

        if (currentX >= threshold) {
          handleCommit();
        } else {
          // Released before threshold: spring back with smooth physics
          if (isReducedMotion) {
            translateX.value = withTiming(0, { duration: 150 });
          } else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          }
        }
      },
      onPanResponderTerminate: () => {
        if (phaseRef.current === 'idle') {
          if (!isReducedMotion) {
            thumbScale.value = withSpring(1.0);
          }
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      },
    });
  }, [isReducedMotion]);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setTrackWidth(width);
    const maxT = Math.max(1, width - THUMB_SIZE - PAD * 2);
    travelDist.value = maxT;
  };

  // --- Animated Styles ---

  const animatedTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const animatedFillStyle = useAnimatedStyle(() => {
    const maxT = travelDist.value > 0 ? travelDist.value : 240;
    const currentW = translateX.value + THUMB_SIZE;

    return {
      width: Math.max(THUMB_SIZE, currentW),
      opacity: fillOpacity.value,
    };
  });

  /**
   * Thumb animated style:
   * - During idle/loading/error: translateX drives position from left to right
   * - During completed: morphProgress interpolates the thumb from
   *   its right-edge position (translateX) to the center of the track
   */
  const animatedThumbStyle = useAnimatedStyle(() => {
    const maxT = travelDist.value > 0 ? travelDist.value : 240;
    // Center position: half the track width minus half the thumb
    const centerX = (maxT - THUMB_SIZE) / 2 + THUMB_SIZE / 2 - PAD;
    // Where the thumb actually is (right edge after slide = maxT)
    const slideX = translateX.value;

    // Interpolate between slide position and center based on morphProgress
    const finalX = interpolate(
      morphProgress.value,
      [0, 1],
      [slideX, centerX > 0 ? centerX : slideX],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: finalX },
        { scale: thumbScale.value },
      ],
    };
  });

  const animatedPromptTextStyle = useAnimatedStyle(() => {
    const maxT = travelDist.value > 0 ? travelDist.value : 200;
    const fadeOpacity = interpolate(
      translateX.value,
      [0, maxT * 0.45],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity: fadeOpacity * shimmer.value,
    };
  });

  const animatedLoadingTextStyle = useAnimatedStyle(() => {
    const isLoading = phase === 'loading';
    return {
      opacity: isLoading ? 1 : 0,
    };
  });

  const animatedDoneTextStyle = useAnimatedStyle(() => {
    // Completed label is no longer shown as standalone text;
    // the green circle with check IS the completion indicator
    return {
      opacity: 0,
    };
  });

  // Dynamic fill colors based on phase
  const fillBackgroundColor =
    phase === 'completed'
      ? successColor
      : phase === 'error'
      ? dangerColor
      : 'rgba(94, 106, 210, 0.24)';

  const fillBorderColor =
    phase === 'completed'
      ? successColor
      : phase === 'error'
      ? dangerColor
      : 'rgba(94, 106, 210, 0.4)';

  const thumbBackgroundColor =
    phase === 'completed'
      ? successColor
      : phase === 'error'
      ? dangerColor
      : handleColor;

  return (
    <Animated.View
      style={[
        styles.trackWrapper,
        { height, backgroundColor: trackColor },
        disabled && styles.trackDisabled,
        animatedTrackStyle,
        style,
      ]}
      onLayout={onLayout}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      accessibilityState={{
        disabled,
        busy: phase === 'loading',
      }}
      {...panResponder.panHandlers}
    >
      {/* Dynamic Fill Track expanding behind the thumb */}
      <Animated.View
        style={[
          styles.fillTrack,
          {
            backgroundColor: fillBackgroundColor,
            borderColor: fillBorderColor,
          },
          animatedFillStyle,
        ]}
      />

      {/* Center Prompt Text Layer (Fades out as thumb glides across) */}
      {phase === 'idle' && (
        <Animated.View
          style={[styles.centerTextContainer, animatedPromptTextStyle]}
          pointerEvents="none"
        >
          <Text style={styles.promptText} numberOfLines={1}>
            {displayLabel}
          </Text>
        </Animated.View>
      )}

      {/* Center Loading Text Layer */}
      {phase === 'loading' && (
        <Animated.View
          style={[styles.centerTextContainer, styles.loadingTextContainer, animatedLoadingTextStyle]}
          pointerEvents="none"
        >
          <Text style={styles.loadingText} numberOfLines={1}>
            {loadingLabel}
          </Text>
        </Animated.View>
      )}

      {/* Draggable Circular Thumb / Handle */}
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbBackgroundColor,
          },
          animatedThumbStyle,
        ]}
        pointerEvents="none"
      >
        {phase === 'loading' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : phase === 'completed' ? (
          <Check size={22} color="#FFFFFF" strokeWidth={2.6} />
        ) : phase === 'error' ? (
          <AlertTriangle size={20} color="#FFFFFF" strokeWidth={2.4} />
        ) : (
          <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.6} />
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  trackWrapper: {
    width: '100%',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: PAD,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trackDisabled: {
    opacity: 0.45,
  },
  fillTrack: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    bottom: PAD,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    zIndex: 0,
  },
  centerTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingHorizontal: THUMB_SIZE + spacing.sm,
  },
  loadingTextContainer: {
    paddingRight: THUMB_SIZE + spacing.sm,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: -0.2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  doneContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
});

export default SlideCommit;
