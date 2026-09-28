import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PixelCard } from '../../components/ui';
import { NormalizedUPIResponse, PaymentTransaction } from '../../types';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';

export default function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paymentId: string;
    responseJson: string;
  }>();

  const { paymentTransactions, envelopes, recordPaymentResult, loadInitialData } =
    useAppStore();

  const [isFinalizing, setIsFinalizing] = useState(true);
  const [finalTxn, setFinalTxn] = useState<PaymentTransaction | null>(null);

  const response: NormalizedUPIResponse = params.responseJson
    ? JSON.parse(params.responseJson)
    : { status: 'UNKNOWN' };

  useEffect(() => {
    async function finalize() {
      try {
        if (params.paymentId) {
          const updated = await recordPaymentResult(
            params.paymentId,
            response.status,
            response
          );
          setFinalTxn(updated);
        }
      } catch (err) {
        console.error('Finalization error:', err);
      } finally {
        setIsFinalizing(false);
      }
    }
    finalize();
  }, [params.paymentId]);

  const targetBucket = finalTxn
    ? envelopes.find((e) => e.id === finalTxn.envelopeId)
    : null;

  const renderStatusIcon = () => {
    switch (response.status) {
      case 'SUCCESS':
        return (
          <View style={[styles.iconContainer, styles.successBg]}>
            <CheckCircle size={48} color={colors.statusSuccess} />
          </View>
        );
      case 'FAILURE':
        return (
          <View style={[styles.iconContainer, styles.errorBg]}>
            <XCircle size={48} color={colors.statusError} />
          </View>
        );
      case 'SUBMITTED':
        return (
          <View style={[styles.iconContainer, styles.pendingBg]}>
            <Clock size={48} color={colors.statusPending} />
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.iconContainer, styles.cancelledBg]}>
            <AlertCircle size={48} color={colors.textTertiary} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconContainer, styles.pendingBg]}>
            <AlertCircle size={48} color={colors.statusWarning} />
          </View>
        );
    }
  };

  const getStatusHeading = () => {
    switch (response.status) {
      case 'SUCCESS':
        return 'Payment Successful!';
      case 'FAILURE':
        return 'Payment Failed';
      case 'SUBMITTED':
        return 'Payment Submitted / Pending';
      case 'CANCELLED':
        return 'Payment Cancelled';
      default:
        return 'Payment Status Unknown';
    }
  };

  const getStatusDescription = () => {
    switch (response.status) {
      case 'SUCCESS':
        return `₹${finalTxn?.requestedAmount.toLocaleString('en-IN')} has been deducted from your ${targetBucket?.name || 'virtual'} bucket.`;
      case 'FAILURE':
        return 'Google Pay reported a payment failure. No funds were deducted from your bucket.';
      case 'SUBMITTED':
        return 'Payment was submitted to the UPI network. No funds have been deducted pending confirmation.';
      case 'CANCELLED':
        return 'You cancelled the payment in Google Pay. Your bucket balance remains unchanged.';
      default:
        return 'The payment outcome could not be verified. No funds were deducted.';
    }
  };

  if (isFinalizing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Full-Screen Shimmering Pixel Canvas in Background */}
        <PixelCard
          noCardFrame
          variant="default"
          centerSoftness
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingSpinnerCircle}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
            <Text style={styles.loadingTitle}>UPDATING VIRTUAL LEDGER</Text>
            <Text style={styles.loadingText}>
              Allocating transaction to {targetBucket?.name || 'bucket'}...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {renderStatusIcon()}
          <Text style={styles.statusTitle}>{getStatusHeading()}</Text>
          <Text style={styles.statusDesc}>{getStatusDescription()}</Text>
        </View>

        {finalTxn && (
          <Card variant="raised" style={styles.receiptCard}>
            <Text style={styles.receiptLabel}>TRANSACTION RECEIPT</Text>

            <View style={styles.receiptAmountRow}>
              <Text style={styles.receiptAmount}>
                ₹{finalTxn.requestedAmount.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Payee</Text>
              <Text style={styles.detailVal}>
                {finalTxn.payeeName || finalTxn.payeeVpa}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Bucket Used</Text>
              <Text style={styles.detailVal}>{targetBucket?.name || 'Unknown'}</Text>
            </View>

            {response.status === 'SUCCESS' && targetBucket && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Remaining Bucket Balance</Text>
                <Text style={[styles.detailVal, { color: colors.statusSuccess }]}>
                  ₹{targetBucket.currentAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Transaction Ref</Text>
              <Text style={styles.detailMono}>{finalTxn.transactionRef}</Text>
            </View>

            {response.txnId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>UPI Txn ID</Text>
                <Text style={styles.detailMono}>{response.txnId}</Text>
              </View>
            )}

            {response.approvalRefNo && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Approval Ref</Text>
                <Text style={styles.detailMono}>{response.approvalRefNo}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Timestamp</Text>
              <Text style={styles.detailVal}>
                {new Date(finalTxn.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.footer}>
          <Button
            title="Done / Return to Dashboard"
            variant="accent"
            size="lg"
            onPress={() => router.replace('/(tabs)')}
            icon={<ArrowRight size={18} color={colors.accentDark} />}
          />
        </View>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 10,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111215',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2A2C38',
    padding: spacing.xl,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loadingSpinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successBg: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
  },
  errorBg: {
    backgroundColor: 'rgba(233, 20, 41, 0.15)',
  },
  pendingBg: {
    backgroundColor: 'rgba(58, 130, 238, 0.15)',
  },
  cancelledBg: {
    backgroundColor: 'rgba(113, 113, 113, 0.15)',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  receiptCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  receiptAmountRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
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
    paddingVertical: spacing.xs + 2,
  },
  detailKey: {
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
  footer: {
    paddingVertical: spacing.lg,
  },
});
