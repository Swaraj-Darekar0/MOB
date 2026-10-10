import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Card } from '../common/Card';
import { CountUp } from '../ui/CountUp';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';

interface BalanceHeaderProps {
  trackedBalance: number;
  allocatedBalance: number;
  unallocatedBalance: number;
  username?: string;
  source?: 'SMS_REPORTED' | 'MANUAL_INITIAL_BALANCE' | 'USER_ENTERED';
  reconciliationStatus?: 'RECONCILED' | 'MISMATCH' | 'NO_REPORTED_BALANCE';
  latestReportedBalance?: number;
  differenceAmount?: number;
}

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({
  trackedBalance,
  allocatedBalance,
  unallocatedBalance,
  username,
  source = 'MANUAL_INITIAL_BALANCE',
  reconciliationStatus = 'NO_REPORTED_BALANCE',
  latestReportedBalance,
  differenceAmount,
}) => {
  const isMismatch = reconciliationStatus === 'MISMATCH' && (differenceAmount || 0) !== 0;

  return (
    <View style={styles.container}>
      {username ? (
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Welcome,</Text>
          <Text style={styles.usernameText}>@{username}</Text>
        </View>
      ) : null}

      <Card variant="raised" style={styles.mainCard}>
        <View style={styles.headerTop}>
          <Text style={styles.subtitle}>TRACKED BANK BALANCE</Text>
          <View
            style={[
              styles.badge,
              reconciliationStatus === 'RECONCILED' && styles.badgeSuccess,
              isMismatch && styles.badgeWarning,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                reconciliationStatus === 'RECONCILED' && { color: colors.statusSuccess },
                isMismatch && { color: colors.statusWarning },
              ]}
            >
              {isMismatch
                ? 'Balance Mismatch'
                : reconciliationStatus === 'RECONCILED'
                ? 'SMS Reconciled'
                : source === 'SMS_REPORTED'
                ? 'SMS Verified'
                : 'Manual Snapshot'}
            </Text>
          </View>
        </View>

        <CountUp
          value={trackedBalance}
          prefix="₹"
          duration={600}
          style={styles.mainBalance}
        />

        {/* Explicit Mismatch Banner */}
        {isMismatch && (
          <View style={styles.mismatchBanner}>
            <AlertTriangle size={14} color={colors.statusWarning} />
            <Text style={styles.mismatchText}>
              Bank reports ₹{(latestReportedBalance || 0).toLocaleString('en-IN')}{' '}
              (Diff: ₹{Math.abs(differenceAmount || 0).toLocaleString('en-IN')}). Review recent activity.
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Allocated to Envelopes</Text>
            <CountUp
              value={allocatedBalance}
              prefix="₹"
              duration={500}
              style={styles.allocatedAmount}
            />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Unallocated Funds</Text>
            <CountUp
              value={unallocatedBalance}
              prefix="₹"
              duration={500}
              style={[
                styles.unallocatedAmount,
                unallocatedBalance > 0 && styles.unallocatedPositive,
              ]}
            />
          </View>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  greetingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mainCard: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.default,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
    borderColor: 'rgba(255, 160, 0, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  mainBalance: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: spacing.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  mismatchText: {
    flex: 1,
    fontSize: 12,
    color: colors.statusWarning,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
    fontWeight: '500',
  },
  allocatedAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unallocatedAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  unallocatedPositive: {
    color: colors.statusSuccess,
  },
});
