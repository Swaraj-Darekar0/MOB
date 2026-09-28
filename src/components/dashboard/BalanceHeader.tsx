import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Card } from '../common/Card';
import { CountUp } from '../ui/CountUp';

interface BalanceHeaderProps {
  trackedBalance: number;
  allocatedBalance: number;
  unallocatedBalance: number;
  username?: string;
}

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({
  trackedBalance,
  allocatedBalance,
  unallocatedBalance,
  username,
}) => {
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Manual Snapshot</Text>
          </View>
        </View>
        
        <CountUp
          value={trackedBalance}
          prefix="₹"
          duration={600}
          style={styles.mainBalance}
        />

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
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  mainBalance: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  allocatedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unallocatedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  unallocatedPositive: {
    color: colors.accent,
  },
});
