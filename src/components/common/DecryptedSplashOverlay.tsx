import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

interface DecryptedSplashOverlayProps {
  /** True when SQLite database and critical app state are initialized */
  isReady: boolean;
  /** Invoked when exit animation completes so root layout unmounts the overlay */
  onAnimationComplete: () => void;
}

const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789X#_/<>&%$*';
const TARGET_WORD = 'MOB';

// ReactBits motion timing profile
const SCRAMBLE_SPEED_MS = 50; // 50ms per iteration (crisp, human-perceptible, 0% bridge lag)
const INITIAL_ENTROPY_MS = 350; // Time all 3 slots scramble before 'M' locks
const STEP_DELAY_MS = 280; // Iteration window between each character settlement
const HOLD_DURATION_MS = 280; // Savor time for fully decrypted word in solid #FFFFFF
const EXIT_DURATION_MS = 340; // Scale-dissolve exit duration

const getRandomChar = () => CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];

/**
 * Pure Minimalist Decrypted Splash Screen (ReactBits Architecture):
 * - Frame 0 starts ALREADY scrambled (NEVER flashes "MOB" before animation)
 * - 50ms scramble cadence ensures smooth 60 FPS without React bridge lag
 * - Sequential left-to-right decipher cadence (M -> O -> B) with ignition glow
 * - Pure #060606 OLED black background across all platforms
 * - Discrete 3-cell architecture: 0.00px horizontal jitter
 */
