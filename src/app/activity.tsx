import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/common/Card';
import { AnimatedPillTabs } from '../components/ui/AnimatedPillTabs';
import { PaymentTransaction, LedgerEvent } from '../types';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react-native';

export default function ActivityScreen() {
  const router = useRouter();
  const { paymentTransactions, ledgerEvents, envelopes } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'payments' | 'ledger'>('all');
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null);

  const getBucketName = (id?: string) => {
    if (!id) return 'Unallocated';
    const env = envelopes.find((e) => e.id === id);
    return env ? env.name : 'Unknown Bucket';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <CheckCircle size={12} color={colors.statusSuccess} />
            <Text style={[styles.badgeText, { color: colors.statusSuccess }]}>SUCCESS</Text>
          </View>
        );
      case 'FAILURE':
        return (
          <View style={[styles.badge, styles.badgeError]}>
            <XCircle size={12} color={colors.statusError} />
            <Text style={[styles.badgeText, { color: colors.statusError }]}>FAILURE</Text>
          </View>
        );
      case 'SUBMITTED':
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Clock size={12} color={colors.statusPending} />
            <Text style={[styles.badgeText, { color: colors.statusPending }]}>SUBMITTED</Text>
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.badge, styles.badgeCancelled]}>
            <AlertCircle size={12} color={colors.textTertiary} />
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
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.topBarText}>
            <Text style={styles.headerTitle}>Activity & Ledger</Text>
            <Text style={styles.headerSubtitle}>
              Complete audit trail of all UPI payments and envelope allocations.
            </Text>
          </View>
        </View>

        <AnimatedPillTabs<'all' | 'payments' | 'ledger'>
          tabs={[
            { id: 'all', label: 'All Activity' },
            { id: 'payments', label: 'Payments', badge: paymentTransactions.length },
            { id: 'ledger', label: 'Ledger Events', badge: ledgerEvents.length },
          ]}
          activeTab={filter}
          onTabChange={(tabId) => setFilter(tabId)}
          style={{ marginBottom: spacing.md }}
        />

        <ScrollView contentContainerStyle={styles.list}>
          {/* Payment Transactions */}
          {(filter === 'all' || filter === 'payments') && (
            <View>
              {paymentTransactions.map((item) => (
                <TouchableOpacity
                  key={`pay-${item.id}`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTxn(item)}
                >
                  <Card variant="raised" style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemTitleGroup}>
                        <View style={styles.iconCirclePayment}>
                          <ArrowUpRight size={18} color={colors.accent} />
                        </View>
                        <View>
                          <Text style={styles.payeeName} numberOfLines={1}>
                            {item.payeeName || item.payeeVpa}
                          </Text>
                          <Text style={styles.envelopeTag}>
                            Bucket: {getBucketName(item.envelopeId)}
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
            </View>
          )}

          {/* Ledger Events */}
          {(filter === 'all' || filter === 'ledger') && (
            <View>
              {ledgerEvents.map((event) => (
                <Card key={`event-${event.id}`} variant="raised" style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleGroup}>
                      <View style={styles.iconCircleLedger}>
                        <ArrowDownLeft size={18} color={colors.textSecondary} />
                      </View>
                      <View>
                        <Text style={styles.payeeName}>{event.type.replace(/_/g, ' ')}</Text>
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
            </View>
          )}

          {paymentTransactions.length === 0 && ledgerEvents.length === 0 && (
            <View style={styles.emptyContainer}>
              <Receipt size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No activity recorded yet.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Transaction Details Modal */}
      <Modal visible={!!selectedTxn} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Audit Details</Text>
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
                  <Text style={styles.detailLabel}>Transaction Ref</Text>
                  <Text style={styles.detailMono}>{selectedTxn.transactionRef}</Text>
                </View>

                {selectedTxn.upiTxnId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI Txn ID</Text>
                    <Text style={styles.detailMono}>{selectedTxn.upiTxnId}</Text>
                  </View>
                )}

                {selectedTxn.approvalRefNo && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Approval Ref No</Text>
                    <Text style={styles.detailMono}>{selectedTxn.approvalRefNo}</Text>
                  </View>
                )}

                {selectedTxn.responseCode && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI Response Code</Text>
                    <Text style={styles.detailVal}>{selectedTxn.responseCode}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailVal}>
                    {new Date(selectedTxn.createdAt).toLocaleString()}
                  </Text>
                </View>

                {selectedTxn.completedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completed At</Text>
                    <Text style={styles.detailVal}>
                      {new Date(selectedTxn.completedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
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
    flex: 1,
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginTop: 2,
  },
  topBarText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  list: {
    paddingBottom: spacing.xxxl,
  },
  itemCard: {
    marginBottom: spacing.sm,
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
  },
  iconCirclePayment: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconCircleLedger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  payeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  envelopeTag: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountNegative: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  ledgerAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  badgeError: {
    backgroundColor: 'rgba(233, 20, 41, 0.1)',
  },
  badgePending: {
    backgroundColor: 'rgba(58, 130, 238, 0.1)',
  },
  badgeCancelled: {
    backgroundColor: 'rgba(113, 113, 113, 0.1)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  emptyContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.default,
    borderTopRightRadius: borderRadius.default,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScroll: {
    paddingBottom: spacing.xxl,
  },
  receiptAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    marginBottom: spacing.lg,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.accent,
    maxWidth: '60%',
    textAlign: 'right',
  },
});
