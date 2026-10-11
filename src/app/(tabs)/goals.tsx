import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Goal, GoalCadence, GoalShortfall, Envelope } from '../../types';
import { formatPaise, toPaise, toRupees } from '../../utils/money';
import { calculateInstallmentAmount } from '../../services/goals/goalCalculations';
import {
  Target,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  X,
  Play,
  Pause,
  Trash2,
  TrendingUp,
} from 'lucide-react-native';

export default function GoalsScreen() {
  const {
    goals,
    shortfalls,
    envelopes,
    unallocatedBalance,
    createGoal,
    updateGoal,
    deleteGoal,
    runScheduledGoalAllocations,
    recoverShortfall,
  } = useAppStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeShortfall, setActiveShortfall] = useState<GoalShortfall | null>(null);

  // New Goal Form State
  const [goalName, setGoalName] = useState('');
  const [targetAmountRupees, setTargetAmountRupees] = useState('');
  const [deadlineNumber, setDeadlineNumber] = useState('90'); // days
  const [cadence, setCadence] = useState<GoalCadence>('MONTHLY');
  const [initialFundingRupees, setInitialFundingRupees] = useState('');

  // Shortfall / Transfer Modal State
  const [sourceEnvelopeId, setSourceEnvelopeId] = useState<string>('');
  const [transferAmountRupees, setTransferAmountRupees] = useState<string>('');

  // Run scheduled checks on mount
  useEffect(() => {
    runScheduledGoalAllocations().catch((err) => {
      console.warn('Scheduled goal check error:', err);
    });
  }, []);

  // Compute deadline date from days
  const computedDeadline = new Date(Date.now() + parseInt(deadlineNumber || '30', 10) * 86400000)
    .toISOString()
    .split('T')[0];

  // Live preview of installment
  const targetPaise = toPaise(parseFloat(targetAmountRupees) || 0);
  const previewInstallmentPaise =
    targetPaise > 0
      ? calculateInstallmentAmount(targetPaise, 0, computedDeadline, cadence)
      : 0;

  const handleCreateGoal = async () => {
    if (!goalName.trim()) {
      Alert.alert('Required', 'Please enter a goal name.');
      return;
    }
    const numTarget = parseFloat(targetAmountRupees);
    if (isNaN(numTarget) || numTarget <= 0) {
      Alert.alert('Required', 'Please enter a valid target amount.');
      return;
    }

    const initDeposit = parseFloat(initialFundingRupees) || 0;
    if (initDeposit > unallocatedBalance) {
      Alert.alert(
        'Insufficient Unallocated Funds',
        `You only have ₹${unallocatedBalance.toLocaleString('en-IN')} available in Unallocated.`
      );
      return;
    }

    try {
      await createGoal({
        name: goalName.trim(),
        targetAmountPaise: toPaise(numTarget),
        deadline: computedDeadline,
        cadence,
        initialDepositPaise: initDeposit > 0 ? toPaise(initDeposit) : undefined,
      });

      // Reset & close
      setGoalName('');
      setTargetAmountRupees('');
      setDeadlineNumber('90');
      setInitialFundingRupees('');
      setCreateModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not create goal.');
    }
  };

  const handleOpenRecoveryModal = (shortfall: GoalShortfall) => {
    setActiveShortfall(shortfall);
    const targetG = goals.find((g) => g.id === shortfall.goalId);
    if (targetG) {
      setSelectedGoal(targetG);
    }
    setTransferAmountRupees(toRupees(shortfall.shortfallAmountPaise).toString());
    // Select first eligible non-goal envelope
    const eligible = envelopes.find((e) => e.archetype !== 'GOAL' && e.currentAmount > 0);
    if (eligible) {
      setSourceEnvelopeId(eligible.id);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedGoal || !sourceEnvelopeId) return;
    const numTransfer = parseFloat(transferAmountRupees);
    if (isNaN(numTransfer) || numTransfer <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transfer amount.');
      return;
    }

    const sourceEnv = envelopes.find((e) => e.id === sourceEnvelopeId);
    if (!sourceEnv || sourceEnv.currentAmount < numTransfer) {
      Alert.alert(
        'Insufficient Funds',
        `Selected source bucket only has ₹${(sourceEnv?.currentAmount || 0).toLocaleString('en-IN')}.`
      );
      return;
    }

    try {
      await recoverShortfall(sourceEnvelopeId, selectedGoal.id, toPaise(numTransfer));
      setActiveShortfall(null);
      setSelectedGoal(null);
      setTransferAmountRupees('');
      Alert.alert('Transfer Complete', `₹${numTransfer.toLocaleString('en-IN')} moved to ${selectedGoal.name}.`);
    } catch (e: any) {
      Alert.alert('Transfer Error', e?.message || 'Could not complete transfer.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.headerTitle}>Financial Goals</Text>
            <Text style={styles.headerSubtitle}>
              Dedicated Goal Buckets with automated partial allocations.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addGoalBtn}
            activeOpacity={0.8}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addGoalBtnText}>New Goal</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Unresolved Shortfalls Alert Card */}
          {shortfalls.length > 0 && (
            <View style={styles.shortfallContainer}>
              {shortfalls.map((sf) => {
                const affectedGoal = goals.find((g) => g.id === sf.goalId);
                return (
                  <Card key={sf.id} variant="raised" style={styles.shortfallCard}>
                    <View style={styles.shortfallHeader}>
                      <View style={styles.shortfallTitleRow}>
                        <AlertTriangle size={16} color={colors.statusWarning} />
                        <Text style={styles.shortfallTitle}>
                          Shortfall: {affectedGoal?.name || 'Goal'}
                        </Text>
                      </View>
                      <Text style={styles.shortfallAmountText}>
                        -₹{toRupees(sf.shortfallAmountPaise).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <Text style={styles.shortfallDesc}>
                      Planned contribution of ₹{toRupees(sf.plannedAmountPaise).toLocaleString('en-IN')} was only
                      partially funded (₹{toRupees(sf.allocatedAmountPaise).toLocaleString('en-IN')} allocated) because Unallocated
                      funds were low.
                    </Text>

                    <TouchableOpacity
                      style={styles.recoverBtn}
                      activeOpacity={0.8}
                      onPress={() => handleOpenRecoveryModal(sf)}
                    >
                      <Text style={styles.recoverBtnText}>Recover Shortfall</Text>
                      <ArrowRight size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </View>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <Card variant="raised" style={styles.emptyCard}>
              <Target size={44} color={colors.accent} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyTitle}>No Goals Set Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create a goal to automatically set aside money towards milestones on your chosen schedule.
              </Text>
              <Button
                title="Create Your First Goal"
                variant="accent"
                size="md"
                onPress={() => setCreateModalVisible(true)}
                style={{ marginTop: spacing.lg }}
              />
            </Card>
          ) : (
            goals.map((goal) => {
              const progressRatio = Math.min(
                1,
                goal.targetAmountPaise > 0
                  ? goal.currentBalancePaise / goal.targetAmountPaise
                  : 0
              );
              const progressPercent = Math.round(progressRatio * 100);
              const remainingPaise = Math.max(0, goal.targetAmountPaise - goal.currentBalancePaise);

              return (
                <Card key={goal.id} variant="raised" style={styles.goalCard}>
                  <View style={styles.goalHeaderRow}>
                    <View style={styles.goalNameBox}>
                      <Target size={18} color={colors.accent} />
                      <Text style={styles.goalNameText}>{goal.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        goal.status === 'COMPLETED' && styles.statusBadgeCompleted,
                        goal.status === 'PAUSED' && styles.statusBadgePaused,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          goal.status === 'COMPLETED' && { color: colors.statusSuccess },
                          goal.status === 'PAUSED' && { color: colors.textSecondary },
                        ]}
                      >
                        {goal.status}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%` },
                        goal.status === 'COMPLETED' && { backgroundColor: colors.statusSuccess },
                      ]}
                    />
                  </View>

                  {/* Financial Metrics */}
                  <View style={styles.metricsRow}>
                    <View>
                      <Text style={styles.metricLabel}>Saved</Text>
                      <Text style={styles.metricVal}>
                        {formatPaise(goal.currentBalancePaise, false)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.metricLabel}>Progress</Text>
                      <Text style={[styles.metricVal, { color: colors.accent }]}>
                        {progressPercent}%
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metricLabel}>Target</Text>
                      <Text style={styles.metricVal}>
                        {formatPaise(goal.targetAmountPaise, false)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Schedule Info */}
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleItem}>
                      <Clock size={13} color={colors.textTertiary} />
                      <Text style={styles.scheduleText}>
                        {formatPaise(goal.installmentAmountPaise, false)} / {goal.cadence.toLowerCase()}
                      </Text>
                    </View>
                    <View style={styles.scheduleItem}>
                      <Calendar size={13} color={colors.textTertiary} />
                      <Text style={styles.scheduleText}>
                        Due: {goal.nextContributionDate}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.goalActionsRow}>
                    <TouchableOpacity
                      style={styles.addFundsActionBtn}
                      onPress={() => {
                        setSelectedGoal(goal);
                        setTransferAmountRupees(
                          toRupees(Math.min(remainingPaise, goal.installmentAmountPaise)).toString()
                        );
                        const eligible = envelopes.find((e) => e.id !== goal.envelopeId && e.currentAmount > 0);
                        if (eligible) setSourceEnvelopeId(eligible.id);
                      }}
                    >
                      <Plus size={13} color={colors.accent} />
                      <Text style={styles.addFundsText}>Move Money</Text>
                    </TouchableOpacity>

                    <View style={styles.iconActions}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() =>
                          updateGoal(goal.id, {
                            status: goal.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                          })
                        }
                      >
                        {goal.status === 'ACTIVE' ? (
                          <Pause size={15} color={colors.textSecondary} />
                        ) : (
                          <Play size={15} color={colors.statusSuccess} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => {
                          Alert.alert(
                            'Delete Goal',
                            `Are you sure you want to delete "${goal.name}"? Funds in this goal will return to Unallocated.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goal.id) },
                            ]
                          );
                        }}
                      >
                        <Trash2 size={15} color={colors.statusError} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>

        {/* Create Goal Modal */}
        <Modal visible={createModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Goal</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Goa Trip, MacBook Pro, Emergency Fund"
                  placeholderTextColor={colors.textTertiary}
                  value={goalName}
                  onChangeText={setGoalName}
                />

                <Text style={styles.inputLabel}>Target Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 50000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={targetAmountRupees}
                  onChangeText={setTargetAmountRupees}
                />

                <Text style={styles.inputLabel}>Timeline (Days from today)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="90"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={deadlineNumber}
                  onChangeText={setDeadlineNumber}
                />
                <Text style={styles.inputSubtext}>Target Deadline: {computedDeadline}</Text>

                <Text style={styles.inputLabel}>Contribution Cadence</Text>
                <View style={styles.cadenceSelector}>
                  {(['DAILY', 'WEEKLY', 'MONTHLY'] as GoalCadence[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cadenceBtn, cadence === c && styles.cadenceBtnActive]}
                      onPress={() => setCadence(c)}
                    >
                      <Text
                        style={[
                          styles.cadenceBtnText,
                          cadence === c && styles.cadenceBtnTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {previewInstallmentPaise > 0 && (
                  <View style={styles.previewBox}>
                    <TrendingUp size={16} color={colors.accent} />
                    <Text style={styles.previewText}>
                      Planned: {formatPaise(previewInstallmentPaise, false)} / {cadence.toLowerCase()}
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Initial Funding (Optional, from Unallocated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Available: ₹${unallocatedBalance.toLocaleString('en-IN')}`}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={initialFundingRupees}
                  onChangeText={setInitialFundingRupees}
                />

                <Button
                  title="Create Goal & Link Bucket"
                  variant="accent"
                  size="lg"
                  onPress={handleCreateGoal}
                  style={{ marginTop: spacing.lg }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Move Money / Recover Shortfall Modal */}
        <Modal visible={!!selectedGoal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeShortfall ? 'Recover Shortfall' : 'Move Money to Goal'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedGoal(null);
                    setActiveShortfall(null);
                  }}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedGoal && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalSubtitle}>
                    Moving money into <Text style={{ color: colors.accent, fontWeight: '700' }}>{selectedGoal.name}</Text>.
                    Your observed bank cash remains completely unchanged.
                  </Text>

                  <Text style={styles.inputLabel}>Select Source Bucket</Text>
                  <View style={styles.sourceList}>
                    {envelopes
                      .filter((e) => e.id !== selectedGoal.envelopeId)
                      .map((env) => {
                        const isSelected = sourceEnvelopeId === env.id;
                        return (
                          <TouchableOpacity
                            key={env.id}
                            style={[styles.sourceItem, isSelected && styles.sourceItemActive]}
                            onPress={() => setSourceEnvelopeId(env.id)}
                          >
                            <View>
                              <Text style={styles.sourceName}>{env.name}</Text>
                              <Text style={styles.sourceBalance}>
                                Current: ₹{env.currentAmount.toLocaleString('en-IN')}
                              </Text>
                            </View>
                            {isSelected && <CheckCircle size={16} color={colors.accent} />}
                          </TouchableOpacity>
                        );
                      })}
                  </View>

                  <Text style={styles.inputLabel}>Transfer Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount in ₹"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={transferAmountRupees}
                    onChangeText={setTransferAmountRupees}
                  />

                  <Button
                    title="Confirm & Move Money"
                    variant="accent"
                    size="lg"
                    onPress={handleConfirmTransfer}
                    style={{ marginTop: spacing.lg }}
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  addGoalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  shortfallContainer: {
    marginBottom: spacing.md,
  },
  shortfallCard: {
    borderColor: colors.statusWarning,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    marginBottom: spacing.sm,
  },
  shortfallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  shortfallTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shortfallTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.statusWarning,
  },
  shortfallAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.statusWarning,
  },
  shortfallDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  recoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.statusWarning,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.default,
  },
  recoverBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 4,
    lineHeight: 18,
  },
  goalCard: {
    marginBottom: spacing.md,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  goalNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduleText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  goalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addFundsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  addFundsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconActionBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.default,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  inputSubtext: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  cadenceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  cadenceBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.default,
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cadenceBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  cadenceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cadenceBtnTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: spacing.md,
    borderRadius: borderRadius.default,
    marginTop: spacing.md,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  sourceList: {
    maxHeight: 160,
    marginVertical: spacing.xs,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.default,
    backgroundColor: colors.surfaceBase,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sourceItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sourceBalance: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
