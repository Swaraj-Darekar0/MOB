import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';

export interface StepItem {
  id: number;
  label: string;
}

export interface WorkspaceTopStepperProps {
  steps: StepItem[];
  currentStep: number; // 1-indexed (1, 2, 3)
  onStepPress?: (stepId: number) => void;
}

export const WorkspaceTopStepper: React.FC<WorkspaceTopStepperProps> = ({
  steps,
  currentStep,
  onStepPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step Pill / Node */}
              <TouchableOpacity
                disabled={!isCompleted || !onStepPress}
                onPress={() => onStepPress?.(step.id)}
                activeOpacity={0.7}
                style={[
                  styles.nodeContainer,
                  isActive && styles.nodeContainerActive,
                ]}
              >
                {/* Number / Checkmark Badge */}
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                    isPending && styles.circlePending,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color={colors.accentDark} strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        isActive && styles.circleTextActive,
                        isPending && styles.circleTextPending,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>

                {/* Step Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    (isCompleted || isActive) && styles.stepLabelActive,
                    isPending && styles.stepLabelPending,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>

              {/* Connecting Line */}
              {!isLast && (
                <View style={styles.connectorWrapper}>
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted ? styles.connectorCompleted : styles.connectorPending,
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
  },
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
  },
  nodeContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  circleCompleted: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  circleActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  circlePending: {
    backgroundColor: 'transparent',
    borderColor: colors.borderHighlight,
  },
  circleText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  circleTextActive: {
    color: colors.accentDark,
  },
  circleTextPending: {
    color: colors.textTertiary,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  stepLabelActive: {
    color: colors.textPrimary,
  },
  stepLabelPending: {
    color: colors.textTertiary,
  },
  connectorWrapper: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  connectorLine: {
    height: 1.5,
    borderRadius: 1,
    minWidth: 16,
  },
  connectorCompleted: {
    backgroundColor: colors.textPrimary,
  },
  connectorPending: {
    backgroundColor: colors.borderDefault,
  },
});
