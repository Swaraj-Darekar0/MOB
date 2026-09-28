import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Vibration,
  TouchableOpacity,
  PanResponder,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react-native';
import { Envelope } from '../../types';
import { colors, spacing } from '../../theme';
import { EnvelopeCard } from '../dashboard/EnvelopeCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fast, snappy spring for card cycling drag release & send-to-back
const STACK_CYCLE_SPRING = {
  stiffness: 260,
  damping: 20,
  mass: 1,
};

// Fluid, luxurious ~650ms spring for compiling cards between Grid <-> Stack
const MORPH_TRANSITION_SPRING = {
  stiffness: 75,
  damping: 15,
  mass: 1,
};

// Explicit card height & generous grid gap for clear visual separation
const CARD_HEIGHT = 180;
const CARD_GAP = 16;

interface MorphingCardProps {
  envelope: Envelope;
  gridIndex: number;
  stackDepth: number;
  totalCards: number;
  viewMode: 'grid' | 'stack';
  centerOffset: number;
  transitionProgress: SharedValue<number>;
  onSendToBack: (id: string) => void;
  onCardPress: (envelope: Envelope) => void;
  onDeletePress?: (envelope: Envelope) => void;
}

const MorphingCardItem: React.FC<MorphingCardProps> = ({
  envelope,
  gridIndex,
  stackDepth,
  totalCards,
  viewMode,
  centerOffset,
  transitionProgress,
  onSendToBack,
  onCardPress,
  onDeletePress,
}) => {
  const depthAnim = useSharedValue(stackDepth);

  // Gesture values (active only for top card in stack mode)
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const flyOutX = useSharedValue(0);
  const isFlyingOut = useRef(false);

  const isTop = stackDepth === 0;

  // Spring depth transitions when cycling stack
  useEffect(() => {
    isFlyingOut.current = false;
    dragX.value = 0;
    dragY.value = 0;
    flyOutX.value = 0;
    depthAnim.value = withSpring(stackDepth, STACK_CYCLE_SPRING);
  }, [stackDepth]);

  // Top Card Fly-Out & Send-to-Back
  const handleFlyOut = (directionX: number) => {
    if (isFlyingOut.current) return;
    isFlyingOut.current = true;

    try {
      if (Platform.OS !== 'web' && Vibration?.vibrate) {
        Vibration.vibrate(18);
      }
    } catch {}

    const targetX = directionX > 0 ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3;
    flyOutX.value = withTiming(
      targetX,
      { duration: 200, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(onSendToBack)(envelope.id);
        }
      }
    );
  };

  // Zero Gesture Overhead: PanResponder instantiated ONLY for the top card in stack mode
  const panResponder = useMemo(() => {
    if (viewMode !== 'stack' || !isTop || totalCards <= 1) {
      return null;
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (isFlyingOut.current) return false;
        return Math.hypot(g.dx, g.dy) > 8;
      },
      onPanResponderMove: (_, g) => {
        if (isFlyingOut.current) return;
        dragX.value = g.dx;
        dragY.value = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        if (isFlyingOut.current) return;
        if (Math.abs(g.dx) > 85 || Math.abs(g.vx) > 0.5) {
          handleFlyOut(g.dx);
        } else {
          dragX.value = withSpring(0, STACK_CYCLE_SPRING);
          dragY.value = withSpring(0, STACK_CYCLE_SPRING);
        }
      },
      onPanResponderTerminate: () => {
        if (!isFlyingOut.current) {
          dragX.value = withSpring(0, STACK_CYCLE_SPRING);
          dragY.value = withSpring(0, STACK_CYCLE_SPRING);
        }
      },
    });
  }, [viewMode, isTop, totalCards, envelope.id]);

  // UI-Thread Transform Worklet driven synchronously by master transitionProgress
  const animatedStyle = useAnimatedStyle(() => {
    const p = transitionProgress.value;
    const d = depthAnim.value;

    // Physical Coordinates:
    // Grid: exact slot with CARD_GAP spacing
    // Stack: centered in visible screen with subtle cascading depth offset
    const gridY = gridIndex * (CARD_HEIGHT + CARD_GAP);
    const stackY = centerOffset + d * 10;
    const currentY = interpolate(p, [0, 1], [gridY, stackY]) + dragY.value;
    const currentX = dragX.value + flyOutX.value;

    // React Bits Stack Formation:
    // At first (p in [0, 0.35]), cards remain in normal flat formation as they travel.
    // When they converge together (p in [0.35, 1.0]), fan out into React Bits stack layout.
    // In reverse (stack -> grid), un-fan back to flat before gliding into grid rows.
    const fanProgress = interpolate(p, [0.35, 1.0], [0, 1], Extrapolation.CLAMP);

    // Scale: 1.0 in grid; React Bits stack scale: 1 - d * 0.05
    const targetScale = Math.max(0.80, 1 - d * 0.05);
    const currentScale = interpolate(fanProgress, [0, 1], [1, targetScale]);

    // Rotation: 0 in grid; React Bits unidirectional fan around bottom-right (90% 90% 0)
    // Active top card (d=0) is straight (0 deg). Background cards fan cleanly outward.
    const targetRotateZ = d === 0 ? 0 : d * 3.4;
    const currentRotateZ = interpolate(fanProgress, [0, 1], [0, targetRotateZ]);

    // Opacity: Background cards > 4 layers fade out softly
    const targetOpacity = d >= 4 ? 0 : 1 - d * 0.15;
    const currentOpacity = interpolate(fanProgress, [0, 1], [1, targetOpacity]);

    // 3D Tilt Drag Physics (only for top card when settled in stack mode)
    const tiltX = isTop && p > 0.85 ? interpolate(dragY.value, [-100, 100], [12, -12]) : 0;
    const tiltY = isTop && p > 0.85 ? interpolate(dragX.value, [-100, 100], [-12, 12]) : 0;

    return {
      opacity: currentOpacity,
      transformOrigin: ['90%', '90%', 0],
      transform: [
        { perspective: 800 },
        { translateY: currentY },
        { translateX: currentX },
        { scale: currentScale },
        { rotateX: `${tiltX}deg` },
        { rotateY: `${tiltY}deg` },
        { rotateZ: `${currentRotateZ}deg` },
      ],
    };
  });

  const dynamicZIndex = (totalCards - stackDepth) * 10;
  const dynamicElevation = Math.max(1, (totalCards - stackDepth) * 3);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          zIndex: dynamicZIndex,
          elevation: dynamicElevation,
        },
        animatedStyle,
      ]}
      pointerEvents={viewMode === 'grid' ? 'auto' : isTop ? 'auto' : 'none'}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      <EnvelopeCard
        envelope={envelope}
        onPayPress={onCardPress}
        onPress={onCardPress}
        onDeletePress={onDeletePress}
        style={styles.cardInner}
      />
    </Animated.View>
  );
};

