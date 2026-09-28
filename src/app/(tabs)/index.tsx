import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { MorphingDeck, RubberSegmentBar } from '../../components/ui';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Envelope } from '../../types';
import { X, Plus, FolderPlus, LayoutGrid, Layers, Trash2 } from 'lucide-react-native';

export default function BucketsDashboardScreen() {
  const router = useRouter();
  const {
    envelopes,
    loadInitialData,
    createCustomEnvelope,
    deleteEnvelope,
  } = useAppStore();

  const { height: windowHeight } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  // View mode switcher: 'grid' (default row-wise list) or 'stack' (React Bits Stack physics)
  const [viewMode, setViewMode] = useState<'grid' | 'stack'>('grid');
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [stackScrollOffset, setStackScrollOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => Math.max(500, windowHeight - 160));

  // New Bucket Modal
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketAmount, setNewBucketAmount] = useState('');

  // Delete Bucket Modal state
  const [bucketToDelete, setBucketToDelete] = useState<Envelope | null>(null);
  const [deleteActivityOption, setDeleteActivityOption] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handlePayPress = (bucket: Envelope) => {
    router.push({
      pathname: '/payment/scan',
      params: { envelopeId: bucket.id },
    });
  };

  // Real-Time Morphing View Mode Transition Handler (Zero-Teleportation Compensation)
  const handleToggleViewMode = (mode: 'grid' | 'stack') => {
    if (mode === viewMode) return;
    if (mode === 'stack') {
      // Capture current scroll position so cards compile directly in the user's visible viewport
      setStackScrollOffset(scrollY.current);
    }
    setViewMode(mode);
  };

  // Create Bucket Handler
  const handleConfirmNewBucket = async () => {
    const name = newBucketName.trim();
    if (!name) {
      Alert.alert('Validation Error', 'Please enter a bucket name');
      return;
    }

    const amount = newBucketAmount ? parseFloat(newBucketAmount) : 0;

    try {
      await createCustomEnvelope(
        name,
        amount,
        undefined,
        undefined,
        undefined,
        'SPEND',
        amount
      );
      setNewBucketName('');
      setNewBucketAmount('');
      setShowNewBucket(false);
      Alert.alert('Bucket Created', `"${name}" bucket is ready.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create bucket');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header with Grid/Stack View Toggle and + New Bucket button */}
      <View style={styles.topDashboardBar}>
        <View>
          <Text style={styles.dashboardTitle}>BUCKETS</Text>
          <Text style={styles.dashboardSubtitle}>
            {envelopes.length} active allocation bucket{envelopes.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Top-Right View Switcher with Dynamic Rubber Squash-and-Stretch Animation */}
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
            activeTab={viewMode}
            onTabChange={(mode) => handleToggleViewMode(mode)}
            variant="compact"
            style={styles.viewToggleRubber}
          />

          {/* New Bucket Button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, styles.headerAccentBtn]}
            activeOpacity={0.7}
            onPress={() => setShowNewBucket(true)}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.headerAccentBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Container with GSAP/Lenis Luxury Eased Inertia Physics */}
      <ScrollView
        ref={scrollRef}
        scrollEnabled={viewMode === 'grid'}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 100) setViewportHeight(h);
        }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.985} // Tuned GSAP/Lenis inertia deceleration
        overScrollMode="never" // Avoid harsh Android stretch
        bounces={viewMode === 'grid'}
        alwaysBounceVertical={viewMode === 'grid'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            enabled={viewMode === 'grid'}
          />
        }
      >
        {/* Real-time Unified Morphing Deck (Grid <-> Stack) */}
        {envelopes.length > 0 && (
          <MorphingDeck
            envelopes={envelopes}
            viewMode={viewMode}
            onCardPress={handlePayPress}
            onDeletePress={(bucket) => setBucketToDelete(bucket)}
            viewportHeight={viewportHeight}
            scrollOffset={stackScrollOffset}
          />
        )}

        {/* Empty State */}
        {envelopes.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <FolderPlus size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Buckets Created</Text>
            <Text style={styles.emptyText}>
              Create your first virtual bucket to allocate funds and scan UPI merchant QRs.
            </Text>
            <Button
              title="+ Create First Bucket"
              variant="accent"
              size="md"
              onPress={() => setShowNewBucket(true)}
              style={styles.emptyBtn}
            />
          </View>
        )}
      </ScrollView>

      {/* Modal: New Bucket */}
      <Modal visible={showNewBucket} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Bucket</Text>
              <TouchableOpacity onPress={() => setShowNewBucket(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Bucket Name"
              placeholder="e.g. Dining, Groceries, Fuel"
              value={newBucketName}
              onChangeText={setNewBucketName}
            />

            <Input
              label="Spending Allowance (₹, optional)"
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={newBucketAmount}
              onChangeText={setNewBucketAmount}
            />

            <Button
              title="Create Bucket"
              variant="accent"
              size="lg"
              onPress={handleConfirmNewBucket}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: DELETE BUCKET (WITH CHECKBOXES) ================= */}
      <Modal visible={!!bucketToDelete} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
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
    backgroundColor: colors.surfaceBase, // #060606
  },
  topDashboardBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    backgroundColor: colors.surfaceBase,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.2,
  },
  dashboardSubtitle: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewToggleRubber: {
    width: 72,
  },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: 8,
  },
  headerAccentBtn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  headerAccentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 60,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  emptyBtn: {
    paddingHorizontal: spacing.xl,
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
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
