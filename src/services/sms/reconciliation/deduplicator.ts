import { ParsedTransaction } from '../../../types';

/**
 * Fast DJB2 + FNV-1a hybrid string hash implementation.
 * Pure TypeScript, zero external dependencies.
 */
export function computeMessageHash(sender: string, body: string, timestamp?: number): string {
  const normalized = `${sender.trim().toUpperCase()}|${body.trim()}|${timestamp ? Math.floor(timestamp / 60000) : ''}`;
  let h1 = 0x811c9dc5;
  let h2 = 5381;

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    // FNV-1a
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    // DJB2
    h2 = ((h2 << 5) + h2) ^ code;
  }

  const hashPart1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hashPart2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `msg_${hashPart1}${hashPart2}`;
}

/**
 * Generates a stable economic transaction fingerprint to prevent duplicate bookings
 * from multiple notifications (e.g. Bank SMS + UPI app alert + repeat SMS).
 */
export function computeTransactionFingerprint(tx: ParsedTransaction): string {
  const ref = tx.referenceId || 'noref';
  const last4 = tx.accountLast4 || 'nolast4';
  const amt = tx.amountPaise;
  const target = tx.payeeVpa || tx.merchantName || 'notarget';
  // Round occurrence time to a 5-minute window to handle minor network/SMS delivery delay
  const timeWindow = tx.occurredAt
    ? Math.floor(new Date(tx.occurredAt).getTime() / (5 * 60 * 1000))
    : 0;

  return `tx_${ref}_${last4}_${amt}_${target}_${timeWindow}`;
}

export function isDuplicateMessage(
  sender: string,
  body: string,
  timestamp?: number,
  hasHashFn?: (hash: string) => boolean
): boolean {
  if (!hasHashFn) return false;
  const hash = computeMessageHash(sender, body, timestamp);
  return hasHashFn(hash);
}

/**
 * Checks whether an identical transaction already exists by reference ID.
 */
export function isDuplicateTransaction(
  tx: ParsedTransaction,
  hasRefFn?: (refId: string) => boolean
): boolean {
  if (tx.referenceId && hasRefFn) {
    return hasRefFn(tx.referenceId);
  }
  return false;
}