export interface MorphingDeckProps {
  envelopes: Envelope[];
  viewMode: 'grid' | 'stack';
  onCardPress: (envelope: Envelope) => void;
  onDeletePress?: (envelope: Envelope) => void;
  viewportHeight?: number;
  scrollOffset?: number;
  style?: StyleProp<ViewStyle>;
}

export const MorphingDeck: React.FC<MorphingDeckProps> = ({
  envelopes,
  viewMode,
  onCardPress,
  onDeletePress,
  viewportHeight = 620,
  scrollOffset = 0,
  style,
}) => {
  // Synchronously initialize stack order so it is never empty on first render
  const [stackOrder, setStackOrder] = useState<string[]>(() => envelopes.map((e) => e.id));

  // Single Master UI-Thread spring value driving the entire deck animation
  const transitionProgress = useSharedValue(viewMode === 'stack' ? 1 : 0);

  // Optical center calculation accounting for scroll offset so stack forms directly in the visible viewport
  const centerOffset = useMemo(() => {
    const baseCenter = Math.max(20, Math.floor((viewportHeight - 290) / 2) - 10);
    return scrollOffset + baseCenter;
  }, [viewportHeight, scrollOffset]);

  // Sync stack ordering with incoming envelope data
  useEffect(() => {
    const ids = envelopes.map((e) => e.id);
    setStackOrder((prev) => {
      const isSame = prev.length === ids.length && ids.every((id) => prev.includes(id));
      return isSame ? prev : ids;
    });
  }, [envelopes]);

  // When switching back to Grid, reset stackOrder to canonical envelopes order
  useEffect(() => {
    if (viewMode === 'grid') {
      setStackOrder(envelopes.map((e) => e.id));
    }
  }, [viewMode, envelopes]);

  // Master spring transition between Grid <-> Stack (~650ms smooth physical curve)
  useEffect(() => {
    transitionProgress.value = withSpring(
      viewMode === 'stack' ? 1 : 0,
      MORPH_TRANSITION_SPRING
    );
  }, [viewMode]);

  const sendToBack = (id: string) => {
    setStackOrder((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      return copy;
    });
  };

  const sendToFront = () => {
    setStackOrder((prev) => {
      if (prev.length <= 1) return prev;
      const last = prev[prev.length - 1];
      return [last, ...prev.slice(0, prev.length - 1)];
    });
  };

  // Fixed container height to eliminate per-frame Yoga layout recalculation inside ScrollView
  const gridHeight = Math.max(
    envelopes.length * (CARD_HEIGHT + CARD_GAP),
    viewportHeight
  );

  const footerAnimatedStyle = useAnimatedStyle(() => {
    const p = transitionProgress.value;
    return {
      opacity: interpolate(p, [0.65, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0.65, 1], [16, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  if (envelopes.length === 0) return null;

  const topEnvelopeId = stackOrder[0] || envelopes[0].id;
  const activeOriginalIndex = envelopes.findIndex((e) => e.id === topEnvelopeId);
  const currentBucketNum = activeOriginalIndex >= 0 ? activeOriginalIndex + 1 : 1;

  // Stable JSX mapping without DOM reordering
  const cardItems = useMemo(() => {
    return envelopes.map((envelope, gridIndex) => {
      const stackDepth = stackOrder.indexOf(envelope.id);
      const depth = stackDepth >= 0 ? stackDepth : gridIndex;
      return { envelope, gridIndex, depth };
    });
  }, [envelopes, stackOrder]);

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.deckContainer, { minHeight: gridHeight }]}>
        {cardItems.map(({ envelope, gridIndex, depth }) => (
          <MorphingCardItem
            key={envelope.id}
            envelope={envelope}
            gridIndex={gridIndex}
            stackDepth={depth}
            totalCards={envelopes.length}
            viewMode={viewMode}
            centerOffset={centerOffset}
            transitionProgress={transitionProgress}
            onSendToBack={sendToBack}
            onCardPress={onCardPress}
            onDeletePress={onDeletePress}
          />
        ))}
      </View>

      {/* Stack Navigation & Telemetry Nudge */}
      <Animated.View
        style={[styles.footerControls, { top: centerOffset + CARD_HEIGHT + 24 }, footerAnimatedStyle]}
        pointerEvents={viewMode === 'stack' ? 'auto' : 'none'}
      >
        <View style={styles.telemetryBadge}>
          <Layers size={13} color={colors.accent} strokeWidth={2.2} />
          <Text style={styles.telemetryText}>
            BUCKET {currentBucketNum} OF {envelopes.length}
          </Text>
        </View>

        <Text style={styles.hintText}>
          {envelopes.length > 1 ? 'Swipe card to cycle • Tap card to pay' : 'Tap card to pay directly'}
        </Text>

        {envelopes.length > 1 && (
          <View style={styles.cycleButtonsRow}>
            <TouchableOpacity
              style={styles.cycleArrowBtn}
              activeOpacity={0.7}
              onPress={sendToFront}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={16} color="#CCCCCC" />
            </TouchableOpacity>

            <View style={styles.dotsRow}>
              {envelopes.slice(0, Math.min(6, envelopes.length)).map((env) => {
                const isActive = env.id === topEnvelopeId;
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
              onPress={() => sendToBack(topEnvelopeId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={16} color="#CCCCCC" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    position: 'relative',
  },
  deckContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: CARD_HEIGHT,
  },
  cardInner: {
    marginBottom: 0,
  },
  footerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
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
