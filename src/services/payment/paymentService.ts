import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Clipboard from 'expo-clipboard';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import type {
  NormalizedUPIResponse,
  PaymentStatus,
  UPIFailureCategory,
  UPIFailureDetails,
} from '../../types';
import { parseUPIUri } from './upiParser';
import { classifyUPIPayment, isMerchantPSPHandle, classifyUPITarget } from './upiHandles';

export { classifyUPIPayment, isMerchantPSPHandle, classifyUPITarget };


/**
 * Supported UPI application targets.
 */
export const UPI_APPS = {
  gpay: {
    id: 'gpay',
    name: 'Google Pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    playStoreUri: 'market://details?id=com.google.android.apps.nbu.paisa.user',
    webUri: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
    scheme: 'upi://',
  },
  phonepe: {
    id: 'phonepe',
    name: 'PhonePe',
    packageName: 'com.phonepe.app',
    playStoreUri: 'market://details?id=com.phonepe.app',
    webUri: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
    scheme: 'phonepe://',
  },
  paytm: {
    id: 'paytm',
    name: 'Paytm',
    packageName: 'net.one97.paytm',
    playStoreUri: 'market://details?id=net.one97.paytm',
    webUri: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
    scheme: 'paytmmp://',
  },
  bhim: {
    id: 'bhim',
    name: 'BHIM',
    packageName: 'in.org.npci.upiapp',
    playStoreUri: 'market://details?id=in.org.npci.upiapp',
    webUri: 'https://play.google.com/store/apps/details?id=in.org.npci.upiapp',
    scheme: 'upi://',
  },
  chooser: {
    id: 'chooser',
    name: 'System Chooser (All Apps)',
    packageName: undefined,
    playStoreUri: undefined,
    webUri: undefined,
    scheme: 'upi://pay',
  },
} as const;

export type UPIAppTarget = keyof typeof UPI_APPS;

/**
 * Constants for Google Pay integration (backward compatibility).
 */
export const GOOGLE_PAY_PACKAGE = UPI_APPS.gpay.packageName;
export const GOOGLE_PLAY_STORE_URI = UPI_APPS.gpay.playStoreUri;
export const GOOGLE_PLAY_WEB_URI = UPI_APPS.gpay.webUri;

// Mock state control for development and testing
let mockStatusOverride: PaymentStatus | null = null;
let mockModeEnabled: boolean = false;

/**
 * Overrides the mock payment status returned in simulation/fallback mode.
 * Set to null to restore default behavior (SUCCESS).
 */
export function setMockPaymentStatus(status: PaymentStatus | null): void {
  mockStatusOverride = status;
}

/**
 * Enables or disables mock mode for testing environments.
 */
export function setMockMode(enabled: boolean): void {
  mockModeEnabled = enabled;
}

/**
 * Checks whether mock mode is currently enabled.
 */
export function isMockModeEnabled(): boolean {
  return mockModeEnabled;
}

/**
 * Generates a unique transaction reference for local tracking and reconciliation.
 * Format: V1-{timestamp}-{randomSuffix} (e.g., V1-20260926T143015Z-A81F2C)
 *
 * @param prefix Local reference prefix (default: 'V1')
 * @returns Formatted transaction reference string
 */
