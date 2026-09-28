import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { ReflectiveCard } from '../../components/ui/ReflectiveCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RubberSegmentBar, RubberTabItem } from '../../components/ui/RubberSegmentBar';
import { PaymentTransaction, LedgerEvent } from '../../types';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  Check,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    paymentTransactions,
    ledgerEvents,
    envelopes,
    updateProfileImage,
    resetBucketsAndActivity,
    resetDatabase,
  } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'payments' | 'ledger'>('all');
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [clearOnboarding, setClearOnboarding] = useState(false);
  const [isFadingAway, setIsFadingAway] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleEditPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery access is required to update your profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUpdatingPhoto(true);
        await updateProfileImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Failed to update profile photo:', err);
      Alert.alert('Error', 'Failed to update profile photo.');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      if (clearOnboarding) {
        setShowResetConfirm(false);
        setIsFadingAway(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start(async () => {
          try {
            await resetDatabase();
            // Small tick to ensure clean state propagation before navigating
            setTimeout(() => {
              router.replace('/(onboarding)/username');
            }, 100);
          } catch (err: any) {
            setIsFadingAway(false);
            setIsResetting(false);
            Alert.alert('Reset Error', err.message || 'Failed to erase all data and reset onboarding.');
          }
        });
      } else {
        await resetBucketsAndActivity();
        setShowResetConfirm(false);
        setIsResetting(false);
        Alert.alert('Reset Complete', 'All buckets and activity have been reset.');
      }
    } catch (e: any) {
      setIsResetting(false);
      Alert.alert('Error', e.message || 'Failed to reset buckets and activity');
    }
  };

  const getBucketName = (id?: string) => {
    if (!id) return 'General';
    const env = envelopes.find((e) => e.id === id);
    return env ? env.name : 'Bucket';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <CheckCircle size={11} color={colors.statusSuccess} />
            <Text style={[styles.badgeText, { color: colors.statusSuccess }]}>SUCCESS</Text>
          </View>
        );
      case 'FAILURE':
        return (
          <View style={[styles.badge, styles.badgeError]}>
            <XCircle size={11} color={colors.statusError} />
            <Text style={[styles.badgeText, { color: colors.statusError }]}>FAILED</Text>
          </View>
        );
      case 'SUBMITTED':
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Clock size={11} color={colors.statusPending} />
            <Text style={[styles.badgeText, { color: colors.statusPending }]}>PENDING</Text>
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.badge, styles.badgeCancelled]}>
            <AlertCircle size={11} color={colors.textTertiary} />
            <Text style={[styles.badgeText, { color: colors.textTertiary }]}>CANCELLED</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{status}</Text>
          </View>
        );
    }
  };

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
        {/* Top: Shimmering Holographic Mirror Profile Card */}
        <View style={styles.cardWrapper}>
          <ReflectiveCard
            username={user?.username || 'User'}
            avatarUri={user?.avatarUri}
            onEditPhoto={handleEditPhoto}
          />
        </View>

        {/* Reset Buckets & Activity Trigger */}
        <View style={styles.resetContainer}>
          <TouchableOpacity
            style={styles.resetBtn}
            activeOpacity={0.7}
            onPress={() => {
              setClearOnboarding(false);
              setShowResetConfirm(true);
            }}
          >
            <RotateCcw size={13} color="#EF4444" strokeWidth={2.2} />
            <Text style={styles.resetBtnText}>Reset Buckets & Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Section directly below the card */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeaderRow}>
            <Text style={styles.activityTitle}>RECENT ACTIVITY</Text>
            <Text style={styles.activityCount}>
              {paymentTransactions.length + ledgerEvents.length} items
            </Text>
          </View>

          {/* Elastic Rubber Activity Filter Tabs (Icon-free) */}
          <RubberSegmentBar<'all' | 'payments' | 'ledger'>
            tabs={[
              {
                id: 'all',
                label: 'All',
              },
              {
                id: 'payments',
                label: 'Payments',
                badge: paymentTransactions.length,
              },
              {
                id: 'ledger',
                label: 'Transfers',
                badge: ledgerEvents.length,
              },
            ]}
            activeTab={filter}
            onTabChange={(tabId) => setFilter(tabId)}
            variant="inline"
            style={{ marginBottom: spacing.md }}
          />

          {/* Activity List */}
          <View style={styles.list}>
            {/* Payment Transactions */}
            {(filter === 'all' || filter === 'payments') &&
              paymentTransactions.map((item) => (
                <TouchableOpacity
                  key={`pay-${item.id}`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTxn(item)}
                >
                  <Card variant="raised" style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemTitleGroup}>
                        <View style={styles.iconCirclePayment}>
                          <ArrowUpRight size={16} color={colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.payeeName} numberOfLines={1}>
                            {item.payeeName || item.payeeVpa}
                          </Text>
                          <Text style={styles.envelopeTag}>
                            {getBucketName(item.envelopeId)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.amountCol}>
                        <Text style={styles.amountNegative}>
                          -₹{item.requestedAmount.toLocaleString('en-IN')}
                        </Text>
                        {getStatusBadge(item.status)}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}

            {/* Ledger Transfers / Events */}
            {(filter === 'all' || filter === 'ledger') &&
              ledgerEvents.map((event) => (
                <Card key={`event-${event.id}`} variant="raised" style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleGroup}>
                      <View style={styles.iconCircleLedger}>
                        <ArrowDownLeft size={16} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.payeeName}>
                          {event.type.replace(/_/g, ' ')}
                        </Text>
                        <Text style={styles.envelopeTag}>
                          {event.note ||
                            (event.destinationEnvelopeId
                              ? `To: ${getBucketName(event.destinationEnvelopeId)}`
                              : 'Allocation update')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.ledgerAmount}>
                      ₹{event.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </Card>
              ))}

            {/* Empty State */}
            {paymentTransactions.length === 0 && ledgerEvents.length === 0 && (
              <View style={styles.emptyContainer}>
                <Receipt size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No activity recorded yet.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Audit Receipt Modal */}
      <Modal visible={!!selectedTxn} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Receipt</Text>
              <TouchableOpacity onPress={() => setSelectedTxn(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.receiptAmountRow}>
                  <Text style={styles.receiptAmount}>
                    ₹{selectedTxn.requestedAmount.toLocaleString('en-IN')}
                  </Text>
                  {getStatusBadge(selectedTxn.status)}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payee</Text>
                  <Text style={styles.detailVal}>{selectedTxn.payeeName || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UPI ID (VPA)</Text>
                  <Text style={styles.detailVal}>{selectedTxn.payeeVpa}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bucket</Text>
                  <Text style={styles.detailVal}>
                    {getBucketName(selectedTxn.envelopeId)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reference</Text>
                  <Text style={styles.detailMono}>{selectedTxn.transactionRef}</Text>
                </View>

                {selectedTxn.upiTxnId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI Txn ID</Text>
                    <Text style={styles.detailMono}>{selectedTxn.upiTxnId}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailVal}>
                    {new Date(selectedTxn.createdAt).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Reset Buckets & Activity Warning Modal */}
      <Modal visible={showResetConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resetModalContent}>
            <View style={styles.resetModalHeader}>
              <View style={styles.resetIconCircle}>
                <AlertTriangle size={24} color="#EF4444" />
              </View>
              <Text style={styles.resetModalTitle}>
                {clearOnboarding ? 'Reset & Start Fresh?' : 'Reset Buckets & Activity?'}
              </Text>
              <Text style={styles.resetModalSubtitle}>
                {clearOnboarding
                  ? 'All local data, cache, envelopes, transactions, balance snapshot, and onboarding profile will be permanently erased.\n\nAll data will fade away and you will start fresh from the onboarding screen.'
                  : 'This will delete all your virtual buckets and clear your recent activity history. All remaining allocated funds will be returned to your Unallocated Pool.\n\nYour profile photo and total tracked balance will be preserved.'}
              </Text>
            </View>

            {/* Checkbox inside the warning modal */}
            <TouchableOpacity
              style={[
                styles.modalCheckboxCard,
                clearOnboarding && styles.modalCheckboxCardActive,
              ]}
              activeOpacity={0.7}
              onPress={() => setClearOnboarding((prev) => !prev)}
            >
              <View style={[styles.checkboxBox, clearOnboarding && styles.checkboxBoxActive]}>
                {clearOnboarding && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View style={styles.modalCheckboxTextCol}>
                <Text style={styles.modalCheckboxTitle}>Start Fresh (Wipe cache & setup)</Text>
                <Text style={styles.modalCheckboxDesc}>
                  Erase all data and restart fresh from the onboarding screen
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.resetActionsRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setShowResetConfirm(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={clearOnboarding ? 'Start Fresh' : 'Reset Everything'}
                variant="danger"
                size="md"
                loading={isResetting}
                onPress={handleConfirmReset}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Fade-Away Transition Overlay */}
      {isFadingAway && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#060606',
              opacity: fadeAnim,
              zIndex: 9999,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
          pointerEvents="auto"
        >
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.fadeAwayText}>
            Starting fresh...
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase, // #060606
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 60,
  },
  cardWrapper: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  activitySection: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  activityCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  list: {
    gap: spacing.xs,
  },
  itemCard: {
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCirclePayment: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconCircleLedger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  payeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  envelopeTag: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountNegative: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.pill,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
  },
  badgeError: {
    backgroundColor: 'rgba(233, 20, 41, 0.12)',
  },
  badgePending: {
    backgroundColor: 'rgba(58, 130, 238, 0.12)',
  },
  badgeCancelled: {
    backgroundColor: 'rgba(113, 113, 113, 0.12)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 3,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.default,
    borderTopRightRadius: borderRadius.default,
    padding: spacing.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScroll: {
    paddingBottom: spacing.xl,
  },
  receiptAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  receiptAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  detailMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.accent,
    maxWidth: '65%',
    textAlign: 'right',
  },
  resetContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: -spacing.sm,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4E5268',
    backgroundColor: '#181A24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  modalCheckboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161720',
    borderWidth: 1,
    borderColor: '#262835',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginTop: 4,
    marginBottom: 4,
  },
  modalCheckboxCardActive: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  modalCheckboxTextCol: {
    flex: 1,
  },
  modalCheckboxTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  modalCheckboxDesc: {
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 15,
  },
  resetModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111215',
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#262833',
  },
  resetModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resetIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  resetModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  resetModalSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
  },
  fadeAwayText: {
    color: colors.textSecondary,
    marginTop: 14,
    fontSize: 13,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
});
