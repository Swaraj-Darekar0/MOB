import React, { useState, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';
import { QRScannerReticle } from '../../components/ui/QRScannerReticle';
import { parseUPIUri } from '../../services/payment/upiParser';
import { getMatchingUPIHandles } from '../../services/payment/upiHandles';
import { useAppStore } from '../../store/useAppStore';
import { ParsedUPIQR } from '../../types';
import {
  ArrowLeft,
  QrCode,
  Flashlight,
  AlertCircle,
  X,
  Smartphone,
} from 'lucide-react-native';

export default function QRScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ envelopeId: string }>();
  const envelopeId = params.envelopeId;

  const envelopes = useAppStore((state) => state.envelopes);
  const currentEnvelope = envelopes.find((e) => e.id === envelopeId);

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Manual UPI ID / Phone Number Modal with Deterministic Auto-Complete Dropdown
  const [showManualModal, setShowManualModal] = useState(false);
  const [payeeInput, setPayeeInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const suggestions = useMemo(() => {
    return getMatchingUPIHandles(payeeInput);
  }, [payeeInput]);


  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setScanError(null);

    const parsed = parseUPIUri(data);
    if (!parsed.isValid) {
      setScanError(parsed.error || 'Invalid or unsupported UPI QR code.');
      setIsProcessing(false);
      return;
    }

    // Proceed to confirmation screen
    router.push({
      pathname: '/payment/confirm',
      params: {
        envelopeId,
        parsedQRJson: JSON.stringify(parsed),
      },
    });
  };

  // Helper to build resolved VPA
  const getResolvedVpa = (): string => {
    const trimmed = payeeInput.trim();
    if (!trimmed) return '';
    if (trimmed.includes('@')) {
      return trimmed;
    }
    // If it's pure digits (like 10-digit mobile number)
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `${digitsOnly}@okaxis`;
    }
    return `${trimmed}@okaxis`;
  };


  const handleManualSubmit = () => {
    const finalVpa = getResolvedVpa();
    if (!finalVpa || !finalVpa.includes('@')) {
      Alert.alert(
        'Invalid UPI ID',
        'Please enter a valid 10-digit phone number or UPI ID (e.g. 9876543210 or user@okaxis).'
      );
      return;
    }

    const parsedAmount = amountInput ? parseFloat(amountInput) : 0;
    const note = noteInput.trim() || undefined;

    const parsed: ParsedUPIQR = {
      isValid: true,
      payeeVpa: finalVpa,
      payeeName: finalVpa.split('@')[0],
      amount: parsedAmount > 0 ? parsedAmount : undefined,
      currency: 'INR',
      transactionNote: note,
      rawPayload: `upi://pay?pa=${encodeURIComponent(finalVpa)}&pn=${encodeURIComponent(
        finalVpa.split('@')[0]
      )}${parsedAmount > 0 ? `&am=${parsedAmount}` : ''}&cu=INR`,
      isDynamic: parsedAmount > 0,
    };

    setShowManualModal(false);
    router.push({
      pathname: '/payment/confirm',
      params: {
        envelopeId,
        parsedQRJson: JSON.stringify(parsed),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Header Bar: Back button on left, Flashlight on right (navbar title removed) */}
      <View style={styles.header}>
        <Button
          title="Back"
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          icon={<ArrowLeft size={18} color={colors.textPrimary} />}
        />

        <View style={styles.headerCenterSpace} />

        {/* Torch Button: Safe inside padding */}
        <TouchableOpacity
          onPress={() => setTorch((prev) => !prev)}
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Flashlight size={19} color={torch ? colors.accent : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 2. Certain Positioned "Paying from bucket" Banner just below navbar */}
      {currentEnvelope && (
        <View style={styles.payingFromBanner}>
          <View
            style={[
              styles.bucketPip,
              { backgroundColor: currentEnvelope.color || colors.accent },
            ]}
          />
          <View style={styles.payingFromContent}>
            <View style={styles.payingFromHeaderRow}>
              <Text style={styles.payingFromPrefix}>PAYING FROM BUCKET</Text>
              <Text style={styles.payingFromAmountBadge}>
                ₹{currentEnvelope.currentAmount.toLocaleString('en-IN')} available
              </Text>
            </View>
            <Text style={styles.payingFromBucketName} numberOfLines={1}>
              {currentEnvelope.name}
            </Text>
          </View>
        </View>
      )}

      {/* 3. Camera Viewfinder Area */}
      <View style={styles.cameraContainer}>
        {!permission ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Checking camera permissions...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <QrCode size={56} color={colors.textTertiary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              MOB requires camera access to scan merchant UPI QR codes.
            </Text>
            <Button
              title="Grant Camera Access"
              variant="accent"
              size="md"
              onPress={requestPermission}
              style={styles.grantBtn}
            />
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
            />

            {/* Viewfinder Target & Laser Scanning Reticle as absolute sibling overlay */}
            <View style={styles.overlay} pointerEvents="box-none">
              <QRScannerReticle
                size={260}
                isProcessing={isProcessing}
                hasError={!!scanError}
              />
              <Text style={styles.instruction}>
                Align the merchant UPI QR inside the frame
              </Text>

              {scanError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.statusError} />
                  <Text style={styles.errorBannerText}>{scanError}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* 4. Manual Phone / UPI ID Trigger */}
      <View style={styles.footer}>
        <Button
          title="Pay UPI ID or Phone Number"
          variant="secondary"
          size="md"
          onPress={() => setShowManualModal(true)}
          icon={<Smartphone size={16} color={colors.textSecondary} />}
        />
      </View>

      {/* 5. UPI ID / Phone Number P2P Modal */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pay UPI ID or Mobile Number</Text>
                <Text style={styles.modalDesc}>
                  Enter a 10-digit phone number or UPI VPA (P2P / Merchant)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManualModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Input: Phone or VPA */}
              <Text style={styles.inputLabel}>RECIPIENT UPI ID OR PHONE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 9876543210 or name@okaxis"
                placeholderTextColor="#666666"
                value={payeeInput}
                onChangeText={(txt) => {
                  setPayeeInput(txt);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Deterministic Auto-Complete Dropdown Filter (Top 4 visible, vertical scroll for rest) */}
              {showDropdown && suggestions.length > 0 && (
                <View style={styles.dropdownContainer}>
                  <View style={styles.dropdownHeaderRow}>
                    <Text style={styles.dropdownHeaderLabel}>SUGGESTED UPI HANDLES</Text>
                    <Text style={styles.dropdownHeaderSub}>Tap to auto-complete</Text>
                  </View>
                  <ScrollView
                    style={styles.dropdownScrollView}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {suggestions.map((item, idx) => (
                      <TouchableOpacity
                        key={`${item.fullVpa}_${idx}`}
                        style={[
                          styles.dropdownItem,
                          idx === suggestions.length - 1 && styles.dropdownItemLast,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setPayeeInput(item.fullVpa);
                          setShowDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <Text style={styles.dropdownVpaText} numberOfLines={1}>
                            <Text style={styles.dropdownPrefixText}>{item.prefix}</Text>
                            <Text style={styles.dropdownHandleText}>{item.handle}</Text>
                          </Text>
                        </View>
                        <View style={styles.providerBadge}>
                          <Text style={styles.providerBadgeText}>{item.provider}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Resolved Preview */}
              {payeeInput.length > 0 && !showDropdown && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Resolved VPA:</Text>
                  <Text style={styles.previewValue}>{getResolvedVpa()}</Text>
                </View>
              )}


              {/* Amount Input */}
              <Text style={styles.inputLabel}>AMOUNT (₹, OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 500 (leave empty for custom at checkout)"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                value={amountInput}
                onChangeText={setAmountInput}
              />

              {/* Note Input */}
              <Text style={styles.inputLabel}>NOTE / REMARK (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Lunch, Split, Rent"
                placeholderTextColor="#666666"
                value={noteInput}
                onChangeText={setNoteInput}
              />

              {/* Action Button: Strictly Continue to Payment for clarity */}
              <View style={styles.modalActionGroup}>
                <Button
                  title="Continue to Payment"
                  variant="accent"
                  size="lg"
                  onPress={handleManualSubmit}
                />
              </View>
            </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceBase,
  },
  headerCenterSpace: {
    flex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  iconBtnActive: {
    backgroundColor: 'rgba(94, 106, 210, 0.25)',
    borderColor: colors.accent,
  },
  payingFromBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#22242B',
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
  },
  bucketPip: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  payingFromContent: {
    flex: 1,
  },
  payingFromHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  payingFromPrefix: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 0.8,
  },
  payingFromAmountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  payingFromBucketName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  permissionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  grantBtn: {
    marginTop: spacing.xl,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  instruction: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 20, 41, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.default,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.statusError,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceBase,
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
    paddingBottom: spacing.xxxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.default,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  dropdownContainer: {
    backgroundColor: '#111216',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242733',
    marginTop: 6,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1D1E26',
    backgroundColor: '#15161D',
  },
  dropdownHeaderLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8A8D9F',
    letterSpacing: 0.8,
  },
  dropdownHeaderSub: {
    fontSize: 10,
    color: '#5E6AD2',
    fontWeight: '600',
  },
  dropdownScrollView: {
    maxHeight: 176, // Exactly 4 items visible (4 * 44px)
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1B1C23',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  dropdownVpaText: {
    fontSize: 13,
  },
  dropdownPrefixText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dropdownHandleText: {
    color: colors.accent,
    fontWeight: '700',
  },
  providerBadge: {
    backgroundColor: 'rgba(94, 106, 210, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent,
  },

  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0E11',
    borderWidth: 1,
    borderColor: '#1E2028',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  previewLabel: {
    fontSize: 11,
    color: '#666666',
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  modalActionGroup: {
    marginTop: spacing.xl,
    gap: 10,
  },
});
