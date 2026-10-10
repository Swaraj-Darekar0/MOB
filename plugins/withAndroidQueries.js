const { withAndroidManifest } = require('@expo/config-plugins');

const UPI_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user', // Google Pay
  'com.phonepe.app',                       // PhonePe
  'net.one97.paytm',                       // Paytm
  'in.org.npci.upiapp',                    // BHIM
  'com.cred.club',                         // CRED
  'in.amazon.mShop.android.shopping',      // Amazon Pay
  'com.whatsapp',                          // WhatsApp Pay
];

/**
 * Expo Config Plugin to inject Android 11+ (API 30+) <queries> element
 * into AndroidManifest.xml. This allows the standalone APK to discover and
 * launch Google Pay and other UPI applications directly without being blocked
 * by Android's package visibility security filter.
 */
const withAndroidQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [];
    }

    let queryBlock = manifest.queries[0];
    if (!queryBlock) {
      queryBlock = {};
      manifest.queries.push(queryBlock);
    }

    if (!queryBlock.package) {
      queryBlock.package = [];
    }

    const existingPackages = new Set(
      queryBlock.package
        .map((p) => p?.$?.['android:name'])
        .filter(Boolean)
    );

    for (const pkg of UPI_PACKAGES) {
      if (!existingPackages.has(pkg)) {
        queryBlock.package.push({
          $: { 'android:name': pkg },
        });
      }
    }

    if (!queryBlock.intent) {
      queryBlock.intent = [];
    }

    const hasUpiIntent = queryBlock.intent.some(
      (intent) =>
        intent.data?.some((d) => d?.$?.['android:scheme'] === 'upi') &&
        intent.action?.some((a) => a?.$?.['android:name'] === 'android.intent.action.VIEW')
    );

    if (!hasUpiIntent) {
      queryBlock.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'upi' } }],
      });
    }

    return config;
  });
};

module.exports = withAndroidQueries;
