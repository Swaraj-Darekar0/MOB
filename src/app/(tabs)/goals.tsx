import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Goal, GoalCadence, GoalShortfall, Envelope } from '../../types';
import { formatPaise, toPaise, toRupees } from '../../utils/money';
import {
  calculateInstallmentAmount,
  analyzeCashFlowHabits,
  CashFlowHabitAnalysis,
} from '../../services/goals/goalPlanner';
import { ThoughtLine } from '../../components/ui/ThoughtLine';
import { RubberSegmentBar } from '../../components/ui/RubberSegmentBar';
import { GoalStack } from '../../components/ui/GoalStack';
import { getGoalVisuals, GoalVisuals } from '../../utils/goalVisuals';
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
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Trophy,
  Moon,
  Wind,
  HeartHandshake,
  Laptop,
  Plane,
  Car,
  Home,
  Gift,
  GraduationCap,
  Gamepad2,
  Rocket,
  ShieldCheck,
  AlertCircle,
  Compass,
  Flame,
  ShieldAlert,
  Scissors,
  Zap,
  LayoutGrid,
  Layers,
} from 'lucide-react-native';

/**
 * Commercialization & Monetization Feature Flag
 * In active development: PRO features remain 100% unlocked for testing.
 * When enabled in production, opens paywall window for Reality Copilot.
 */