export function generateTransactionRef(prefix = 'V1'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${randomSuffix}`.slice(0, 30);
}

/**
 * Constructs a standard UPI payment URI (`upi://pay?...`).
 * Formats amount to 2 decimal places and properly encodes all query components.
 *
 * Intelligent tr Stripping:
 * - For Merchant QRs (mc present and not '0000'): passes tr, mc, mid, sid, tid.
 * - For Personal QRs (P2P): omits tr and merchant flags completely, constructing a pure P2P URI.
 */
export function buildUPIUri(params: {
  pa: string;
  pn?: string;
  am: number;
  tr?: string;
  tn?: string;
  mc?: string;
  mid?: string;
  sid?: string;
  tid?: string;
  url?: string;
}): string {
  const queryParts: string[] = [];
  queryParts.push(`pa=${encodeURIComponent(params.pa)}`);
  if (params.pn) {
    queryParts.push(`pn=${encodeURIComponent(params.pn)}`);
  }

  // Intelligent Merchant vs P2P distinction using deterministic VPA Classification Engine:
  const classification = classifyUPIPayment({
    payeeVpa: params.pa,
    merchantCode: params.mc,
    merchantId: params.mid,
    storeId: params.sid,
    terminalId: params.tid,
  });
  const isMerchant = classification.isMerchant;

  if (isMerchant) {
    if (params.mc) queryParts.push(`mc=${encodeURIComponent(params.mc)}`);
    if (params.mid) queryParts.push(`mid=${encodeURIComponent(params.mid)}`);
    if (params.sid) queryParts.push(`sid=${encodeURIComponent(params.sid)}`);
    if (params.tid) queryParts.push(`tid=${encodeURIComponent(params.tid)}`);
  }

  queryParts.push(`am=${encodeURIComponent(params.am.toFixed(2))}`);
  queryParts.push('cu=INR');

  // Intelligent tr Stripping:
  // Only include tr for merchant transactions. Personal QRs omit tr to prevent merchant order validation errors.
  if (isMerchant && params.tr) {
    queryParts.push(`tr=${encodeURIComponent(params.tr)}`);
  }

  if (params.tn) {
    queryParts.push(`tn=${encodeURIComponent(params.tn)}`);
  }
  if (params.url) {
    queryParts.push(`url=${encodeURIComponent(params.url)}`);
  }
  return `upi://pay?${queryParts.join('&')}`;
}

/**
 * Checks whether the specified UPI app or any UPI handler is available on the device.
 *
 * @param targetApp The target UPI app ('gpay' | 'phonepe' | 'paytm' | 'bhim' | 'chooser')
 * @returns Promise resolving to true if intent handler can be opened
 */
export async function checkAppInstalled(targetApp: UPIAppTarget = 'gpay'): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    const appConfig = UPI_APPS[targetApp];
    const scheme = appConfig?.scheme || 'upi://pay';
    return await Linking.canOpenURL(scheme);
  } catch (error) {
    console.warn(`[PaymentService] Error checking ${targetApp} installation:`, error);
    return false;
  }
}

/**
 * Backward compatibility check for Google Pay.
 */
export async function checkGooglePayInstalled(): Promise<boolean> {
  return checkAppInstalled('gpay');
}

/**
 * Opens Google Play Store to install a UPI app.
 */
export async function openAppStore(targetApp: UPIAppTarget = 'gpay'): Promise<void> {
  const appConfig = UPI_APPS[targetApp] || UPI_APPS.gpay;
  const storeUri = appConfig.playStoreUri || GOOGLE_PLAY_STORE_URI;
  const webUri = appConfig.webUri || GOOGLE_PLAY_WEB_URI;

  try {
    if (Platform.OS === 'android' && storeUri) {
      const canOpenMarket = await Linking.canOpenURL(storeUri);
      if (canOpenMarket) {
        await Linking.openURL(storeUri);
        return;
      }
    }
    if (webUri) {
      await Linking.openURL(webUri);
    }
  } catch (error) {
    console.error(`[PaymentService] Failed to open Play Store for ${targetApp}:`, error);
    if (webUri) {
      try {
        await Linking.openURL(webUri);
      } catch (fallbackError) {
        console.error('[PaymentService] Failed to open Web Store URL fallback:', fallbackError);
      }
    }
  }
}

/**
 * Backward compatibility alias for opening Google Pay on Play Store.
 */
export async function openGooglePlayStore(): Promise<void> {
  return openAppStore('gpay');
}

/**
 * Helper to parse a key-value or query string into a lowercase-keyed dictionary.
 */
