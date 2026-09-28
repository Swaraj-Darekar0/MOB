import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  Platform,
  Vibration,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react-native';
import { Envelope } from '../../types';
import { colors, spacing } from '../../theme';
import { EnvelopeCard } from '../dashboard/EnvelopeCard';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exact React Bits animation config: { stiffness: 260, damping: 20 }
const REACT_BITS_SPRING = {
  stiffness: 260,
  damping: 20,
  mass: 1,
};

interface StackCardItemProps {
  envelope: Envelope;
  depth: number;
  totalCards: number;
  isTop: boolean;
  onSendToBack: (id: string) => void;
  onCardPress: (envelope: Envelope) => void;
  sensitivity: number;
  isReducedMotion: boolean;
}

const StackCardItem: React.FC<StackCardItemProps> = ({
  envelope,
  depth,
  totalCards,
  isTop,
  onSendToBack,
  onCardPress,
  sensitivity,
  isReducedMotion,
}) => {
  // Target depth properties matching React Bits formulas:
  // scale: 1 - depth * 0.05
  // rotateZ: depth === 0 ? 0 : alternating angle (depth * 2.8deg)
  // translateY: depth * 10
  const targetScale = Math.max(0.78, 1 - depth * 0.05);
  const targetTranslateY = depth * 10;
  const targetRotateZ =
    depth === 0
      ? 0
      : depth % 2 === 1
      ? -(depth * 2.8)
      : depth * 2.8;
  const targetOpacity = depth >= 4 ? 0 : 1 - depth * 0.15;

  // Reanimated shared values for layered card physics
  const animScale = useSharedValue(targetScale);
  const animTranslateY = useSharedValue(targetTranslateY);
  const animRotateZ = useSharedValue(targetRotateZ);
  const animOpacity = useSharedValue(targetOpacity);

  // Gesture drag shared values for the top card
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const flyOutX = useSharedValue(0);
  const flyOutY = useSharedValue(0);

  const isFlyingOut = useRef(false);
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Spring animation on depth change (just like Framer Motion)
  useEffect(() => {
    isFlyingOut.current = false;
    dragX.value = 0;
    dragY.value = 0;
    flyOutX.value = 0;
    flyOutY.value = 0;

    if (isReducedMotion) {
      animScale.value = targetScale;
      animTranslateY.value = targetTranslateY;
      animRotateZ.value = 0;
      animOpacity.value = targetOpacity;
    } else {
      animScale.value = withSpring(targetScale, REACT_BITS_SPRING);
      animTranslateY.value = withSpring(targetTranslateY, REACT_BITS_SPRING);
      animRotateZ.value = withSpring(targetRotateZ, REACT_BITS_SPRING);
      animOpacity.value = withSpring(targetOpacity, REACT_BITS_SPRING);
    }
  }, [depth, isReducedMotion]);

  const triggerFlyOffAndSendToBack = (directionX: number, directionY: number) => {
    if (isFlyingOut.current) return;
    isFlyingOut.current = true;

    try {
      if (Platform.OS !== 'web' && typeof Vibration !== 'undefined' && Vibration.vibrate) {
        Vibration.vibrate(18);
      }
    } catch {}

    const targetX = directionX !== 0 ? Math.sign(directionX) * (SCREEN_WIDTH * 1.25) : SCREEN_WIDTH * 1.25;
    const targetY = directionY * 1.2;

    flyOutX.value = withTiming(targetX, { duration: 180, easing: Easing.out(Easing.quad) });
    flyOutY.value = withTiming(targetY, { duration: 180, easing: Easing.out(Easing.quad) });
    animOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) {
        runOnJS(onSendToBack)(envelope.id);
      }
    });
  };

  // PanResponder only active on top card
  const panResponder = useMemo(() => {
    if (!isTop || totalCards <= 1) {
      return null;
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isFlyingOut.current) return false;
        const totalDist = Math.hypot(gestureState.dx, gestureState.dy);
        return totalDist > 7;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (isFlyingOut.current) return false;
        const totalDist = Math.hypot(gestureState.dx, gestureState.dy);
        return totalDist > 9;
      },
      onPanResponderGrant: (evt) => {
        touchStartTime.current = Date.now();
        touchStartPos.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
      },
      onPanResponderMove: (_, gestureState) => {
        if (isFlyingOut.current) return;
        dragX.value = gestureState.dx;
        dragY.value = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isFlyingOut.current) return;

        const totalDist = Math.hypot(gestureState.dx, gestureState.dy);
        const velocity = Math.hypot(gestureState.vx, gestureState.vy);

        if (totalDist > sensitivity || velocity > 0.5) {
          triggerFlyOffAndSendToBack(gestureState.dx, gestureState.dy);
        } else {
          // Snap back to 0,0 with React Bits spring physics
          dragX.value = withSpring(0, REACT_BITS_SPRING);
          dragY.value = withSpring(0, REACT_BITS_SPRING);
        }
      },
      onPanResponderTerminate: () => {
        if (!isFlyingOut.current) {
          dragX.value = withSpring(0, REACT_BITS_SPRING);
          dragY.value = withSpring(0, REACT_BITS_SPRING);
        }
      },
    });
  }, [isTop, totalCards, sensitivity, envelope.id]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentX = dragX.value + flyOutX.value;
    const currentY = animTranslateY.value + dragY.value + flyOutY.value;

    if (isReducedMotion) {
      return {
        transform: [{ translateX: currentX }, { translateY: currentY }, { scale: animScale.value }],
        opacity: animOpacity.value,
      };
    }

    // 3D Tilt Physics adapted from React Bits CardRotate
    const tiltRotateX = isTop ? interpolate(dragY.value, [-100, 100], [16, -16]) : 0;
    const tiltRotateY = isTop ? interpolate(dragX.value, [-100, 100], [-16, 16]) : 0;
    const currentRotateZ = animRotateZ.value + (isTop ? interpolate(currentX, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15]) : 0);

    return {
      opacity: animOpacity.value,
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        { perspective: 800 },
        { scale: animScale.value },
        { rotateX: `${tiltRotateX}deg` },
        { rotateY: `${tiltRotateY}deg` },
        { rotateZ: `${currentRotateZ}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { zIndex: totalCards - depth },
        animatedStyle,
      ]}
      pointerEvents={isTop ? 'auto' : 'none'}
      {...(isTop && panResponder ? panResponder.panHandlers : {})}
    >
      <EnvelopeCard
        envelope={envelope}
        onPayPress={onCardPress}
        onPress={onCardPress}
        style={styles.cardResetMargin}
      />
    </Animated.View>
  );
};

export interface BucketStackProps {
  envelopes: Envelope[];
  onCardPress?: (envelope: Envelope) => void;
  onPayPress?: (envelope: Envelope) => void;
  sensitivity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * BucketStack Component
 * Faithfully adapted from React Bits `Stack` (https://reactbits.dev/c/components/stack)
 * - Individual card spring physics with { stiffness: 260, damping: 20 }
 * - 3D Tilt Drag physics (rotateX, rotateY, rotateZ) on the active top card
 * - Smooth spring transition for background cards as they glide into the foreground
 * - Dynamic "BUCKET X OF Y" telemetry nudge
 * - Direct tap-on-card interaction to initiate payment
 */
export const BucketStack: React.FC<BucketStackProps> = ({
  envelopes,
  onCardPress,
  onPayPress,
  sensitivity = 90,
  style,
}) => {
  const isReducedMotion = useReducedMotion();
  const [stack, setStack] = useState<Envelope[]>([]);

  // Sync internal stack with external envelopes prop
  useEffect(() => {
    if (!envelopes || envelopes.length === 0) {
      setStack([]);
      return;
    }
    setStack((prev) => {
      const prevIds = prev.map((e) => e.id);
      const incomingIds = envelopes.map((e) => e.id);
      const isSameSet =
        prevIds.length === incomingIds.length &&
        incomingIds.every((id) => prevIds.includes(id));

      if (isSameSet) {
        return prev.map((item) => envelopes.find((e) => e.id === item.id) || item);
      }
      return [...envelopes];
    });
  }, [envelopes]);

  const handlePay = (envelope: Envelope) => {
    if (onCardPress) {
      onCardPress(envelope);
    } else if (onPayPress) {
      onPayPress(envelope);
    }
  };

  // Move top card to back of stack (exact sendToBack from React Bits)
  const sendToBack = (id: string) => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const newStack = [...prev];
      const index = newStack.findIndex((c) => c.id === id);
      if (index === -1) return prev;
      const [card] = newStack.splice(index, 1);
      newStack.push(card); // In our top=0 arrangement, push moves it to the back
      return newStack;
    });
  };

  // Move back card to front of stack (cycle previous)
  const sendToFront = () => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const last = prev[prev.length - 1];
      const rest = prev.slice(0, prev.length - 1);
      return [last, ...rest];
    });
  };

  if (stack.length === 0) {
    return null;
  }

  const topEnvelope = stack[0];

  // DYNAMIC BUCKET COUNTER: Find index of topEnvelope in original envelopes array
  const activeOriginalIndex = envelopes.findIndex((e) => e.id === topEnvelope.id);
  const currentBucketNum = activeOriginalIndex >= 0 ? activeOriginalIndex + 1 : 1;

  // Render cards in reverse order so z-index / DOM stacking naturally places top card on top
  const cardsToRender = stack.slice(0, Math.min(6, stack.length));

  return (
    <View style={[styles.container, style]}>
      {/* 1. Stack Arena */}
      <View style={styles.cardArena}>
        {cardsToRender
          .map((envelope, depth) => (
            <StackCardItem
              key={envelope.id}
              envelope={envelope}
              depth={depth}
              totalCards={stack.length}
              isTop={depth === 0}
              onSendToBack={sendToBack}
              onCardPress={handlePay}
              sensitivity={sensitivity}
              isReducedMotion={isReducedMotion}
            />
          ))
          .reverse()}
      </View>

      {/* 2. Interactive Navigation & Dynamic Telemetry Nudge */}
      <View style={styles.footerControls}>
        <View style={styles.telemetryBadge}>
          <Layers size={13} color={colors.accent} strokeWidth={2.2} />
          {/* DYNAMIC: BUCKET X OF TOTAL */}
          <Text style={styles.telemetryText}>
            BUCKET {currentBucketNum} OF {envelopes.length}
          </Text>
        </View>

        <Text style={styles.hintText}>
          {stack.length > 1
            ? 'Swipe card to cycle • Tap card to pay'
            : 'Tap card to pay directly'}
        </Text>

        {stack.length > 1 && (
          <View style={styles.cycleButtonsRow}>
            <TouchableOpacity
              style={styles.cycleArrowBtn}
              activeOpacity={0.7}
              onPress={sendToFront}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={16} color="#CCCCCC" />
            </TouchableOpacity>

            {/* Micro Dot Indicators */}
            <View style={styles.dotsRow}>
              {envelopes.slice(0, Math.min(6, envelopes.length)).map((env) => {
                const isActive = env.id === topEnvelope.id;
                return (
                  <View
                    key={env.id}
                    style={[
                      styles.dot,
                      isActive && styles.dotActive,
                      isActive && { backgroundColor: env.color || colors.accent },
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.cycleArrowBtn}
              activeOpacity={0.7}
              onPress={() => sendToBack(topEnvelope.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={16} color="#CCCCCC" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cardArena: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  cardWrapper: {
    position: 'absolute',
    width: '100%',
    top: 0,
    left: 0,
    right: 0,
  },
  cardResetMargin: {
    marginBottom: 0,
  },
  footerControls: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#22242B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  telemetryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  hintText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cycleButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  cycleArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#22242B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2C34',
  },
  dotActive: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
});