export function DecryptedSplashOverlay({
  isReady,
  onAnimationComplete,
}: DecryptedSplashOverlayProps) {
  const { width, height } = useWindowDimensions();

  // Frame 0 is INITIALIZED WITH RANDOM SCRAMBLED CHARACTERS (never "MOB")
  const [displayChars, setDisplayChars] = useState<string[]>(() => [
    getRandomChar(),
    getRandomChar(),
    getRandomChar(),
  ]);
  const [lockedFlags, setLockedFlags] = useState<boolean[]>([false, false, false]);
  const [glowIndex, setGlowIndex] = useState<number | null>(null);

  // Robust refs to prevent effect cleanups from canceling running timers
  const lockedFlagsRef = useRef<boolean[]>([false, false, false]);
  const hasStartedResolving = useRef(false);
  const isExited = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reanimated values for container exit
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  // Responsive typography metrics
  const typographyMetrics = useMemo(() => {
    const dimMin = Math.min(width, height);
    // 24% of shortest dimension gives ~86dp on 360dp, ~94dp on iPhone 15, ~103dp on Pro Max
    const rawFontSize = dimMin * 0.24;
    const fontSize = Math.round(Math.min(Math.max(rawFontSize, 76), 128));

    // Discrete cell sizing to isolate glyph advance and guarantee zero layout shift
    const cellWidth = Math.ceil(fontSize * 0.78);
    const letterGap = Math.round(fontSize * 0.12);
    const lineHeight = Math.round(fontSize * 1.15);
    const opticalOffset = -Math.round(fontSize * 0.025);

    return {
      fontSize,
      cellWidth,
      letterGap,
      lineHeight,
      opticalOffset,
    };
  }, [width, height]);

  // Safe dismissal of native static splash once Reanimated surface paints
  const handleRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Exit Animation: scale dissolve on UI thread into pre-rendered app
  const triggerExitAnimation = useCallback(() => {
    if (isExited.current) return;
    isExited.current = true;

    // Stop scrambling immediately and ensure target text is locked
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayChars(TARGET_WORD.split(''));
    setLockedFlags([true, true, true]);

    containerScale.value = withTiming(1.08, {
      duration: EXIT_DURATION_MS,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    containerOpacity.value = withTiming(
      0,
      {
        duration: EXIT_DURATION_MS,
        easing: Easing.in(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      }
    );

    // Guaranteed fallback: unmount even if Reanimated finish callback is dropped
    const fallbackTimer = setTimeout(() => {
      onAnimationComplete();
    }, EXIT_DURATION_MS + 60);
    timeoutsRef.current.push(fallbackTimer);
  }, [containerOpacity, containerScale, onAnimationComplete]);

  // Master Watchdog: Under no circumstance can splash screen stay on screen longer than 2400ms
  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (!isExited.current) {
        triggerExitAnimation();
      }
    }, 2400);
    timeoutsRef.current.push(watchdog);
  }, [triggerExitAnimation]);

  // Respect OS reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (enabled) {
        setDisplayChars(TARGET_WORD.split(''));
        lockedFlagsRef.current = [true, true, true];
        setLockedFlags([true, true, true]);
        triggerExitAnimation();
      }
    });
  }, [triggerExitAnimation]);

  // Continuous Scramble Loop (50ms ReactBits cadence)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDisplayChars(() =>
        TARGET_WORD.split('').map((targetChar, index) => {
          if (lockedFlagsRef.current[index]) return targetChar;
          return getRandomChar();
        })
      );
    }, SCRAMBLE_SPEED_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Settlement Orchestrator: Staggered Decipher (M -> O -> B)
  useEffect(() => {
    const startTimer = setTimeout(() => {
      if (hasStartedResolving.current) return;
      hasStartedResolving.current = true;

      // 1. Lock character 0 ('M')
      lockedFlagsRef.current[0] = true;
      setLockedFlags([...lockedFlagsRef.current]);
      setGlowIndex(0);

      // 2. Lock character 1 ('O') after STEP_DELAY_MS
      const timerO = setTimeout(() => {
        lockedFlagsRef.current[1] = true;
        setLockedFlags([...lockedFlagsRef.current]);
        setGlowIndex(1);
      }, STEP_DELAY_MS);

      // 3. Lock character 2 ('B') after STEP_DELAY_MS * 2
      const timerB = setTimeout(() => {
        lockedFlagsRef.current[2] = true;
        setLockedFlags([...lockedFlagsRef.current]);
        setGlowIndex(2);

        // Turn off glow after lock-in
        const timerGlow = setTimeout(() => setGlowIndex(null), 120);

        // Hold resolved word, then trigger exit dissolve
        const timerHold = setTimeout(() => {
          triggerExitAnimation();
        }, HOLD_DURATION_MS);

        timeoutsRef.current.push(timerGlow, timerHold);
      }, STEP_DELAY_MS * 2);

      timeoutsRef.current.push(timerO, timerB);
    }, isReady ? INITIAL_ENTROPY_MS : INITIAL_ENTROPY_MS + 100);

    timeoutsRef.current.push(startTimer);
  }, [isReady, triggerExitAnimation]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View
      onLayout={handleRootLayout}
      pointerEvents={isExited.current ? 'none' : 'auto'}
      style={[styles.container, animatedContainerStyle]}
    >
      <View
        style={[
          styles.lockupContainer,
          {
            gap: typographyMetrics.letterGap,
            transform: [{ translateY: typographyMetrics.opticalOffset }],
          },
        ]}
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel="MOB"
      >
        {TARGET_WORD.split('').map((_, index) => {
          const char = displayChars[index];
          const isLocked = lockedFlags[index];
          const hasGlow = glowIndex === index;

          return (
            <View
              key={index}
              style={[
                styles.slot,
                {
                  width: typographyMetrics.cellWidth,
                  height: typographyMetrics.lineHeight,
                },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.baseText,
                  {
                    fontSize: typographyMetrics.fontSize,
                    lineHeight: typographyMetrics.lineHeight,
                  },
                  isLocked ? styles.lockedText : styles.scrambleText,
                  hasGlow && styles.glowText,
                ]}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#060606',
    zIndex: 999999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  baseText: {
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
    ...Platform.select({
      ios: {
        fontFamily: 'Menlo',
      },
      android: {
        fontFamily: 'monospace',
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
      default: {
        fontFamily: 'monospace',
      },
    }),
  },
  scrambleText: {
    color: 'rgba(255, 255, 255, 0.35)',
  },
  lockedText: {
    color: '#FFFFFF',
  },
  glowText: {
    textShadowColor: 'rgba(255, 255, 255, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});
