import { Platform, PermissionsAndroid } from 'react-native';

export interface DeviceSmsMessage {
  id?: string;
  sender: string;
  body: string;
  timestamp: number;
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
 * Synthetic Test Fixtures for Regression Testing & Development Simulation
 */
export const SYNTHETIC_TEST_FIXTURES: DeviceSmsMessage[] = [
  // 1. Positive: HDFC UPI Debit
  {
    sender: 'VK-HDFCBK',
    body: 'Sent Rs.750.00 from HDFC Bank A/C **4321 to HOTEL XYZ on 05-10-26. UPI Ref 627912345678. Bal Rs.24300.00',
    timestamp: Date.now() - 3600000,
  },
  // 2. Positive: SBI UPI Debit
  {
    sender: 'AD-SBIINB',
    body: 'Dear SBI User, your A/C X4321 debited by Rs.450.00 on 05Oct26 by transfer to SWIGGY Ref No 123456789. Avl Bal Rs:23,850.00',
    timestamp: Date.now() - 7200000,
  },
  // 3. Positive: ICICI POS Debit
  {
    sender: 'VM-ICICIB',
    body: 'ICICI Bank Acct XX4321 debited for Rs 1200.00 on 05-Oct-26. Info: POS/STARBUCKS. Available Balance is Rs 22,650.00.',
    timestamp: Date.now() - 10800000,
  },
  // 4. Positive: Axis Salary Credit
  {
    sender: 'AX-AXISBK',
    body: 'Your A/c no. XX4321 is credited with INR 35000.00 on 01-10-26 by SALARY. Avail Bal: INR 57,650.00',
    timestamp: Date.now() - 86400000,
  },
  // 5. Positive: Kotak UPI Debit
  {
    sender: 'BP-KOTAKB',
    body: 'Sent Rs.250.00 from Kotak Bank AC 4321 to BLINKIT on 05-10-26. UPI Ref 998877665544. Bal: Rs.24050.00',
    timestamp: Date.now() - 14400000,
  },
  // 6. Positive: Federal Bank UPI Debit
  {
    sender: 'BW-FEDBNK',
    body: 'Federal Bank: Rs 320.00 debited from A/C ...4321 to UBER on 05-10-26. Ref No 554433221100. Avl Bal Rs 23,730.00',
    timestamp: Date.now() - 18000000,
  },
  // 7. Positive: IDFC FIRST Bank UPI Debit
  {
    sender: 'BZ-IDFCFB',
    body: 'Rs. 890.00 debited from IDFC FIRST Bank A/C XX4321 towards ZOMATO on 05-Oct-26. UPI Ref: 334455667788. Avl Bal Rs 22,840.00',
    timestamp: Date.now() - 21600000,
  },
  // 8. Positive: Refund / Reversal
  {
    sender: 'VK-HDFCBK',
    body: 'Rs. 450.00 refunded to your HDFC Bank A/C **4321 on 06-10-26. UPI Ref 112233445566. Bal Rs.23290.00',
    timestamp: Date.now() - 25200000,
  },
  // 9. Negative: OTP (Must be rejected)
  {
    sender: 'VK-HDFCBK',
    body: 'Your OTP for netbanking transaction of Rs 5000.00 is 492810. Do not share OTP with anyone. Valid for 10 mins.',
    timestamp: Date.now() - 1800000,
  },
  // 10. Negative: Bill Due (Must be rejected)
  {
    sender: 'AX-AXISBK',
    body: 'Dear Customer, your Credit Card bill of Rs. 14,500.00 is generated. Due date is 15-Oct-26. Pay now.',
    timestamp: Date.now() - 2400000,
  },
  // 11. Negative: Promotional Offer (Must be rejected)
  {
    sender: 'BP-KOTAKB',
    body: 'Congratulations! You are pre-approved for personal loan of Rs 5,00,000 at flat 10% interest. Apply now.',
    timestamp: Date.now() - 3000000,
  },
];
