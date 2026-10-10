import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { IndianRupee, ArrowRight, ArrowLeft, Sparkles, Check, Edit3 } from 'lucide-react-native';

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'SMS Setup' },
  { id: 3, label: 'Balance' },
  { id: 4, label: 'Buckets' },
];

export default function BalanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phoneNumber?: string;
    detectedBalance?: string;
    detectedBank?: string;
    username?: string;
    avatarUri?: string;
  }>();

  const [balanceStr, setBalanceStr] = useState(params.detectedBalance || '');
  const [balanceSource, setBalanceSource] = useState<'SMS_REPORTED' | 'MANUAL_INITIAL_BALANCE'>(
    params.detectedBalance ? 'SMS_REPORTED' : 'MANUAL_INITIAL_BALANCE'
  );
  const [isEditingDetected, setIsEditingDetected] = useState(!params.detectedBalance);
  const [error, setError] = useState('');

  const detectedNum = params.detectedBalance ? parseFloat(params.detectedBalance) : 0;

  const handleUseDetected = () => {
    setBalanceStr(detectedNum.toString());
    setBalanceSource('SMS_REPORTED');
    setIsEditingDetected(false);
    setError('');
  };

  const handleContinue = () => {
    const cleanAmount = balanceStr.replace(/,/g, '').trim();
    const amount = parseFloat(cleanAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid starting balance (greater than ₹0)');
      return;
    }

    setError('');
    router.push({
      pathname: '/(onboarding)/allocation',
      params: {
        phoneNumber: params.phoneNumber,
        username: params.username || 'User',
        startingBalance: amount.toString(),
        balanceSource,
        avatarUri: params.avatarUri,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <WorkspaceTopStepper steps={STEPS} currentStep={3} />

          <View style={styles.header}>
            <Text style={styles.title}>Starting Bank Balance</Text>
            <Text style={styles.subtitle}>
              Set the total bank balance you wish to track. The app will distribute this across your virtual buckets.
            </Text>
          </View>

          {/* Detected SMS Balance Card */}
          {params.detectedBalance && detectedNum > 0 && !isEditingDetected && (
            <View style={styles.detectedCard}>
              <View style={styles.detectedHeader}>
                <Sparkles size={16} color={colors.accent} />
                <Text style={styles.detectedTag}>
                  Latest SMS Detected ({params.detectedBank || 'Bank'})
                </Text>
              </View>

              <Text style={styles.detectedAmount}>
                ₹{detectedNum.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.detectedSubtext}>
                Reported balance from your latest verified transaction SMS. Never called a live bank balance.
              </Text>

              <View style={styles.detectedActions}>
                <TouchableOpacity
                  style={styles.detectedUseBtn}
                  onPress={handleContinue}
                >
                  <Check size={16} color={colors.textPrimary} />
                  <Text style={styles.detectedUseBtnText}>Use as Starting Balance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detectedEditBtn}
                  onPress={() => {
                    setIsEditingDetected(true);
                    setBalanceSource('MANUAL_INITIAL_BALANCE');
                  }}
                >
                  <Edit3 size={14} color={colors.textSecondary} />
                  <Text style={styles.detectedEditBtnText}>Edit Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Manual Entry Form */}
          {(isEditingDetected || !params.detectedBalance) && (
            <View style={styles.form}>
              <Input
                label="Tracked Balance (₹)"
                placeholder="e.g. 40,000"
                keyboardType="numeric"
                value={balanceStr}
                onChangeText={(text) => {
                  setBalanceStr(text);
                  setBalanceSource('MANUAL_INITIAL_BALANCE');
                  if (error) setError('');
                }}
                error={error}
                leftIcon={<IndianRupee size={20} color={colors.accent} />}
              />

              {params.detectedBalance && (
                <TouchableOpacity
                  style={styles.revertBtn}
                  onPress={handleUseDetected}
                >
                  <Text style={styles.revertBtnText}>
                    ← Switch back to detected ₹{detectedNum.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Your bank balance remains safely in your bank account. Virtual envelopes only manage how you allocate and budget your spending on-device.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Button
              title="Back"
              onPress={() => router.back()}
              variant="secondary"
              icon={<ArrowLeft size={18} color={colors.textPrimary} />}
              style={styles.backButton}
            />
            <Button
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              icon={<ArrowRight size={18} color={colors.accentDark} />}
              style={styles.continueButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    marginVertical: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  detectedCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(58, 130, 238, 0.3)',
    marginBottom: spacing.lg,
  },
  detectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  detectedTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  detectedAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  detectedSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  detectedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detectedUseBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  detectedUseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detectedEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  detectedEditBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  revertBtn: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  revertBtnText: {
    fontSize: 12,
    color: colors.accent,
  },
  infoBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});
