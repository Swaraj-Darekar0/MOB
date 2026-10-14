import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { readNativeInbox, isNativeSmsReaderAvailable } from '../../../../modules/expo-sms-reader';

export interface DeviceSmsMessage {
  id?: string;
  sender: string;
  body: string;
  timestamp: number;
}

export interface ReadSmsResult {
  messages: DeviceSmsMessage[];
  isSynthetic: boolean;
  permissionGranted: boolean;
}

/**
 * Android Runtime SMS Permission Manager
 */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);

    return (
      granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.warn('[SMS Reader] Error requesting SMS permission:', error);
    return false;
  }
}

export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const readGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const receiveGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    return readGranted && receiveGranted;
  } catch (error) {
    console.warn('[SMS Reader] Error checking SMS permission:', error);
    return false;
  }
}

/**
 * Reads SMS messages from the device inbox using native Android ContentResolver.
 * Automatically falls back to SYNTHETIC_TEST_FIXTURES in Expo Go, non-Android,
 * or when permission is not granted.
 */
export async function readDeviceSmsInbox(options?: {
  maxCount?: number;
  sinceTimestamp?: number;
  forceSynthetic?: boolean;
}): Promise<ReadSmsResult> {
  const isExpoGo = Constants.appOwnership === 'expo';
  const isAndroid = Platform.OS === 'android';

  if (options?.forceSynthetic || !isAndroid || isExpoGo) {
    return {
      messages: [...SYNTHETIC_TEST_FIXTURES],
      isSynthetic: true,
      permissionGranted: true,
    };
  }

  const hasPermission = await checkSmsPermission();
  if (!hasPermission) {
    const requested = await requestSmsPermission();
    if (!requested) {
      return {
        messages: [...SYNTHETIC_TEST_FIXTURES],
        isSynthetic: true,
        permissionGranted: false,
      };
    }
  }

  if (isNativeSmsReaderAvailable()) {
    try {
      const nativeRecords = await readNativeInbox(
        options?.maxCount ?? 100,
        options?.sinceTimestamp ?? 0
      );

      if (nativeRecords && nativeRecords.length > 0) {
        return {
          messages: nativeRecords.map((r) => ({
            id: r.id,
            sender: r.sender,
            body: r.body,
            timestamp: r.timestamp,
          })),
          isSynthetic: false,
          permissionGranted: true,
        };
      }
    } catch (err) {
      console.warn('[SMS Reader] Native inbox query error, falling back to fixtures:', err);
    }
  }

  return {
    messages: [...SYNTHETIC_TEST_FIXTURES],
    isSynthetic: true,
    permissionGranted: true,
  };
}

/**
 * Synthetic Test Fixtures for Regression Testing & Development Simulation
 */
export const SYNTHETIC_TEST_FIXTURES: DeviceSmsMessage[] = [
  // 1. Latest Union Bank of India: A/c *0221 (₹46,742.82)
  {
    sender: 'JK-UNIONB-T',
    body: 'Union Bank of India A/c *0221 Debited Rs:20.00 on 10-10-2026 19:09:29 by Mob Bk ref no 628463056070. Avl Bal Rs:46,742.82. Never share OTP/PIN.',
    timestamp: Date.now() - 60000,
  },
  // 2. Latest HDFC Bank: A/c **4321 (₹24,300.00)
  {
    sender: 'VK-HDFCBK',
    body: 'Sent Rs.750.00 from HDFC Bank A/C **4321 to HOTEL XYZ on 05-10-26. UPI Ref 627912345678. Bal Rs.24300.00',
    timestamp: Date.now() - 3600000,
  },
  // 3. Historical Union Bank of India debit
  {
    sender: 'JK-UNIONB-T',
    body: 'Union Bank of India A/c *0221 Debited Rs:100.00 on 08-10-2026 14:22:10 by Mob Bk ref no 628109283711. Avl Bal Rs:46,762.82.',
    timestamp: Date.now() - 86400000 * 2,
  },
  // 4. Historical HDFC Bank refund
  {
    sender: 'VK-HDFCBK',
    body: 'Rs. 450.00 refunded to your HDFC Bank A/C **4321 on 04-10-26. UPI Ref 112233445566. Bal Rs.25050.00',
    timestamp: Date.now() - 86400000 * 3,
  },
  // 5. Negative: OTP (Must be rejected)
  {
    sender: 'VK-HDFCBK',
    body: 'Your OTP for netbanking transaction of Rs 5000.00 is 492810. Do not share OTP with anyone. Valid for 10 mins.',
    timestamp: Date.now() - 1800000,
  },
  // 6. Negative: Bill Due (Must be rejected)
  {
    sender: 'JK-UNIONB-T',
    body: 'Dear Customer, your Credit Card bill of Rs. 14,500.00 is generated. Due date is 15-Oct-26. Pay now.',
    timestamp: Date.now() - 2400000,
  },
  // 7. Negative: Promotional Offer (Must be rejected)
  {
    sender: 'VK-HDFCBK',
    body: 'Congratulations! You are pre-approved for personal loan of Rs 5,00,000 at flat 10% interest. Apply now.',
    timestamp: Date.now() - 3000000,
  },
];
