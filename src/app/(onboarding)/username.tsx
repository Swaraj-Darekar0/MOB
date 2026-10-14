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
import { User, ArrowRight, Camera, Sparkles } from 'lucide-react-native';

const STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'SMS Sync' },
  { id: 3, label: 'Buckets' },
];

export default function UsernameScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState('');

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery permission is required to select an optional profile photo.'
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
      }
    } catch (err) {
      console.error('Failed to pick profile image:', err);
    }
  };

  const handleContinue = () => {
    const trimmed = username.trim().toLowerCase();

    if (!trimmed) {
      setError('Please choose a username');
      return;
    }
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Only letters, numbers, and underscores allowed');
      return;
    }

    setError('');

    // Step 1 -> Step 2: Route to sms-permission passing username
    router.push({
      pathname: '/(onboarding)/sms-permission',
      params: {
        username: trimmed,
        avatarUri: avatarUri || '',
      },
    });
  };

  const monogramLetter = username.trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Workspace Top Stepper at Step 1 */}
          <View style={styles.stepperContainer}>
            <WorkspaceTopStepper steps={STEPS} currentStep={1} />
          </View>

          <View style={styles.contentBody}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.badgeRow}>
                <Sparkles size={13} color={colors.accent} />
                <Text style={styles.badgeText}>STEP 1 OF 3</Text>
              </View>
              <Text style={styles.title}>Welcome to MOB</Text>
              <Text style={styles.description}>
                Choose a unique username to personalize your virtual envelope ledger and UPI reconciliation.
              </Text>
            </View>

            {/* Stylish Monogram / Icon Avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={pickImage}
                style={styles.avatarWrapper}
              >
                <View style={styles.avatarGlowRing}>
                  <View style={styles.avatarContainer}>
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : monogramLetter ? (
                      <View style={styles.monogramBox}>
                        <Text style={styles.monogramText}>{monogramLetter}</Text>
                      </View>
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={38} color={colors.textSecondary} />
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.cameraBadge}>
                  <Camera size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={pickImage}
                style={styles.optionalPhotoBtn}
              >
                <Text style={styles.optionalPhotoText}>
                  {avatarUri ? 'Change photo' : 'Add photo (optional)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clean Username Input */}
            <View style={styles.form}>
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
                leftIcon={<User size={18} color={colors.accent} />}
              />
              <Text style={styles.inputHelperText}>
                Letters, numbers, and underscores only. Min 3 characters.
              </Text>
            </View>
          </View>

          {/* Footer Action */}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  stepperContainer: {
    marginBottom: spacing.md,
  },
  contentBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  header: {
    marginBottom: spacing.xl,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarGlowRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 3,
    backgroundColor: 'rgba(94, 106, 210, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(94, 106, 210, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  monogramBox: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    borderWidth: 2,
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
  optionalPhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  optionalPhotoText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  form: {
    width: '100%',
  },
  inputHelperText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginLeft: 2,
    lineHeight: 16,
  },
  footer: {
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : spacing.md,
  },
});
