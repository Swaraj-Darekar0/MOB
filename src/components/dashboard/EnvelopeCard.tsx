import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Envelope } from '../../types';
import { CountUp } from '../ui/CountUp';
import { ArrowUpRight, Trash2 } from 'lucide-react-native';

export interface EnvelopeCardProps {
  envelope: Envelope;
  onPayPress: (envelope: Envelope) => void;
  onPress?: (envelope: Envelope) => void;
  onDeletePress?: (envelope: Envelope) => void;
  style?: StyleProp<ViewStyle>;
}

export const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  envelope,
  onPayPress,
  onPress,
  onDeletePress,
  style,
}) => {
  const current = envelope.currentAmount;
  const allocated =
    envelope.allocatedAmount !== undefined && envelope.allocatedAmount > 0
      ? envelope.allocatedAmount
      : (envelope.targetAmount && envelope.targetAmount > 0
          ? envelope.targetAmount
          : current);

  // Exact burn-down calculations
  const spentAmount = Math.max(0, allocated - current);
  const percentLeft =
    allocated > 0
      ? Math.max(0, Math.min(100, Math.round((current / allocated) * 100)))
      : 100;

  const accentColor = envelope.color || colors.accent;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress ? () => onPress(envelope) : undefined}
      style={[styles.cardContainer, style]}
    >
      {/* 1. Header Bar: Identity & Runway Percentage (Always '% LEFT') */}
      <View style={styles.headerRow}>
        <View style={styles.titleSection}>
          <View style={[styles.identityPip, { backgroundColor: accentColor }]} />
          <Text style={styles.titleText} numberOfLines={1}>
            {envelope.name.toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.runwayText, { color: percentLeft < 20 ? colors.statusWarning : '#8E8E93' }]}>
          {percentLeft}% LEFT
        </Text>
      </View>

      {/* 2. Structured Hairline Divider */}
      <View style={styles.divider} />

      {/* 3. Hero Financial Telemetry Grid */}
      <View style={styles.metricsRow}>
        <View style={styles.heroColumn}>
          <Text style={styles.heroLabel}>LEFT TO SPEND</Text>
          <View style={styles.amountDisplay}>
            <Text style={styles.currencySymbol}>₹</Text>
            <CountUp
              value={current}
              duration={400}
              style={styles.heroAmount}
            />
          </View>
        </View>

        {allocated > 0 && (
          <View style={styles.contextColumn}>
            <Text style={styles.contextLabel}>SPENT</Text>
            <Text style={styles.contextValue}>
              ₹{spentAmount.toLocaleString('en-IN')} of ₹{allocated.toLocaleString('en-IN')}
            </Text>
          </View>
        )}
      </View>

      {/* 4. Precision 3.5px Burn-Down Runway Track */}
      {allocated > 0 && (
        <View style={styles.burnTrackContainer}>
          <View style={styles.burnTrack}>
            <View
              style={[
                styles.burnFill,
                {
                  width: `${percentLeft}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* 5. Bottom Row: Left Delete Icon & Center Prompt */}
      <View style={styles.bottomRowContainer}>
        {onDeletePress ? (
          <TouchableOpacity
            style={styles.cardDeleteBtn}
            activeOpacity={0.6}
            onPress={(e) => {
              e.stopPropagation();
              onDeletePress(envelope);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Delete ${envelope.name}`}
          >
            <Trash2 size={12} color="#555555" strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={styles.cardDeletePlaceholder} />
        )}

        <View style={styles.bottomCenterPrompt}>
          <Text style={styles.bottomPromptLabel}>TAP TO PAY FROM BUCKET</Text>
          <ArrowUpRight size={11.5} color="#8E8E93" strokeWidth={2.4} />
        </View>

        <View style={styles.cardDeletePlaceholder} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#22242A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 11,
    height: 180,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  identityPip: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EDEDED',
    letterSpacing: 0.6,
  },
  runwayText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1C1D22',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  heroColumn: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 1.0,
    marginBottom: 2,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8E8E93',
    marginRight: 2,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  contextColumn: {
    alignItems: 'flex-end',
  },
  contextLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  contextValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  burnTrackContainer: {
    marginBottom: 12,
  },
  burnTrack: {
    height: 3.5,
    backgroundColor: '#1C1D22',
    borderRadius: 2,
    overflow: 'hidden',
  },
  burnFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 2,
  },
  cardDeleteBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  cardDeletePlaceholder: {
    width: 24,
    height: 24,
  },
  bottomCenterPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomPromptLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.0,
  },
});
