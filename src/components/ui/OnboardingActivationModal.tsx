import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, spacing } from '../../theme';
import { DecryptedText } from './DecryptedText';
import { GeometricPreloader } from './GeometricPreloader';

export interface OnboardingActivationModalProps {
  visible: boolean;
  username: string;
  onSequenceComplete: () => void;
}

export const OnboardingActivationModal: React.FC<OnboardingActivationModalProps> = ({
  visible,
  username,
  onSequenceComplete,
}) => {
  const [decryptionComplete, setDecryptionComplete] = useState(false);

  const handleDecryptionFinished = () => {
    setDecryptionComplete(true);
    // Let preloader morphing shape execute smoothly for 2200ms before navigating
    setTimeout(() => {
      onSequenceComplete();
    }, 2200);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.content}>
          {/* Top Welcome Title with Decrypted Username */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingPrefix}>Hola </Text>
            <Text style={styles.greetingQuote}>"</Text>
            <DecryptedText
              text={username}
              speed={45}
              sequential={true}
              revealDirection="center"
              characters="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_#@$"
              style={styles.decryptedUsername}
              encryptedStyle={styles.encryptedUsername}
              onAnimationComplete={handleDecryptionFinished}
            />
            <Text style={styles.greetingQuote}>"</Text>
          </View>

          <Text style={styles.subtext}>
            {decryptionComplete
              ? 'Synchronizing local ledger partitions & encryption keys...'
              : 'Verifying cryptographic identifier...'}
          </Text>

          {/* Geometric Preloader (Morphing Square -> Diamond -> Circle) */}
          <View style={styles.preloaderBox}>
            <GeometricPreloader
              size={64}
              theme="monochrome"
              label=""
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 6, 6, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  greetingPrefix: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  greetingQuote: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  decryptedUsername: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  encryptedUsername: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
  },
  subtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
    maxWidth: 280,
    lineHeight: 20,
  },
  preloaderBox: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
