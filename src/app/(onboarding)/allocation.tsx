import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { OnboardingActivationModal } from '../../components/ui/OnboardingActivationModal';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react-native';

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'Balance' },
  { id: 3, label: 'Buckets' },
];

interface OnboardingBucket {
  id: string;
  name: string;
  percentage: number;
  color: string;
}

const DEFAULT_BUCKETS: OnboardingBucket[] = [
  { id: '1', name: 'Rent & Utilities', percentage: 30, color: '#3A82EE' },
  { id: '2', name: 'Food & Dining', percentage: 20, color: '#1DB954' },
  { id: '3', name: 'Travel & Commute', percentage: 15, color: '#FFA000' },
  { id: '4', name: 'Shopping', percentage: 15, color: '#9B51E0' },
  { id: '5', name: 'Savings & Emergency', percentage: 20, color: '#00C853' },
];

export default function AllocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    username: string;
    startingBalance: string;
    avatarUri?: string;
  }>();
  const startingBalance = parseFloat(params.startingBalance || '0');
  const username = params.username || 'User';

  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [buckets, setBuckets] = useState<OnboardingBucket[]>(DEFAULT_BUCKETS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComboSequence, setShowComboSequence] = useState(false);

  const totalAllocatedPercentage = buckets.reduce((sum, b) => sum + (b.percentage || 0), 0);
  const unallocatedPercentage = Math.max(0, 100 - totalAllocatedPercentage);
  const unallocatedRupees = Math.round((unallocatedPercentage / 100) * startingBalance);

  const handlePercentageChange = (id: string, text: string) => {
    const val = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    setBuckets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, percentage: Math.min(100, val) } : b))
    );
  };

  const handleRemoveBucket = (id: string) => {
    if (buckets.length <= 1) {
      Alert.alert('Notice', 'You must have at least one envelope.');
      return;
    }
    setBuckets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddBucket = () => {
    const newId = Date.now().toString();
    const remaining = Math.max(0, 100 - totalAllocatedPercentage);
    setBuckets((prev) => [
      ...prev,
      {
        id: newId,
        name: `Envelope ${prev.length + 1}`,
        percentage: remaining > 0 ? Math.min(10, remaining) : 0,
        color: '#717171',
      },
    ]);
  };

  const handleFinish = async () => {
    if (totalAllocatedPercentage > 100) {
      Alert.alert(
        'Allocation Error',
        `Total allocation is ${totalAllocatedPercentage}%. It cannot exceed 100%. Please adjust your envelope percentages.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const allocations = buckets.map((b) => {
        const rupeeAmount = Math.round(((b.percentage || 0) / 100) * startingBalance);
        return {
          name: b.name,
          percentage: b.percentage,
          amount: rupeeAmount,
          target: rupeeAmount,
          color: b.color,
        };
      });

      // 1. Commit to database and store
      await completeOnboarding(username, startingBalance, allocations, params.avatarUri);

      // 2. Launch Combo Sequence (Decrypted text on `Hola "{username}"` + Geometric Preloader)
      setShowComboSequence(true);
    } catch (err: any) {
      Alert.alert('Initialization Failed', err.message || 'Could not complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionToDashboard = () => {
    setShowComboSequence(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Workspace Top Stepper at Step 3 */}
        <WorkspaceTopStepper
          steps={STEPS}
          currentStep={3}
          onStepPress={(id) => {
            if (id === 1) router.navigate('/(onboarding)/username');
            if (id === 2) router.back();
          }}
        />

        <View style={styles.navRow}>
          <Button
            title="Back"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            icon={<ArrowLeft size={16} color={colors.textSecondary} />}
          />
        </View>

        <Text style={styles.title}>Bucket Allocation</Text>
        <Text style={styles.description}>
          Allocate ₹{startingBalance.toLocaleString('en-IN')} across your spending buckets using percentages.
        </Text>

        {/* Real-time Allocation Summary Card */}
        <Card variant="raised" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Allocated</Text>
              <Text
                style={[
                  styles.summaryVal,
                  totalAllocatedPercentage > 100 && styles.summaryOver,
                ]}
              >
                {totalAllocatedPercentage}%
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryLabel}>Unallocated Balance</Text>
              <Text style={styles.unallocatedVal}>
                ₹{unallocatedRupees.toLocaleString('en-IN')} ({unallocatedPercentage}%)
              </Text>
            </View>
          </View>
        </Card>

        {/* Envelope List */}
        <View style={styles.list}>
          {buckets.map((bucket) => {
            const rupeeValue = Math.round(
              ((bucket.percentage || 0) / 100) * startingBalance
            );
            return (
              <Card key={bucket.id} variant="raised" style={styles.bucketCard}>
                <View style={styles.bucketHeader}>
                  <View style={styles.titleWithDot}>
                    <View style={[styles.colorBadge, { backgroundColor: bucket.color }]} />
                    <Text style={styles.bucketName}>{bucket.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveBucket(bucket.id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.bucketBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputPrefix}>%</Text>
                    <TextInput
                      style={styles.percentInput}
                      keyboardType="numeric"
                      value={bucket.percentage ? bucket.percentage.toString() : ''}
                      onChangeText={(t) => handlePercentageChange(bucket.id, t)}
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.rupeeEquivalent}>
                    <Text style={styles.rupeeEquivalentLabel}>Equals</Text>
                    <Text style={styles.rupeeEquivalentValue}>
                      ₹{rupeeValue.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        <Button
          title="Add Another Bucket"
          variant="secondary"
          size="md"
          onPress={handleAddBucket}
          icon={<Plus size={16} color={colors.textPrimary} />}
          style={styles.addBtn}
        />

        <View style={styles.footer}>
          <Button
            title="Complete Setup & Launch"
            variant="accent"
            size="lg"
            loading={isSubmitting}
            onPress={handleFinish}
            icon={<Check size={18} color={colors.accentDark} />}
          />
        </View>
      </ScrollView>

      {/* Onboarding Activation Combo Sequence */}
      <OnboardingActivationModal
        visible={showComboSequence}
        username={username}
        onSequenceComplete={handleTransitionToDashboard}
      />
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
    padding: spacing.xxl,
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
    marginBottom: spacing.lg,
  },
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceElevated,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.md,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  summaryOver: {
    color: colors.statusError,
  },
  unallocatedVal: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bucketCard: {
    padding: spacing.md,
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  bucketName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  bucketBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.md,
    height: 40,
    width: 90,
  },
  inputPrefix: {
    fontSize: 14,
    color: colors.textTertiary,
    marginRight: spacing.xs,
  },
  percentInput: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  rupeeEquivalent: {
    alignItems: 'flex-end',
  },
  rupeeEquivalentLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  rupeeEquivalentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  addBtn: {
    marginBottom: spacing.xxl,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
