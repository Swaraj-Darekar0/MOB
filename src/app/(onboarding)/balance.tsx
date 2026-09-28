import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { IndianRupee, ArrowRight, ArrowLeft } from 'lucide-react-native';

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'Balance' },
  { id: 3, label: 'Buckets' },
];

export default function BalanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username: string; avatarUri?: string }>();
  const [balanceStr, setBalanceStr] = useState('');
  const [error, setError] = useState('');

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
        username: params.username,
        startingBalance: amount.toString(),
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
          {/* Stepper with step 1 completed and step 2 active */}
          <WorkspaceTopStepper
            steps={STEPS}
            currentStep={2}
            onStepPress={(id) => {
              if (id === 1) router.back();
            }}
          />

          <View>
            <View style={styles.navRow}>
              <Button
                title="Back"
                variant="ghost"
                size="sm"
                onPress={() => router.back()}
                icon={<ArrowLeft size={16} color={colors.textSecondary} />}
              />
            </View>

            <Text style={styles.title}>Tracked Bank Balance</Text>
            <Text style={styles.description}>
              Enter your current available balance. This serves as the pool divided among your virtual envelopes.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Available Balance (₹)"
              placeholder="e.g. 50000"
              value={balanceStr}
              onChangeText={(text) => {
                setBalanceStr(text);
                if (error) setError('');
              }}
              keyboardType="numeric"
              error={error}
              leftIcon={<IndianRupee size={20} color={colors.accent} />}
              helperText="MOB maintains a strict local ledger and never links your bank credentials."
            />

            <View style={styles.quickPills}>
              {[10000, 25000, 50000, 100000].map((preset) => (
                <Button
                  key={preset}
                  title={`₹${preset.toLocaleString('en-IN')}`}
                  variant="secondary"
                  size="sm"
                  onPress={() => setBalanceStr(preset.toString())}
                  style={styles.pill}
                />
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Continue to Allocation"
              variant="accent"
              size="lg"
              onPress={handleContinue}
              icon={<ArrowRight size={18} color={colors.accentDark} />}
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
    padding: spacing.xxl,
    justifyContent: 'space-between',
  },
  navRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    marginLeft: -spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  quickPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
