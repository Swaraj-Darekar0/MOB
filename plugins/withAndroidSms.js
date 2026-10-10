const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to inject Android SMS permissions and receiver
 * for privacy-first, on-device financial transaction reconciliation.
 * 
 * Injects:
 * - android.permission.READ_SMS
 * - android.permission.RECEIVE_SMS
 */
const withAndroidSms = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.READ_SMS',
      'android.permission.RECEIVE_SMS',
    ];

    for (const perm of permissions) {
      const alreadyHas = manifest['uses-permission'].some(
        (p) => p?.$?.['android:name'] === perm
      );
      if (!alreadyHas) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    return config;
  });
};

module.exports = withAndroidSms;
