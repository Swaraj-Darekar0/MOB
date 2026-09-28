import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface SingleDigitTickerProps {
  digit: number;
  height: number;
  textStyle?: StyleProp<TextStyle>;
  duration?: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const SingleDigitTicker: React.FC<SingleDigitTickerProps> = ({
  digit,
  height,
  textStyle,
  duration = 350,
}) => {
  const isReducedMotion = useReducedMotion();
  const translateY = useSharedValue(-digit * height);

  useEffect(() => {
    if (isReducedMotion) {
      translateY.value = -digit * height;
    } else {
      translateY.value = withTiming(-digit * height, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [digit, height, isReducedMotion, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[{ height, overflow: 'hidden' }]}>
      <Animated.View style={animatedStyle}>
        {DIGITS.map((num) => (
          <View key={num} style={{ height, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.tabularText, textStyle]}>{num}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

interface NumberTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Pure Compositor-Only Rolling Digit Ticker.
 * Adheres strictly to dark_ui.md:
 * - "MUST animate only compositor props (transform, opacity)"
 * - "SHOULD use tabular-nums for numeric data"
 * - "SHOULD respect prefers-reduced-motion"
 */
export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  prefix = '₹',
  suffix = '',
  fontSize = 32,
  textStyle,
  containerStyle,
}) => {
  const rowHeight = fontSize * 1.25;
  const formatted = Math.round(value).toLocaleString('en-IN');
  const chars = formatted.split('');

  return (
    <View style={[styles.row, containerStyle]}>
      {prefix ? (
        <Text style={[styles.staticChar, { fontSize, lineHeight: rowHeight }, textStyle]}>
          {prefix}
        </Text>
      ) : null}

      {chars.map((char, index) => {
        const parsed = parseInt(char, 10);
        if (isNaN(parsed)) {
          return (
            <Text
              key={`sep-${index}`}
              style={[styles.staticChar, { fontSize, lineHeight: rowHeight }, textStyle]}
            >
              {char}
            </Text>
          );
        }
        return (
          <SingleDigitTicker
            key={`dig-${index}-${chars.length}`}
            digit={parsed}
            height={rowHeight}
            textStyle={[{ fontSize, lineHeight: rowHeight }, textStyle]}
          />
        );
      })}

      {suffix ? (
        <Text style={[styles.staticChar, { fontSize, lineHeight: rowHeight }, textStyle]}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  staticChar: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
