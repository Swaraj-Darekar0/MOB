import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { SlideCommit, PixelCard } from '../../components/ui';
import {
  ParsedUPIQR,
  PaymentTransaction,
  PaymentStatus,
  UPIFailureCategory,
  UPIFailureDetails,
} from '../../types';
import * as paymentService from '../../services/payment/paymentService';
import {
  ArrowLeft,
  Store,
  User,
  ShieldCheck,
  AlertTriangle,
  IndianRupee,
  Copy,
  Check,
  Smartphone,
  Info,
  CheckSquare,
  Square,
  XCircle,
  ChevronDown,
} from 'lucide-react-native';

interface OutcomeModalState {
  visible: boolean;
  paymentId: string;
  status: PaymentStatus;
  details: UPIFailureDetails;
}

export default function PaymentConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    envelopeId: string;
    parsedQRJson: string;
  }>();

  const parsedQR: ParsedUPIQR = params.parsedQRJson
    ? JSON.parse(params.parsedQRJson)
    : null;

  const { envelopes, recordPayment, recordPaymentResult } = useAppStore();

  // Dynamic Bucket Switching: State-driven selection allows switching buckets on error!
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>(params.envelopeId);
  const currentEnvelope =
    envelopes.find((e) => e.id === selectedEnvelopeId) || envelopes[0];
  const [showBucketPicker, setShowBucketPicker] = useState(false);

  const [enteredAmount, setEnteredAmount] = useState(
    parsedQR?.amount ? parsedQR.amount.toString() : ''
  );
  // Default to Google Pay as currently supported app
  const selectedApp: paymentService.UPIAppTarget = 'gpay';
  const [isLaunching, setIsLaunching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-Flight Payment Tracking & AppState
  const inFlightPaymentRef = useRef<{
    paymentId: string;
    amount: number;
    envelopeId: string;
    startTime: number;
    resolved: boolean;
  } | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Outcome Resolution Modal State
  const [outcomeModal, setOutcomeModal] = useState<OutcomeModalState | null>(null);

  // P2P 4-Step Human-Language Interstitial state
  const [hasAcknowledgedP2P, setHasAcknowledgedP2P] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);

  // Assisted P2P confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  /**
   * AppState Return Listener:
   * Detects when the user returns to MOB from Google Pay or task switcher.
   * If Google Pay hung or user switched back, defrosts the UI and shows the outcome modal.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevAppState.match(/inactive|background/) && nextAppState === 'active') {
        const inFlight = inFlightPaymentRef.current;
        if (inFlight && !inFlight.resolved) {
          // Grace period: allow native onActivityResult 600ms to resolve first
          setTimeout(() => {
            if (inFlightPaymentRef.current && !inFlightPaymentRef.current.resolved) {
              inFlightPaymentRef.current.resolved = true;
              console.log('[PaymentConfirm] User returned via App Switcher. Defrosting UI.');
              setIsLaunching(false);
              setOutcomeModal({
                visible: true,
                paymentId: inFlight.paymentId,
                status: 'CANCELLED',
                details: {
                  category: 'USER_CANCELLED',
                  title: isMerchant ? 'Payment Incomplete' : 'Payment Cancelled',
                  description: isMerchant
                    ? `The payment could not be completed successfully. No money was deducted from your ${currentEnvelope.name} bucket.`
                    : `The transfer was cancelled or could not be completed. No money was deducted from your ${currentEnvelope.name} bucket.`,
                },
              });
            }
          }, 600);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);


  if (!parsedQR || !currentEnvelope) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Invalid Payment Context</Text>
          <Button
            title="Go to Dashboard"
            variant="accent"
            size="md"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Deterministic Classification: Merchant (P2M) vs Personal (P2P)
  const upiClassification = paymentService.classifyUPIPayment({
    payeeVpa: parsedQR.payeeVpa,
    merchantCode: parsedQR.merchantCode,
    merchantId: parsedQR.merchantId,
    storeId: parsedQR.storeId,
    terminalId: parsedQR.terminalId,
    rawPayload: parsedQR.rawPayload,
  });
  const isMerchant = upiClassification.isMerchant;

  const numericAmount = parseFloat(enteredAmount.replace(/,/g, '').trim()) || 0;
  const availableBalance = currentEnvelope.currentAmount;
  const isInsufficient = numericAmount > availableBalance;
  const isInvalidAmount = numericAmount <= 0;

  const handleCopyVpa = async () => {
    await paymentService.copyToClipboard(parsedQR.payeeVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /**
   * Direct UPI Intent Flow (Recommended for Merchant QRs, optional fallback for P2P)
   */
  const handleLaunchDirectIntent = async () => {
    if (isInvalidAmount) {
      setError('Please enter a valid amount greater than ₹0');
      throw new Error('Please enter a valid amount greater than ₹0');
    }

    if (isInsufficient) {
      const msg = `Insufficient ${currentEnvelope.name} balance. Available: ₹${availableBalance.toLocaleString(
        'en-IN'
      )}`;
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsLaunching(true);
      setError(null);

      // 1. Generate unique local transaction ref
      const transactionRef = paymentService.generateTransactionRef('V1');
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 2. Build local payment record in INITIATED state
      const paymentRecord: PaymentTransaction = {
        id: paymentId,
        envelopeId: currentEnvelope.id,
        requestedAmount: numericAmount,
        payeeVpa: parsedQR.payeeVpa,
        payeeName: parsedQR.payeeName,
        qrPayload: parsedQR.rawPayload,
        transactionRef,
        status: 'INITIATED',
        createdAt: new Date().toISOString(),
      };

      // 3. Persist INITIATED record in database
      await recordPayment(paymentRecord);

      // 4. Construct UPI URI with Intelligent tr Stripping
      const upiUri = paymentService.buildUPIUri({
        pa: parsedQR.payeeVpa,
        pn: parsedQR.payeeName,
        am: numericAmount,
        tr: transactionRef,
        tn: parsedQR.transactionNote || `MOB from ${currentEnvelope.name}`,
        mc: parsedQR.merchantCode,
        mid: parsedQR.merchantId,
        sid: parsedQR.storeId,
        tid: parsedQR.terminalId,
      });

      // 5. Launch intent targeting selected app or system chooser
      const normalizedResponse = await paymentService.launchUPIIntent(upiUri, selectedApp);

      if (inFlightPaymentRef.current) {
        inFlightPaymentRef.current.resolved = true;
      }

      if (normalizedResponse.status === 'SUCCESS') {
        // ONLY navigate to result screen on SUCCESS!
        router.replace({
          pathname: '/payment/result',
          params: {
            paymentId,
            responseJson: JSON.stringify(normalizedResponse),
          },
        });
      } else {
        // Cancelled, Limit reached, or Failed:
        // Update database so status is accurately CANCELLED/FAILURE (not INITIATED)
        await recordPaymentResult(paymentId, normalizedResponse.status, normalizedResponse);
        setIsLaunching(false);

        setOutcomeModal({
          visible: true,
          paymentId,
          status: normalizedResponse.status,
          details: {
            category: normalizedResponse.status === 'CANCELLED' ? 'USER_CANCELLED' : 'DECLINED',
            title: isMerchant ? 'Payment Incomplete' : 'Payment Cancelled',
            description: isMerchant
              ? `The payment could not be completed successfully. No money was deducted from your ${currentEnvelope.name} bucket.`
              : `The transfer was cancelled or could not be completed. No money was deducted from your ${currentEnvelope.name} bucket.`,
          },
        });
      }
    } catch (err: any) {
      if (inFlightPaymentRef.current) {
        inFlightPaymentRef.current.resolved = true;
      }
      setIsLaunching(false);
      setOutcomeModal({
        visible: true,
        paymentId: inFlightPaymentRef.current?.paymentId || 'temp',
        status: 'CANCELLED',
        details: {
          category: 'USER_CANCELLED',
          title: isMerchant ? 'Payment Incomplete' : 'Payment Cancelled',
          description: isMerchant
            ? `The payment could not be completed successfully. No money was deducted from your ${currentEnvelope.name} bucket.`
            : `The transfer was cancelled or could not be completed. No money was deducted from your ${currentEnvelope.name} bucket.`,
        },
      });
    } finally {
      setIsLaunching(false);
    }
  };

  /**
   * Emergency Bailout Handler from Commencement Overlay:
   * Enables user to dismiss the commencement overlay if Google Pay takes too long or fails to launch.
   */
  const handleBailoutCommence = () => {
    if (inFlightPaymentRef.current) {
      inFlightPaymentRef.current.resolved = true;
      recordPaymentResult(inFlightPaymentRef.current.paymentId, 'CANCELLED', {
        reason: 'user_bailout_commence_overlay',
      });
    }
    setIsLaunching(false);
  };

  /**
   * Outcome Modal Action: Dismiss and return to dashboard.
   * This is the single, clear action for both P2P and P2M failure/cancellation.
   */
  const handleOutcomeReturnDashboard = () => {
    setOutcomeModal(null);
    router.replace('/(tabs)');
  };


  /**
   * SlideCommit Trigger Handler
   */
  const handleProceedPayment = async () => {
    await handleLaunchDirectIntent();
  };

  /**
   * Assisted P2P Flow (Circumvents the Bank / NPCI zero-tolerance P2P intent block)
   */
  const handleLaunchAssistedP2P = async () => {
    if (isInvalidAmount) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (isInsufficient) {
      setError(
        `Insufficient ${currentEnvelope.name} balance. Available: ₹${availableBalance.toLocaleString(
          'en-IN'
        )}`
      );
      return;
    }

    try {
      setIsLaunching(true);
      setError(null);

      const transactionRef = paymentService.generateTransactionRef('V1');
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const paymentRecord: PaymentTransaction = {
        id: paymentId,
        envelopeId: currentEnvelope.id,
        requestedAmount: numericAmount,
        payeeVpa: parsedQR.payeeVpa,
        payeeName: parsedQR.payeeName,
        qrPayload: parsedQR.rawPayload,
        transactionRef,
        status: 'INITIATED',
        createdAt: new Date().toISOString(),
      };

      await recordPayment(paymentRecord);
      setPendingPaymentId(paymentId);

      // Copy UPI ID to clipboard & open target UPI app directly in first-party mode
      const opened = await paymentService.executeAssistedP2PFlow(parsedQR.payeeVpa, selectedApp);

      // Display post-transfer verification modal if the app was successfully launched
      if (opened) {
        setShowConfirmModal(true);
      }
    } catch (err: any) {
      Alert.alert('Assisted Launch Error', err.message || 'Could not launch UPI app');
    } finally {
      setIsLaunching(false);
    }
  };

  /**
   * Confirm manual completion of Assisted P2P transfer
   */
  const handleConfirmAssistedSuccess = async () => {
    if (!pendingPaymentId) return;
    try {
      const simulatedSuccessResponse = {
        status: 'SUCCESS' as const,
        toVpa: parsedQR.payeeVpa,
        amount: numericAmount,
        rawResponse: { mode: 'ASSISTED_P2P' },
      };

      setShowConfirmModal(false);
      router.replace({
        pathname: '/payment/result',
        params: {
          paymentId: pendingPaymentId,
          responseJson: JSON.stringify(simulatedSuccessResponse),
        },
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to finalize payment record');
    }
  };

  /**
   * Cancel manual assisted flow without deducting funds
   */
  const handleCancelAssisted = async () => {
    const pId = pendingPaymentId;
    if (pId) {
      await recordPaymentResult(pId, 'CANCELLED', { mode: 'ASSISTED_P2P_CANCELLED' });
    }
    setShowConfirmModal(false);
    setPendingPaymentId(null);

    setOutcomeModal({
      visible: true,
      paymentId: pId || 'temp',
      status: 'CANCELLED',
      details: {
        category: 'USER_CANCELLED',
        title: 'Payment Cancelled',
        description: `The transfer was cancelled or could not be completed. No money was deducted from your ${currentEnvelope.name} bucket.`,
      },
    });
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Full-Screen Shimmering Pixel Canvas in Background */}
      <PixelCard
        noCardFrame
        variant="default"
        centerSoftness
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}>
          <Button
            title="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            icon={<ArrowLeft size={16} color={colors.textSecondary} />}
          />
        </View>

        {/* Main Payment & Payee Container */}
        <View style={styles.paymentCard}>
          {/* Payee Details */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.storeIconCircle,
                !isMerchant && styles.personalIconCircle,
              ]}
            >
                {isMerchant ? (
                  <Store size={22} color={colors.accent} />
                ) : (
                  <User size={22} color={colors.statusWarning} />
                )}
              </View>
              <View style={styles.storeTextCol}>
                <View style={styles.payeeTitleRow}>
                  <Text style={styles.payeeName}>
                    {parsedQR.payeeName || (isMerchant ? 'Merchant' : 'Personal Account')}
                  </Text>
                  {isMerchant ? (
                    <View style={styles.merchantBadge}>
                      <ShieldCheck size={12} color={colors.statusSuccess} />
                      <Text style={styles.merchantBadgeText}>Merchant</Text>
                    </View>
                  ) : (
                    <View style={styles.personalBadge}>
                      <Text style={styles.personalBadgeText}>Personal (P2P)</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.payeeVpa}>{parsedQR.payeeVpa}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.pixelDivider} />

            {/* Bucket Info with Switch Capability */}
            <TouchableOpacity
              style={styles.envelopeRow}
              activeOpacity={0.7}
              onPress={() => setShowBucketPicker(true)}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.labelMuted}>Deducting from Bucket</Text>
                  <ChevronDown size={12} color={colors.textTertiary} />
                </View>
                <Text style={styles.envelopeName}>{currentEnvelope.name}</Text>
              </View>
              <View style={styles.balanceBadge}>
                <Text style={styles.labelMuted}>Available</Text>
                <Text style={styles.balanceText}>
                  ₹{availableBalance.toLocaleString('en-IN')}
                </Text>
              </View>
            </TouchableOpacity>


            {/* Divider */}
            <View style={styles.pixelDivider} />

            {/* Amount Section */}
            <Text style={styles.amountSectionLabel}>
              {parsedQR.isDynamic ? 'QR Fixed Amount' : 'Enter Amount to Pay'}
            </Text>

            {parsedQR.isDynamic ? (
              <View style={styles.dynamicAmountRow}>
                <Text style={styles.dynamicAmount}>
                  ₹{numericAmount.toLocaleString('en-IN')}
                </Text>
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedText}>Dynamic QR</Text>
                </View>
              </View>
            ) : (
              <Input
                label="Payment Amount (₹)"
                placeholder="e.g. 500"
                keyboardType="numeric"
                value={enteredAmount}
                onChangeText={(text) => {
                  setEnteredAmount(text);
                  if (error) setError(null);
                }}
                leftIcon={<IndianRupee size={20} color={colors.accent} />}
              />
            )}

            {isInsufficient && (
              <View style={styles.warningBox}>
                <AlertTriangle size={16} color={colors.statusWarning} />
                <Text style={styles.warningText}>
                  Insufficient bucket balance. You need ₹
                  {(numericAmount - availableBalance).toLocaleString('en-IN')} more in{' '}
                  {currentEnvelope.name}.
                </Text>
              </View>
            )}

            {error && !isInsufficient && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>

        {/* Supported Payment App (Google Pay Default) */}
        <Card variant="raised" style={styles.card}>
          <View style={styles.appHeaderRow}>
            <Smartphone size={16} color={colors.textSecondary} />
            <Text style={styles.appSelectorLabel}>Supported Payment App</Text>
          </View>
          <View style={styles.singleAppDisplay}>
            <View style={styles.appBrandRow}>
              <View style={styles.appActiveDot} />
              <Text style={styles.appBrandTitle}>Google Pay</Text>
            </View>
            <View style={styles.appActiveBadge}>
              <Text style={styles.appActiveBadgeText}>Supported & Ready</Text>
            </View>
          </View>
        </Card>

        {/* Direct Payment Commencement Section */}
        <View style={styles.footer}>
          <SlideCommit
            onCommit={isMerchant ? handleProceedPayment : handleLaunchAssistedP2P}
            label={
              isMerchant
                ? `Slide to Pay ₹${numericAmount.toLocaleString('en-IN')}`
                : `Slide to Pay with Google Pay`
            }
            disabled={isLaunching || isInsufficient || isInvalidAmount}
          />
          <Text style={styles.disclaimerText}>
            {isMerchant
              ? 'Verified merchant transaction. Google Pay will open to complete payment with your UPI PIN.'
              : `Copies ${parsedQR.payeeVpa} and opens Google Pay automatically.`}
          </Text>
        </View>
      </ScrollView>

      {/* P2P 4-Step Human Language Interstitial */}
      {!isMerchant && (
        <Modal
          visible={!hasAcknowledgedP2P}
          transparent
          animationType="fade"
          onRequestClose={() => router.back()}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.p2pStepsModalContent}>
              <View style={styles.p2pStepsHeader}>
                <View style={styles.p2pIconCircle}>
                  <User size={22} color={colors.accent} />
                </View>
                <Text style={styles.p2pStepsTitle}>Paying a Person</Text>
                <Text style={styles.p2pStepsSubtitle}>
                  Simple 4 steps to complete this payment smoothly:
                </Text>
              </View>

              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Select Amount</Text>
                    <Text style={styles.stepDesc}>Choose how much to pay from your bucket.</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Automatic Copy</Text>
                    <Text style={styles.stepDesc}>We copy their UPI address for you.</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Pay in Google Pay</Text>
                    <Text style={styles.stepDesc}>Google Pay opens so you can paste and enter your PIN.</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Confirm in MOB</Text>
                    <Text style={styles.stepDesc}>Return here to record the spend in your bucket.</Text>
                  </View>
                </View>
              </View>

              {/* Checkbox */}
              <TouchableOpacity
                style={styles.ackCheckboxRow}
                activeOpacity={0.8}
                onPress={() => setAckChecked(!ackChecked)}
              >
                <View style={[styles.checkboxBox, ackChecked && styles.checkboxBoxChecked]}>
                  {ackChecked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.ackCheckboxText}>
                  I understand how this works
                </Text>
              </TouchableOpacity>

              {/* Continue Button */}
              <Button
                title="Continue to Payment"
                variant="accent"
                size="lg"
                disabled={!ackChecked}
                onPress={() => setHasAcknowledgedP2P(true)}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Assisted P2P Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAssisted}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Check size={24} color={colors.statusSuccess} />
              </View>
              <Text style={styles.modalTitle}>Confirm Payment</Text>
              <Text style={styles.modalSubtitle}>
                Did you complete the ₹{numericAmount.toLocaleString('en-IN')} transfer to{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                  {parsedQR.payeeName || parsedQR.payeeVpa}
                </Text>{' '}
                in your UPI app?
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Yes, Payment Successful"
                variant="accent"
                size="md"
                onPress={handleConfirmAssistedSuccess}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                title="No, Cancelled"
                variant="ghost"
                size="sm"
                onPress={handleCancelAssisted}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 1. INTERACTIVE OUTCOME MODAL (Cancellation / Failure / Limit) */}
      {/* ======================================================== */}
      {outcomeModal && (
        <Modal
          visible={outcomeModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setOutcomeModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.outcomeModalContent}>
              <View style={styles.outcomeModalHeader}>
                <View style={[styles.outcomeIconCircle, styles.outcomeCancelledBg]}>
                  <XCircle size={32} color={colors.textSecondary} />
                </View>
                <Text style={styles.outcomeModalTitle}>{outcomeModal.details.title}</Text>
                <Text style={styles.outcomeModalDesc}>{outcomeModal.details.description}</Text>
              </View>

              <View style={styles.outcomeActionsList}>
                <Button
                  title={isMerchant ? 'OK' : 'Return to Dashboard'}
                  variant="accent"
                  size="md"
                  onPress={handleOutcomeReturnDashboard}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 2. BUCKET SELECTOR MODAL (Switch bucket without rescanning) */}
      {/* ======================================================== */}
      <Modal
        visible={showBucketPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBucketPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bucketPickerContent}>
            <View style={styles.bucketPickerHeader}>
              <Text style={styles.bucketPickerTitle}>Select Deducting Bucket</Text>
              <Text style={styles.bucketPickerSubtitle}>
                Choose which bucket pays for ₹{numericAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
              {envelopes.map((env) => {
                const isSelected = env.id === selectedEnvelopeId;
                const canAfford = env.currentAmount >= numericAmount;
                return (
                  <TouchableOpacity
                    key={env.id}
                    style={[
                      styles.bucketOptionItem,
                      isSelected && styles.bucketOptionSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedEnvelopeId(env.id);
                      setShowBucketPicker(false);
                      if (error) setError(null);
                    }}
                  >
                    <View>
                      <Text style={styles.bucketOptionName}>{env.name}</Text>
                      <Text
                        style={[
                          styles.bucketOptionBalance,
                          !canAfford && { color: colors.statusWarning },
                        ]}
                      >
                        ₹{env.currentAmount.toLocaleString('en-IN')} available
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button
              title="Close"
              variant="ghost"
              size="sm"
              style={{ marginTop: spacing.md }}
              onPress={() => setShowBucketPicker(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Full-Screen Payment Commencement Shimmer Overlay */}
      {isLaunching && (
        <View style={styles.commencingOverlay}>
          <PixelCard
            noCardFrame
            variant="default"
            centerSoftness
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.commencingCard}>
            <View style={styles.commencingIconCircle}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
            <Text style={styles.commencingTitle}>COMMENCING UPI PAYMENT</Text>
            <Text style={styles.commencingSubtitle}>
              Opening Google Pay for ₹{numericAmount.toLocaleString('en-IN')}
            </Text>
            <View style={styles.commencingPayeePill}>
              <Text style={styles.commencingPayeeText} numberOfLines={1}>
                To: {parsedQR.payeeName || parsedQR.payeeVpa}
              </Text>
            </View>
            <Text style={styles.commencingHint}>
              Approve payment with your UPI PIN in Google Pay
            </Text>

            {/* Emergency Bailout Button to prevent freezing */}
            <TouchableOpacity
              style={styles.commenceBailoutButton}
              activeOpacity={0.7}
              onPress={handleBailoutCommence}
            >
              <Text style={styles.commenceBailoutText}>Cancel / Taking too long?</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    paddingBottom: spacing.xxxl,
  },
  navRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  personalIconCircle: {
    backgroundColor: 'rgba(255, 160, 0, 0.15)',
  },
  storeTextCol: {
    flex: 1,
  },
  payeeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  payeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  merchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  merchantBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.statusSuccess,
  },
  personalBadge: {
    backgroundColor: 'rgba(255, 160, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  personalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.statusWarning,
  },
  payeeVpa: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  envelopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelMuted: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  balanceBadge: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  amountSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dynamicAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dynamicAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  lockedBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  lockedText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 160, 0, 0.15)',
    padding: spacing.md,
    borderRadius: borderRadius.default,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  warningText: {
    fontSize: 12,
    color: colors.statusWarning,
    flex: 1,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.statusError,
    marginTop: spacing.xs,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  appSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentCard: {
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#22242A',
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  pixelDivider: {
    height: 1,
    backgroundColor: '#1C1D24',
    marginVertical: spacing.md,
  },
  commencingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: spacing.xl,
  },
  commencingCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111215',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2A2C38',
    padding: spacing.xl,
    alignItems: 'center',
    zIndex: 10,
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
  commencingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  commencingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  commencingSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  commencingPayeePill: {
    backgroundColor: '#181A22',
    borderWidth: 1,
    borderColor: '#272936',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
    maxWidth: '100%',
  },
  commencingPayeeText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '600',
  },
  commencingHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  singleAppDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: '#22242B',
  },
  appBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSuccess,
  },
  appBrandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  appActiveBadge: {
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
  },
  appActiveBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.statusSuccess,
  },
  footer: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
  p2pStepsModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111215',
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#242630',
  },
  p2pStepsHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  p2pIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(94, 106, 210, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  p2pStepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  p2pStepsSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  stepsList: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E2028',
    borderWidth: 1,
    borderColor: '#2F3240',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  stepDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  ackCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#16181E',
    borderWidth: 1,
    borderColor: '#272935',
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#4A4D5E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ackCheckboxText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceBase,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalActions: {
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  errorTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  outcomeModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#12141A',
    borderRadius: 22,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#262936',
    alignItems: 'center',
  },
  outcomeModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  outcomeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  outcomeCancelledBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  outcomeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  outcomeModalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  outcomeActionsList: {
    width: '100%',
    gap: 10,
  },
  commenceBailoutButton: {
    marginTop: spacing.lg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  commenceBailoutText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  bucketPickerContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#12141A',
    borderRadius: 22,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#262936',
  },
  bucketPickerHeader: {
    marginBottom: spacing.md,
  },
  bucketPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bucketPickerSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bucketOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#181A22',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242733',
  },
  bucketOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(94, 106, 210, 0.1)',
  },
  bucketOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bucketOptionBalance: {
    fontSize: 12,
    color: colors.statusSuccess,
    marginTop: 2,
  },
});

