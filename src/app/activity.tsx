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
import { PaymentTransaction, LedgerEvent, Transaction, SystemCategory } from '../types';
import { SYSTEM_CATEGORIES } from '../services/sms/categorization/taxonomy';
import { formatPaise } from '../utils/money';
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
  RotateCcw,
} from 'lucide-react-native';

export default function ActivityScreen() {
  const router = useRouter();
  const { paymentTransactions, ledgerEvents, envelopes, transactions, teachMerchantRule } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'review' | 'bank' | 'payments' | 'ledger'>('all');
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null);
  const [selectedBankTxn, setSelectedBankTxn] = useState<Transaction | null>(null);

  const reviewItems = transactions.filter(
    (t) => !t.envelopeId || t.categoryId === 'UNCLASSIFIED'
  );
  const unclassifiedCount = reviewItems.length;

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
              Complete audit trail of all UPI payments, bank SMS, and envelope allocations.
            </Text>
          </View>
        </View>

        <AnimatedPillTabs<'all' | 'review' | 'bank' | 'payments' | 'ledger'>
          tabs={[
            { id: 'all', label: 'All Activity' },
            { id: 'review', label: 'Review Queue', badge: unclassifiedCount },
            { id: 'bank', label: 'Bank SMS', badge: transactions.length },
            { id: 'payments', label: 'UPI Direct', badge: paymentTransactions.length },
            { id: 'ledger', label: 'Ledger Events', badge: ledgerEvents.length },
          ]}
          activeTab={filter}
          onTabChange={(tabId) => setFilter(tabId)}
          style={{ marginBottom: spacing.md }}
        />

        <ScrollView contentContainerStyle={styles.list}>
          {/* Review Queue or Bank & SMS Transactions */}
          {(filter === 'all' || filter === 'bank' || filter === 'review') && (
            <View>
              {(filter === 'review' ? reviewItems : transactions).map((item) => {
                const isCredit = item.type === 'INCOME' || item.type === 'REVERSAL';
                const categoryMeta = item.categoryId
                  ? SYSTEM_CATEGORIES[item.categoryId as SystemCategory]
                  : null;

                return (
                  <TouchableOpacity
                    key={`bank-${item.id}`}
                    activeOpacity={0.8}
                    onPress={() => setSelectedBankTxn(item)}
                  >
                    <Card variant="raised" style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleGroup}>
                          <View
                            style={[
                              styles.iconCirclePayment,
                              item.type === 'INCOME' && styles.iconCircleIncome,
                              item.type === 'REVERSAL' && styles.iconCircleReversal,
                            ]}
                          >
                            {item.type === 'INCOME' ? (
                              <ArrowDownLeft size={18} color="#10B981" />
                            ) : item.type === 'REVERSAL' ? (
                              <RotateCcw size={16} color="#A855F7" />
                            ) : (
                              <ArrowUpRight size={18} color={colors.accent} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.payeeName} numberOfLines={1}>
                              {item.merchantName ||
                                item.payeeVpa ||
                                (item.type === 'INCOME' ? 'Credit Deposit' : 'Bank Transaction')}
                            </Text>
                            <View style={styles.tagRow}>
                              {categoryMeta && (
                                <View
                                  style={[
                                    styles.categoryPill,
                                    { backgroundColor: `${categoryMeta.color}20` },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.categoryPillText,
                                      { color: categoryMeta.color },
                                    ]}
                                  >
                                    {categoryMeta.displayName}
                                  </Text>
                                </View>
                              )}
                              <Text style={styles.envelopeTag}>
                                {item.bankName || 'Bank'}{' '}
                                {item.accountLast4 ? `••${item.accountLast4}` : ''}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.amountCol}>
                          <Text
                            style={[
                              styles.amountNegative,
                              isCredit && styles.amountPositive,
                            ]}
                          >
                            {isCredit ? '+' : '-'}
                            {formatPaise(item.amountPaise, true)}
                          </Text>
                          <View
                            style={[
                              styles.sourceBadge,
                              item.source === 'IN_APP_PAYMENT' && styles.sourceBadgeGPay,
                            ]}
                          >
                            <Text
                              style={[
                                styles.sourceBadgeText,
                                item.source === 'IN_APP_PAYMENT' &&
                                  styles.sourceBadgeTextGPay,
                              ]}
                            >
                              {item.source === 'IN_APP_PAYMENT'
                                ? 'GPAY + SMS'
                                : 'BANK SMS'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

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

          {transactions.length === 0 && paymentTransactions.length === 0 && ledgerEvents.length === 0 && (
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

      {/* Bank Transaction Details Modal */}
      <Modal visible={!!selectedBankTxn} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bank Transaction Audit</Text>
              <TouchableOpacity onPress={() => setSelectedBankTxn(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedBankTxn && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.receiptAmountRow}>
                  <Text
                    style={[
                      styles.receiptAmount,
                      (selectedBankTxn.type === 'INCOME' || selectedBankTxn.type === 'REVERSAL') &&
                        styles.amountPositive,
                    ]}
                  >
                    {selectedBankTxn.type === 'INCOME' || selectedBankTxn.type === 'REVERSAL'
                      ? '+'
                      : '-'}
                    {formatPaise(selectedBankTxn.amountPaise, true)}
                  </Text>
                  <View style={[styles.badge, styles.badgeSuccess]}>
                    <Text style={[styles.badgeText, { color: colors.statusSuccess }]}>
                      {selectedBankTxn.type}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Merchant / Payee</Text>
                  <Text style={styles.detailVal}>
                    {selectedBankTxn.merchantName ||
                      selectedBankTxn.payeeVpa ||
                      'Bank Transfer'}
                  </Text>
                </View>

                {selectedBankTxn.payeeVpa && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI ID (VPA)</Text>
                    <Text style={styles.detailVal}>{selectedBankTxn.payeeVpa}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailVal}>
                    {selectedBankTxn.categoryId
                      ? SYSTEM_CATEGORIES[selectedBankTxn.categoryId as SystemCategory]
                          ?.displayName || selectedBankTxn.categoryId
                      : 'Unclassified'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank & Account</Text>
                  <Text style={styles.detailVal}>
                    {selectedBankTxn.bankName || 'Bank'}{' '}
                    {selectedBankTxn.accountLast4
                      ? `(••${selectedBankTxn.accountLast4})`
                      : ''}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Channel</Text>
                  <Text style={styles.detailVal}>{selectedBankTxn.channel}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Source</Text>
                  <Text style={styles.detailVal}>
                    {selectedBankTxn.source === 'IN_APP_PAYMENT'
                      ? 'Google Pay + Bank SMS'
                      : 'Bank SMS Ingestion'}
                  </Text>
                </View>

                {selectedBankTxn.referenceId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI / Bank Ref ID</Text>
                    <Text style={styles.detailMono}>{selectedBankTxn.referenceId}</Text>
                  </View>
                )}

                {selectedBankTxn.balanceAfterPaise !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reported Balance After</Text>
                    <Text style={[styles.detailVal, { color: colors.accent }]}>
                      {formatPaise(selectedBankTxn.balanceAfterPaise, true)}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Timestamp</Text>
                  <Text style={styles.detailVal}>
                    {new Date(
                      selectedBankTxn.occurredAt || selectedBankTxn.createdAt
                    ).toLocaleString()}
                  </Text>
                </View>

                {/* Unclassified Review Action: Assign Bucket & Teach Rule */}
                {(!selectedBankTxn.envelopeId || selectedBankTxn.categoryId === 'UNCLASSIFIED') && (
                  <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.borderDefault }}>
                    <Text style={[styles.detailLabel, { marginBottom: 8, color: colors.statusWarning }]}>
                      Assign to Bucket (Teaches Auto-Rule)
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {envelopes.map((env) => (
                        <TouchableOpacity
                          key={env.id}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: borderRadius.sm,
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            borderWidth: 1,
                            borderColor: colors.accent,
                          }}
                          onPress={async () => {
                            const targetIdentifier = selectedBankTxn.payeeVpa || selectedBankTxn.merchantName || 'unknown';
                            await teachMerchantRule(
                              targetIdentifier,
                              env.id,
                              'OTHER',
                              !!selectedBankTxn.payeeVpa
                            );
                            setSelectedBankTxn(null);
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>
                            {env.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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
  iconCircleIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  iconCircleReversal: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  amountPositive: {
    color: '#10B981',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sourceBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  sourceBadgeGPay: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 0.5,
  },
  sourceBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  sourceBadgeTextGPay: {
    color: '#4ADE80',
  },
});
