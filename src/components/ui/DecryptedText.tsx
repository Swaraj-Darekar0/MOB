import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Text, TextStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors } from '../../theme';

export interface DecryptedTextProps {
  /** Target text to decrypt into (e.g. "₹24,300.00") */
  text: string;
  /** Scramble interval in milliseconds (default: 35ms) */
  speed?: number;
  /** Number of scramble iterations per character before locking (default: 8) */
  maxIterations?: number;
  /** Whether to scramble and reveal characters sequentially (default: true) */
  sequential?: boolean;
  /** Direction to reveal characters from ('start' | 'end' | 'center', default: 'start') */
  revealDirection?: 'start' | 'end' | 'center';
  /** If true, only shuffles characters present in target text (default: false) */
  useOriginalCharsOnly?: boolean;
  /** Glyphs pool used for scrambling */
  characters?: string;
  /** When to trigger animation ('mount' | 'manual', default: 'mount') */
  animateOn?: 'mount' | 'manual';
  /** Whether animation is triggered when animateOn='manual' (default: true) */
  isTriggered?: boolean;
  /** Callback fired when decryption resolves all characters */
  onDecryptionComplete?: () => void;
  /** Callback alias for backward compatibility */
  onAnimationComplete?: () => void;
  /** Text style for the root container */
  style?: StyleProp<TextStyle>;
  /** Web class name placeholder for react-bits parity */
  encryptedClassName?: string;
  /** Style applied to encrypted/scrambling characters (e.g. accent glow) */
  encryptedStyle?: StyleProp<TextStyle>;
  /** Style applied to resolved/decrypted characters */
  revealedStyle?: StyleProp<TextStyle>;
}

const DEFAULT_CHARACTERS = '!@#$%^&*0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 35,
  maxIterations = 8,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = DEFAULT_CHARACTERS,
  animateOn = 'mount',
  isTriggered = true,
  onDecryptionComplete,
  onAnimationComplete,
  style,
  encryptedClassName,
  encryptedStyle,
  revealedStyle,
}) => {
  const isReducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState<string>(text);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDecryptionCompleteRef = useRef(onDecryptionComplete);
  onDecryptionCompleteRef.current = onDecryptionComplete;
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  // Available characters pool
  const availableChars = useMemo<string[]>(() => {
    if (useOriginalCharsOnly) {
      const unique = Array.from(new Set(text.split(''))).filter((char) => char !== ' ');
      return unique.length > 0 ? unique : DEFAULT_CHARACTERS.split('');
    }
    return characters.length > 0 ? characters.split('') : DEFAULT_CHARACTERS.split('');
  }, [useOriginalCharsOnly, text, characters]);

  // Compute sequence of indices to reveal
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

      // 'center' reveal: start in the middle and radiate outwards
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

  // Scramble text with random glyphs for unrevealed slots
  const generateScrambled = useCallback(
    (originalText: string, currentRevealed: Set<number>) => {
      const len = originalText.length;
      let result = '';
      for (let i = 0; i < len; i++) {
        const char = originalText[i];
        if (char === ' ') {
          result += ' ';
        } else if (currentRevealed.has(i)) {
          result += char;
        } else {
          const randomChar =
            availableChars[Math.floor(Math.random() * availableChars.length)] || '*';
          result += randomChar;
        }
      }
      return result;
    },
    [availableChars]
  );

  useEffect(() => {
    // If reduced motion is preferred or text is empty, reveal instantly
    if (isReducedMotion || !text) {
      setDisplayText(text);
      setIsFinished(true);
      setRevealedIndices(new Set(Array.from({ length: text.length }, (_, i) => i)));
      onDecryptionCompleteRef.current?.();
      onAnimationCompleteRef.current?.();
      return;
    }

    // Manual trigger check
    if (animateOn === 'manual' && !isTriggered) {
      setDisplayText(text);
      setIsFinished(true);
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const order = computeOrder(text.length);
    const activeRevealed = new Set<number>();
    let currentStep = 0;
    let stepIteration = 0;
    let globalIteration = 0;

    // Immediately scramble initial frame
    setIsFinished(false);
    setRevealedIndices(new Set());
    setDisplayText(generateScrambled(text, activeRevealed));

    intervalRef.current = setInterval(() => {
      if (sequential) {
        stepIteration++;

        // Lock current character when iterations per character reached
        if (stepIteration >= Math.max(1, maxIterations)) {
          if (currentStep < order.length) {
            activeRevealed.add(order[currentStep]);
            currentStep++;
            stepIteration = 0;

            // Automatically resolve adjacent spaces without waiting
            while (currentStep < order.length && text[order[currentStep]] === ' ') {
              activeRevealed.add(order[currentStep]);
              currentStep++;
            }
          }
        }

        const newScrambled = generateScrambled(text, activeRevealed);
        setRevealedIndices(new Set(activeRevealed));
        setDisplayText(newScrambled);

        // Completion condition
        if (currentStep >= order.length || activeRevealed.size >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text);
          setIsFinished(true);
          setRevealedIndices(new Set(Array.from({ length: text.length }, (_, i) => i)));
          onDecryptionCompleteRef.current?.();
          onAnimationCompleteRef.current?.();
        }
      } else {
        // Non-sequential scramble
        globalIteration++;
        const newScrambled = generateScrambled(text, activeRevealed);
        setDisplayText(newScrambled);

        if (globalIteration >= Math.max(1, maxIterations)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text);
          setIsFinished(true);
          setRevealedIndices(new Set(Array.from({ length: text.length }, (_, i) => i)));
          onDecryptionCompleteRef.current?.();
          onAnimationCompleteRef.current?.();
        }
      }
    }, Math.max(10, speed));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    text,
    speed,
    maxIterations,
    sequential,
    computeOrder,
    generateScrambled,
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
            key={index}
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
    opacity: 0.85,
  },
});
