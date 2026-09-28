import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { Sparkles, Pencil } from 'lucide-react-native';
import { colors, borderRadius, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAppStore } from '../../store/useAppStore';
import { PixelSculptImage, PixelSculptImageRef } from './PixelSculptImage';

export interface ReflectiveCardProps {
  username?: string;
  avatarUri?: string;
  onEditPhoto?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ReflectiveCard: React.FC<ReflectiveCardProps> = ({
  username = 'User',
  avatarUri,
  onEditPhoto,
  style,
}) => {
  const isReducedMotion = useReducedMotion();
  const { user } = useAppStore();
  const effectiveAvatar = avatarUri || user?.avatarUri;

  const pixelSculptRef = useRef<PixelSculptImageRef>(null);

  // 3D Perspective Tilt Values
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Reflection Sheen Sweep Animation
  const sweepProgress = useSharedValue(-1);

  useEffect(() => {
    if (!isReducedMotion) {
      sweepProgress.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 3200, easing: Easing.inOut(Easing.cubic) }),
          withTiming(-1, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [isReducedMotion]);

  // Touch handlers for 3D perspective tilt & interactive pixel sculpt ripples
  const handleTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const cardWidth = 330;
    const cardHeight = 380;

    const normX = (locationX / cardWidth) * 2 - 1;
    const normY = (locationY / cardHeight) * 2 - 1;

    if (!isReducedMotion) {
      tiltX.value = withSpring(-normY * 8, { stiffness: 220, damping: 20 });
      tiltY.value = withSpring(normX * 8, { stiffness: 220, damping: 20 });
      scale.value = withSpring(1.02, { stiffness: 220, damping: 20 });
    }

    // Ripple wave into pixel sculpt tiles
    const u = Math.max(0, Math.min(1, locationX / cardWidth));
    const v = Math.max(0, Math.min(1, 1.0 - locationY / cardHeight));
    pixelSculptRef.current?.triggerRipple(u, v, 1.0);
    pixelSculptRef.current?.setTilt(normX * 0.25, -normY * 0.25);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const cardWidth = 330;
    const cardHeight = 380;

    const normX = (locationX / cardWidth) * 2 - 1;
    const normY = (locationY / cardHeight) * 2 - 1;

    if (!isReducedMotion) {
      tiltX.value = withSpring(-normY * 8, { stiffness: 220, damping: 20 });
      tiltY.value = withSpring(normX * 8, { stiffness: 220, damping: 20 });
      scale.value = withSpring(1.02, { stiffness: 220, damping: 20 });
    }

    // Interactive ripple wave follows dragging finger
    const u = Math.max(0, Math.min(1, locationX / cardWidth));
    const v = Math.max(0, Math.min(1, 1.0 - locationY / cardHeight));
    pixelSculptRef.current?.triggerRipple(u, v, 1.0);
    pixelSculptRef.current?.setTilt(normX * 0.25, -normY * 0.25);
  };

  const handleTouchEnd = () => {
    if (!isReducedMotion) {
      tiltX.value = withSpring(0, { stiffness: 220, damping: 20 });
      tiltY.value = withSpring(0, { stiffness: 220, damping: 20 });
      scale.value = withSpring(1, { stiffness: 220, damping: 20 });
    }

    pixelSculptRef.current?.releaseRipple();
    pixelSculptRef.current?.setTilt(0, 0);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { scale: scale.value },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
    ],
  }));

  const animatedSweepStyle = useAnimatedStyle(() => {
    const translateX = interpolate(sweepProgress.value, [-1, 1.6], [-240, 420]);
    return {
      transform: [{ translateX }, { rotate: '25deg' }],
      opacity: sweepProgress.value > -0.9 && sweepProgress.value < 1.5 ? 0.4 : 0,
    };
  });

  return (
    <Animated.View
      style={[styles.outerContainer, animatedCardStyle, style]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 1px Metallic Gradient Border */}
      <View style={styles.metallicBorder}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="cardMetallicBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="30%" stopColor="#5E6AD2" stopOpacity="0.5" />
              <Stop offset="60%" stopColor="#2A2A2A" stopOpacity="0.8" />
              <Stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#191919" stopOpacity="0.95" />
            </SvgLinearGradient>
          </Defs>
          <Rect
            x="0.75"
            y="0.75"
            width="99%"
            height="99%"
            rx={15}
            ry={15}
            stroke="url(#cardMetallicBorder)"
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>

        {/* Card Main Body */}
        <View style={styles.cardBody}>
          {/* Base Background: GPU-based 3D Pixel Sculpt relief tiles */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <PixelSculptImage
              ref={pixelSculptRef}
              source={effectiveAvatar || ''}
              width={330}
              height={380}
              tileResolution={40}
              depthScale={0.35}
              ambientLight={0.45}
              diffuseLight={0.75}
              interactive={false}
            />
            {/* Dark metallic iridescent cyber tint overlay */}
            <View style={[StyleSheet.absoluteFill, styles.pixelSculptTint]} />
          </View>

          {/* Gliding Specular Reflection Sheen Beam */}
          <Animated.View pointerEvents="none" style={[styles.reflectionSweep, animatedSweepStyle]}>
            <Svg width="120" height="500" viewBox="0 0 120 500">
              <Defs>
                <SvgLinearGradient id="shimmerBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Rect width="120" height="500" fill="url(#shimmerBeam)" />
            </Svg>
          </Animated.View>

          {/* Subtle Frosted Inner Rim */}
          <View pointerEvents="none" style={styles.frostedRim} />

          {/* Card Content Overlay */}
          <View style={styles.contentContainer}>
            {/* Top Row: App Name 'MOB' on top left, Edit Photo Pencil on top right */}
            <View style={styles.topRow}>
              <View style={styles.appNameBox}>
                <Text style={styles.appName}>MOB</Text>
              </View>
              {onEditPhoto ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onEditPhoto}
                  style={styles.editPhotoBadge}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Pencil size={15} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.sparkleBadge}>
                  <Sparkles size={16} color="rgba(255, 255, 255, 0.75)" />
                </View>
              )}
            </View>

            {/* Bottom Row: User's Name below */}
            <View style={styles.bottomSection}>
              <Text style={styles.nameLabel}>USER</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {username}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    maxWidth: 330,
    height: 380,
    borderRadius: borderRadius.default, // 15px
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  metallicBorder: {
    flex: 1,
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    padding: 1.5,
    backgroundColor: '#111216',
  },
  cardBody: {
    flex: 1,
    borderRadius: borderRadius.default - 1,
    overflow: 'hidden',
    backgroundColor: colors.surfaceBase,
    position: 'relative',
  },
  pixelSculptTint: {
    backgroundColor: 'rgba(6, 7, 12, 0.22)',
  },
  frostedRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  reflectionSweep: {
    position: 'absolute',
    top: -80,
    left: 0,
    width: 120,
    height: 500,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNameBox: {
    paddingHorizontal: 0,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.5,
  },
  sparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  editPhotoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  bottomSection: {
    marginTop: 'auto',
  },
  nameLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default ReflectiveCard;
