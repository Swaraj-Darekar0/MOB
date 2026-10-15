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
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Pause,
  Play,
  Trash2,
  ArrowRight,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Goal, GoalShortfall } from '../../types';
import { colors, spacing, borderRadius } from '../../theme';
import { formatPaise, toRupees } from '../../utils/money';
import { getGoalVisuals } from '../../utils/goalVisuals';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exact React Bits animation config: { stiffness: 260, damping: 20 }
const REACT_BITS_SPRING = {
  stiffness: 260,
  damping: 20,
  mass: 1,
};

interface GoalStackCardItemProps {
  goal: Goal;
  depth: number;
  totalCards: number;
  isTop: boolean;
  shortfall?: GoalShortfall;
  onSendToBack: (id: string) => void;
  onOpenRecoveryModal: (shortfall: GoalShortfall) => void;
  onOpenMoveMoney: (goal: Goal) => void;
  onTogglePause: (goal: Goal) => void;
  onDeletePress: (goal: Goal) => void;
  sensitivity: number;
  isReducedMotion: boolean;
}

const GoalStackCardItem: React.FC<GoalStackCardItemProps> = ({
  goal,
  depth,
  totalCards,
  isTop,
  shortfall,
  onSendToBack,
  onOpenRecoveryModal,
  onOpenMoveMoney,
  onTogglePause,
  onDeletePress,
  sensitivity,
  isReducedMotion,
}) => {
  const visuals = getGoalVisuals(goal, !!shortfall);

  const targetScale = Math.max(0.78, 1 - depth * 0.05);
  const targetTranslateY = depth * 12;
  const targetRotateZ =
    depth === 0
      ? 0
      : depth % 2 === 1
      ? -(depth * 2.6)
      : depth * 2.6;
  const targetOpacity = depth >= 4 ? 0 : 1 - depth * 0.15;

  const animScale = useSharedValue(targetScale);
  const animTranslateY = useSharedValue(targetTranslateY);
  const animRotateZ = useSharedValue(targetRotateZ);
  const animOpacity = useSharedValue(targetOpacity);

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const flyOutX = useSharedValue(0);
  const flyOutY = useSharedValue(0);

  const isFlyingOut = useRef(false);

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
        runOnJS(onSendToBack)(goal.id);
      }
    });
  };

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
      onPanResponderMove: (_, gestureState) => {
        if (isFlyingOut.current) return;
        dragX.value = gestureState.dx;
        dragY.value = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isFlyingOut.current) return;
        const totalDist = Math.hypot(gestureState.dx, gestureState.dy);

        if (totalDist > sensitivity) {
          triggerFlyOffAndSendToBack(gestureState.dx, gestureState.dy);
        } else {
          dragX.value = withSpring(0, REACT_BITS_SPRING);
          dragY.value = withSpring(0, REACT_BITS_SPRING);
        }
      },
      onPanResponderTerminate: () => {
        dragX.value = withSpring(0, REACT_BITS_SPRING);
        dragY.value = withSpring(0, REACT_BITS_SPRING);
      },
    });
  }, [isTop, totalCards, sensitivity]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotZ = interpolate(dragX.value, [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2], [-14, 14]);
    const rotY = interpolate(dragX.value, [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2], [10, -10]);
    const rotX = interpolate(dragY.value, [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2], [-8, 8]);

    return {
      opacity: animOpacity.value,
      transform: [
        { translateX: flyOutX.value !== 0 ? flyOutX.value : dragX.value },
        { translateY: (flyOutY.value !== 0 ? flyOutY.value : dragY.value) + animTranslateY.value },
        { scale: animScale.value },
        { rotateZ: `${animRotateZ.value + (isTop ? rotZ : 0)}deg` },
        { rotateY: `${isTop ? rotY : 0}deg` },
        { rotateX: `${isTop ? rotX : 0}deg` },
      ],
      zIndex: totalCards - depth,
    };
  });

  const progressRatio = Math.min(
    1,
    goal.targetAmountPaise > 0 ? goal.currentBalancePaise / goal.targetAmountPaise : 0
  );
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <Animated.View
      style={[styles.cardWrapper, animatedStyle]}
      {...(isTop && panResponder ? panResponder.panHandlers : {})}
    >
      <View style={styles.cardContainer}>
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <View style={[styles.iconCircle, { backgroundColor: visuals.bgColor }]}>
              <visuals.IconComponent size={20} color={visuals.color} strokeWidth={2.4} />
            </View>
            <View style={styles.titleTextContainer}>
              <Text style={styles.goalTitle} numberOfLines={1}>
                {goal.name}
              </Text>
              {visuals.emotionalTag && (
                <Text style={[styles.emotionalTagText, { color: visuals.emotionalTagColor || visuals.color }]}>
                  {visuals.emotionalTag}
                </Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              goal.status === 'COMPLETED' && styles.statusBadgeCompleted,
              goal.status === 'PAUSED' && styles.statusBadgePaused,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                goal.status === 'COMPLETED' && { color: colors.statusSuccess },
                goal.status === 'PAUSED' && { color: colors.textSecondary },
              ]}
            >
              {goal.status}
            </Text>
          </View>
        </View>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: visuals.color },
              goal.status === 'COMPLETED' && { backgroundColor: colors.statusSuccess },
            ]}
          />
        </View>

        {/* Financial Metrics */}
        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricLabel}>Saved</Text>
            <Text style={styles.metricVal}>{formatPaise(goal.currentBalancePaise, false)}</Text>
          </View>
          <View style={styles.metricCenter}>
            <Text style={styles.metricLabel}>Progress</Text>
            <Text style={[styles.metricVal, { color: visuals.color }]}>{progressPercent}%</Text>
          </View>
          <View style={styles.metricRight}>
            <Text style={styles.metricLabel}>Target</Text>
            <Text style={styles.metricVal}>{formatPaise(goal.targetAmountPaise, false)}</Text>
          </View>
        </View>

        {/* Schedule & Pace Pill */}
        <View style={styles.scheduleRow}>
          <View style={styles.scheduleLeft}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={styles.scheduleText}>
              {goal.cadence} • {formatPaise(goal.installmentAmountPaise, false)} / interval
            </Text>
          </View>
          <Text style={styles.deadlineText}>Due {goal.deadline}</Text>
        </View>

        {/* Shortfall Alert Banner if present */}
        {shortfall && (
          <View style={styles.shortfallBox}>
            <View style={styles.shortfallRow}>
              <AlertTriangle size={13} color={colors.statusWarning} />
              <Text style={styles.shortfallText}>
                Shortfall: -₹{toRupees(shortfall.shortfallAmountPaise).toLocaleString('en-IN')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.recoverPillBtn}
              activeOpacity={0.8}
              onPress={() => onOpenRecoveryModal(shortfall)}
            >
              <Text style={styles.recoverPillText}>Fix</Text>
              <ArrowRight size={11} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Card Footer Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.moveMoneyBtn}
            activeOpacity={0.8}
            onPress={() => onOpenMoveMoney(goal)}
          >
            <Sparkles size={13} color={colors.accent} />
            <Text style={styles.moveMoneyBtnText}>Move Money</Text>
          </TouchableOpacity>

          <View style={styles.ghostActions}>
            <TouchableOpacity
              style={styles.ghostIconBtn}
              activeOpacity={0.7}
              onPress={() => onTogglePause(goal)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {goal.status === 'PAUSED' ? (
                <Play size={14} color={colors.textSecondary} />
              ) : (
                <Pause size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostIconBtn}
              activeOpacity={0.7}
              onPress={() => onDeletePress(goal)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={14} color={colors.statusError} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export interface GoalStackProps {
  goals: Goal[];
  shortfalls: GoalShortfall[];
  onOpenRecoveryModal: (shortfall: GoalShortfall) => void;
  onOpenMoveMoney: (goal: Goal) => void;
  onTogglePause: (goal: Goal) => void;
  onDeletePress: (goal: Goal) => void;
  sensitivity?: number;
  style?: StyleProp<ViewStyle>;
}

export const GoalStack: React.FC<GoalStackProps> = ({
  goals,
  shortfalls,
  onOpenRecoveryModal,
  onOpenMoveMoney,
  onTogglePause,
  onDeletePress,
  sensitivity = 90,
  style,
}) => {
  const isReducedMotion = useReducedMotion();
  const [stack, setStack] = useState<Goal[]>([]);

  useEffect(() => {
    if (!goals || goals.length === 0) {
      setStack([]);
      return;
    }
    setStack((prev) => {
      const prevIds = prev.map((g) => g.id);
      const incomingIds = goals.map((g) => g.id);
      const isSameSet =
        prevIds.length === incomingIds.length && incomingIds.every((id) => prevIds.includes(id));

      if (isSameSet) {
        return prev.map((item) => goals.find((g) => g.id === item.id) || item);
      }
      return [...goals];
    });
  }, [goals]);

  const sendToBack = (id: string) => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const newStack = [...prev];
      const index = newStack.findIndex((g) => g.id === id);
      if (index === -1) return prev;
      const [card] = newStack.splice(index, 1);
      newStack.push(card);
      return newStack;
    });
  };

  const sendToFront = () => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const last = prev[prev.length - 1];
      const rest = prev.slice(0, prev.length - 1);
      return [last, ...rest];
    });
  };

  if (stack.length === 0) return null;

  const topGoal = stack[0];
  const activeOriginalIndex = goals.findIndex((g) => g.id === topGoal.id);
  const currentGoalNum = activeOriginalIndex >= 0 ? activeOriginalIndex + 1 : 1;
  const cardsToRender = stack.slice(0, Math.min(5, stack.length));

  return (
    <View style={[styles.root, style]}>
      {/* 3D Stack Card Arena */}
      <View style={styles.cardArena}>
        {cardsToRender
          .map((goal, depth) => {
            const sf = shortfalls.find((s) => s.goalId === goal.id && !s.resolved);
            return (
              <GoalStackCardItem
                key={goal.id}
                goal={goal}
                depth={depth}
                totalCards={stack.length}
                isTop={depth === 0}
                shortfall={sf}
                onSendToBack={sendToBack}
                onOpenRecoveryModal={onOpenRecoveryModal}
                onOpenMoveMoney={onOpenMoveMoney}
                onTogglePause={onTogglePause}
                onDeletePress={onDeletePress}
                sensitivity={sensitivity}
                isReducedMotion={isReducedMotion}
              />
            );
          })
          .reverse()}
      </View>

      {/* Navigation & Telemetry Nudge */}
      <View style={styles.footerControls}>
        <View style={styles.telemetryBadge}>
          <Target size={13} color={colors.accent} strokeWidth={2.4} />
          <Text style={styles.telemetryText}>
            GOAL {currentGoalNum} OF {goals.length}
          </Text>
        </View>

        {goals.length > 1 && (
          <View style={styles.navButtonsGroup}>
            <TouchableOpacity
              style={styles.cycleBtn}
              onPress={sendToFront}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={16} color={colors.textSecondary} strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cycleBtn}
              onPress={() => sendToBack(topGoal.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cardArena: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    width: '100%',
    borderRadius: borderRadius.lg,
  },
  cardContainer: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleTextContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  emotionalTagText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.6,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.pill,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  metricCenter: {
    alignItems: 'center',
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  deadlineText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  shortfallBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
  },
  shortfallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shortfallText: {
    fontSize: 11,
    color: colors.statusWarning,
    fontWeight: '700',
  },
  recoverPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusWarning,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    gap: 3,
  },
  recoverPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  moveMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
    gap: 5,
  },
  moveMoneyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  ghostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ghostIconBtn: {
    padding: 6,
  },
  footerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH - spacing.lg * 2,
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