function parseKeyValueString(str: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!str || typeof str !== 'string') return map;

  const trimmed = str.trim();
  const qIdx = trimmed.indexOf('?');
  const qs = qIdx !== -1 ? trimmed.substring(qIdx + 1) : trimmed;

  for (const part of qs.split('&')) {
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const rawKey = part.substring(0, eqIdx);
      const rawVal = part.substring(eqIdx + 1);
      try {
        map[decodeURIComponent(rawKey.replace(/\+/g, ' ')).toLowerCase()] =
          decodeURIComponent(rawVal.replace(/\+/g, ' '));
      } catch {
        map[rawKey.replace(/\+/g, ' ').toLowerCase()] = rawVal.replace(/\+/g, ' ');
      }
    }
  }
  return map;
}

/**
 * Resolves human-language diagnostics for NPCI response codes, Android cancellation states, and limits.
 */
export function resolveUPIFailureDetails(
  status: PaymentStatus,
  responseCode?: string,
  resultCode?: number,
  rawStatus?: string,
  rawError?: string
): UPIFailureDetails | undefined {
  if (status === 'SUCCESS') return undefined;

  const code = (responseCode || '').trim().toUpperCase();
  const raw = (rawStatus || '').trim().toUpperCase();
  const err = (rawError || '').toLowerCase();

  // 1. User Cancellation
  if (
    status === 'CANCELLED' ||
    resultCode === 0 ||
    code === 'ZA' ||
    raw === 'CANCELLED' ||
    raw === 'CANCELED' ||
    raw === 'USER_CANCELLED' ||
    raw === 'USER_DROPPED' ||
    err.includes('cancel')
  ) {
    return {
      category: 'USER_CANCELLED',
      title: 'Payment Cancelled',
      description: 'The payment was cancelled in Google Pay. No money was deducted from your bucket.',
      responseCode: code || 'ZA',
      rawError,
    };
  }

  // 2. Bank / NPCI Limits Exceeded
  if (code === 'ZM') {
    return {
      category: 'LIMIT_EXCEEDED',
      title: 'Risk / Transaction Limit Exceeded',
      description: 'Google Pay or your bank flagged this transaction as exceeding daily risk or payment limits.',
      responseCode: 'ZM',
      rawError,
    };
  }
  if (code === 'U30') {
    return {
      category: 'LIMIT_EXCEEDED',
      title: 'Bank Daily Limit Reached',
      description: 'Your bank daily UPI transfer limit has been reached for this account. No funds were deducted.',
      responseCode: 'U30',
      rawError,
    };
  }
  if (code === 'Z9') {
    return {
      category: 'LIMIT_EXCEEDED',
      title: 'Daily Amount Limit Exceeded',
      description: 'The maximum daily UPI transaction amount allowed by your bank has been reached.',
      responseCode: 'Z9',
      rawError,
    };
  }
  if (code === 'Z8') {
    return {
      category: 'LIMIT_EXCEEDED',
      title: 'Per-Transaction Limit Exceeded',
      description: 'This transaction exceeds the per-payment limit set by your bank for UPI.',
      responseCode: 'Z8',
      rawError,
    };
  }
  if (code === 'Z7') {
    return {
      category: 'LIMIT_EXCEEDED',
      title: 'Daily Frequency Limit Exceeded',
      description: 'You have reached the maximum count of UPI transfers allowed today by your bank.',
      responseCode: 'Z7',
      rawError,
    };
  }
  if (code === 'U19') {
    return {
      category: 'LIMIT_EXCEEDED',
      title: 'Payment Limit Exceeded',
      description: 'The payment amount exceeds the limit permitted by your UPI application.',
      responseCode: 'U19',
      rawError,
    };
  }

  // 3. Security & PIN Lock
  if (code === 'Z6') {
    return {
      category: 'PIN_LOCKED',
      title: 'UPI PIN Attempts Exceeded',
      description: 'Too many incorrect UPI PIN attempts. Your UPI account is temporarily blocked for 24 hours.',
      responseCode: 'Z6',
      rawError,
    };
  }

  // 4. Beneficiary / Payee Validation Failure
  if (code === 'ZD' || code === 'XQ' || code === 'XR') {
    return {
      category: 'VALIDATION_ERROR',
      title: 'Payee Validation Failed',
      description: 'The receiver UPI ID could not be validated or is currently inactive.',
      responseCode: code,
      rawError,
    };
  }

  // 5. Bank CBS Offline / Technical Downtime
  if (code === 'BT' || code === 'RB' || code === 'XY' || code === 'YC') {
    return {
      category: 'BANK_DOWNTIME',
      title: 'Bank System Unavailable',
      description: 'The issuing or beneficiary bank system is temporarily offline. Please try again in a few minutes.',
      responseCode: code,
      rawError,
    };
  }

  // 6. Generic Decline / Failure
  return {
    category: 'DECLINED',
    title: 'Payment Declined',
    description: 'Google Pay or your bank was unable to process this payment. No money was deducted.',
    responseCode: code || 'UNKNOWN',
    rawError,
  };
}

