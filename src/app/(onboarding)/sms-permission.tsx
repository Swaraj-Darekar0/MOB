import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Edit3,
  Check,
  CreditCard,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { ThoughtLine } from '../../components/ui/ThoughtLine';
import { DecryptedText } from '../../components/ui/DecryptedText';
import { readDeviceSmsInbox } from '../../services/sms/native/smsReader';
import { parseSms } from '../../services/sms/parser';
import { toRupees } from '../../utils/money';
import Constants from 'expo-constants';

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'SMS Sync' },
  { id: 3, label: 'Buckets' },
];

export interface DetectedAccount {
  id: string;
  bankName: string;
  accountLast4: string;
  balanceRupees: number;
  balancePaise: number;
  timestamp: number;
  included: boolean;
}

const REASONING_STATEMENTS = [
  'Scanning SMS inbox',
  'Detecting bank accounts',
  'Reconciling balances',
];

type FlowPhase = 'IDLE' | 'THINKING' | 'REVEALED';

export default function SmsPermissionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    username?: string;
    avatarUri?: string;
  }>();

  const [phase, setPhase] = useState<FlowPhase>('IDLE');
  const [detectedAccounts, setDetectedAccounts] = useState<DetectedAccount[]>([
    {
      id: 'union_0221',
      bankName: 'Union Bank of India',
      accountLast4: '0221',
      balanceRupees: 46742.82,
      balancePaise: 4674282,
      timestamp: Date.now() - 60000,
      included: true,
    },
    {
      id: 'hdfc_4321',
      bankName: 'HDFC Bank',
      accountLast4: '4321',
      balanceRupees: 24300.0,
      balancePaise: 2430000,
      timestamp: Date.now() - 3600000,
      included: true,
    },
  ]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [customBalanceStr, setCustomBalanceStr] = useState<string>('71042.82');

  // Animation values
  const thinkingOpacity = useSharedValue(1);
  const revealedOpacity = useSharedValue(0);
  const revealedScale = useSharedValue(0.95);

  const startReconciliation = async () => {
    // 1. Move to thinking phase immediately so UI provides instant feedback
    setPhase('THINKING');
    thinkingOpacity.value = 1;
    revealedOpacity.value = 0;

    // 2. Fetch SMS from native device inbox (with graceful synthetic fallback for Expo Go / simulators)
    const scanResult = await readDeviceSmsInbox({ maxCount: 150 });

    // 3. Scan and parse messages sorted by timestamp descending (latest by date and time)
    const sortedMessages = [...scanResult.messages].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const accountMap = new Map<string, DetectedAccount>();

    for (const msg of sortedMessages) {
      const parsed = parseSms(msg.body, msg.sender, msg.timestamp);
      if (parsed && parsed.balanceAfterPaise && parsed.bankName) {
        const last4 = parsed.accountLast4 || 'XXXX';
        const key = `${parsed.bankName.toLowerCase()}_${last4}`;
        if (!accountMap.has(key)) {
          const balanceRupees = toRupees(parsed.balanceAfterPaise);
          accountMap.set(key, {
            id: key,
            bankName: parsed.bankName,
            accountLast4: last4,
            balanceRupees,
            balancePaise: parsed.balanceAfterPaise,
            timestamp: msg.timestamp,
            included: true,
          });
        }
      }
    }

    const accounts = Array.from(accountMap.values());
    if (accounts.length > 0) {
      setDetectedAccounts(accounts);
      const total = accounts.reduce((sum, a) => sum + a.balanceRupees, 0);
      setCustomBalanceStr(total.toFixed(2));
    }
  };

  const handleThinkingComplete = () => {
    // Smooth transition from Thinking to Revealed
    thinkingOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });

    setTimeout(() => {
      setPhase('REVEALED');
    }, 300);
  };

  useEffect(() => {
    if (phase === 'REVEALED') {
      revealedOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
      revealedScale.value = withSpring(1, { damping: 14 });
    }
  }, [phase, revealedOpacity, revealedScale]);

  // Active merged total computation
  const activeTotal = detectedAccounts
    .filter((acc) => acc.included)
    .reduce((sum, acc) => sum + acc.balanceRupees, 0);

  const displayBalance = isEditing
    ? parseFloat(customBalanceStr.replace(/,/g, '').trim()) || activeTotal
    : activeTotal;

  const toggleAccountInclusion = (id: string) => {
    setDetectedAccounts((prev) => {
      const updated = prev.map((acc) =>
        acc.id === id ? { ...acc, included: !acc.included } : acc
      );
      const newTotal = updated
        .filter((acc) => acc.included)
        .reduce((sum, acc) => sum + acc.balanceRupees, 0);
      setCustomBalanceStr(newTotal.toFixed(2));
      return updated;
    });
  };

  const handleContinueToAllocation = () => {
    router.push({
      pathname: '/(onboarding)/allocation',
      params: {
        username: params.username || 'User',
        avatarUri: params.avatarUri || '',
        startingBalance: displayBalance.toFixed(2),
        balanceSource: 'SMS_REPORTED',
      },
    });
  };

  const thinkingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: thinkingOpacity.value,
  }));

  const revealedAnimatedStyle = useAnimatedStyle(() => ({
    opacity: revealedOpacity.value,
    transform: [{ scale: revealedScale.value }],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          phase === 'REVEALED' && styles.containerRevealed,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={phase !== 'REVEALED'}
        bounces={false}
      >
        {/* Workspace Top Stepper at Step 2 */}
        <View
          style={[
            styles.stepperContainer,
            phase === 'REVEALED' && styles.stepperContainerRevealed,
          ]}
        >
          <WorkspaceTopStepper
            steps={STEPS}
            currentStep={2}
            onStepPress={(stepId) => {
              if (stepId === 1 && phase === 'IDLE') {
                router.back();
              }
            }}
          />
        </View>

        {/* PHASE 1: IDLE INTRO */}
        {phase === 'IDLE' && (
          <View style={styles.idleContent}>
            <View style={styles.header}>
              <View style={styles.badgeRow}>
                <Sparkles size={13} color={colors.accent} />
                <Text style={styles.badgeText}>STEP 2 OF 3</Text>
              </View>
              <Text style={styles.title}>Automatic SMS Reconciliation</Text>
              <Text style={styles.description}>
                MOB reads incoming financial SMS on your phone to maintain your virtual spending buckets without manual bookkeeping.
              </Text>
            </View>

            {/* Notion Obsidian Card */}
            <View style={styles.featuresCard}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <CheckCircle2 size={16} color={colors.statusSuccess} />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureHeading}>Zero Manual Data Entry</Text>
                  <Text style={styles.featureSubtext}>
                    Bank debits & UPI payments are instantly allocated into your designated envelopes.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <CheckCircle2 size={16} color={colors.statusSuccess} />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureHeading}>Timeline Reconciled Balance</Text>
                  <Text style={styles.featureSubtext}>
                    Calculates your exact available balance sorted chronologically by date and time.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Shield size={16} color={colors.accent} />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureHeading}>Strict On-Device Privacy</Text>
                  <Text style={styles.featureSubtext}>
                    Personal texts, OTPs, and private messages are discarded. Data never leaves your device.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Button
                title="Enable Financial SMS Access"
                variant="accent"
                size="lg"
                onPress={startReconciliation}
                icon={<ArrowRight size={18} color={colors.accentDark} />}
              />

              <Button
                title="Continue Without Permission"
                variant="ghost"
                size="md"
                onPress={startReconciliation}
                style={styles.skipBtn}
              />
            </View>
          </View>
        )}

        {/* PHASE 2: THINKING */}
        {phase === 'THINKING' && (
          <Animated.View style={[styles.thinkingContent, thinkingAnimatedStyle]}>
            <View style={styles.thinkingHeader}>
              <Text style={styles.thinkingTitle}>Reconciling Financial State</Text>
              <Text style={styles.thinkingSubtitle}>
                Scanning verified local bank alerts to compute current ledger balance
              </Text>
            </View>

            {/* Center-screen ThoughtLine cycling through 3 crisp statements */}
            <ThoughtLine
              steps={REASONING_STATEMENTS}
              durationMs={3000}
              doneThought="Balances reconciled"
              onComplete={handleThinkingComplete}
              showTimer={true}
              color={colors.accent}
            />
          </Animated.View>
        )}

        {/* PHASE 3: REVEALED BALANCE */}
        {phase === 'REVEALED' && (
          <Animated.View style={[styles.revealedContent, revealedAnimatedStyle]}>
            <View style={styles.balanceDisplayCard}>
              {detectedAccounts.length > 1 ? (
                <View style={styles.reconciledBadgeMulti}>
                  <Sparkles size={12} color={colors.accent} />
                  <Text style={styles.reconciledBadgeTextMulti}>
                    {detectedAccounts.length} BANK ACCOUNTS DETECTED
                  </Text>
                </View>
              ) : (
                <View style={styles.reconciledBadge}>
                  <CheckCircle2 size={13} color={colors.statusSuccess} />
                  <Text style={styles.reconciledBadgeText}>
                    RECONCILED VIA {detectedAccounts[0]?.bankName.toUpperCase() || 'BANK'} ••{detectedAccounts[0]?.accountLast4 || 'XXXX'}
                  </Text>
                </View>
              )}

              <Text style={styles.balanceLabel}>
                {detectedAccounts.length > 1
                  ? 'Total Available Balance'
                  : 'Current Available Balance'}
              </Text>

              {/* DecryptedText rapidly resolving to the detected balance */}
              {!isEditing ? (
                <View style={styles.decryptedWrapper}>
                  <DecryptedText
                    text={`₹${displayBalance.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                    speed={25}
                    maxIterations={8}
                    style={styles.decryptedBalanceText}
                    revealedStyle={styles.decryptedBalanceRevealed}
                  />
                </View>
              ) : (
                <View style={styles.editInputWrapper}>
                  <Text style={styles.rupeePrefix}>₹</Text>
                  <TextInput
                    style={styles.editInput}
                    keyboardType="numeric"
                    value={customBalanceStr}
                    onChangeText={setCustomBalanceStr}
                    autoFocus
                  />
                </View>
              )}

              {/* Notion-style Multi-Account Merge Callout */}
              {detectedAccounts.length > 1 && (
                <View style={styles.mergeCallout}>
                  <Text style={styles.mergeCalloutText}>
                    We've merged balances from both accounts into your unified available pool. Toggle below to exclude an account if needed.
                  </Text>
                </View>
              )}

              {/* Account Breakdown List (Notion Obsidian Style) */}
              {detectedAccounts.length > 1 && (
                <View style={styles.accountsCard}>
                  <View style={styles.accountsCardHeader}>
                    <View style={styles.accountsHeaderLeft}>
                      <CreditCard size={12} color={colors.textSecondary} />
                      <Text style={styles.accountsCardTitle}>DETECTED ACCOUNTS</Text>
                    </View>
                    <View style={styles.mergedPill}>
                      <Text style={styles.mergedPillText}>Merged into Total</Text>
                    </View>
                  </View>

                  {detectedAccounts.map((account, index) => {
                    const isLast = index === detectedAccounts.length - 1;
                    return (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountRow,
                          !isLast && styles.accountRowBorder,
                          !account.included && styles.accountRowExcluded,
                        ]}
                        onPress={() => toggleAccountInclusion(account.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.accountLeft}>
                          <View
                            style={[
                              styles.accountCheckbox,
                              account.included
                                ? styles.accountCheckboxActive
                                : styles.accountCheckboxInactive,
                            ]}
                          >
                            {account.included && (
                              <Check size={11} color="#FFFFFF" strokeWidth={3} />
                            )}
                          </View>
                          <View style={styles.accountInfo}>
                            <Text
                              style={[
                                styles.accountBankName,
                                !account.included && styles.textMuted,
                              ]}
                            >
                              {account.bankName}
                            </Text>
                            <Text style={styles.accountNumber}>
                              A/c ending ••{account.accountLast4}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.accountRight}>
                          <Text
                            style={[
                              styles.accountBalance,
                              !account.included && styles.accountBalanceExcluded,
                            ]}
                          >
                            ₹{account.balanceRupees.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.accountStatus,
                              account.included && styles.accountStatusIncluded,
                            ]}
                          >
                            {account.included ? 'Included' : 'Excluded'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {detectedAccounts.length <= 1 && (
                <Text style={styles.balanceCaption}>
                  Synchronized by date and time from your verified account ledger. Ready for bucket division.
                </Text>
              )}

              <TouchableOpacity
                style={styles.editToggleBtn}
                onPress={() => {
                  if (!isEditing) {
                    setCustomBalanceStr(displayBalance.toFixed(2));
                  }
                  setIsEditing(!isEditing);
                }}
                activeOpacity={0.7}
              >
                <Edit3 size={12} color={colors.accent} />
                <Text style={styles.editToggleText}>
                  {isEditing ? 'Save amount' : 'Adjust amount manually'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.footer, styles.footerRevealed]}>
              <Button
                title="Continue to Buckets"
                variant="accent"
                size="lg"
                onPress={handleContinueToAllocation}
                icon={<ArrowRight size={18} color={colors.accentDark} />}
              />
            </View>
          </Animated.View>
        )}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  containerRevealed: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  stepperContainer: {
    marginBottom: spacing.md,
  },
  stepperContainerRevealed: {
    marginBottom: spacing.xs,
  },
  // Phase 1: Idle
  idleContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  featuresCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.lg,
    gap: spacing.lg,
    marginVertical: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureTextBox: {
    flex: 1,
  },
  featureHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  footer: {
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : spacing.md,
    gap: spacing.xs,
  },
  skipBtn: {
    marginTop: 4,
  },
  // Phase 2: Thinking
  thinkingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  thinkingHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  thinkingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  thinkingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  // Phase 3: Revealed
  revealedContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  balanceDisplayCard: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.xs,
  },
  reconciledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
    marginBottom: 4,
  },
  reconciledBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.statusSuccess,
    letterSpacing: 0.8,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  decryptedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  decryptedBalanceText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  decryptedBalanceRevealed: {
    color: colors.textPrimary,
  },
  editInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    height: 44,
    marginVertical: 4,
  },
  rupeePrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
    marginRight: 4,
  },
  editInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 120,
    fontVariant: ['tabular-nums'],
  },
  balanceCaption: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
    maxWidth: 260,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  // Multi-account Badge & Card
  reconciledBadgeMulti: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.3)',
    marginBottom: 4,
  },
  reconciledBadgeTextMulti: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  mergeCallout: {
    backgroundColor: 'rgba(94, 106, 210, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.2)',
    borderRadius: borderRadius.default,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    marginTop: 5,
    marginBottom: 3,
    width: '100%',
  },
  mergeCalloutText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    lineHeight: 14.5,
    textAlign: 'center',
  },
  accountsCard: {
    width: '100%',
    backgroundColor: '#0C0D12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 3,
  },
  accountsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 2,
  },
  accountsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  accountsCardTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  mergedPill: {
    backgroundColor: 'rgba(94, 106, 210, 0.15)',
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  mergedPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.accent,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4.5,
  },
  accountRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  accountRowExcluded: {
    opacity: 0.45,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  accountCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCheckboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  accountCheckboxInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.textDisabled,
  },
  accountInfo: {
    gap: 1,
  },
  accountBankName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accountNumber: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  accountRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  accountBalance: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  accountBalanceExcluded: {
    textDecorationLine: 'line-through',
    color: colors.textDisabled,
  },
  accountStatus: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  accountStatusIncluded: {
    color: colors.statusSuccess,
  },
  textMuted: {
    color: colors.textDisabled,
  },
  footerRevealed: {
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : spacing.sm,
    gap: spacing.xs,
  },
});
