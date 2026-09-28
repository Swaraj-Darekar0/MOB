import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Text, TextStyle, StyleProp, View, StyleSheet, Platform } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors } from '../../theme';

export interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  animateOn?: 'mount' | 'manual';
  isTriggered?: boolean;
  onAnimationComplete?: () => void;
  style?: StyleProp<TextStyle>;
  encryptedStyle?: StyleProp<TextStyle>;
  revealedStyle?: StyleProp<TextStyle>;
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 40,
  maxIterations = 12,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = DEFAULT_CHARS,
  animateOn = 'mount',
  isTriggered = true,
  onAnimationComplete,
  style,
  encryptedStyle,
  revealedStyle,
}) => {
  const isReducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState<string>(text);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableChars = useMemo<string[]>(() => {
    if (useOriginalCharsOnly) {
      return Array.from(new Set(text.split(''))).filter((char) => char !== ' ');
    }
    return characters.split('');
  }, [useOriginalCharsOnly, text, characters]);

  const shuffleText = useCallback(
    (originalText: string, currentRevealed: Set<number>) => {
      return originalText
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (currentRevealed.has(i)) return originalText[i];
          return availableChars[Math.floor(Math.random() * availableChars.length)] || '*';
        })
        .join('');
    },
    [availableChars]
  );

  const computeOrder = useCallback(
    (len: number): number[] => {
      const order: number[] = [];
      if (len <= 0) return order;

      if (revealDirection === 'start') {
        for (let i = 0; i < len; i++) order.push(i);
        return order;
      }
      if (revealDirection === 'end') {
        for (let i = len - 1; i >= 0; i--) order.push(i);
        return order;
      }
      // center reveal
      const middle = Math.floor(len / 2);
      let offset = 0;
      while (order.length < len) {
        if (offset % 2 === 0) {
          const idx = middle + offset / 2;
          if (idx >= 0 && idx < len) order.push(idx);
        } else {
          const idx = middle - Math.ceil(offset / 2);
          if (idx >= 0 && idx < len) order.push(idx);
        }
        offset++;
      }
      return order.slice(0, len);
    },
    [revealDirection]
  );

  useEffect(() => {
    if (isReducedMotion) {
      setDisplayText(text);
      setIsFinished(true);
      onAnimationComplete?.();
      return;
    }

    if (animateOn === 'manual' && !isTriggered) {
      setDisplayText(text);
      return;
    }

    const order = computeOrder(text.length);
    let stepCount = 0;
    const currentRevealed = new Set<number>();
    let currentIteration = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (sequential) {
        if (stepCount < order.length) {
          currentRevealed.add(order[stepCount]);
          stepCount++;
          setRevealedIndices(new Set(currentRevealed));
          setDisplayText(shuffleText(text, currentRevealed));
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text);
          setIsFinished(true);
          onAnimationComplete?.();
        }
      } else {
        currentIteration++;
        setDisplayText(shuffleText(text, currentRevealed));
        if (currentIteration >= maxIterations) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text);
          setIsFinished(true);
          onAnimationComplete?.();
        }
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    text,
    speed,
    maxIterations,
    sequential,
    revealDirection,
    shuffleText,
    computeOrder,
    animateOn,
    isTriggered,
    isReducedMotion,
  ]);

  return (
    <Text style={[styles.baseText, style]}>
      {displayText.split('').map((char, index) => {
        const isRevealed = isFinished || revealedIndices.has(index);
        return (
          <Text
            key={`${index}-${char}`}
            style={[
              styles.glyph,
              isRevealed
                ? [styles.revealedGlyph, revealedStyle]
                : [styles.encryptedGlyph, encryptedStyle],
            ]}
          >
            {char}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  baseText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  glyph: {
    fontVariant: ['tabular-nums'],
  },
  revealedGlyph: {
    color: colors.textPrimary,
  },
  encryptedGlyph: {
    color: colors.accent,
    opacity: 0.75,
  },
});
