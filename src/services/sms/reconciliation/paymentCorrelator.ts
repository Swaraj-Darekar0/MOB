import {
  ParsedTransaction,
  PaymentAttempt,
  PaymentCorrelation,
  ConfirmationState,
} from '../../../types';
import { getPendingPaymentAttempts } from '../../db/database';
import { normalizeVpa, normalizeMerchantName } from '../parser/normalizer';

/**
 * 3-Signal Payment Correlator
 * 
 * Correlates an in-flight payment attempt with an incoming bank SMS debit signal:
 * Signal 1: Exact UPI transaction reference (tr, ref, approval ref)
 * Signal 2: Exact matching amount
 * Signal 3: Matching payee VPA / merchant name
 * Signal 4: Close time window (< 10 minutes)
 * Signal 5: Transaction debit direction
 */

export function correlatePaymentWithSms(
  tx: ParsedTransaction
): PaymentCorrelation | null {
  // Only debits can confirm a payment
  if (tx.type !== 'EXPENSE') {
    return null;
  }

  const pendingAttempts = getPendingPaymentAttempts();
  if (pendingAttempts.length === 0) {
    return null;
  }

  let bestMatch: PaymentCorrelation | null = null;
  let highestScore = 0;

  const txTime = tx.occurredAt ? new Date(tx.occurredAt).getTime() : Date.now();
  const txVpa = tx.payeeVpa ? normalizeVpa(tx.payeeVpa) : '';
  const txMerchant = tx.merchantName ? normalizeMerchantName(tx.merchantName) : '';

  for (const attempt of pendingAttempts) {
    let score = 0;
    const matchedSignals: string[] = [];

    // 1. Exact UPI Reference ID match (Strongest Signal)
    if (
      tx.referenceId &&
      (attempt.transactionRef === tx.referenceId ||
        attempt.upiTxnId === tx.referenceId ||
        attempt.approvalRefNo === tx.referenceId)
    ) {
      score += 50;
      matchedSignals.push('EXACT_REFERENCE_ID');
    }

    // 2. Exact Amount match
    if (attempt.requestedAmountPaise === tx.amountPaise) {
      score += 30;
      matchedSignals.push('EXACT_AMOUNT');
    }

    // 3. VPA or Payee match
    const attemptVpa = normalizeVpa(attempt.payeeVpa);
    const attemptName = attempt.payeeName ? normalizeMerchantName(attempt.payeeName) : '';

    if (txVpa && attemptVpa && txVpa === attemptVpa) {
      score += 20;
      matchedSignals.push('EXACT_VPA');
    } else if (txMerchant && attemptName && (txMerchant.includes(attemptName) || attemptName.includes(txMerchant))) {
      score += 15;
      matchedSignals.push('MATCHING_MERCHANT_NAME');
    }

    // 4. Time Proximity match (Within 10 minutes)
    const attemptTime = new Date(attempt.createdAt).getTime();
    const timeDiffMinutes = Math.abs(txTime - attemptTime) / (60 * 1000);
    if (timeDiffMinutes <= 10) {
      score += 15;
      matchedSignals.push('PROXIMATE_TIME_WINDOW');
    } else if (timeDiffMinutes <= 30) {
      score += 5;
      matchedSignals.push('ACCEPTABLE_TIME_WINDOW');
    }

    // Determine Confirmation State
    let confirmationState: ConfirmationState = 'NO_MATCH';
    if (score >= 70) {
      confirmationState = 'CONFIRMED';
    } else if (score >= 50) {
      confirmationState = 'STRONG_MATCH';
    } else if (score >= 30) {
      confirmationState = 'POSSIBLE_MATCH';
    }

    if (score > highestScore && confirmationState !== 'NO_MATCH') {
      highestScore = score;
      bestMatch = {
        paymentAttemptId: attempt.id,
        smsTransactionId: tx.referenceId || `gen_${Date.now()}`,
        matchedSignals,
        score,
        confirmationState,
      };
    }
  }

  return bestMatch;
}