/**
 * Parses and normalizes raw Android Activity result or Google Pay response into NormalizedUPIResponse.
 * Supports `tezResponse` JSON string/object and flat fields (`Status`, `txnId`, `responseCode`, `ApprovalRefNo`, etc.).
 *
 * @param result Raw result from startActivityAsync or intent callback
 * @returns NormalizedUPIResponse with status in: SUCCESS, FAILURE, CANCELLED, SUBMITTED, UNKNOWN
 */
export function normalizeUPIResponse(result: any): NormalizedUPIResponse {

  if (!result || typeof result !== 'object') {
    return {
      status: 'UNKNOWN',
      rawResponse: result,
    };
  }

  let tezObj: Record<string, any> = {};
  const extraObj: Record<string, any> =
    result.extra && typeof result.extra === 'object' ? result.extra : {};
  let dataMap: Record<string, string> = {};

  // 1. Try to extract tezResponse from extra
  if (extraObj.tezResponse) {
    if (typeof extraObj.tezResponse === 'string') {
      try {
        tezObj = JSON.parse(extraObj.tezResponse);
      } catch (e) {
        console.warn('[PaymentService] Failed to parse extra.tezResponse JSON string:', e);
      }
    } else if (typeof extraObj.tezResponse === 'object') {
      tezObj = extraObj.tezResponse;
    }
  }

  // 2. Parse result.data
  if (result.data && typeof result.data === 'string') {
    const dataStr = result.data.trim();
    if (dataStr.startsWith('{') && dataStr.endsWith('}')) {
      try {
        const parsed = JSON.parse(dataStr);
        if (typeof parsed === 'object' && parsed !== null) {
          dataMap = parsed;
        }
      } catch {
        dataMap = parseKeyValueString(dataStr);
      }
    } else {
      dataMap = parseKeyValueString(dataStr);
    }
  }

  // If tezResponse wasn't in extra, check if it was encoded in dataMap
  if (Object.keys(tezObj).length === 0 && dataMap.tezresponse) {
    try {
      tezObj = JSON.parse(dataMap.tezresponse);
    } catch {
      // ignore
    }
  }

  // Helper to extract fields case-insensitively with priority: tezObj > extraObj > dataMap
  const getField = (...keys: string[]): any => {
    // Check tezObj
    for (const k of keys) {
      const lower = k.toLowerCase();
      for (const objKey of Object.keys(tezObj)) {
        if (objKey.toLowerCase() === lower && tezObj[objKey] !== undefined && tezObj[objKey] !== '') {
          return tezObj[objKey];
        }
      }
    }
    // Check extraObj
    for (const k of keys) {
      const lower = k.toLowerCase();
      for (const objKey of Object.keys(extraObj)) {
        if (objKey.toLowerCase() === lower && extraObj[objKey] !== undefined && extraObj[objKey] !== '') {
          return extraObj[objKey];
        }
      }
    }
    // Check dataMap
    for (const k of keys) {
      const lower = k.toLowerCase();
      if (dataMap[lower] !== undefined && dataMap[lower] !== '') {
        return dataMap[lower];
      }
    }
    return undefined;
  };

  const rawStatus = getField('status', 'Status', 'STATUS');
  const txnId = getField('txnId', 'txnid', 'TxnId');
  const txnRef = getField('txnRef', 'txnref', 'TxnRef', 'tr');
  const approvalRefNo = getField(
    'ApprovalRefNo',
    'approvalRefNo',
    'approvalrefno',
    'approval_ref_no'
  );
  const responseCode = getField('responseCode', 'responsecode', 'ResponseCode');
  const toVpa = getField('toVpa', 'tovpa', 'ToVpa', 'pa');
  const rawAmount = getField('amount', 'am', 'Amount');

  let amount: number | undefined = undefined;
  if (rawAmount !== undefined && rawAmount !== '') {
    const parsedAmt = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
    if (!isNaN(parsedAmt)) {
      amount = parsedAmt;
    }
  }

  // Normalize status into: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'SUBMITTED' | 'UNKNOWN'
  let normalizedStatus: PaymentStatus = 'UNKNOWN';

  if (rawStatus && typeof rawStatus === 'string') {
    const s = rawStatus.trim().toUpperCase();
    if (s === 'SUCCESS' || s === 'S') {
      normalizedStatus = 'SUCCESS';
    } else if (s === 'FAILURE' || s === 'FAIL' || s === 'FAILED' || s === 'F') {
      normalizedStatus = 'FAILURE';
    } else if (s === 'SUBMITTED' || s === 'PENDING' || s === 'P') {
      normalizedStatus = 'SUBMITTED';
    } else if (
      s === 'CANCELLED' ||
      s === 'CANCELED' ||
      s === 'USER_CANCELLED' ||
      s === 'USER_DROPPED' ||
      s === 'DISCARDED'
    ) {
      normalizedStatus = 'CANCELLED';
    }
  }

  // Fallback checks if status is not determined yet
  if (normalizedStatus === 'UNKNOWN') {
    if (responseCode) {
      const code = String(responseCode).trim().toUpperCase();
      if (code === '00' || code === '0' || code === 'M0') {
        normalizedStatus = 'SUCCESS';
      } else if (code === 'ZA') {
        normalizedStatus = 'CANCELLED';
      } else if (code === 'PENDING') {
        normalizedStatus = 'SUBMITTED';
      } else {
        normalizedStatus = 'FAILURE';
      }
    } else if (result.resultCode === 0) {
      // Activity.RESULT_CANCELED = 0
      normalizedStatus = 'CANCELLED';
    }
  }

  const failureDetails =
    normalizedStatus !== 'SUCCESS'
      ? resolveUPIFailureDetails(
          normalizedStatus,
          responseCode,
          result?.resultCode,
          rawStatus,
          result?.error || result?.message
        )
      : undefined;

  return {
    status: normalizedStatus,
    txnId: txnId ? String(txnId) : undefined,
    txnRef: txnRef ? String(txnRef) : undefined,
    approvalRefNo: approvalRefNo ? String(approvalRefNo) : undefined,
    responseCode: responseCode ? String(responseCode) : undefined,
    toVpa: toVpa ? String(toVpa) : undefined,
    amount,
    rawResponse: result,
    failureDetails,
  };
}


