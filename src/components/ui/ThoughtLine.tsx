import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Sparkles, Cpu, Brain, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type ThoughtGlyphType = 'sparkles' | 'cpu' | 'brain' | 'dot' | React.ReactNode;

export interface ThoughtLineProps {
  /** List of thoughts/statements to cycle through */
  thoughts?: string[];
  /** Alias for thoughts to support react-bits steps nomenclature */
  steps?: string[];
  /** Whether the thinking process is currently active (default: true) */
  isThinking?: boolean;
  /** Callback fired when cycling finishes or settles */
  onFinished?: () => void;
  /** Callback alias for onFinished */
  onComplete?: () => void;
  /** Overall duration in ms before completing (default: 1800ms) */
  durationMs?: number;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Compact mode for small inline placements (e.g. Goals creation, pills) */
  compact?: boolean;
  /** Icon glyph to display during thinking (default: 'sparkles') */
  glyph?: ThoughtGlyphType;
  /** Accent color for icon/text (default: colors.accent) */
  color?: string;
  /** Custom settled prefix label (default: 'Thought for') */
  settlePrefix?: string;
  /** Custom label when completed instead of final thought */
  doneThought?: string;
  /** Whether to show live elapsed timer (default: true) */
  showTimer?: boolean;
  /** Whether user can tap to expand past thoughts history trace */
  collapsible?: boolean;
}

