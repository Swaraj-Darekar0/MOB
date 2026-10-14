import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Vibration,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Inbox,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { Transaction, Envelope, SystemCategory } from '../../types';
import { colors, spacing, borderRadius } from '../../theme';
import { formatPaise, toRupees } from '../../utils/money';

export interface ReviewQueuePopupProps {
  visible: boolean;
  onClose: () => void;
  unclassifiedItems: Transaction[];
  envelopes: Envelope[];
  unallocatedBalance?: number;
  onAssignBucket: (
    transactionId: string,
    envelopeId: string,
    categoryId?: SystemCategory
  ) => Promise<void>;
}

export const ReviewQueuePopup: React.FC<ReviewQueuePopupProps> = ({
  visible,
  onClose,
  unclassifiedItems,
  envelopes,
  unallocatedBalance = 0,
  onAssignBucket,
}) => {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Exactly 75% length and width of viewport per specification
  const POPUP_WIDTH = Math.round(SCREEN_WIDTH * 0.75);
  const POPUP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);
  const isAssigningRef = useRef(false);
  const isMountedRef = useRef(false);
  const isClosingRef = useRef(false);

  // Motion opening progress (0 = closed at top-left trigger, 1 = fully open at 75% size)
  const animProgress = useSharedValue(0);

  // Card switch transition progress
  const cardAnimProgress = useSharedValue(1);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const notifyClose = () => {
    onCloseRef.current?.();
  };

  // Close smoothly with spring animation back to top-left origin, then notify parent
  const handleClose = () => {
    if (isClosingRef.current || isAssigningRef.current) return;
    isClosingRef.current = true;
    animProgress.value = withSpring(
      0,
      {
        stiffness: 300,
        damping: 26,
        mass: 0.9,
      },
      (finished) => {
        if (finished) {
          runOnJS(notifyClose)();
        }
      }
    );
  };

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      isAssigningRef.current = false;
      setIsAssigning(false);
      setCurrentIndex(0);
      animProgress.value = 0;
      cardAnimProgress.value = 1;
      animProgress.value = withSpring(1, {
        stiffness: 280,
        damping: 24,
        mass: 0.9,
      });
    } else {
      animProgress.value = 0;
    }
    isMountedRef.current = true;
  }, [visible]);

  // Guaranteed safe items array
  const items = Array.isArray(unclassifiedItems) ? unclassifiedItems : [];
  const itemsCount = items.length;

  // Clamp current index safely within bounds
  const safeIndex =
    itemsCount > 0 ? Math.max(0, Math.min(currentIndex, itemsCount - 1)) : 0;

  const activeItem: Transaction | undefined =
    itemsCount > 0 ? items[safeIndex] : undefined;

  const reviewedAmountRupees = activeItem ? toRupees(activeItem.amountPaise) : 0;
  // User Invariant: Only show the unallocated button if the unallocated money present in user's database
  // is greater than or equal to the reviewed transaction money.
  const canAllocateToUnallocated =
    activeItem?.type === 'INCOME' || (unallocatedBalance !== undefined && unallocatedBalance >= reviewedAmountRupees);

  // Keep currentIndex bounded when unclassified items shrink or update
  useEffect(() => {
    if (itemsCount === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
    } else if (currentIndex >= itemsCount) {
      setCurrentIndex(Math.max(0, itemsCount - 1));
    }
  }, [itemsCount, currentIndex]);

  const formatDateSafe = (isoDate?: string) => {
    if (!isoDate) return 'Recent';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return 'Recent';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();
      if (isToday) {
        return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      if (isYesterday) {
        return 'Yesterday, ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return 'Recent';
    }
  };

  const handleSelectBucket = async (bucket: { id: string; name: string; currentAmount: number; color?: string }) => {
    if (!activeItem || isAssigningRef.current || isClosingRef.current) return;
    isAssigningRef.current = true;
    setIsAssigning(true);

    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(12);
      } catch {}
    }

    const currentTxId = activeItem.id;

    // 1. Decoupled smooth card exit animation on JS thread (NO inline runOnJS worklet calls)
    cardAnimProgress.value = withTiming(0, { duration: 150 });
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      // 2. Perform bucket assignment via DB & store update
      await onAssignBucket(currentTxId, bucket.id, undefined);

      // 3. Update index safely:
      // When currentTxId is removed, subsequent items naturally shift down into the current index slot.
      // We clamp to the new valid index range.
      setCurrentIndex((prev) => {
        const remaining = items.filter((item) => item.id !== currentTxId).length;
        if (remaining <= 0) return 0;
        return Math.min(prev, remaining - 1);
      });
    } catch (e) {
      console.error('[ReviewQueue] Error assigning bucket:', e);
    } finally {
      isAssigningRef.current = false;
      setIsAssigning(false);
      // 4. Smoothly animate the next card into view
      cardAnimProgress.value = withSpring(1, { stiffness: 320, damping: 24 });
    }
  };

  // Motion Transitioned Backdrop (Blur / Dark Glass tint)
  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: animProgress.value,
    };
  });

  // Smooth opening transition from top-left anchor (Clip-path inspired expansion)
  const popupAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(animProgress.value, [0, 1], [0.08, 1]);
    const opacity = interpolate(animProgress.value, [0, 0.15, 1], [0, 1, 1]);
    const translateX = interpolate(animProgress.value, [0, 1], [-(POPUP_WIDTH * 0.46), 0]);
    const translateY = interpolate(animProgress.value, [0, 1], [-(POPUP_HEIGHT * 0.46), 0]);
    const rad = interpolate(animProgress.value, [0, 1], [14, 24]);

    return {
      opacity,
      borderRadius: rad,
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  });

  // Card slide & scale animation inside popup
  const activeCardAnimatedStyle = useAnimatedStyle(() => {
    const cardScale = interpolate(cardAnimProgress.value, [0, 1], [0.92, 1]);
    const cardOpacity = interpolate(cardAnimProgress.value, [0, 1], [0, 1]);
    const cardTranslateY = interpolate(cardAnimProgress.value, [0, 1], [-16, 0]);

    return {
      opacity: cardOpacity,
      transform: [
        { translateY: cardTranslateY },
        { scale: cardScale },
      ],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* 1. Motion Transitioned Backdrop Blur Overlay */}
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* 2. Expanding Pop-up Container (75% x 75% of viewport from Top-Left) */}
        <Animated.View
          style={[
            styles.popupContainer,
            {
              width: POPUP_WIDTH,
              height: POPUP_HEIGHT,
              top: Math.max(54, insets.top + 46),
              left: 16,
            },
            popupAnimatedStyle,
          ]}
        >
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconPip}>
                <Inbox size={14} color={colors.accent} strokeWidth={2.4} />
              </View>
              <Text style={styles.headerTitle}>REVIEW QUEUE</Text>
              {activeItem && (
                <View style={styles.counterPill}>
                  <Text style={styles.counterText}>
                    {safeIndex + 1} of {itemsCount}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={handleClose}
              disabled={isAssigning}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={15} color={colors.textSecondary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          {activeItem ? (
            <View style={styles.contentContainer}>
              {/* --- Stacked Card Container --- */}
              <View style={styles.stackDeckArea}>
                {/* Background Stack Card (Depth illusion) */}
                {itemsCount > safeIndex + 1 && (
                  <View style={styles.backgroundStackCard} />
                )}

              {/* Active Foreground Transaction Card */}
              <Animated.View style={[styles.activeCard, activeCardAnimatedStyle]}>
                {/* Top Row: Bank Info & Date */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardBankLabel}>
                    {activeItem.bankName || 'BANK'}{' '}
                    {activeItem.accountLast4 ? `••${activeItem.accountLast4}` : ''}
                  </Text>
                  <Text style={styles.cardDateLabel}>
                    {formatDateSafe(activeItem.occurredAt)}
                  </Text>
                </View>

                {/* Main Row: Payee / Merchant Name & Type Icon */}
                <View style={styles.cardMainRow}>
                  <View style={styles.merchantContainer}>
                    <Text style={styles.merchantName} numberOfLines={1}>
                      {activeItem.merchantName ||
                        activeItem.payeeVpa ||
                        (activeItem.type === 'INCOME' ? 'Credit Deposit' : 'Bank Transaction')}
                    </Text>
                    <Text style={styles.channelLabel} numberOfLines={1}>
                      {activeItem.payeeVpa && activeItem.merchantName && activeItem.payeeVpa !== activeItem.merchantName
                        ? `${activeItem.payeeVpa} · `
                        : ''}
                      {activeItem.channel} · {activeItem.type}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.typeCircle,
                      activeItem.type === 'INCOME'
                        ? styles.typeCircleIncome
                        : activeItem.type === 'REVERSAL'
                        ? styles.typeCircleReversal
                        : styles.typeCircleExpense,
                    ]}
                  >
                    {activeItem.type === 'INCOME' ? (
                      <ArrowDownLeft size={16} color="#10B981" />
                    ) : activeItem.type === 'REVERSAL' ? (
                      <RotateCcw size={14} color="#A855F7" />
                    ) : (
                      <ArrowUpRight size={16} color={colors.accent} />
                    )}
                  </View>
                </View>

                {/* Amount Row */}
                <View style={styles.amountRow}>
                  <Text
                    style={[
                      styles.amountValue,
                      activeItem.type === 'INCOME' && { color: '#10B981' },
                    ]}
                  >
                    {activeItem.type === 'INCOME' ? '+' : ''}
                    {formatPaise(activeItem.amountPaise, true)}
                  </Text>
                </View>

                {/* Raw SMS Snippet Preview */}
                {activeItem.rawNarration && (
                  <View style={styles.narrationBox}>
                    <Text style={styles.narrationText} numberOfLines={2}>
                      "{activeItem.rawNarration.replace(/\r?\n/g, ' ')}"
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>

            {/* --- Bucket Selection Section Below the Card --- */}
            <View style={styles.bucketSelectionHeader}>
              <Text style={styles.selectionTitle}>SELECT BUCKET TO ALLOCATE</Text>
              <Text style={styles.selectionSubtitle}>Teaches auto-rule for future SMS</Text>
            </View>

            <ScrollView
              style={styles.bucketScrollView}
              contentContainerStyle={styles.bucketListContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Option: Unallocated Cash (Only shown if unallocatedBalance >= reviewed money) */}
              {canAllocateToUnallocated && (
                <TouchableOpacity
                  key="unallocated"
                  style={[
                    styles.bucketOptionCard,
                    styles.unallocatedOptionCard,
                    isAssigning && { opacity: 0.6 },
                  ]}
                  activeOpacity={0.7}
                  disabled={isAssigning}
                  onPress={() =>
                    handleSelectBucket({
                      id: 'unallocated',
                      name: 'Unallocated Cash',
                      currentAmount: unallocatedBalance,
                    })
                  }
                >
                  <View style={styles.bucketOptionLeft}>
                    <View style={[styles.bucketPip, { backgroundColor: '#64748B' }]} />
                    <View style={styles.bucketOptionTextCol}>
                      <Text style={styles.bucketOptionName} numberOfLines={1}>
                        Unallocated Cash
                      </Text>
                      <Text style={styles.unallocatedSubtext}>
                        Assign as general unallocated spending
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.bucketOptionBal, styles.unallocatedOptionBal]}>
                    ₹{Math.round(unallocatedBalance).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Categorized User Buckets */}
              {envelopes.map((bucket) => {
                const accentColor = bucket.color || colors.accent;
                return (
                  <TouchableOpacity
                    key={bucket.id}
                    style={[styles.bucketOptionCard, isAssigning && { opacity: 0.6 }]}
                    activeOpacity={0.7}
                    disabled={isAssigning}
                    onPress={() => handleSelectBucket(bucket)}
                  >
                    <View style={styles.bucketOptionLeft}>
                      <View style={[styles.bucketPip, { backgroundColor: accentColor }]} />
                      <Text style={styles.bucketOptionName} numberOfLines={1}>
                        {bucket.name}
                      </Text>
                    </View>

                    <Text style={styles.bucketOptionBal}>
                      ₹{Math.round(bucket.currentAmount).toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          /* Empty / All Reviewed State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <CheckCircle2 size={36} color="#10B981" strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>Queue is Clean</Text>
            <Text style={styles.emptySubtitle}>
              All transactions have been categorized and allocated to your envelopes.
            </Text>

            <TouchableOpacity style={styles.emptyDoneBtn} activeOpacity={0.8} onPress={handleClose}>
              <Text style={styles.emptyDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  </Modal>
);
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 7, 10, 0.78)',
  },
  popupContainer: {
    position: 'absolute',
    backgroundColor: '#0F1115',
    borderWidth: 1,
    borderColor: '#262933',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.6,
        shadowRadius: 28,
      },
      android: {
        elevation: 22,
      },
      web: {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
      },
    }),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1D24',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconPip: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.8,
  },
  counterPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#1E222B',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161920',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242730',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  stackDeckArea: {
    position: 'relative',
    height: 168,
    marginBottom: 10,
    justifyContent: 'center',
  },
  backgroundStackCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: -6,
    height: 154,
    borderRadius: 16,
    backgroundColor: '#0C0D10',
    borderWidth: 1,
    borderColor: '#1F222A',
    opacity: 0.7,
  },
  activeCard: {
    backgroundColor: '#15171D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2E39',
    padding: 13,
    height: 162,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBankLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E95A5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  merchantContainer: {
    flex: 1,
    marginRight: 8,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  channelLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  typeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeCircleExpense: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  typeCircleIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  typeCircleReversal: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },
  narrationBox: {
    backgroundColor: '#0E1014',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2129',
  },
  narrationText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  bucketSelectionHeader: {
    marginTop: 2,
    marginBottom: 8,
  },
  selectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  selectionSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#556070',
    marginTop: 1,
  },
  bucketScrollView: {
    flex: 1,
  },
  bucketListContent: {
    gap: 6,
    paddingBottom: 8,
  },
  bucketOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14161C',
    borderWidth: 1,
    borderColor: '#22252F',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  unallocatedOptionCard: {
    backgroundColor: '#101217',
    borderColor: '#2D323E',
    borderStyle: 'dashed',
  },
  bucketOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bucketOptionTextCol: {
    flex: 1,
  },
  bucketPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bucketOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  unallocatedSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  bucketOptionBal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    fontVariant: ['tabular-nums'],
  },
  unallocatedOptionBal: {
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#717F94',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyDoneBtn: {
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: '#282C37',
    paddingVertical: 9,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  emptyDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
});
