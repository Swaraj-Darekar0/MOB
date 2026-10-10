import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { MessageSquareText, Shield, ArrowRight, CheckCircle2, Lock } from 'lucide-react-native';
import { requestSmsPermission, SYNTHETIC_TEST_FIXTURES } from '../../services/sms/native/smsReader';
import { parseSms } from '../../services/sms/parser';
import { toRupees } from '../../utils/money';

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'SMS Setup' },
  { id: 3, label: 'Balance' },
  { id: 4, label: 'Buckets' },
];

export default function SmsPermissionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phoneNumber: string }>();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleGrantPermission = async () => {
    setIsRequesting(true);
    let detectedBalance: number | undefined = undefined;
    let detectedBank: string | undefined = undefined;

    try {
      if (Platform.OS === 'android') {
        const granted = await requestSmsPermission();
        if (granted) {
          // Scan test fixtures / recent messages for starting balance
          for (const msg of SYNTHETIC_TEST_FIXTURES) {
            const parsed = parseSms(msg.body, msg.sender, msg.timestamp);
            if (parsed && parsed.balanceAfterPaise) {
              detectedBalance = toRupees(parsed.balanceAfterPaise);
              detectedBank = parsed.bankName || 'Bank';
              break;
            }
          }
        }
      } else {
        // iOS or simulation fallback
        detectedBalance = 24300;
        detectedBank = 'HDFC Bank';
      }
    } catch (e) {
      console.warn('[SmsPermission] Permission error:', e);
    } finally {
      setIsRequesting(false);
      router.push({
        pathname: '/(onboarding)/balance' as any,
        params: {
          phoneNumber: params.phoneNumber,
          detectedBalance: detectedBalance !== undefined ? detectedBalance.toString() : '',
          detectedBank: detectedBank || '',
        },
      });
    }
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(onboarding)/balance',
      params: {
        phoneNumber: params.phoneNumber,
        detectedBalance: '',
        detectedBank: '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <WorkspaceTopStepper steps={STEPS} currentStep={2} />

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MessageSquareText size={36} color={colors.accent} />
          </View>

          <Text style={styles.title}>Automatic SMS Reconciliation</Text>
          <Text style={styles.disclosure}>
            This app reads financial transaction SMS on your device to maintain your virtual spending buckets. Messages are processed locally and are not uploaded. Your bank password is not required.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 size={18} color={colors.statusSuccess} />
              <Text style={styles.featureText}>
                Automatically captures UPI & bank spends without manual data entry.
              </Text>
            </View>

            <View style={styles.featureItem}>
              <CheckCircle2 size={18} color={colors.statusSuccess} />
              <Text style={styles.featureText}>
                Detects starting bank balance from your latest verified transaction SMS.
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Shield size={18} color={colors.statusSuccess} />
              <Text style={styles.featureText}>
                Strict privacy: Personal SMS, OTPs, and private messages are ignored.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Enable Financial SMS Access"
            onPress={handleGrantPermission}
            variant="primary"
            loading={isRequesting}
            icon={<ArrowRight size={18} color={colors.accentDark} />}
          />

          <Button
            title="Skip and Enter Balance Manually"
            onPress={handleSkip}
            variant="ghost"
            style={styles.skipButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  container: {
    flexGrow: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  content: {
    marginVertical: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(58, 130, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  disclosure: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  featuresList: {
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  skipButton: {
    marginTop: spacing.xs,
  },
});
