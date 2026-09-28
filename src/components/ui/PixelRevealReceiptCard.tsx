import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PixelRevealReceiptCardProps {
  children: React.ReactNode;
  gridCols?: number;
  gridRows?: number;
  speedMs?: number;
  colorsList?: string[];
  style?: StyleProp<ViewStyle>;
  onRevealComplete?: () => void;
}

const DEFAULT_PIXEL_COLORS = [
  '#5E6AD2', // Accent
  '#727DE0', // Accent Light
  '#1DB954', // Success Emerald
  '#FFFFFF', // Bright Highlight
  '#2A2A2A', // Subtle Highlight
];

// Individual high-performance animated pixel unit
const PixelCell: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  delayMs: number;
  durationMs: number;
  isReduced: boolean;
}> = React.memo(({ x, y, size, color, delayMs, durationMs, isReduced }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (isReduced) {
      opacity.value = 0;
      scale.value = 0;
      return;
    }

    opacity.value = withDelay(
      delayMs,
      withSequence(
        withTiming(0.9, { duration: durationMs * 0.4, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: durationMs * 0.6, easing: Easing.in(Easing.quad) })
      )
    );

    scale.value = withDelay(
      delayMs,
      withSequence(
        withTiming(1.1, { duration: durationMs * 0.4, easing: Easing.out(Easing.quad) }),
        withTiming(0.1, { duration: durationMs * 0.6, easing: Easing.in(Easing.quad) })
      )
    );
  }, [delayMs, durationMs, isReduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pixel,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
});

export const PixelRevealReceiptCard: React.FC<PixelRevealReceiptCardProps> = ({
  children,
  gridCols = 10,
  gridRows = 12,
  speedMs = 380,
  colorsList = DEFAULT_PIXEL_COLORS,
  style,
  onRevealComplete,
}) => {
  const isReducedMotion = useReducedMotion();
  const [layout, setLayout] = React.useState<{ width: number; height: number } | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(8);

  const pixels = useMemo(() => {
    if (!layout || isReducedMotion) return [];

    const { width, height } = layout;
    const cellW = width / gridCols;
    const cellH = height / gridRows;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const items: Array<{
      id: string;
      x: number;
      y: number;
      size: number;
      color: string;
      delay: number;
    }> = [];

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const x = c * cellW;
        const y = r * cellH;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        // Normalized radial stagger + random cyber jitter
        const normalizedDist = dist / maxDist;
        const jitter = Math.random() * 60;
        const delay = normalizedDist * (speedMs * 0.6) + jitter;
        const color = colorsList[Math.floor(Math.random() * colorsList.length)];

        items.push({
          id: `px-${r}-${c}`,
          x,
          y,
          size: Math.min(cellW, cellH) * 0.92,
          color,
          delay,
        });
      }
    }
    return items;
  }, [layout, gridCols, gridRows, speedMs, colorsList, isReducedMotion]);

  useEffect(() => {
    if (!layout) return;

    if (isReducedMotion) {
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
      onRevealComplete?.();
      return;
    }

    // Trigger card content reveal right as the pixel cascade clears
    const revealDelay = speedMs * 0.65;
    contentOpacity.value = withDelay(
      revealDelay,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) })
    );
    contentTranslateY.value = withDelay(
      revealDelay,
      withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) })
    );

    const timer = setTimeout(() => {
      onRevealComplete?.();
    }, speedMs + 100);

    return () => clearTimeout(timer);
  }, [layout, speedMs, isReducedMotion]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
      style={[styles.cardContainer, style]}
    >
      {/* Underlying Transaction Content */}
      <Animated.View style={[styles.contentWrapper, animatedContentStyle]}>
        {children}
      </Animated.View>

      {/* Overlay Pixel Grid Canvas */}
      {layout && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {pixels.map((p) => (
            <PixelCell
              key={p.id}
              x={p.x}
              y={p.y}
              size={p.size}
              color={p.color}
              delayMs={p.delay}
              durationMs={180}
              isReduced={isReducedMotion}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surfaceRaised, // #1D1D1D
    borderRadius: borderRadius.default, // 15px per dark_ui.md
    borderWidth: 1,
    borderColor: colors.borderDefault, // #191919
    overflow: 'hidden',
    position: 'relative',
  },
  contentWrapper: {
    width: '100%',
  },
  pixel: {
    position: 'absolute',
    borderRadius: 2,
  },
});