/**
 * Creates a simulated response for development, testing, and mock fallback.
 */
export function createSimulatedResponse(
  upiUri?: string,
  forcedStatus?: PaymentStatus
): NormalizedUPIResponse {
  const status = forcedStatus ?? mockStatusOverride ?? 'SUCCESS';
  let payeeVpa = 'merchant@upi';
  let amount: number | undefined = undefined;
  let txnRef = generateTransactionRef();

  if (upiUri) {
    const parsed = parseUPIUri(upiUri);
    if (parsed.isValid) {
      payeeVpa = parsed.payeeVpa;
      amount = parsed.amount;
      if (parsed.transactionRef) {
        txnRef = parsed.transactionRef;
      }
    }
  }

  const now = Date.now();
  const isSuccess = status === 'SUCCESS';
  const isCancelled = status === 'CANCELLED';
  const isSubmitted = status === 'SUBMITTED';

  const txnId = isSuccess || isSubmitted ? `SIM-TXN-${now}` : undefined;
  const approvalRefNo = isSuccess
    ? `${Math.floor(100000000000 + Math.random() * 900000000000)}`
    : undefined;
  const responseCode = isSuccess ? '00' : isCancelled ? 'ZA' : isSubmitted ? 'PENDING' : 'U1';

  return {
    status,
    txnId,
    txnRef,
    approvalRefNo,
    responseCode,
    toVpa: payeeVpa,
    amount,
    rawResponse: {
      simulated: true,
      resultCode: isSuccess ? -1 : isCancelled ? 0 : -1,
      extra: {
        tezResponse: JSON.stringify({
          Status: status,
          txnId: txnId ?? '',
          responseCode,
          ApprovalRefNo: approvalRefNo ?? '',
          txnRef,
          amount: amount !== undefined ? amount.toFixed(2) : undefined,
          toVpa: payeeVpa,
        }),
      },
    },
  };
}

