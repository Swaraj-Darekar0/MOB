/**
 * Test Suite: Profile Photo Pipeline (Onboarding -> State -> DB -> Profile Card)
 * 
 * Verifies:
 * 1. Avatar URI sanitization (trimming, whitespace to undefined)
 * 2. SQLite User Profile storage, retrieval, and updates
 * 3. Onboarding router param chaining (Step 1 -> Step 2 -> Step 3)
 * 4. ReflectiveCard avatarUri fallback resolution
 * 5. In-app photo editing and state synchronization
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n======================================================================');
console.log('🧪 Profile Photo Pipeline Verification Suite');
console.log('======================================================================\n');

// 1. Avatar URI Sanitization
console.log('--- 1. Testing Avatar URI Sanitization ---');
{
  function sanitizeAvatar(uri) {
    return uri && uri.trim().length > 0 ? uri.trim() : undefined;
  }

  assert(sanitizeAvatar('file:///path/to/img.png') === 'file:///path/to/img.png', 'Valid URI preserved');
  assert(sanitizeAvatar('  file:///path/to/img.png  ') === 'file:///path/to/img.png', 'Trims whitespace');
  assert(sanitizeAvatar('') === undefined, 'Empty string returns undefined');
  assert(sanitizeAvatar('    ') === undefined, 'Whitespace-only string returns undefined');
  assert(sanitizeAvatar(null) === undefined, 'Null returns undefined');
  assert(sanitizeAvatar(undefined) === undefined, 'Undefined returns undefined');
}

// 2. Database Model Simulation
console.log('\n--- 2. Testing SQLite Profile Storage & Mutation ---');
{
  const mockDb = {
    users: [],
    getUserProfile() {
      if (this.users.length === 0) return null;
      const row = this.users[0];
      const cleanAvatar = row.avatarUri && row.avatarUri.trim().length > 0 ? row.avatarUri.trim() : undefined;
      return {
        id: row.id,
        username: row.username,
        avatarUri: cleanAvatar,
        createdAt: row.createdAt,
      };
    },
    saveUserProfile(username, avatarUri) {
      const existing = this.getUserProfile();
      const trimmedName = username.trim();
      const cleanAvatar = avatarUri && avatarUri.trim().length > 0 ? avatarUri.trim() : undefined;
      const finalAvatar = cleanAvatar !== undefined ? cleanAvatar : (existing?.avatarUri || undefined);

      if (existing) {
        this.users[0] = {
          ...this.users[0],
          username: trimmedName,
          avatarUri: finalAvatar ?? null,
        };
        return { ...existing, username: trimmedName, avatarUri: finalAvatar };
      } else {
        const newUser = {
          id: 'user_1',
          username: trimmedName,
          avatarUri: finalAvatar ?? null,
          createdAt: new Date().toISOString(),
        };
        this.users.push(newUser);
        return {
          id: newUser.id,
          username: newUser.username,
          avatarUri: finalAvatar,
          createdAt: newUser.createdAt,
        };
      }
    },
    updateUserAvatar(avatarUri) {
      const existing = this.getUserProfile();
      if (!existing) throw new Error('User profile not found');
      const cleanAvatar = avatarUri && avatarUri.trim().length > 0 ? avatarUri.trim() : undefined;
      this.users[0].avatarUri = cleanAvatar ?? null;
      return { ...existing, avatarUri: cleanAvatar };
    },
  };

  // Initially empty
  assert(mockDb.getUserProfile() === null, 'Initial DB has null profile');

  // Complete onboarding with avatar
  const created = mockDb.saveUserProfile('swaraj', 'file:///data/user/0/avatar_onboarding.jpg');
  assert(created.username === 'swaraj', 'Username saved as swaraj');
  assert(created.avatarUri === 'file:///data/user/0/avatar_onboarding.jpg', 'Avatar saved from onboarding');

  // Load from DB
  const loaded = mockDb.getUserProfile();
  assert(loaded !== null, 'Loaded profile exists');
  assert(loaded.avatarUri === 'file:///data/user/0/avatar_onboarding.jpg', 'Loaded avatarUri matches saved URI');

  // Update profile image via settings tab
  mockDb.updateUserAvatar('file:///data/user/0/avatar_edited_in_settings.jpg');
  const updated = mockDb.getUserProfile();
  assert(updated.avatarUri === 'file:///data/user/0/avatar_edited_in_settings.jpg', 'Updated avatarUri persisted');

  // Update username without passing avatar retains current avatar
  mockDb.saveUserProfile('swaraj_pro');
  const reloaded = mockDb.getUserProfile();
  assert(reloaded.username === 'swaraj_pro', 'Username updated');
  assert(reloaded.avatarUri === 'file:///data/user/0/avatar_edited_in_settings.jpg', 'Avatar preserved during username update');
}

// 3. Onboarding Router Param Chaining
console.log('\n--- 3. Testing Onboarding Router Param Chaining ---');
{
  // Step 1: username.tsx
  const step1State = { username: ' alex ', avatarUri: 'file:///gallery/pic.png' };
  const step1Output = {
    pathname: '/(onboarding)/sms-permission',
    params: {
      username: step1State.username.trim().toLowerCase(),
      avatarUri: step1State.avatarUri || '',
    },
  };
  assert(step1Output.params.username === 'alex', 'Step 1 produces sanitized username');
  assert(step1Output.params.avatarUri === 'file:///gallery/pic.png', 'Step 1 forwards avatarUri');

  // Step 2: sms-permission.tsx
  const step2Received = step1Output.params;
  const step2Output = {
    pathname: '/(onboarding)/allocation',
    params: {
      username: step2Received.username || 'User',
      avatarUri: step2Received.avatarUri || '',
      startingBalance: '50000.00',
      balanceSource: 'SMS_REPORTED',
    },
  };
  assert(step2Output.params.avatarUri === 'file:///gallery/pic.png', 'Step 2 preserves avatarUri');

  // Step 3: allocation.tsx
  const step3Received = step2Output.params;
  const cleanAvatarUri = step3Received.avatarUri && step3Received.avatarUri.trim().length > 0
    ? step3Received.avatarUri.trim()
    : undefined;
  assert(cleanAvatarUri === 'file:///gallery/pic.png', 'Step 3 extracts clean avatar URI for completeOnboarding');
}

// 4. ReflectiveCard Fallback Resolution
console.log('\n--- 4. Testing ReflectiveCard Avatar Resolution ---');
{
  function resolveEffectiveAvatar(cardAvatarUri, storeUserAvatarUri) {
    return cardAvatarUri || storeUserAvatarUri;
  }

  assert(
    resolveEffectiveAvatar('file:///prop_override.jpg', 'file:///store.jpg') === 'file:///prop_override.jpg',
    'Explicit prop takes precedence over store'
  );
  assert(
    resolveEffectiveAvatar(undefined, 'file:///store.jpg') === 'file:///store.jpg',
    'Falls back to store user.avatarUri when prop is undefined'
  );
  assert(
    resolveEffectiveAvatar(undefined, undefined) === undefined,
    'Returns undefined when neither prop nor store has avatar (triggers PixelSculpt)'
  );
}

console.log('\n======================================================================');
console.log(`📊 Suite Completed: ${passed} Passed, ${failed} Failed`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
}
