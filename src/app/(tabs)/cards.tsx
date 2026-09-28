import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { CreditCard } from '../../components/ui/CreditCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  PlusCircle,
  ArrowDownRight,
  ArrowLeftRight,
  X,
  PieChart,
  CheckCircle,
  AlertCircle,
  ReceiptText,
  Trash2,
  Check,
} from 'lucide-react-native';

export default function CardsScreen() {
  const {
    user,
    trackedBalance,
    allocatedBalance,
    unallocatedBalance,
    envelopes,
    addMoney,
    allocateToEnvelope,
    transferBetweenEnvelopes,
    recordManualSpend,
    deleteEnvelope,
  } = useAppStore();

  // Modals
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmountStr, setAddAmountStr] = useState('');

  const [showAllocate, setShowAllocate] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState<string>('');
  const [allocateAmountStr, setAllocateAmountStr] = useState('');

  const [showMoveBetween, setShowMoveBetween] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [moveDestId, setMoveDestId] = useState<string>('');
  const [moveAmountStr, setMoveAmountStr] = useState('');

  // Manual Spend Modal
  const [showManualSpend, setShowManualSpend] = useState(false);
  const [manualSpendBucketId, setManualSpendBucketId] = useState<string>('');
  const [manualSpendAmount, setManualSpendAmount] = useState<string>('');
  const [manualSpendNote, setManualSpendNote] = useState<string>('');

  // Delete Bucket with Checkboxes Modal
  const [bucketToDelete, setBucketToDelete] = useState<any | null>(null);
  const [deleteActivityOption, setDeleteActivityOption] = useState<boolean>(false);

  // Proportions calculation
  const total = Math.max(trackedBalance, 1);
  const allocatedRatio = Math.min(Math.max(allocatedBalance / total, 0), 1);
  const unallocatedRatio = Math.min(Math.max(unallocatedBalance / total, 0), 1);
  const allocatedPct = Math.round(allocatedRatio * 100);
  const unallocatedPct = 100 - allocatedPct;

  // Add Money Handler
  const handleConfirmAddMoney = async () => {
    const amount = parseFloat(addAmountStr.replace(/,/g, '').trim());
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than ₹0');
      return;
    }

    try {
      await addMoney(amount);
      setAddAmountStr('');
      setShowAddMoney(false);
      Alert.alert(
        'Money Added',
        `₹${amount.toLocaleString('en-IN')} added to your Unallocated funds, ready to be put into buckets.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add money');
    }
  };

  // Quick Preset for Add Money
  const handleAddPreset = (val: number) => {
    const current = parseFloat(addAmountStr.replace(/,/g, '')) || 0;
    setAddAmountStr((current + val).toString());
  };

  // Quick Preset for Allocation (% of unallocated)
  const handleAllocatePctPreset = (pct: number) => {
    if (unallocatedBalance <= 0) return;
    const val = Math.round((pct / 100) * unallocatedBalance);
    setAllocateAmountStr(val.toString());
  };

  // Allocate from Unallocated Handler
  const handleConfirmAllocate = async () => {
    const amount = parseFloat(allocateAmountStr.replace(/,/g, '').trim());
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than ₹0');
      return;
    }

    if (!selectedDestId) {
      Alert.alert('Selection Error', 'Please select a destination bucket');
      return;
    }

    if (amount > unallocatedBalance) {
      Alert.alert(
        'Insufficient Unallocated Funds',
        `You only have ₹${unallocatedBalance.toLocaleString('en-IN')} left to allocate.`
      );
      return;
    }

    try {
      await allocateToEnvelope(selectedDestId, amount);
      setAllocateAmountStr('');
      setShowAllocate(false);
      const destBucket = envelopes.find((e) => e.id === selectedDestId);
      Alert.alert(
        'Allocated Successfully',
        `₹${amount.toLocaleString('en-IN')} put into "${destBucket?.name || 'bucket'}".`
      );
    } catch (err: any) {
      Alert.alert('Allocation Error', err.message || 'Could not allocate funds');
    }
  };

  // Move Between Buckets Handler
  const handleConfirmMoveBetween = async () => {
    const amount = parseFloat(moveAmountStr.replace(/,/g, '').trim());
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than ₹0');
      return;
    }

    if (!selectedSourceId || !moveDestId) {
      Alert.alert('Selection Error', 'Please select both source and destination buckets');
      return;
    }

    if (selectedSourceId === moveDestId) {
      Alert.alert('Selection Error', 'Source and destination buckets must be different');
      return;
    }

    const srcBucket = envelopes.find((e) => e.id === selectedSourceId);
    if (!srcBucket || srcBucket.currentAmount < amount) {
      Alert.alert(
        'Insufficient Bucket Balance',
        `"${srcBucket?.name || 'Source bucket'}" only has ₹${(srcBucket?.currentAmount || 0).toLocaleString('en-IN')}`
      );
      return;
    }

    try {
      await transferBetweenEnvelopes(selectedSourceId, moveDestId, amount);
      setMoveAmountStr('');
      setShowMoveBetween(false);
      Alert.alert('Transfer Complete', `₹${amount.toLocaleString('en-IN')} moved successfully.`);
    } catch (err: any) {
      Alert.alert('Transfer Error', err.message || 'Could not move funds');
    }
  };

  // Manual Spend Handler
  const handleConfirmManualSpend = async () => {
    const amount = parseFloat(manualSpendAmount.replace(/,/g, '').trim());
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than ₹0');
      return;
    }

    if (!manualSpendBucketId) {
      Alert.alert('Selection Error', 'Please select a bucket to deduct from');
      return;
    }

    const bucket = envelopes.find((e) => e.id === manualSpendBucketId);
    if (!bucket || bucket.currentAmount < amount) {
      Alert.alert(
        'Insufficient Bucket Balance',
        `"${bucket?.name || 'Selected bucket'}" only has ₹${(bucket?.currentAmount || 0).toLocaleString('en-IN')}`
      );
      return;
    }

    try {
      await recordManualSpend(manualSpendBucketId, amount, manualSpendNote.trim() || undefined);
      setManualSpendAmount('');
      setManualSpendNote('');
      setShowManualSpend(false);
      Alert.alert(
        'Spend Recorded',
        `₹${amount.toLocaleString('en-IN')} deducted from "${bucket.name}".`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record spend');
    }
  };

  // Confirm Delete Bucket Handler
  const handleConfirmDeleteBucket = async () => {
    if (!bucketToDelete) return;
    try {
      await deleteEnvelope(bucketToDelete.id, deleteActivityOption);
      const name = bucketToDelete.name;
      setBucketToDelete(null);
      setDeleteActivityOption(false);
      Alert.alert('Bucket Deleted', `"${name}" has been deleted.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not delete bucket');
    }
  };

  const parsedAllocateAmount = parseFloat(allocateAmountStr.replace(/,/g, '')) || 0;
  const remainingUnallocatedAfter = Math.max(0, unallocatedBalance - parsedAllocateAmount);
  const isOverAllocating = parsedAllocateAmount > unallocatedBalance;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.985}
        scrollEventThrottle={16}
        overScrollMode="never"
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CARDS & ALLOCATION</Text>
        </View>

        {/* 3D Flip Credit Card */}
        <View style={styles.cardContainer}>
          <CreditCard
            username={user?.username}
            trackedBalance={trackedBalance}
            allocatedBalance={allocatedBalance}
            unallocatedBalance={unallocatedBalance}
            network="mob"
          />
        </View>

        {/* Proportions Breakdown Section: How much money is left to be allocated */}
        <View style={styles.proportionsCard}>
          <View style={styles.proportionsHeader}>
            <View style={styles.proportionsTitleGroup}>
              <PieChart size={15} color={colors.accent} />
              <Text style={styles.proportionsTitle}>BUDGET PROPORTIONS</Text>
            </View>
          </View>

          {/* Metric Columns */}
          <View style={styles.metricsRow}>
            {/* In Buckets (Allocated) */}
            <View style={styles.metricColumn}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.metricDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.metricLabel}>IN BUCKETS</Text>
              </View>
              <Text style={styles.metricValue}>
                ₹{allocatedBalance.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.metricSub}>
                {allocatedPct}% in {envelopes.length} bucket{envelopes.length === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            {/* Left to Allocate (Unallocated) */}
            <View style={styles.metricColumn}>
              <View style={styles.metricLabelRow}>
                <View
                  style={[
                    styles.metricDot,
                    { backgroundColor: unallocatedBalance > 0 ? '#1DB954' : '#64748B' },
                  ]}
                />
                <Text style={styles.metricLabel}>LEFT TO ALLOCATE</Text>
              </View>
              <Text style={[styles.metricValue, { color: unallocatedBalance > 0 ? '#1DB954' : colors.textSecondary }]}>
                ₹{unallocatedBalance.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.metricSub}>
                {unallocatedPct}% of total funds
              </Text>
            </View>
          </View>

          {/* Visual Proportion Bar */}
          <View style={styles.proportionBarTrack}>
            <View
              style={[
                styles.proportionBarAllocated,
                { width: `${allocatedPct}%` },
              ]}
            />
            <View
              style={[
                styles.proportionBarUnallocated,
                { width: `${unallocatedPct}%` },
              ]}
            />
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionsSection}>
          <View style={styles.primaryActionRow}>
            {/* Add Money Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.addMoneyBtn]}
              activeOpacity={0.8}
              onPress={() => setShowAddMoney(true)}
            >
              <PlusCircle size={18} color="#FFFFFF" />
              <Text style={styles.addMoneyBtnText}>Add Money</Text>
            </TouchableOpacity>

            {/* Put into Bucket (Allocate) Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.allocateBtn,
                unallocatedBalance <= 0 && styles.allocateBtnDisabled,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (envelopes.length > 0) {
                  setSelectedDestId(envelopes[0].id);
                }
                setShowAllocate(true);
              }}
            >
              <ArrowDownRight
                size={18}
                color={unallocatedBalance > 0 ? colors.accent : colors.textTertiary}
              />
              <Text
                style={[
                  styles.allocateBtnText,
                  unallocatedBalance <= 0 && { color: colors.textTertiary },
                ]}
              >
                Put into Bucket
              </Text>
            </TouchableOpacity>
          </View>

          {/* Move Between Buckets Secondary Button */}
          {envelopes.length > 1 && (
            <TouchableOpacity
              style={styles.moveBetweenBtn}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedSourceId(envelopes[0].id);
                setMoveDestId(envelopes[1].id);
                setShowMoveBetween(true);
              }}
            >
              <ArrowLeftRight size={14} color={colors.textSecondary} />
              <Text style={styles.moveBetweenBtnText}>Move Between Buckets</Text>
            </TouchableOpacity>
          )}

          {/* Small label: MANUAL ENTRY */}
          {envelopes.length > 0 && (
            <View style={styles.manualEntryContainer}>
              <Text style={styles.manualEntrySmallLabel}>MANUAL ENTRY</Text>

              {/* Record Offline Spend Button */}
              <TouchableOpacity
                style={styles.manualSpendBtn}
                activeOpacity={0.7}
                onPress={() => {
                  if (envelopes.length > 0) {
                    setManualSpendBucketId(envelopes[0].id);
                  }
                  setShowManualSpend(true);
                }}
              >
                <ReceiptText size={15} color={colors.textSecondary} strokeWidth={2.2} />
                <Text style={styles.manualSpendBtnText}>Record Offline Spend</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bucket Proportions Quick Glance */}
        {envelopes.length > 0 && (
          <View style={styles.bucketGlanceSection}>
            <Text style={styles.bucketGlanceTitle}>CURRENT BUCKET SHARES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bucketGlanceScroll}>
              {envelopes.map((bucket) => {
                const sharePct = total > 0 ? Math.round((bucket.currentAmount / total) * 100) : 0;
                return (
                  <View key={`glance-${bucket.id}`} style={styles.bucketGlanceItem}>
                    <View style={styles.bucketGlanceHeader}>
                      <View style={styles.bucketGlanceLeft}>
                        <View style={[styles.glanceDot, { backgroundColor: bucket.color || colors.accent }]} />
                        <Text style={styles.glanceName} numberOfLines={1}>
                          {bucket.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.glanceDeleteBtn}
                        onPress={() => {
                          setBucketToDelete(bucket);
                          setDeleteActivityOption(false);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Delete ${bucket.name}`}
                      >
                        <Trash2 size={12} color="#666666" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.glanceAmount}>
                      ₹{bucket.currentAmount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.glancePct}>{sharePct}% of total</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL: ADD MONEY ================= */}
      <Modal visible={showAddMoney} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money to Balance</Text>
              <TouchableOpacity onPress={() => setShowAddMoney(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Explanatory Proportions Card */}
            <View style={styles.modalProportionInfo}>
              <Text style={styles.modalInfoLabel}>Current Left to Allocate:</Text>
              <Text style={styles.modalInfoValue}>
                ₹{unallocatedBalance.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.modalInfoSub}>
                Funds added will go directly into your unallocated pool, ready to be put into buckets.
              </Text>
            </View>

            {/* Quick Add Presets */}
            <View style={styles.presetRow}>
              {[500, 1000, 2000, 5000].map((preset) => (
                <TouchableOpacity
                  key={`add-preset-${preset}`}
                  style={styles.presetChip}
                  onPress={() => handleAddPreset(preset)}
                >
                  <Text style={styles.presetChipText}>+₹{preset.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Amount to Add (₹)"
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={addAmountStr}
              onChangeText={setAddAmountStr}
            />

            <Button
              title="Add to Unallocated Pool"
              variant="accent"
              size="lg"
              onPress={handleConfirmAddMoney}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: PUT INTO BUCKET (ALLOCATE) ================= */}
      <Modal visible={showAllocate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Put into Bucket</Text>
              <TouchableOpacity onPress={() => setShowAllocate(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Available to Allocate Banner */}
            <View style={styles.modalAvailableBanner}>
              <View>
                <Text style={styles.availableBannerLabel}>LEFT TO ALLOCATE</Text>
                <Text style={styles.availableBannerAmount}>
                  ₹{unallocatedBalance.toLocaleString('en-IN')}
                </Text>
              </View>
              {parsedAllocateAmount > 0 && !isOverAllocating && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.availableBannerLabel}>WILL REMAIN</Text>
                  <Text style={styles.remainingAfterText}>
                    ₹{remainingUnallocatedAfter.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Percentage Presets */}
            <View style={styles.presetRow}>
              {[25, 50, 75, 100].map((pct) => (
                <TouchableOpacity
                  key={`pct-preset-${pct}`}
                  style={styles.presetChip}
                  onPress={() => handleAllocatePctPreset(pct)}
                >
                  <Text style={styles.presetChipText}>
                    {pct === 100 ? 'All (100%)' : `${pct}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Destination Bucket Selector */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Select Destination Bucket:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {envelopes.map((b) => (
                  <TouchableOpacity
                    key={`dest-${b.id}`}
                    style={[
                      styles.bucketChip,
                      selectedDestId === b.id && styles.bucketChipActive,
                    ]}
                    onPress={() => setSelectedDestId(b.id)}
                  >
                    <View style={[styles.chipColorDot, { backgroundColor: b.color || colors.accent }]} />
                    <Text
                      style={[
                        styles.bucketChipText,
                        selectedDestId === b.id && styles.bucketChipTextActive,
                      ]}
                    >
                      {b.name} (₹{b.currentAmount.toLocaleString('en-IN')})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Input
              label="Amount to Put into Bucket (₹)"
              placeholder="e.g. 1500"
              keyboardType="numeric"
              value={allocateAmountStr}
              onChangeText={setAllocateAmountStr}
            />

            {isOverAllocating && (
              <View style={styles.overAllocatingAlert}>
                <AlertCircle size={14} color={colors.statusError} />
                <Text style={styles.overAllocatingText}>
                  Exceeds unallocated balance of ₹{unallocatedBalance.toLocaleString('en-IN')}.
                </Text>
              </View>
            )}

            <Button
              title="Confirm Allocation"
              variant="accent"
              size="lg"
              disabled={isOverAllocating || unallocatedBalance <= 0}
              onPress={handleConfirmAllocate}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: MOVE BETWEEN BUCKETS ================= */}
      <Modal visible={showMoveBetween} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move Between Buckets</Text>
              <TouchableOpacity onPress={() => setShowMoveBetween(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Source Bucket Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Source Bucket (Deduct from):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {envelopes.map((b) => (
                  <TouchableOpacity
                    key={`src-${b.id}`}
                    style={[
                      styles.bucketChip,
                      selectedSourceId === b.id && styles.bucketChipActive,
                    ]}
                    onPress={() => setSelectedSourceId(b.id)}
                  >
                    <View style={[styles.chipColorDot, { backgroundColor: b.color || colors.accent }]} />
                    <Text
                      style={[
                        styles.bucketChipText,
                        selectedSourceId === b.id && styles.bucketChipTextActive,
                      ]}
                    >
                      {b.name} (₹{b.currentAmount.toLocaleString('en-IN')})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Destination Bucket Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Destination Bucket (Move to):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {envelopes.map((b) => (
                  <TouchableOpacity
                    key={`move-dest-${b.id}`}
                    style={[
                      styles.bucketChip,
                      moveDestId === b.id && styles.bucketChipActive,
                    ]}
                    onPress={() => setMoveDestId(b.id)}
                  >
                    <View style={[styles.chipColorDot, { backgroundColor: b.color || colors.accent }]} />
                    <Text
                      style={[
                        styles.bucketChipText,
                        moveDestId === b.id && styles.bucketChipTextActive,
                      ]}
                    >
                      {b.name} (₹{b.currentAmount.toLocaleString('en-IN')})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Input
              label="Amount to Transfer (₹)"
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={moveAmountStr}
              onChangeText={setMoveAmountStr}
            />

            <Button
              title="Transfer Between Buckets"
              variant="accent"
              size="lg"
              onPress={handleConfirmMoveBetween}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: RECORD MANUAL SPEND ================= */}
      <Modal visible={showManualSpend} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Offline Spend</Text>
                <Text style={styles.modalSubtitle}>
                  Deduct cash or offline expenses from a bucket
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowManualSpend(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Bucket Selector */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Deduct from Bucket:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {envelopes.map((b) => (
                  <TouchableOpacity
                    key={`spend-${b.id}`}
                    style={[
                      styles.bucketChip,
                      manualSpendBucketId === b.id && styles.bucketChipActive,
                    ]}
                    onPress={() => setManualSpendBucketId(b.id)}
                  >
                    <View style={[styles.chipColorDot, { backgroundColor: b.color || colors.accent }]} />
                    <Text
                      style={[
                        styles.bucketChipText,
                        manualSpendBucketId === b.id && styles.bucketChipTextActive,
                      ]}
                    >
                      {b.name} (₹{b.currentAmount.toLocaleString('en-IN')})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Input
              label="Amount Spent (₹)"
              placeholder="e.g. 150"
              keyboardType="numeric"
              value={manualSpendAmount}
              onChangeText={setManualSpendAmount}
            />

            <Input
              label="Description / Merchant (Optional)"
              placeholder="e.g. Street tea, Cash groceries"
              value={manualSpendNote}
              onChangeText={setManualSpendNote}
            />

            <Button
              title="Record Spend"
              variant="accent"
              size="lg"
              onPress={handleConfirmManualSpend}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: DELETE BUCKET (WITH CHECKBOXES) ================= */}
      <Modal visible={!!bucketToDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconCircle}>
                <Trash2 size={22} color="#EF4444" />
              </View>
              <Text style={styles.deleteModalTitle}>
                Delete "{bucketToDelete?.name}"?
              </Text>
              <Text style={styles.deleteModalSubtitle}>
                This bucket currently has ₹{(bucketToDelete?.currentAmount || 0).toLocaleString('en-IN')}. Remaining funds will return to your Unallocated Pool.
              </Text>
            </View>

            {/* Checkbox Options */}
            <View style={styles.deleteOptionsContainer}>
              {/* Option 1: Delete bucket only (Preserve activity) */}
              <TouchableOpacity
                style={[
                  styles.deleteOptionItem,
                  !deleteActivityOption && styles.deleteOptionItemActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setDeleteActivityOption(false)}
              >
                <View
                  style={[
                    styles.radioCircle,
                    !deleteActivityOption && styles.radioCircleActive,
                  ]}
                >
                  {!deleteActivityOption && <View style={styles.radioInner} />}
                </View>
                <View style={styles.deleteOptionTextCol}>
                  <Text style={styles.deleteOptionTitle}>
                    Delete bucket only (Recommended)
                  </Text>
                  <Text style={styles.deleteOptionDesc}>
                    Preserve all past payment transactions & activity history.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Delete bucket & connected activity */}
              <TouchableOpacity
                style={[
                  styles.deleteOptionItem,
                  deleteActivityOption && styles.deleteOptionItemActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setDeleteActivityOption(true)}
              >
                <View
                  style={[
                    styles.radioCircle,
                    deleteActivityOption && styles.radioCircleActive,
                  ]}
                >
                  {deleteActivityOption && <View style={styles.radioInner} />}
                </View>
                <View style={styles.deleteOptionTextCol}>
                  <Text style={styles.deleteOptionTitle}>
                    Delete bucket & connected activity
                  </Text>
                  <Text style={styles.deleteOptionDesc}>
                    Permanently wipe all transaction records and activity linked to this bucket.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.deleteActionsRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setBucketToDelete(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Delete Bucket"
                variant="danger"
                size="md"
                onPress={handleConfirmDeleteBucket}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 60,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  proportionsCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  proportionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  proportionsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proportionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricColumn: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.md,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  proportionBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  proportionBarAllocated: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  proportionBarUnallocated: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  actionsSection: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.default,
  },
  addMoneyBtn: {
    backgroundColor: colors.accent,
  },
  addMoneyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  allocateBtn: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.4)',
  },
  allocateBtnDisabled: {
    opacity: 0.5,
    borderColor: colors.borderDefault,
  },
  allocateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  moveBetweenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  moveBetweenBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bucketGlanceSection: {
    marginBottom: spacing.xl,
  },
  bucketGlanceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bucketGlanceScroll: {
    gap: spacing.sm,
  },
  bucketGlanceItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    minWidth: 130,
  },
  bucketGlanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  glanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glanceName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  glanceAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  glancePct: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.default,
    borderTopRightRadius: borderRadius.default,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalProportionInfo: {
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    borderRadius: borderRadius.default,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  modalInfoLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  modalInfoValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1DB954',
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  modalInfoSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  modalAvailableBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
    borderRadius: borderRadius.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  availableBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  availableBannerAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1DB954',
    fontVariant: ['tabular-nums'],
  },
  remainingAfterText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetChip: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pickerSection: {
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  bucketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginRight: spacing.sm,
    gap: 6,
  },
  bucketChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(94, 106, 210, 0.15)',
  },
  chipColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bucketChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bucketChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  overAllocatingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  overAllocatingText: {
    fontSize: 12,
    color: colors.statusError,
  },
  manualEntryContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  manualEntrySmallLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#666666',
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  manualSpendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.default,
    backgroundColor: '#15161B',
    borderWidth: 1,
    borderColor: '#252733',
    width: '100%',
  },
  manualSpendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  bucketGlanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  glanceDeleteBtn: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111215',
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#262833',
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  deleteIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  deleteModalSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  deleteOptionsContainer: {
    gap: 10,
    marginBottom: spacing.xl,
  },
  deleteOptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#16171D',
    borderWidth: 1,
    borderColor: '#22242E',
  },
  deleteOptionItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(94, 106, 210, 0.08)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#4A4D5E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.accent,
  },
  deleteOptionTextCol: {
    flex: 1,
  },
  deleteOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deleteOptionDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  deleteActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