/**
 * Launches a UPI payment intent with the specified target application or system chooser.
 * Handles platform differences and provides simulated fallback on Web/Expo Go/test environments.
 *
 * @param upiUri The constructed `upi://pay?...` payment URI
 * @param targetApp Target UPI application ('gpay' | 'phonepe' | 'paytm' | 'bhim' | 'chooser')
 * @returns NormalizedUPIResponse indicating status and transaction details
 */
export async function launchUPIIntent(
  upiUri: string,
  targetApp: UPIAppTarget = 'gpay'
): Promise<NormalizedUPIResponse> {
  const appConfig = UPI_APPS[targetApp] || UPI_APPS.gpay;

  // Web, iOS, or non-Android platform simulation
  if (Platform.OS !== 'android') {
    console.log(
      `[PaymentService] Non-Android platform (${Platform.OS}). Providing simulated ${appConfig.name} response.`
    );
    return createSimulatedResponse(upiUri);
  }

  // Expo Go check: Native IntentLauncher with third-party packageName is often restricted in Expo Go
  const isExpoGo =
    Constants.appOwnership === AppOwnership.Expo ||
    Constants.appOwnership === ('expo' as any) ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (isExpoGo && isMockModeEnabled()) {
    console.log('[PaymentService] Expo Go mock mode active. Providing simulated response.');
    return createSimulatedResponse(upiUri);
  }

  try {
    const launchParams: { data: string; packageName?: string } = {
      data: upiUri,
    };
    if (appConfig.packageName) {
      launchParams.packageName = appConfig.packageName;
    }

    const result = await IntentLauncher.startActivityAsync(
      'android.intent.action.VIEW',
      launchParams
    );
    return normalizeUPIResponse(result);
  } catch (error: any) {
    console.warn(
      `[PaymentService] Intent launch failed for ${appConfig.name}:`,
      error?.message
    );
    const errMsg = String(error?.message || '').toLowerCase();
    const isCancelled =
      errMsg.includes('cancel') ||
      errMsg.includes('cancelled') ||
      errMsg.includes('canceled') ||
      errMsg.includes('user_dropped');

    if (isCancelled) {
      return {
        status: 'CANCELLED',
        rawResponse: { error: error?.message },
        failureDetails: resolveUPIFailureDetails(
          'CANCELLED',
          'ZA',
          0,
          'CANCELLED',
          error?.message || 'Activity was cancelled'
        ),
      };
    }

    // On mock fallback: provide simulated responses ONLY if mock mode is explicitly enabled
    if (isMockModeEnabled()) {
      return createSimulatedResponse(upiUri);
    }

    return {
      status: 'FAILURE',
      rawResponse: { error: error?.message || `Failed to launch ${appConfig.name} intent` },
      failureDetails: resolveUPIFailureDetails(
        'FAILURE',
        undefined,
        undefined,
        'FAILURE',
        error?.message
      ),
    };
  }
}


