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
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { Phone, ArrowRight, ShieldCheck, Lock } from 'lucide-react-native';
import { saveLocalProfile } from '../../services/db/database';

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'SMS Setup' },
  { id: 3, label: 'Balance' },
  { id: 4, label: 'Buckets' },
];

export default function PhoneScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (!cleaned) {
      setError('Please enter your mobile number');
      return;
    }

    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setError('');
    // Store local profile identifier in SQLite
    saveLocalProfile(`+91${cleaned}`);

    router.push({
      pathname: '/(onboarding)/sms-permission' as any,
      params: {
        phoneNumber: `+91${cleaned}`,
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
          <WorkspaceTopStepper steps={STEPS} currentStep={1} />

          <View style={styles.header}>
            <Text style={styles.title}>Your Local Profile</Text>
            <Text style={styles.subtitle}>
              Enter your mobile number to create your on-device virtual envelope profile.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Mobile Number"
              placeholder="e.g. 98765 43210"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              error={error}
              leftIcon={<Phone size={20} color={colors.textTertiary} />}
              maxLength={10}
            />

            <View style={styles.securityBox}>
              <View style={styles.securityRow}>
                <ShieldCheck size={16} color={colors.statusSuccess} />
                <Text style={styles.securityTitle}>100% On-Device & Private</Text>
              </View>
              <Text style={styles.securityDesc}>
                This phone number is only a local profile tag. It does not provide access to UPI history, is not a bank login, and is never uploaded.
              </Text>
            </View>

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
  form: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  securityBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.statusSuccess,
  },
  securityDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  continueButton: {
    marginTop: spacing.xl,
  },
});