export const COPILOT_MONETIZATION = {
  isProUnlocked: true, // 100% unlocked for development & testing
  tier: 'PRO',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const GOAL_OPTIMIZATION_STATEMENTS = [
  'Checking 90 days of SMS transactions',
  'Separating fixed bills from flexible spending',
  'Testing your safe cash flow and safety buffer',
  'Finding your most reliable savings path',
];


export default function GoalsScreen() {
  const {
    goals,
    shortfalls,
    envelopes,
    unallocatedBalance,
    transactions,
    createGoal,
    updateGoal,
    deleteGoal,
    runScheduledGoalAllocations,
    recoverShortfall,
  } = useAppStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeShortfall, setActiveShortfall] = useState<GoalShortfall | null>(null);
  const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowHabitAnalysis | null>(null);
  const [goalViewMode, setGoalViewMode] = useState<'grid' | 'stack'>('grid');

  // Custom Confirmation Modal states (replacing native Alert.alert)
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [goalToPause, setGoalToPause] = useState<Goal | null>(null);

  // Inline Feedback & Error states
  const [createStep1Error, setCreateStep1Error] = useState<string | null>(null);
  const [createStep2Error, setCreateStep2Error] = useState<string | null>(null);
  const [transferErrorMessage, setTransferErrorMessage] = useState<string | null>(null);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);

  // New Goal Form State
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [goalName, setGoalName] = useState('');
  const [targetAmountRupees, setTargetAmountRupees] = useState('');
  const [cadence, setCadence] = useState<GoalCadence>('MONTHLY');
  const [initialFundingRupees, setInitialFundingRupees] = useState('');
  const [selectedRealityOption, setSelectedRealityOption] = useState<'STRESS_FREE' | 'SACRIFICE' | 'SEED_SPRINT' | 'NONE'>('STRESS_FREE');
  const [showManualCadences, setShowManualCadences] = useState(false);

  // Target Date & Calendar State
  const [targetDate, setTargetDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d;
  });

  const [calendarMonth, setCalendarMonth] = useState<number>(() => targetDate.getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(() => targetDate.getFullYear());

  // ThoughtLine Optimization State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasOptimized, setHasOptimized] = useState(false);

  // Shortfall / Transfer Modal State
  const [sourceEnvelopeId, setSourceEnvelopeId] = useState<string>('unallocated');
  const [transferAmountRupees, setTransferAmountRupees] = useState<string>('');

  // Run scheduled checks on mount
  useEffect(() => {
    runScheduledGoalAllocations().catch((err) => {
      console.warn('Scheduled goal check error:', err);
    });
  }, []);

  // Compute daysRemaining and deadline string
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const targetDateTime = useMemo(() => {
    const d = new Date(targetDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [targetDate]);

  const diffMs = targetDateTime.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const deadlineStr = targetDateTime.toISOString().split('T')[0];

  // Target in paise
  const targetPaise = toPaise(parseFloat(targetAmountRupees) || 0);

  // Installment calculations for all 3 cadences
  const dailyInstallmentPaise = targetPaise > 0
    ? calculateInstallmentAmount(targetPaise, 0, deadlineStr, 'DAILY')
    : 0;
  const weeklyInstallmentPaise = targetPaise > 0
    ? calculateInstallmentAmount(targetPaise, 0, deadlineStr, 'WEEKLY')
    : 0;
  const monthlyInstallmentPaise = targetPaise > 0
    ? calculateInstallmentAmount(targetPaise, 0, deadlineStr, 'MONTHLY')
    : 0;

  // Advance from Step 1 to Step 2 with Deterministic 90-Day Cash Flow Analysis
  const handleProceedToStep2 = async () => {
    if (!goalName.trim()) {
      setCreateStep1Error('Please enter a goal name.');
      return;
    }
    const numTarget = parseFloat(targetAmountRupees);
    if (isNaN(numTarget) || numTarget <= 0) {
      setCreateStep1Error('Please enter a valid target amount.');
      return;
    }
    if (daysRemaining < 1) {
      setCreateStep1Error('Target deadline must be in the future.');
      return;
    }

    setCreateStep1Error(null);
    setCreateStep(2);
    setIsOptimizing(true);
    setHasOptimized(false);

    const startTime = Date.now();
    try {
      // 1. Analyze 90-day debits & credits across bank accounts with robust statistics
      const targetPaiseVal = toPaise(numTarget);
      const unallocatedPaiseVal = toPaise(unallocatedBalance);
      const analysis = analyzeCashFlowHabits(targetPaiseVal, deadlineStr, transactions, undefined, unallocatedPaiseVal);
      setCashFlowAnalysis(analysis);

      if (analysis.realityOffer?.isNeeded) {
        setSelectedRealityOption('STRESS_FREE');
        setShowManualCadences(false);
      } else {
        setSelectedRealityOption('NONE');
        setShowManualCadences(true);
        if (analysis.recommendedCadence) {
          setCadence(analysis.recommendedCadence);
        }
      }

      // 2. Guarantee minimum 2.5s duration so user can read statements clearly
      const elapsed = Date.now() - startTime;
      const minDuration = 2500;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }

      setIsOptimizing(false);
      setHasOptimized(true);
    } catch (e) {
      setIsOptimizing(false);
      setHasOptimized(true);
    }
  };

  const handleOptimizationComplete = () => {
    setIsOptimizing(false);
    setHasOptimized(true);
  };

  // Calendar Day Navigation
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (year: number, month: number, day: number) => {
    const selected = new Date(year, month, day);
    selected.setHours(0, 0, 0, 0);
    if (selected.getTime() < today.getTime()) {
      return; // cannot select past date
    }
    setTargetDate(selected);
    setCreateStep1Error(null);
  };

  // Calendar Days Grid Generation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const days: Array<{
      day: number | null;
      isToday: boolean;
      isSelected: boolean;
      isPast: boolean;
    }> = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, isToday: false, isSelected: false, isPast: false });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const thisDate = new Date(calendarYear, calendarMonth, d);
      thisDate.setHours(0, 0, 0, 0);

      const isToday = thisDate.getTime() === today.getTime();
      const isSelected = thisDate.getTime() === targetDateTime.getTime();
      const isPast = thisDate.getTime() < today.getTime();

      days.push({ day: d, isToday, isSelected, isPast });
    }

    return days;
  }, [calendarYear, calendarMonth, today, targetDateTime]);

  const handleCreateGoal = async () => {
    if (!goalName.trim()) {
      setCreateStep2Error('Please enter a goal name.');
      return;
    }
    const numTarget = parseFloat(targetAmountRupees);
    if (isNaN(numTarget) || numTarget <= 0) {
      setCreateStep2Error('Please enter a valid target amount.');
      return;
    }

    const initDeposit = parseFloat(initialFundingRupees) || 0;
    if (initDeposit > unallocatedBalance) {
      setCreateStep2Error(
        `Insufficient unallocated cash (Available: ₹${unallocatedBalance.toLocaleString('en-IN')})`
      );
      return;
    }

    try {
      setCreateStep2Error(null);

      // Check if a Reality Option is selected
      if (cashFlowAnalysis?.realityOffer?.isNeeded && selectedRealityOption !== 'NONE') {
        if (selectedRealityOption === 'STRESS_FREE') {
          const opt = cashFlowAnalysis.realityOffer.optionStressFree;
          await createGoal({
            name: goalName.trim(),
            targetAmountPaise: toPaise(numTarget),
            deadline: opt.dilatedTargetDate,
            cadence: 'MONTHLY',
            initialDepositPaise: initDeposit > 0 ? toPaise(initDeposit) : undefined,
            chosenRealityOption: 'STRESS_FREE',
          });
        } else if (selectedRealityOption === 'SACRIFICE') {
          const opt = cashFlowAnalysis.realityOffer.optionSacrifice;
          await createGoal({
            name: goalName.trim(),
            targetAmountPaise: toPaise(numTarget),
            deadline: deadlineStr,
            cadence: 'MONTHLY',
            initialDepositPaise: initDeposit > 0 ? toPaise(initDeposit) : undefined,
            chosenRealityOption: 'SACRIFICE',
            envelopeCuts: opt.cuts.map((c) => ({
              category: c.category,
              envelopeName: c.envelopeName,
              cutMonthlyPaise: c.cutMonthlyPaise,
            })),
          });
        } else if (selectedRealityOption === 'SEED_SPRINT' && cashFlowAnalysis.realityOffer.optionSeedSprint) {
          const opt = cashFlowAnalysis.realityOffer.optionSeedSprint;
          await createGoal({
            name: goalName.trim(),
            targetAmountPaise: toPaise(numTarget),
            deadline: deadlineStr,
            cadence: 'MONTHLY',
            initialDepositPaise: opt.seedAmountPaise,
            chosenRealityOption: 'SEED_SPRINT',
          });
        }
      } else {
        await createGoal({
          name: goalName.trim(),
          targetAmountPaise: toPaise(numTarget),
          deadline: deadlineStr,
          cadence,
          initialDepositPaise: initDeposit > 0 ? toPaise(initDeposit) : undefined,
        });
      }

      // Reset & close
      setGoalName('');
      setTargetAmountRupees('');
      setInitialFundingRupees('');
      setSelectedRealityOption('STRESS_FREE');
      setShowManualCadences(false);
      setHasOptimized(false);
      setIsOptimizing(false);
      setCreateModalVisible(false);
    } catch (e: any) {
      setCreateStep2Error(e?.message || 'Could not create goal.');
    }
  };

  const handleOpenRecoveryModal = (shortfall: GoalShortfall) => {
    setActiveShortfall(shortfall);
    const targetG = goals.find((g) => g.id === shortfall.goalId);
    if (targetG) {
      setSelectedGoal(targetG);
    }
    setTransferAmountRupees(toRupees(shortfall.shortfallAmountPaise).toString());
    setTransferErrorMessage(null);
    setTransferSuccessMessage(null);
    if (unallocatedBalance > 0) {
      setSourceEnvelopeId('unallocated');
    } else {
      const eligible = envelopes.find((e) => e.archetype !== 'GOAL' && e.currentAmount > 0);
      if (eligible) setSourceEnvelopeId(eligible.id);
    }
  };

  const handleOpenMoveMoney = (goal: Goal) => {
    setSelectedGoal(goal);
    setActiveShortfall(null);
    const remainingPaise = Math.max(0, goal.targetAmountPaise - goal.currentBalancePaise);
    const defaultAmt = toRupees(Math.min(remainingPaise, goal.installmentAmountPaise));
    setTransferAmountRupees(defaultAmt > 0 ? defaultAmt.toString() : '500');
    setTransferErrorMessage(null);
    setTransferSuccessMessage(null);
    if (unallocatedBalance > 0) {
      setSourceEnvelopeId('unallocated');
    } else {
      const eligible = envelopes.find((e) => e.id !== goal.envelopeId && e.currentAmount > 0);
      if (eligible) setSourceEnvelopeId(eligible.id);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedGoal || !sourceEnvelopeId) {
      setTransferErrorMessage('Please choose a funding source.');
      return;
    }
    const numTransfer = parseFloat(transferAmountRupees);
    if (isNaN(numTransfer) || numTransfer <= 0) {
      setTransferErrorMessage('Please enter a valid transfer amount.');
      return;
    }

    const isFromUnallocated = sourceEnvelopeId === 'unallocated';
    const sourceAvailable = isFromUnallocated
      ? unallocatedBalance
      : envelopes.find((e) => e.id === sourceEnvelopeId)?.currentAmount || 0;

    if (sourceAvailable < numTransfer) {
      setTransferErrorMessage(
        `Selected source only has ₹${sourceAvailable.toLocaleString('en-IN')}.`
      );
      return;
    }

    try {
      setTransferErrorMessage(null);
      await recoverShortfall(sourceEnvelopeId, selectedGoal.id, toPaise(numTransfer));
      setTransferSuccessMessage(`₹${numTransfer.toLocaleString('en-IN')} moved to ${selectedGoal.name}!`);
      setTimeout(() => {
        setActiveShortfall(null);
        setSelectedGoal(null);
        setTransferAmountRupees('');
        setTransferSuccessMessage(null);
      }, 1200);
    } catch (e: any) {
      setTransferErrorMessage(e?.message || 'Could not complete transfer.');
    }
  };

  const handleTogglePause = (goal: Goal) => {
    if (goal.status === 'ACTIVE') {
      setGoalToPause(goal);
    } else {
      updateGoal(goal.id, { status: 'ACTIVE' });
    }
  };

  const handleConfirmPause = async () => {
    if (!goalToPause) return;
    try {
      await updateGoal(goalToPause.id, { status: 'PAUSED' });
      setGoalToPause(null);
    } catch (e) {
      setGoalToPause(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete.id);
      setGoalToDelete(null);
    } catch (e) {
      setGoalToDelete(null);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateStep(1);
    setCreateStep1Error(null);
    setCreateStep2Error(null);
    setIsOptimizing(false);
    setHasOptimized(false);
    setGoalName('');
    setTargetAmountRupees('');
    setInitialFundingRupees('');
    setSelectedRealityOption('STRESS_FREE');
    setShowManualCadences(false);
    setCreateModalVisible(true);
  };

  const isFromUnallocated = sourceEnvelopeId === 'unallocated';
  const sourceAvailable = isFromUnallocated
    ? unallocatedBalance
    : envelopes.find((e) => e.id === sourceEnvelopeId)?.currentAmount || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.topBarHeaderLeft}>
            <Text style={styles.headerTitle} numberOfLines={1}>Financial Goals</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Dedicated Goal Buckets with automated partial allocations.
            </Text>
          </View>

          <View style={styles.topBarRightActions}>
            <RubberSegmentBar<'grid' | 'stack'>
              tabs={[
                {
                  id: 'grid',
                  label: '',
                  icon: (color) => (
                    <LayoutGrid
                      size={15}
                      color={color}
                      strokeWidth={2.2}
                    />
                  ),
                },
                {
                  id: 'stack',
                  label: '',
                  icon: (color) => (
                    <Layers
                      size={15}
                      color={color}
                      strokeWidth={2.2}
                    />
                  ),
                },
              ]}
              activeTab={goalViewMode}
              onTabChange={(mode) => setGoalViewMode(mode)}
              variant="compact"
              style={styles.viewToggleRubber}
            />

            <TouchableOpacity
              style={styles.addGoalBtn}
              activeOpacity={0.8}
              onPress={handleOpenCreateModal}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addGoalBtnText}>New Goal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={goalViewMode === 'grid'}
          bounces={goalViewMode === 'grid'}
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

          {/* Goals Content: Empty State vs Stack vs 2-Column Grid */}
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
                onPress={handleOpenCreateModal}
                style={{ marginTop: spacing.lg }}
              />
            </Card>
          ) : goalViewMode === 'stack' ? (
            <GoalStack
              goals={goals}
              shortfalls={shortfalls}
              onOpenRecoveryModal={handleOpenRecoveryModal}
              onOpenMoveMoney={handleOpenMoveMoney}
              onTogglePause={handleTogglePause}
              onDeletePress={(g) => setGoalToDelete(g)}
            />
          ) : (
            <View style={styles.goalsGrid}>
              {goals.map((goal) => {
                const progressRatio = Math.min(
                  1,
                  goal.targetAmountPaise > 0
                    ? goal.currentBalancePaise / goal.targetAmountPaise
                    : 0
                );
                const progressPercent = Math.round(progressRatio * 100);
                const goalShortfall = shortfalls.find((s) => s.goalId === goal.id && !s.resolved);
                const visuals = getGoalVisuals(goal, !!goalShortfall);

                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.gridGoalCard}
                    activeOpacity={0.85}
                    onPress={() => handleOpenMoveMoney(goal)}
                  >
                    {/* Header: Icon + Status */}
                    <View style={styles.gridCardHeader}>
                      <View style={[styles.gridIconCircle, { backgroundColor: visuals.bgColor }]}>
                        <visuals.IconComponent size={16} color={visuals.color} strokeWidth={2.2} />
                      </View>
                      <View
                        style={[
                          styles.gridStatusBadge,
                          goal.status === 'COMPLETED' && styles.statusBadgeCompleted,
                          goal.status === 'PAUSED' && styles.statusBadgePaused,
                        ]}
                      >
                        <Text
                          style={[
                            styles.gridStatusBadgeText,
                            goal.status === 'COMPLETED' && { color: colors.statusSuccess },
                            goal.status === 'PAUSED' && { color: colors.textSecondary },
                          ]}
                        >
                          {goal.status}
                        </Text>
                      </View>
                    </View>

                    {/* Goal Name */}
                    <Text style={styles.gridGoalName} numberOfLines={2}>
                      {goal.name}
                    </Text>

                    {/* Amounts */}
                    <View style={styles.gridAmountsGroup}>
                      <Text style={styles.gridSavedText}>
                        {formatPaise(goal.currentBalancePaise, false)}
                      </Text>
                      <Text style={styles.gridTargetText} numberOfLines={1}>
                        target {formatPaise(goal.targetAmountPaise, false)}
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.gridProgressBarTrack}>
                      <View
                        style={[
                          styles.gridProgressBarFill,
                          { width: `${progressPercent}%`, backgroundColor: visuals.color },
                          goal.status === 'COMPLETED' && { backgroundColor: colors.statusSuccess },
                        ]}
                      />
                    </View>

                    {/* Footer: Cadence & Percent */}
                    <View style={styles.gridCardFooter}>
                      <View style={styles.gridCadencePill}>
                        <Text style={styles.gridCadenceText}>{goal.cadence}</Text>
                      </View>
                      <Text style={[styles.gridPercentText, { color: visuals.color }]}>
                        {progressPercent}%
                      </Text>
                    </View>

                    {/* Shortfall Tag if present */}
                    {goalShortfall && (
                      <TouchableOpacity
                        style={styles.gridShortfallBadge}
                        activeOpacity={0.8}
                        onPress={() => handleOpenRecoveryModal(goalShortfall)}
                      >
                        <AlertTriangle size={10} color={colors.statusWarning} />
                        <Text style={styles.gridShortfallText}>Shortfall</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Two-Step Progressive Disclosure Create Goal Modal */}
        <Modal visible={createModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleGroup}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>STEP {createStep} OF 2</Text>
                    </View>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {createStep === 1 ? 'New Goal Milestone' : 'Contribution Cadence'}
                    </Text>
                    <Text style={styles.modalSubtitle} numberOfLines={1}>
                      {createStep === 1
                        ? 'Set target milestone amount & deadline'
                        : 'Select savings frequency to calculate schedule'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setCreateModalVisible(false);
                      setCreateStep(1);
                      setIsOptimizing(false);
                      setHasOptimized(false);
                    }}
                    style={styles.closeBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* ================= STEP 1: DEFINITION ================= */}
                  {createStep === 1 && (
                    <View>
                      {/* Goal Name */}
                      <Text style={styles.inputLabel}>Goal Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. MacBook Pro, Emergency Fund, Bali Vacation"
                        placeholderTextColor={colors.textTertiary}
                        value={goalName}
                        onChangeText={setGoalName}
                      />

                      {/* Target Amount */}
                      <Text style={styles.inputLabel}>Target Amount (₹)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 50,000"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={targetAmountRupees}
                        onChangeText={setTargetAmountRupees}
                      />

                      {/* Target Deadline Header with days count */}
                      <View style={styles.dateSelectorHeader}>
                        <Text style={styles.inputLabelNoMargin}>Target Deadline</Text>
                        <Text style={styles.deadlineDaysCountText}>{daysRemaining} days away</Text>
                      </View>

                      {/* Quick Horizon Presets */}
                      <View style={styles.presetPillsRow}>
                        {[
                          { label: '+30D', days: 30 },
                          { label: '+90D', days: 90 },
                          { label: '+6M', days: 180 },
                          { label: '+1Y', days: 365 },
                        ].map((preset) => {
                          const isPresetActive = Math.abs(daysRemaining - preset.days) <= 1;
                          return (
                            <TouchableOpacity
                              key={preset.label}
                              style={[
                                styles.presetPill,
                                isPresetActive && styles.presetPillActive,
                              ]}
                              activeOpacity={0.7}
                              onPress={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + preset.days);
                                setTargetDate(d);
                                setCalendarMonth(d.getMonth());
                                setCalendarYear(d.getFullYear());
                              }}
                            >
                              <Text
                                style={[
                                  styles.presetPillText,
                                  isPresetActive && styles.presetPillTextActive,
                                ]}
                              >
                                {preset.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Interactive Calendar Month Picker */}
                      <View style={styles.calendarContainer}>
                        <View style={styles.calendarNavHeader}>
                          <TouchableOpacity
                            onPress={handlePrevMonth}
                            style={styles.calNavBtn}
                            activeOpacity={0.7}
                          >
                            <ChevronLeft size={16} color={colors.textSecondary} />
                          </TouchableOpacity>

                          <Text style={styles.calendarMonthTitle}>
                            {MONTH_NAMES[calendarMonth]} {calendarYear}
                          </Text>

                          <TouchableOpacity
                            onPress={handleNextMonth}
                            style={styles.calNavBtn}
                            activeOpacity={0.7}
                          >
                            <ChevronRight size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        {/* Weekday Row */}
                        <View style={styles.weekdayRow}>
                          {WEEKDAY_NAMES.map((wd) => (
                            <Text key={wd} style={styles.weekdayText}>
                              {wd}
                            </Text>
                          ))}
                        </View>

                        {/* Days Grid */}
                        <View style={styles.daysGrid}>
                          {calendarDays.map((item, idx) => {
                            if (item.day === null) {
                              return <View key={`blank-${idx}`} style={styles.dayCell} />;
                            }

                            return (
                              <TouchableOpacity
                                key={`day-${item.day}`}
                                style={[
                                  styles.dayCell,
                                  item.isPast && styles.dayCellPast,
                                  item.isSelected && styles.dayCellSelected,
                                  item.isToday && !item.isSelected && styles.dayCellToday,
                                ]}
                                disabled={item.isPast}
                                onPress={() =>
                                  handleSelectDate(calendarYear, calendarMonth, item.day!)
                                }
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.dayCellText,
                                    item.isPast && styles.dayCellTextPast,
                                    item.isSelected && styles.dayCellTextSelected,
                                    item.isToday && !item.isSelected && styles.dayCellTextToday,
                                  ]}
                                >
                                  {item.day}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Date Readout */}
                        <View style={styles.calendarFooter}>
                          <Calendar size={13} color={colors.textSecondary} />
                          <Text style={styles.calendarFooterText}>
                            Selected Deadline: <Text style={styles.deadlineHighlight}>{deadlineStr}</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Inline validation error */}
                      {createStep1Error && (
                        <View style={styles.inlineErrorBanner}>
                          <AlertCircle size={13} color="#EF4444" />
                          <Text style={styles.inlineErrorText}>{createStep1Error}</Text>
                        </View>
                      )}
                    </View>
                  )}


                  {/* ================= STEP 2: CADENCE & SAVINGS PLAN ================= */}
                  {createStep === 2 && (
                    <View>
                      {/* Step 2 Back & Milestone Summary Bar */}
                      <View style={styles.step2SummaryBar}>
                        <TouchableOpacity
                          style={styles.backToStep1Btn}
                          onPress={() => setCreateStep(1)}
                          activeOpacity={0.7}
                        >
                          <ChevronLeft size={14} color={colors.accent} />
                          <Text style={styles.backToStep1Text}>Edit Details</Text>
                        </TouchableOpacity>

                        <View style={styles.summaryPill}>
                          <Text style={styles.summaryPillText} numberOfLines={1}>
                            {goalName} • ₹{parseFloat(targetAmountRupees || '0').toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>

                      {/* Deliberate ThoughtLine Optimization Step (min 2.5s duration + dynamic engine await) */}
                      {isOptimizing ? (
                        <View style={styles.thoughtLineContainer}>
                          <View style={styles.thinkingHeaderBlock}>
                            <Text style={styles.thinkingTitleText}>Analyzing Cash Flow Rhythm</Text>
                            <Text style={styles.thinkingSubtitleText}>
                              Evaluating 90-day debits & credits across bank accounts to project sustainable cadences
                            </Text>
                          </View>
                          <ThoughtLine
                            steps={GOAL_OPTIMIZATION_STATEMENTS}
                            isThinking={isOptimizing}
                            durationMs={0}
                            compact={false}
                            color={colors.accent}
                            settlePrefix="Cadences projected in"
                          />
                        </View>
                      ) : (
                        hasOptimized && (
                          <View>
                            {/* 90-Day Cash Flow Ratio Intelligence Card */}
                            {cashFlowAnalysis && (
                              <View style={styles.cashFlowInsightCard}>
                                <View style={styles.cashFlowInsightHeader}>
                                  <Sparkles size={13} color={colors.accent} />
                                  <Text style={styles.cashFlowInsightTitle}>90-DAY CASH FLOW INTELLIGENCE</Text>
                                </View>
                                <Text style={styles.cashFlowInsightText}>
                                  {cashFlowAnalysis.insightCallout}
                                </Text>
                              </View>
                            )}

                            {/* Milestone Summary Card */}
                            <View style={styles.milestoneCard}>
                              <View style={styles.milestoneCardTop}>
                                <Text style={styles.milestoneEyebrow}>TARGET MILESTONE</Text>
                                <View style={styles.milestoneDaysBadge}>
                                  <Clock size={11} color={colors.accent} />
                                  <Text style={styles.milestoneDaysText}>
                                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.milestoneMainRow}>
                                <Text style={styles.milestoneGoalName} numberOfLines={1}>
                                  {goalName}
                                </Text>
                                <Text style={styles.milestoneTargetAmount}>
                                  ₹{parseFloat(targetAmountRupees || '0').toLocaleString('en-IN')}
                                </Text>
                              </View>
                              <View style={styles.milestoneDeadlineRow}>
                                <Calendar size={12} color={colors.textTertiary} />
                                <Text style={styles.milestoneDeadlineText}>Deadline: {deadlineStr}</Text>
                              </View>
                            </View>

                            {/* If Reality Offer is needed (Stretch or Deficit), show 3-Way Pathways */}
                            {cashFlowAnalysis?.realityOffer?.isNeeded && (
                              <View style={{ marginBottom: spacing.md }}>
                                {/* Feasibility Alert Banner */}
                                <View
                                  style={[
                                    styles.realityHeaderBanner,
                                    cashFlowAnalysis.feasibilityBand === 'DEFICIT_CRITICAL'
                                      ? { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)' }
                                      : { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)' },
                                  ]}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <ShieldAlert
                                      size={14}
                                      color={cashFlowAnalysis.feasibilityBand === 'DEFICIT_CRITICAL' ? '#EF4444' : '#F59E0B'}
                                    />
                                    <Text
                                      style={[
                                        styles.realityHeaderTitle,
                                        { color: cashFlowAnalysis.feasibilityBand === 'DEFICIT_CRITICAL' ? '#EF4444' : '#F59E0B' },
                                      ]}
                                    >
                                      {cashFlowAnalysis.feasibilityBand === 'DEFICIT_CRITICAL'
                                        ? 'TARGET NEEDS ATTENTION'
                                        : 'TARGET IS ACHIEVABLE WITH CARE'}
                                    </Text>
                                  </View>
                                  <Text style={styles.realityHeaderDesc}>
                                    {cashFlowAnalysis.feasibilityBand === 'DEFICIT_CRITICAL'
                                      ? `At your current spending, this goal needs ₹${toRupees(cashFlowAnalysis.realityOffer.monthlyDeficitPaise).toLocaleString('en-IN')}/mo more than your safe cash flow. Choose one of three realistic paths below:`
                                      : `This goal is near your safe monthly surplus. Choose a path below to stay comfortable:`}
                                  </Text>
                                </View>

                                {/* Option 1: The Stress-Free Pace */}
                                <TouchableOpacity
                                  style={[
                                    styles.realityCard,
                                    selectedRealityOption === 'STRESS_FREE' && styles.realityCardSelected,
                                  ]}
                                  onPress={() => {
                                    setSelectedRealityOption('STRESS_FREE');
                                    setShowManualCadences(false);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.realityCardTopRow}>
                                    <Text style={[styles.realityCardEyebrow, { color: '#10B981' }]}>
                                      OPTION 1 · ZERO LIFESTYLE CHANGE
                                    </Text>
                                    <View
                                      style={[
                                        styles.radioCircle,
                                        selectedRealityOption === 'STRESS_FREE' && styles.radioCircleSelected,
                                      ]}
                                    >
                                      {selectedRealityOption === 'STRESS_FREE' && (
                                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                                      )}
                                    </View>
                                  </View>
                                  <Text style={styles.realityCardTitle}>The Stress-Free Pace</Text>
                                  <Text style={styles.realityCardExplanation}>
                                    {cashFlowAnalysis.realityOffer.optionStressFree.explanation}
                                  </Text>
                                  <View style={styles.realityStatsPill}>
                                    <Text style={styles.realityStatsPillText}>
                                      ₹{toRupees(cashFlowAnalysis.realityOffer.optionStressFree.monthlyInstallmentPaise).toLocaleString('en-IN')}/month · 99% Safe
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                {/* Option 2: The Envelope Trim Plan */}
                                <TouchableOpacity
                                  style={[
                                    styles.realityCard,
                                    selectedRealityOption === 'SACRIFICE' && styles.realityCardSelected,
                                  ]}
                                  onPress={() => {
                                    setSelectedRealityOption('SACRIFICE');
                                    setShowManualCadences(false);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.realityCardTopRow}>
                                    <Text style={[styles.realityCardEyebrow, { color: '#F59E0B' }]}>
                                      OPTION 2 · KEEP TARGET DATE
                                    </Text>
                                    <View
                                      style={[
                                        styles.radioCircle,
                                        selectedRealityOption === 'SACRIFICE' && styles.radioCircleSelected,
                                      ]}
                                    >
                                      {selectedRealityOption === 'SACRIFICE' && (
                                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                                      )}
                                    </View>
                                  </View>
                                  <Text style={styles.realityCardTitle}>The Envelope Trim Plan</Text>
                                  <Text style={styles.realityCardExplanation}>
                                    {cashFlowAnalysis.realityOffer.optionSacrifice.explanation}
                                  </Text>

                                  {/* Envelope Cuts Breakdown */}
                                  {cashFlowAnalysis.realityOffer.optionSacrifice.cuts.length > 0 && (
                                    <View style={styles.realityCutsList}>
                                      {cashFlowAnalysis.realityOffer.optionSacrifice.cuts.map((cut, idx) => (
                                        <View key={`cut-${idx}`} style={styles.realityCutRow}>
                                          <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.realityCutName}>{cut.envelopeName}</Text>
                                            <Text style={styles.realityCutHint}>{cut.plainHint}</Text>
                                          </View>
                                          <Text style={styles.realityCutAmount}>
                                            -₹{toRupees(cut.cutMonthlyPaise).toLocaleString('en-IN')}/mo
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                  )}

                                  <View style={styles.realityStatsPill}>
                                    <Text style={[styles.realityStatsPillText, { color: '#F59E0B' }]}>
                                      -₹{toRupees(cashFlowAnalysis.realityOffer.optionSacrifice.totalMonthlyCutPaise).toLocaleString('en-IN')}/month from flexible buckets
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                {/* Option 3: The Seed & Sprint Plan */}
                                {cashFlowAnalysis.realityOffer.optionSeedSprint && (
                                  <TouchableOpacity
                                    style={[
                                      styles.realityCard,
                                      selectedRealityOption === 'SEED_SPRINT' && styles.realityCardSelected,
                                    ]}
                                    onPress={() => {
                                      setSelectedRealityOption('SEED_SPRINT');
                                      setShowManualCadences(false);
                                    }}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.realityCardTopRow}>
                                      <Text style={[styles.realityCardEyebrow, { color: colors.accent }]}>
                                        OPTION 3 · USE IDLE CASH
                                      </Text>
                                      <View
                                        style={[
                                          styles.radioCircle,
                                          selectedRealityOption === 'SEED_SPRINT' && styles.radioCircleSelected,
                                        ]}
                                      >
                                        {selectedRealityOption === 'SEED_SPRINT' && (
                                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                                        )}
                                      </View>
                                    </View>
                                    <Text style={styles.realityCardTitle}>The Seed & Sprint Plan</Text>
                                    <Text style={styles.realityCardExplanation}>
                                      {cashFlowAnalysis.realityOffer.optionSeedSprint.explanation}
                                    </Text>
                                    <View style={styles.realityStatsPill}>
                                      <Text style={styles.realityStatsPillText}>
                                        Pay ₹{toRupees(cashFlowAnalysis.realityOffer.optionSeedSprint.reducedMonthlyInstallmentPaise).toLocaleString('en-IN')}/month after seed
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                )}

                                {/* Toggle Standard Schedules */}
                                <TouchableOpacity
                                  style={styles.toggleManualCadencesBtn}
                                  onPress={() => {
                                    const next = !showManualCadences;
                                    setShowManualCadences(next);
                                    if (next) {
                                      setSelectedRealityOption('NONE');
                                    } else {
                                      setSelectedRealityOption('STRESS_FREE');
                                    }
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.toggleManualCadencesText}>
                                    {showManualCadences
                                      ? '▲ Hide standard schedules'
                                      : '▼ Or choose a standard monthly / weekly schedule'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Standard Contribution Frequency Cards (Visible when no reality offer or user toggles) */}
                            {(!cashFlowAnalysis?.realityOffer?.isNeeded || showManualCadences) && (
                              <View>
                                <Text style={styles.cadenceSectionTitle}>CHOOSE CONTRIBUTION FREQUENCY</Text>

                                <View style={styles.cadenceStackContainer}>
                                  {[
                                    {
                                      key: 'DAILY' as GoalCadence,
                                      label: 'Daily',
                                      amountPaise: dailyInstallmentPaise,
                                      periodLabel: '/ day',
                                      scheduleText: `${daysRemaining} daily installments`,
                                      insight: cashFlowAnalysis?.cadences?.DAILY,
                                      disabled: !cashFlowAnalysis?.isDailyAllowed,
                                    },
                                    {
                                      key: 'WEEKLY' as GoalCadence,
                                      label: 'Weekly',
                                      amountPaise: weeklyInstallmentPaise,
                                      periodLabel: '/ week',
                                      scheduleText: `${Math.ceil(daysRemaining / 7)} weekly installments`,
                                      insight: cashFlowAnalysis?.cadences?.WEEKLY,
                                      disabled: false,
                                    },
                                    {
                                      key: 'MONTHLY' as GoalCadence,
                                      label: 'Monthly',
                                      amountPaise: monthlyInstallmentPaise,
                                      periodLabel: '/ month',
                                      scheduleText: `${Math.max(1, Math.ceil(daysRemaining / 30))} monthly installments`,
                                      insight: cashFlowAnalysis?.cadences?.MONTHLY,
                                      disabled: false,
                                    },
                                  ].map((item) => {
                                    const isSelected = selectedRealityOption === 'NONE' && cadence === item.key;

                                    return (
                                      <TouchableOpacity
                                        key={item.key}
                                        style={[
                                          styles.cadenceRowCard,
                                          isSelected && styles.cadenceRowCardSelected,
                                          item.disabled && { opacity: 0.65 },
                                        ]}
                                        onPress={() => {
                                          setSelectedRealityOption('NONE');
                                          setCadence(item.key);
                                        }}
                                        activeOpacity={0.8}
                                      >
                                        <View style={styles.cadenceRowLeft}>
                                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text
                                              style={[
                                                styles.cadenceRowTitle,
                                                isSelected && styles.cadenceRowTitleSelected,
                                              ]}
                                            >
                                              {item.label}
                                            </Text>
                                            {item.insight && (
                                              <View
                                                style={[
                                                  styles.sustainabilityBadge,
                                                  { backgroundColor: `${item.insight.badgeColor}22` },
                                                ]}
                                              >
                                                <Text
                                                  style={[
                                                    styles.sustainabilityBadgeText,
                                                    { color: item.insight.badgeColor },
                                                  ]}
                                                >
                                                  {item.insight.badgeLabel}
                                                </Text>
                                              </View>
                                            )}
                                          </View>
                                          <Text style={styles.cadenceRowSchedule}>
                                            {item.scheduleText}
                                          </Text>
                                          {item.insight?.pacingSummary && (
                                            <Text style={styles.cadencePacingSummaryText}>
                                              {item.insight.pacingSummary}
                                            </Text>
                                          )}
                                        </View>

                                        <View style={styles.cadenceRowRight}>
                                          <View style={styles.amountWrap}>
                                            <Text
                                              style={[
                                                styles.cadenceRowAmount,
                                                isSelected && styles.cadenceRowAmountSelected,
                                              ]}
                                            >
                                              {formatPaise(item.amountPaise, false)}
                                            </Text>
                                            <Text style={styles.cadenceRowPeriod}>{item.periodLabel}</Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.radioCircle,
                                              isSelected && styles.radioCircleSelected,
                                            ]}
                                          >
                                            {isSelected && (
                                              <Check size={11} color="#FFFFFF" strokeWidth={3} />
                                            )}
                                          </View>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </View>
                            )}

                            {/* Optional Initial Funding (Hidden if Seed & Sprint option is active) */}
                            {selectedRealityOption !== 'SEED_SPRINT' && (
                              <View>
                                <Text style={styles.inputLabel}>
                                  Initial Funding (Optional, from Unallocated)
                                </Text>
                                <TextInput
                                  style={styles.input}
                                  placeholder={`Available: ₹${unallocatedBalance.toLocaleString('en-IN')}`}
                                  placeholderTextColor={colors.textTertiary}
                                  keyboardType="numeric"
                                  value={initialFundingRupees}
                                  onChangeText={setInitialFundingRupees}
                                />
                              </View>
                            )}

                            {/* Inline error feedback if goal creation fails */}
                            {createStep2Error && (
                              <View style={styles.inlineErrorBanner}>
                                <AlertCircle size={13} color="#EF4444" />
                                <Text style={styles.inlineErrorText}>{createStep2Error}</Text>
                              </View>
                            )}

                          </View>
                        )
                      )}
                    </View>
                  )}
                </ScrollView>

                {/* Sticky Action Footer - Always visible, never clipped or out of bounds! */}
                <View style={styles.modalFooter}>
                  {createStep === 1 ? (
                    <Button
                      title="Continue to Savings Plan →"
                      variant="accent"
                      size="lg"
                      onPress={handleProceedToStep2}
                      disabled={!goalName.trim() || !(parseFloat(targetAmountRupees) > 0)}
                      style={styles.modalFooterBtn}
                    />
                  ) : (
                    !isOptimizing && hasOptimized && (
                      <Button
                        title={
                          selectedRealityOption === 'STRESS_FREE' && cashFlowAnalysis?.realityOffer?.isNeeded
                            ? 'Confirm Stress-Free Goal →'
                            : selectedRealityOption === 'SACRIFICE' && cashFlowAnalysis?.realityOffer?.isNeeded
                            ? 'Confirm & Trim Envelopes →'
                            : selectedRealityOption === 'SEED_SPRINT' && cashFlowAnalysis?.realityOffer?.isNeeded
                            ? 'Confirm & Seed Goal →'
                            : 'Create Goal & Link Bucket'
                        }
                        variant="accent"
                        size="lg"
                        onPress={handleCreateGoal}
                        style={styles.modalFooterBtn}
                      />
                    )
                  )}
                </View>
              </View>

            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Move Money / Recover Shortfall Modal */}
        <Modal visible={!!selectedGoal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {activeShortfall ? 'Recover Shortfall' : 'Move Money to Goal'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedGoal(null);
                      setActiveShortfall(null);
                      setTransferErrorMessage(null);
                      setTransferSuccessMessage(null);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {selectedGoal && (
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.modalSubtitle}>
                      Moving money into{' '}
                      <Text style={{ color: colors.accent, fontWeight: '700' }}>
                        {selectedGoal.name}
                      </Text>
                      . Your observed bank cash remains completely unchanged.
                    </Text>

                    <Text style={styles.inputLabel}>Select Source</Text>
                    <View style={styles.sourceList}>
                      {/* Unallocated Cash Option */}
                      <TouchableOpacity
                        style={[
                          styles.sourceItem,
                          sourceEnvelopeId === 'unallocated' && styles.sourceItemActive,
                        ]}
                        onPress={() => {
                          setSourceEnvelopeId('unallocated');
                          setTransferErrorMessage(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text style={styles.sourceName}>Unallocated Cash</Text>
                          <Text style={styles.sourceBalance}>
                            Available: ₹{unallocatedBalance.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        {sourceEnvelopeId === 'unallocated' && (
                          <CheckCircle size={16} color={colors.accent} />
                        )}
                      </TouchableOpacity>

                      {envelopes
                        .filter((e) => e.id !== selectedGoal.envelopeId)
                        .map((env) => {
                          const isSelected = sourceEnvelopeId === env.id;
                          return (
                            <TouchableOpacity
                              key={env.id}
                              style={[styles.sourceItem, isSelected && styles.sourceItemActive]}
                              onPress={() => {
                                setSourceEnvelopeId(env.id);
                                setTransferErrorMessage(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <View>
                                <Text style={styles.sourceName}>{env.name}</Text>
                                <Text style={styles.sourceBalance}>
                                  Available: ₹{env.currentAmount.toLocaleString('en-IN')}
                                </Text>
                              </View>
                              {isSelected && <CheckCircle size={16} color={colors.accent} />}
                            </TouchableOpacity>
                          );
                        })}
                    </View>

                    <View style={styles.amountLabelRow}>
                      <Text style={styles.inputLabel}>Transfer Amount (₹)</Text>
                      {activeShortfall && (
                        <TouchableOpacity
                          onPress={() => {
                            setTransferAmountRupees(
                              toRupees(activeShortfall.shortfallAmountPaise).toString()
                            );
                            setTransferErrorMessage(null);
                          }}
                          style={styles.fillShortfallChip}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.fillShortfallText}>
                            Fill Shortfall (₹{toRupees(activeShortfall.shortfallAmountPaise).toLocaleString('en-IN')})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter amount in ₹"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      value={transferAmountRupees}
                      onChangeText={(val) => {
                        setTransferAmountRupees(val);
                        setTransferErrorMessage(null);
                      }}
                    />

                    {/* Quick Amount Preset Chips */}
                    <View style={styles.presetChipsRowSmall}>
                      {[500, 1000, 2000].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.quickAmtChip}
                          onPress={() => {
                            setTransferAmountRupees(amt.toString());
                            setTransferErrorMessage(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickAmtChipText}>+₹{amt.toLocaleString('en-IN')}</Text>
                        </TouchableOpacity>
                      ))}
                      {sourceAvailable > 0 && (
                        <TouchableOpacity
                          style={styles.quickAmtChip}
                          onPress={() => {
                            setTransferAmountRupees(sourceAvailable.toString());
                            setTransferErrorMessage(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickAmtChipText}>Max Available</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Inline Error Banner */}
                    {transferErrorMessage && (
                      <View style={styles.inlineErrorBanner}>
                        <AlertCircle size={13} color="#EF4444" />
                        <Text style={styles.inlineErrorText}>{transferErrorMessage}</Text>
                      </View>
                    )}

                    {/* Inline Success Banner */}
                    {transferSuccessMessage && (
                      <View style={styles.inlineSuccessBanner}>
                        <CheckCircle size={15} color="#10B981" />
                        <Text style={styles.inlineSuccessText}>{transferSuccessMessage}</Text>
                      </View>
                    )}

                    <Button
                      title={transferSuccessMessage ? 'Transferred!' : 'Confirm & Move Money'}
                      variant="accent"
                      size="lg"
                      onPress={handleConfirmTransfer}
                      disabled={
                        !transferAmountRupees ||
                        parseFloat(transferAmountRupees) <= 0 ||
                        parseFloat(transferAmountRupees) > sourceAvailable ||
                        !!transferSuccessMessage
                      }
                      style={{ marginTop: spacing.md }}
                    />
                  </ScrollView>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Custom Delete Confirmation Modal */}
        <Modal visible={!!goalToDelete} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModalContent}>
              <View style={styles.deleteIconCircle}>
                <Trash2 size={24} color="#EF4444" strokeWidth={2.4} />
              </View>
              <Text style={styles.confirmModalTitle}>Delete Goal?</Text>
              <Text style={styles.confirmModalSubtitle}>
                Are you sure you want to delete{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  "{goalToDelete?.name}"
                </Text>
                ?
                {goalToDelete && goalToDelete.currentBalancePaise > 0
                  ? ` All saved funds (${formatPaise(goalToDelete.currentBalancePaise, false)}) will be safely returned to Unallocated Cash.`
                  : ' This action cannot be undone.'}
              </Text>

              <View style={styles.confirmModalActions}>
                <TouchableOpacity
                  style={styles.cancelActionBtn}
                  onPress={() => setGoalToDelete(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelActionText}>Keep Goal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteActionBtn}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteActionText}>Delete Goal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Custom Pause Confirmation Modal */}
        <Modal visible={!!goalToPause} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModalContent}>
              <View style={styles.pauseIconCircle}>
                <Pause size={24} color="#F59E0B" strokeWidth={2.4} />
              </View>
              <Text style={styles.confirmModalTitle}>Pause Goal Contributions?</Text>
              <Text style={styles.confirmModalSubtitle}>
                Scheduled installments for{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  "{goalToPause?.name}"
                </Text>{' '}
                will be placed on hold. You can resume anytime without losing any saved progress.
              </Text>

              <View style={styles.confirmModalActions}>
                <TouchableOpacity
                  style={styles.cancelActionBtn}
                  onPress={() => setGoalToPause(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelActionText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pauseActionBtn}
                  onPress={handleConfirmPause}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pauseActionText}>Pause Goal</Text>
                </TouchableOpacity>
              </View>
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
    gap: spacing.sm,
  },
  topBarHeaderLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
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
    lineHeight: 16,
  },
  topBarRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleRubber: {
    marginRight: 0,
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  addGoalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingBottom: 100,
  },
  gridGoalCard: {
    width: '48.2%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  gridIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  gridGoalName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    minHeight: 34,
    marginTop: 4,
    lineHeight: 17,
  },
  gridAmountsGroup: {
    marginVertical: 6,
  },
  gridSavedText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  gridTargetText: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  gridProgressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    marginVertical: 4,
  },
  gridProgressBarFill: {
    height: '100%',
    borderRadius: borderRadius.pill,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gridCadencePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gridCadenceText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gridPercentText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  gridShortfallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gridShortfallText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.statusWarning,
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
    flex: 1,
    marginRight: spacing.sm,
  },
  goalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  goalTitleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  goalNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  goalEmotionalTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalKeyboardContainer: {
    width: '100%',
    maxHeight: '90%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: borderRadius.pill,
    borderTopRightRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '100%',
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modalHeaderTitleGroup: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(94, 106, 210, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.35)',
    marginBottom: 4,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
  },
  modalFooter: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalFooterBtn: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  inputLabelNoMargin: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deadlineDaysCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  presetPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetPillActive: {
    backgroundColor: 'rgba(94, 106, 210, 0.22)',
    borderColor: colors.accent,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetPillTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceBase,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.default,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  // Calendar Selector Styles
  dateSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  calendarContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  calendarNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekdayText: {
    width: '14%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    borderRadius: 6,
  },
  dayCellPast: {
    opacity: 0.25,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dayCellSelected: {
    backgroundColor: colors.accent,
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayCellTextPast: {
    color: colors.textDisabled,
  },
  dayCellTextToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  calendarFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deadlineHighlight: {
    color: colors.accent,
    fontWeight: '700',
  },
  step2SummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  backToStep1Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backToStep1Text: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  summaryPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    maxWidth: '65%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  thoughtLineContainer: {
    marginVertical: spacing.lg,
    paddingVertical: spacing.md,
  },
  thinkingHeaderBlock: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  thinkingTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  thinkingSubtitleText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 290,
  },
  cashFlowInsightCard: {
    backgroundColor: 'rgba(94, 106, 210, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.22)',
    borderRadius: borderRadius.default,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cashFlowInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cashFlowInsightTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.1,
  },
  cashFlowInsightText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  sustainabilityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
    marginLeft: 6,
  },
  sustainabilityBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cadencePacingSummaryText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  milestoneCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  milestoneCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  milestoneEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  milestoneDaysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(94, 106, 210, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: borderRadius.full,
  },
  milestoneDaysText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  milestoneMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  milestoneGoalName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  milestoneTargetAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  milestoneDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  milestoneDeadlineText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  cadenceSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  cadenceStackContainer: {
    gap: 8,
    marginBottom: spacing.md,
  },
  cadenceRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cadenceRowCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
  },
  cadenceRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  cadenceRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cadenceRowTitleSelected: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  cadenceRowSchedule: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  cadenceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  cadenceRowAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  cadenceRowAmountSelected: {
    color: colors.accent,
  },
  cadenceRowPeriod: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBase,
  },
  radioCircleSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  createSubmitBtn: {
    marginTop: spacing.md,
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
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: spacing.xs,
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  inlineSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: spacing.xs,
  },
  inlineSuccessText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
    flex: 1,
  },
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  fillShortfallChip: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: borderRadius.sm,
  },
  fillShortfallText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.statusWarning,
  },
  presetChipsRowSmall: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  quickAmtChip: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  quickAmtChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmModalContent: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  deleteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pauseIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.default,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteActionBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.default,
    alignItems: 'center',
  },
  deleteActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pauseActionBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.default,
    alignItems: 'center',
  },
  pauseActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  // 3-Way Reality Option Deck Styles
  realityHeaderBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  realityHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  realityHeaderDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  realityCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
    marginBottom: 10,
  },
  realityCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
  },
  realityCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  realityCardEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  realityCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  realityCardExplanation: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  realityCutsList: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  realityCutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  realityCutName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  realityCutHint: {
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  realityCutAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  realityStatsPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    marginTop: 2,
  },
  realityStatsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  toggleManualCadencesBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  toggleManualCadencesText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },
});