export const ThoughtLine: React.FC<ThoughtLineProps> = ({
  thoughts,
  steps,
  isThinking = true,
  onFinished,
  onComplete,
  durationMs = 1800,
  style,
  compact = false,
  glyph = 'sparkles',
  color = colors.accent,
  settlePrefix = '',
  doneThought,
  showTimer = true,
  collapsible = false,
}) => {
  const isReducedMotion = useReducedMotion();

  // Combine thoughts and steps with fallback
  const safeThoughts = useMemo(() => {
    if (thoughts && thoughts.length > 0) return thoughts;
    if (steps && steps.length > 0) return steps;
    return ['Thinking…'];
  }, [thoughts, steps]);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSettled, setIsSettled] = useState(!isThinking);
  const [isExpanded, setIsExpanded] = useState(false);

  // Refs
  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoFinishTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reanimated shared values
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.7);

  // Thought text transition (Apple fluid spring)
  const textOpacity = useSharedValue(1);
  const textTranslateY = useSharedValue(0);

  // Settle icon spring
  const checkScale = useSharedValue(0.5);
  const checkOpacity = useSharedValue(0);

  // Trigger settle action
  const settle = useCallback(
    (finalDurationMs: number) => {
      setIsSettled(true);
      setElapsedMs(finalDurationMs);

      // Stop intervals
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);

      // Animate checkmark entrance
      if (!isReducedMotion) {
        pulseScale.value = withSpring(1, { damping: 14, stiffness: 140 });
        pulseOpacity.value = withTiming(0.4, { duration: 200 });

        checkScale.value = withSpring(1, { damping: 12, stiffness: 180 });
        checkOpacity.value = withTiming(1, { duration: 250 });
      } else {
        checkScale.value = 1;
        checkOpacity.value = 1;
      }

      onFinishedRef.current?.();
      onCompleteRef.current?.();
    },
    [isReducedMotion, pulseScale, pulseOpacity, checkScale, checkOpacity]
  );

  // Handle thinking state lifecycle
  useEffect(() => {
    // Clear any existing timers
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    autoFinishTimeoutRef.current.forEach(clearTimeout);
    autoFinishTimeoutRef.current = [];

    if (!isThinking) {
      if (!isSettled) {
        settle(elapsedMs);
      }
      return;
    }

    // Reset state for new thinking run
    setIsSettled(false);
    setCurrentIndex(0);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    checkScale.value = 0.5;
    checkOpacity.value = 0;

    // Start breathing animation
    if (!isReducedMotion) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.94, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 1;
    }

    // Start live elapsed timer (every 100ms for smooth 0.1s increments)
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const diff = now - startTimeRef.current;
      setElapsedMs(diff);
    }, 100);

    // Thought cycling interval
    if (safeThoughts.length > 1) {
      const cycleStepMs = Math.max(
        850,
        Math.floor(durationMs / Math.max(1, safeThoughts.length))
      );

      cycleIntervalRef.current = setInterval(() => {
        if (!isReducedMotion) {
          // Apple micro-interaction: smooth slide up & fade out, enter from bottom
          textTranslateY.value = withSequence(
            withTiming(-5, { duration: 140, easing: Easing.out(Easing.quad) }),
            withTiming(5, { duration: 0 }),
            withSpring(0, { damping: 16, stiffness: 180 })
          );
          textOpacity.value = withSequence(
            withTiming(0, { duration: 140 }),
            withTiming(1, { duration: 180 })
          );
        }
        setCurrentIndex((prev) => (prev + 1) % safeThoughts.length);
      }, cycleStepMs);
    }

    // Auto-settle after durationMs if specified
    if (durationMs > 0) {
      const finishTimeout = setTimeout(() => {
        settle(durationMs);
      }, durationMs);
      autoFinishTimeoutRef.current.push(finishTimeout);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
      autoFinishTimeoutRef.current.forEach(clearTimeout);
    };
  }, [
    isThinking,
    durationMs,
    safeThoughts.length,
    isReducedMotion,
    settle,
    pulseScale,
    pulseOpacity,
    checkScale,
    checkOpacity,
    textTranslateY,
    textOpacity,
  ]);

  // Animated styles
  const animatedGlyphStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  // Format timer seconds (e.g. "0.8s", settling to "2.8s" or custom prefix)
  const secondsFormatted = (elapsedMs / 1000).toFixed(1);
  const timerText = isSettled
    ? (settlePrefix ? `${settlePrefix} ${secondsFormatted}s` : `${secondsFormatted}s`)
    : `${secondsFormatted}s`;

  // Render Glyph Icon
  const iconSize = compact ? 12 : 14;
  const renderGlyph = () => {
    if (isSettled) {
      return (
        <Animated.View style={[styles.glyphContainer, animatedCheckStyle]}>
          <Check size={iconSize} color={colors.statusSuccess} strokeWidth={2.5} />
        </Animated.View>
      );
    }

    if (glyph === 'cpu') {
      return (
        <Animated.View style={[styles.glyphContainer, animatedGlyphStyle]}>
          <Cpu size={iconSize} color={color} strokeWidth={2.2} />
        </Animated.View>
      );
    }
    if (glyph === 'brain') {
      return (
        <Animated.View style={[styles.glyphContainer, animatedGlyphStyle]}>
          <Brain size={iconSize} color={color} strokeWidth={2.2} />
        </Animated.View>
      );
    }
    if (glyph === 'dot') {
      return (
        <Animated.View style={[styles.glyphContainer, animatedGlyphStyle]}>
          <View
            style={[
              styles.dotGlyph,
              { backgroundColor: color },
              compact && styles.dotGlyphCompact,
            ]}
          />
        </Animated.View>
      );
    }
    if (typeof glyph === 'string' && glyph === 'sparkles') {
      return (
        <Animated.View style={[styles.glyphContainer, animatedGlyphStyle]}>
          <Sparkles size={iconSize} color={color} strokeWidth={2.2} />
        </Animated.View>
      );
    }
    // Custom ReactNode glyph
    return (
      <Animated.View style={[styles.glyphContainer, animatedGlyphStyle]}>
        {glyph as React.ReactNode}
      </Animated.View>
    );
  };

  const currentThoughtText = isSettled
    ? doneThought || safeThoughts[safeThoughts.length - 1]
    : safeThoughts[currentIndex] || safeThoughts[0];

  const handleToggleExpand = () => {
    if (collapsible && safeThoughts.length > 1) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <View style={[styles.rootContainer, style]}>
      <Pressable
        onPress={handleToggleExpand}
        disabled={!collapsible || safeThoughts.length <= 1}
        style={[
          styles.container,
          compact ? styles.containerCompact : styles.containerStandard,
          isSettled ? styles.containerSettled : styles.containerThinking,
        ]}
      >
        {/* Breathing / Settled Glyph */}
        {renderGlyph()}

        {/* Dynamic Thought Statement */}
        <Animated.View style={[styles.textWrapper, animatedTextStyle]}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.thoughtText,
              compact ? styles.thoughtTextCompact : styles.thoughtTextStandard,
              isSettled && styles.thoughtTextSettled,
            ]}
          >
            {currentThoughtText}
          </Text>
        </Animated.View>

        {/* Live Elapsed Timer */}
        {showTimer && (
          <Text
            style={[
              styles.timerText,
              compact ? styles.timerTextCompact : styles.timerTextStandard,
              isSettled && styles.timerTextSettled,
            ]}
          >
            {timerText}
          </Text>
        )}

        {/* Collapsible Indicator */}
        {collapsible && safeThoughts.length > 1 && (
          <View style={styles.chevronWrapper}>
            {isExpanded ? (
              <ChevronUp size={compact ? 10 : 12} color={colors.textTertiary} />
            ) : (
              <ChevronDown size={compact ? 10 : 12} color={colors.textTertiary} />
            )}
          </View>
        )}
      </Pressable>

      {/* Expanded thoughts trace */}
      {collapsible && isExpanded && safeThoughts.length > 1 && (
        <View style={styles.expandedTraceBox}>
          {safeThoughts.map((step, idx) => {
            const isCompletedStep = isSettled || idx < currentIndex;
            const isCurrentStep = !isSettled && idx === currentIndex;
            return (
              <View key={`${idx}-${step}`} style={styles.traceRow}>
                <View
                  style={[
                    styles.traceBullet,
                    isCompletedStep && styles.traceBulletDone,
                    isCurrentStep && styles.traceBulletActive,
                  ]}
                />
                <Text
                  style={[
                    styles.traceText,
                    isCurrentStep && styles.traceTextActive,
                    isCompletedStep && styles.traceTextDone,
                  ]}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0E14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  containerStandard: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
    maxWidth: '100%',
  },
  containerCompact: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
    maxWidth: '100%',
  },
  containerThinking: {
    borderColor: 'rgba(94, 106, 210, 0.35)',
    backgroundColor: '#0E0F17',
  },
  containerSettled: {
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(16, 17, 22, 0.85)',
  },
  glyphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotGlyph: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  dotGlyphCompact: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  textWrapper: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  thoughtText: {
    color: colors.textPrimary,
    fontWeight: '500',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  thoughtTextStandard: {
    fontSize: 13,
    lineHeight: 18,
  },
  thoughtTextCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  thoughtTextSettled: {
    color: colors.textSecondary,
  },
  timerText: {
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },
  timerTextStandard: {
    fontSize: 12,
  },
  timerTextCompact: {
    fontSize: 10,
  },
  timerTextSettled: {
    color: colors.textTertiary,
  },
  chevronWrapper: {
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedTraceBox: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  traceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  traceBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDisabled,
  },
  traceBulletActive: {
    backgroundColor: colors.accent,
    width: 5,
    height: 5,
  },
  traceBulletDone: {
    backgroundColor: colors.statusSuccess,
  },
  traceText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  traceTextActive: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  traceTextDone: {
    color: colors.textSecondary,
  },
});
