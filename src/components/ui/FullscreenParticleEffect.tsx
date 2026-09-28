import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface FullscreenParticleEffectProps {
  active?: boolean;
  count?: number;
  originYRatio?: number; // 0.28 = near the status checkmark
}

const PARTICLE_COLORS = [
  '#5E6AD2', // Electric Indigo
  '#727DE0', // Soft Lavender
  '#1DB954', // Emerald Glow
  '#FFFFFF', // Sparkle White
  '#F59E0B', // Amber Star
  '#38BDF8', // Cyan Dust
  '#E0E7FF', // Bright Glint
];

interface ParticleData {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  delayMs: number;
  durationMs: number;
}

const SingleParticle: React.FC<{
  particle: ParticleData;
  isReduced: boolean;
}> = React.memo(({ particle, isReduced }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isReduced) return;

    progress.value = withDelay(
      particle.delayMs,
      withTiming(1, {
        duration: particle.durationMs,
        easing: Easing.out(Easing.cubic),
      })
    );

    opacity.value = withDelay(
      particle.delayMs,
      withSequence(
        withTiming(1, { duration: particle.durationMs * 0.25, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: particle.durationMs * 0.75, easing: Easing.in(Easing.quad) })
      )
    );
  }, [particle, isReduced]);

  const animatedStyle = useAnimatedStyle(() => {
    const curX = particle.startX + (particle.targetX - particle.startX) * progress.value;
    const curY = particle.startY + (particle.targetY - particle.startY) * progress.value;
    const scale = 0.4 + (1 - Math.abs(progress.value - 0.5) * 2) * 0.8;

    return {
      position: 'absolute',
      left: curX,
      top: curY,
      width: particle.size,
      height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      opacity: opacity.value,
      transform: [{ scale }],
    };
  });

  if (isReduced) return null;

  return <Animated.View pointerEvents="none" style={animatedStyle} />;
});

export const FullscreenParticleEffect: React.FC<FullscreenParticleEffectProps> = ({
  active = true,
  count = 280,
  originYRatio = 0.26,
}) => {
  const isReduced = useReducedMotion();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const particles: ParticleData[] = useMemo(() => {
    const originX = screenWidth / 2;
    const originY = screenHeight * originYRatio;
    const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight) * 0.65;

    const list: ParticleData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Exponential distribution for more particles near the center with trails reaching edges
      const distRatio = Math.pow(Math.random(), 0.65);
      const distance = 40 + distRatio * (maxRadius - 40);

      const targetX = originX + Math.cos(angle) * distance;
      const targetY = originY + Math.sin(angle) * distance;

      // Small particle sizes: between 1.8px and 4.2px
      const size = 1.8 + Math.random() * 2.4;
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      const delayMs = Math.floor(Math.random() * 380);
      const durationMs = 650 + Math.floor(Math.random() * 850);

      list.push({
        id: i,
        startX: originX + (Math.random() - 0.5) * 20,
        startY: originY + (Math.random() - 0.5) * 20,
        targetX,
        targetY,
        size,
        color,
        delayMs,
        durationMs,
      });
    }
    return list;
  }, [screenWidth, screenHeight, count, originYRatio]);

  if (!active || isReduced) return null;

  return (
    <View style={styles.fullscreenOverlay} pointerEvents="none">
      {particles.map((p) => (
        <SingleParticle key={p.id} particle={p} isReduced={isReduced} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 99,
  },
});

export default FullscreenParticleEffect;