/**
 * Backward-compatible wrapper for launchUPIIntent with Google Pay.
 *
 * @param upiUri The constructed `upi://pay?...` payment URI
 * @returns NormalizedUPIResponse indicating status and transaction details
 */
export async function launchGooglePayIntent(upiUri: string): Promise<NormalizedUPIResponse> {
  return launchUPIIntent(upiUri, 'gpay');
}

/**
 * Copies a UPI ID or text string to the system clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.warn('[PaymentService] Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Launches the first-party UPI application directly (via main launcher)
 * rather than firing a 3rd-party VIEW payment intent.
 * This circumvents the NPCI/Bank zero-tolerance P2P intent block.
 */
export async function launchFirstPartyUPIApp(targetApp: UPIAppTarget = 'gpay'): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const appConfig = UPI_APPS[targetApp] || UPI_APPS.gpay;
  const packageName = appConfig.packageName;

  // 1. If user explicitly chose the system chooser:
  if (targetApp === 'chooser' || !packageName) {
    try {
      await Linking.openURL('upi://');
      return true;
    } catch {
      await Linking.openURL('upi://pay');
      return true;
    }
  }

  // 2. Direct first-party app launch via IntentLauncher.openApplication
  // This calls Android's PackageManager.getLaunchIntentForPackage(packageName) natively,
  // opening the specific target app (e.g. Google Pay) directly without prompting "what to open".
  try {
    if (typeof IntentLauncher.openApplication === 'function') {
      IntentLauncher.openApplication(packageName);
      return true;
    }
  } catch (openAppError: any) {
    console.warn(
      `[PaymentService] IntentLauncher.openApplication failed for ${appConfig.name} (${packageName}):`,
      openAppError?.message
    );
  }

  // 3. Fallback: try explicit ComponentName with known primary activities
  try {
    const knownClassNames: Record<string, string> = {
      [UPI_APPS.gpay.packageName!]:
        'com.google.android.apps.nbu.paisa.user.launcher.LauncherActivity',
      [UPI_APPS.phonepe.packageName!]:
        'com.phonepe.app.ui.UniversalActivity',
      [UPI_APPS.paytm.packageName!]:
        'net.one97.paytm.landingpage.activity.AJRMainActivity',
      [UPI_APPS.bhim.packageName!]:
        'in.org.npci.upiapp.HomeActivity',
    };

    const className = knownClassNames[packageName];
    if (className) {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        packageName,
        className,
        category: 'android.intent.category.LAUNCHER',
        flags: 0x10000000, // Intent.FLAG_ACTIVITY_NEW_TASK
      });
      return true;
    }
  } catch (componentError: any) {
    console.warn(
      `[PaymentService] Component launcher failed for ${appConfig.name}:`,
      componentError?.message
    );
  }

  // 4. Fallback: try app-specific scheme (e.g., phonepe://, paytmmp://) ONLY if distinct from generic upi://
  const schemeStr: string | undefined = appConfig.scheme;
  if (schemeStr && schemeStr !== 'upi://' && schemeStr !== 'upi://pay') {
    try {
      const canOpen = await Linking.canOpenURL(schemeStr);
      if (canOpen) {
        await Linking.openURL(schemeStr);
        return true;
      }
    } catch (schemeErr) {
      console.warn(`[PaymentService] Scheme fallback failed for ${appConfig.name}:`, schemeErr);
    }
  }

  // 5. If the app is not installed, open the Play Store for that specific app
  await openAppStore(targetApp);
  return false;
}

/**
 * Executes the complete Assisted P2P flow:
 * 1. Copies payee VPA to clipboard
 * 2. Launches the chosen first-party UPI app directly
 */
export async function executeAssistedP2PFlow(
  payeeVpa: string,
  targetApp: UPIAppTarget = 'gpay'
): Promise<boolean> {
  await copyToClipboard(payeeVpa);
  return await launchFirstPartyUPIApp(targetApp);
}
