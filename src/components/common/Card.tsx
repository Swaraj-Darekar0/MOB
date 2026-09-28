import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

interface CardProps extends ViewProps {
  variant?: 'raised' | 'elevated' | 'flat';
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'raised',
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'raised' && styles.raised,
        variant === 'elevated' && styles.elevated,
        variant === 'flat' && styles.flat,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.default,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
  },
  flat: {
    backgroundColor: 'transparent',
    borderColor: colors.borderDefault,
  },
});
