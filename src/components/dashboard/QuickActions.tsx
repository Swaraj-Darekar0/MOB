import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '../../theme';
import { Button } from '../common/Button';
import { PlusCircle, ArrowLeftRight, FolderPlus } from 'lucide-react-native';

interface QuickActionsProps {
  onAddMoney: () => void;
  onAllocate: () => void;
  onCreateEnvelope: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddMoney,
  onAllocate,
  onCreateEnvelope,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Button
          title="Add Money"
          variant="secondary"
          size="sm"
          onPress={onAddMoney}
          icon={<PlusCircle size={15} color={colors.accent} />}
          style={styles.actionBtn}
        />
        <Button
          title="Allocate / Move"
          variant="secondary"
          size="sm"
          onPress={onAllocate}
          icon={<ArrowLeftRight size={15} color={colors.textPrimary} />}
          style={styles.actionBtn}
        />
        <Button
          title="New Envelope"
          variant="secondary"
          size="sm"
          onPress={onCreateEnvelope}
          icon={<FolderPlus size={15} color={colors.textSecondary} />}
          style={styles.actionBtn}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.md + 2,
  },
});
