import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { borderRadius, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface CreditCardProps {
  username?: string;
  trackedBalance: number;
  allocatedBalance?: number;
  unallocatedBalance?: number;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  network?: 'mob' | 'mastercard' | 'rupay' | 'visa';
  style?: StyleProp<ViewStyle>;
  onFlipChange?: (isFlipped: boolean) => void;
  topLabel?: string;
  topLabelAlign?: 'left' | 'center' | 'right';
}

export const CreditCard: React.FC<CreditCardProps> = ({
  username = 'JOHN DOE',
  trackedBalance = 0,
  cardNumber = '1234  5678  9012  3456',
  expiryDate = '∞',
  style,
  onFlipChange,
  topLabel = 'TAP FOR BALANCE',
  topLabelAlign = 'right',
}) => {
  const isReducedMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = useState(false);
  const flipProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    onFlipChange?.(nextFlipped);

    if (isReducedMotion) {
      flipProgress.value = nextFlipped ? 1 : 0;
    } else {
      flipProgress.value = withSpring(nextFlipped ? 1 : 0, {
        stiffness: 140,
        damping: 18,
        mass: 0.8,
      });
    }
  };

  const handlePressIn = () => {
    if (!isReducedMotion) {
      scale.value = withTiming(0.98, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  const handlePressOut = () => {
    if (!isReducedMotion) {
      scale.value = withTiming(1, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  // 3D Perspective Rotation for Front Face
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipProgress.value,
      [0, 1],
      [0, 180],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { perspective: 1200 },
        { scale: scale.value },
        { rotateY: `${rotateY}deg` },
      ],
      // Hard cutoff at 90 deg prevents Android & iOS text bleeding / ghosting
      opacity: flipProgress.value <= 0.5 ? 1 : 0,
      zIndex: flipProgress.value <= 0.5 ? 2 : 0,
    };
  });

  // 3D Perspective Rotation for Back Face
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipProgress.value,
      [0, 1],
      [180, 360],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { perspective: 1200 },
        { scale: scale.value },
        { rotateY: `${rotateY}deg` },
      ],
      opacity: flipProgress.value > 0.5 ? 1 : 0,
      zIndex: flipProgress.value > 0.5 ? 2 : 0,
    };
  });

  // Format 16-digit unmasked number in 4 distinct blocks without bullet masking
  const formattedCardNumber = React.useMemo(() => {
    if (!cardNumber || cardNumber.includes('•')) {
      return '1234  5678  9012  3456';
    }
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.length === 16) {
      return `${clean.slice(0, 4)}  ${clean.slice(4, 8)}  ${clean.slice(8, 12)}  ${clean.slice(12, 16)}`;
    }
    return cardNumber;
  }, [cardNumber]);

  const displayName = (username && username.trim() !== '' ? username : 'JOHN DOE').toUpperCase();
  const safeBalance = typeof trackedBalance === 'number' && !isNaN(trackedBalance) ? trackedBalance : 0;
  const displayExpiry = expiryDate && expiryDate !== '09/29' ? expiryDate : '∞';

  return (
    <Pressable
      onPress={handleFlip}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Credit card. Tap to ${isFlipped ? 'hide' : 'reveal'} balance.`}
      style={[styles.container, style]}
    >
      {/* ================= FRONT FACE ================= */}
      <Animated.View style={[styles.card, styles.frontCard, frontAnimatedStyle]}>
        {/* Soft Matte Off-white / Silver Surface Gradient */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="cardFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#F5F5F7" stopOpacity="1" />
              <Stop offset="45%" stopColor="#ECECEF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#DCDCE0" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={borderRadius.default} ry={borderRadius.default} fill="url(#cardFrontGrad)" />
        </Svg>

        {/* Frosted / Subtle Rim */}
        <View pointerEvents="none" style={styles.frostedRim} />

        {/* Top Row: Reframed Action Hint Label */}
        {topLabel ? (
          <View
            style={[
              styles.topRow,
              {
                justifyContent:
                  topLabelAlign === 'left'
                    ? 'flex-start'
                    : topLabelAlign === 'center'
                    ? 'center'
                    : 'flex-end',
              },
            ]}
          >
            <Text style={styles.topLabelText}>{topLabel}</Text>
          </View>
        ) : (
          <View style={styles.topSpace} />
        )}

        {/* Center: Full 16-digit unmasked Card Number with backdrop shadow */}
        <View style={styles.cardNumberContainer}>
          <Text style={styles.cardNumberText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formattedCardNumber}
          </Text>
        </View>

        {/* Bottom Row: Cardholder Name & Infinity Expiry */}
        <View style={styles.bottomRow}>
          <View style={styles.holderCol}>
            <Text style={styles.labelMicro}>CARDHOLDER</Text>
            <Text style={styles.holderName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <View style={styles.expiryCol}>
            <Text style={styles.labelMicro}>EXPIRES</Text>
            <Text style={styles.expirySymbol}>{displayExpiry}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ================= BACK FACE ================= */}
      <Animated.View style={[styles.card, styles.backCard, backAnimatedStyle]}>
        {/* Soft Matte Off-white / Silver Surface Gradient */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="cardBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#F5F5F7" stopOpacity="1" />
              <Stop offset="45%" stopColor="#ECECEF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#DCDCE0" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={borderRadius.default} ry={borderRadius.default} fill="url(#cardBackGrad)" />
        </Svg>

        <View pointerEvents="none" style={styles.frostedRim} />

        {/* Pure & Centered Total Available Balance */}
        <View style={styles.backCenterContainer}>
          <Text style={styles.backBalanceLabel}>TOTAL BALANCE AVAILABLE</Text>
          <Text style={styles.backBalanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            ₹{safeBalance.toLocaleString('en-IN')}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.586, // ISO/IEC 7810 ID-1 standard ratio
    maxHeight: 220,
    marginVertical: spacing.md,
    borderRadius: borderRadius.default,
  },
  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    backgroundColor: '#EBEBEF',
    backfaceVisibility: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
  frontCard: {
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  backCard: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  frostedRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    minHeight: 14,
  },
  topLabelText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#71717A',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  topSpace: {
    height: 12,
  },
  cardNumberContainer: {
    zIndex: 2,
    marginTop: 8,
  },
  cardNumberText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 2.2,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  holderCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  expiryCol: {
    alignItems: 'flex-start',
  },
  labelMicro: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717A',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  holderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  expirySymbol: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 21,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  backCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backBalanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  backBalanceValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111111',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default CreditCard;
