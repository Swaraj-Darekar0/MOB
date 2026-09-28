import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { WorkspaceTopStepper } from '../../components/ui/WorkspaceTopStepper';
import { User, ArrowRight, Globe, Camera, Plus } from 'lucide-react-native';

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'Balance' },
  { id: 3, label: 'Buckets' },
];

export default function UsernameScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery permission is required to select a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
        setAvatarError('');
      }
    } catch (err) {
      console.error('Failed to pick profile image:', err);
      Alert.alert('Error', 'Failed to pick image from library.');
    }
  };

  const handleContinue = () => {
    const trimmed = username.trim().toLowerCase();
    let hasError = false;

    if (!avatarUri) {
      setAvatarError('Please select a profile photo to continue');
      hasError = true;
    } else {
      setAvatarError('');
    }

    if (!trimmed) {
      setError('Please enter a username');
      hasError = true;
    } else if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Only letters, numbers, and underscores allowed');
      hasError = true;
    } else {
      setError('');
    }

    if (hasError || !avatarUri) {
      return;
    }

    router.push({
      pathname: '/(onboarding)/balance',
      params: {
        username: trimmed,
        avatarUri,
      },
    });
  };

  const previewSlug = username.trim().toLowerCase() || 'yourname';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* React Bits Pro Workspace Top Stepper */}
          <WorkspaceTopStepper steps={STEPS} currentStep={1} />

          <View style={styles.header}>
            <Text style={styles.title}>Create your profile</Text>
            <Text style={styles.description}>
              This is the identity for your local virtual envelopes and UPI payment ledger.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Compulsory Profile Photo Picker */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={pickImage}
                style={styles.avatarWrapper}
              >
                <View
                  style={[
                    styles.avatarContainer,
                    avatarError ? styles.avatarContainerError : undefined,
                  ]}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={42} color={colors.textTertiary} />
                    </View>
                  )}
                </View>

                <View style={styles.cameraBadge}>
                  {avatarUri ? (
                    <Camera size={14} color={colors.accentDark} />
                  ) : (
                    <Plus size={15} color={colors.accentDark} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} onPress={pickImage}>
                <Text style={styles.avatarActionText}>
                  {avatarUri ? 'Change profile photo' : 'Upload profile photo'}
                </Text>
              </TouchableOpacity>

              {avatarError ? (
                <Text style={styles.avatarErrorText}>{avatarError}</Text>
              ) : (
                <Text style={styles.avatarHelperText}>Photo upload is required</Text>
              )}
            </View>

            <Input
              label="Username"
              placeholder="e.g. swaraj, alex_99"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (error) setError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
              leftIcon={<User size={18} color={colors.textTertiary} />}
            />

            {/* React Bits Pro Live URL Slug Preview */}
            <View style={styles.slugContainer}>
              <Text style={styles.slugLabel}>Profile URL preview</Text>
              <View style={styles.slugBox}>
                <View style={styles.slugPrefix}>
                  <Globe size={14} color={colors.textTertiary} style={styles.slugIcon} />
                  <Text style={styles.slugHost}>mob.local/@</Text>
                </View>
                <Text style={styles.slugValue} numberOfLines={1}>
                  {previewSlug}
                </Text>
              </View>
              <Text style={styles.slugHelper}>
                Virtual receipts and exports will be tagged with mob.local/@{previewSlug}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Continue"
              variant="accent"
              size="lg"
              onPress={handleContinue}
              icon={<ArrowRight size={18} color={colors.accentDark} />}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainerError: {
    borderColor: colors.statusError,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: colors.surfaceBase,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 4,
  },
  avatarHelperText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  avatarErrorText: {
    fontSize: 12,
    color: colors.statusError,
    fontWeight: '500',
  },
  slugContainer: {
    marginTop: spacing.xs,
  },
  slugLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  slugBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  slugPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slugIcon: {
    marginRight: 6,
  },
  slugHost: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  slugValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  slugHelper: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
