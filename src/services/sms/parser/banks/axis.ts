import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * Axis Bank SMS Parser
 */
export function parseAxisSms(body: string, sender: string, timestamp: number): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction ("INR 750.00", "Rs. 750.00")
  const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction ("A/c no. XX4321")
  const accountMatch = body.match(/(?:a\/c\s*(?:no\.?)?)\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  // 3. Balance After Extraction ("Avail Bal: INR 24,300.00", "Bal INR 24300")
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(/(?:avail\s*bal|bal(?:ance)?)\s*(?::|is)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. Reference Extraction ("UPI Ref: 123456789")
  let referenceId: string | null = null;
  const refMatch = body.match(/(?:upi\s*ref(?:\s*no\.?)?|ref\s*no\.?)\s*(?::|is)?\s*(\d{6,16})/i);
  if (refMatch) {
    referenceId = refMatch[1];
  }

  // 5. Merchant Extraction ("towards UPI/HOTEL XYZ", "towards HOTEL XYZ")
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  const towardsMatch = body.match(/(?:towards|to)\s+([^.\n]+?)(?:\s+on|\s+upi\s*ref|\s+avail|\.|$)/i);
  if (towardsMatch) {
    const rawTarget = towardsMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  if (!merchantName && isCredit) {
    const byMatch = body.match(/(?:by|from)\s+([^.\n]+?)(?:\s+on|\s+avail|\.|$)/i);
    if (byMatch) {
      merchantName = normalizeMerchantName(byMatch[1]);
    }
  }

  let channel: TransactionChannel = 'BANK';
  if (/upi/i.test(body) || payeeVpa) {
    channel = 'UPI';
  } else if (/card|pos/i.test(body)) {
    channel = 'CARD';
  }

  const type = isReversal ? 'REVERSAL' : isCredit ? 'INCOME' : 'EXPENSE';

  return {
    amountPaise,
    type,
    merchantName,
    payeeVpa,
    referenceId,
    accountLast4,
    balanceAfterPaise,
    bankName: 'Axis Bank',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
