import React, { useEffect, useState, useRef } from 'react';
import { Text, TextStyle, StyleSheet, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CountUpProps {
  value: number;
  from?: number;
  duration?: number; // ms, default 500ms
  prefix?: string;
  suffix?: string;
  decimals?: number;
  locale?: string;
  style?: StyleProp<TextStyle>;
  onEnd?: () => void;
}

/**
 * Animated CountUp component for React Native / Reanimated.
 * Translated from react-bits CountUp with dark_ui.md constraints:
 * - Respects prefers-reduced-motion
 * - Uses tabular-nums font variant for steady numeral alignment
 * - Smooth cubic ease-out easing
 * - Formats via en-IN (or specified locale)
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  from,
  duration = 500,
  prefix = '',
  suffix = '',
  decimals = 0,
  locale = 'en-IN',
  style,
  onEnd,
}) => {
  const isReducedMotion = useReducedMotion();
  const initialValue = from !== undefined ? from : value;
  const [displayValue, setDisplayValue] = useState<number>(initialValue);
  const animValue = useSharedValue<number>(initialValue);
  const isFirstRender = useRef(true);

  const formatNumber = (num: number): string => {
    return num.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  useEffect(() => {
    if (isReducedMotion) {
      setDisplayValue(value);
      animValue.value = value;
      onEnd?.();
      return;
    }

    if (isFirstRender.current && from === undefined) {
      isFirstRender.current = false;
      setDisplayValue(value);
      animValue.value = value;
      return;
    }

    isFirstRender.current = false;
    animValue.value = withTiming(
      value,
      {
        duration,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished && onEnd) {
          runOnJS(onEnd)();
        }
      }
    );
  }, [value, duration, isReducedMotion, from]);

  useAnimatedReaction(
    () => animValue.value,
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setDisplayValue)(current);
      }
    },
    [animValue]
  );

  return (
    <Text style={[styles.tabularText, style]}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </Text>
  );
};

const styles = StyleSheet.create({
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
});
