import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * HDFC Bank SMS Parser
 */
export function parseHdfcSms(body: string, sender: string, timestamp: number): ParsedTransaction | null {
  const isDebit = /\b(?:debited|sent|deducted|spent|paid)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded|refund)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction
  // Patterns: "Rs. 750.00", "Rs.750", "INR 750.00"
  const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction
  // Patterns: "A/C **4321", "A/C XX4321", "account **4321"
  const accountMatch = body.match(/(?:a\/c|acct|account)\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  // 3. Balance After Extraction
  // Patterns: "Bal Rs.24300.00", "Avl bal: Rs. 24,300", "Balance: INR 24300"
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(/(?:bal(?:ance)?|avl\s*bal)\s*(?::|is)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. UPI Reference ID
  // Patterns: "UPI Ref 627912345678", "UPI: 123456789", "Ref No 123456789"
  let referenceId: string | null = null;
  const refMatch = body.match(/(?:upi\s*ref(?:erence)?(?:\s*no\.?)?|upi\s*txn\s*id|ref\s*no\.?)\s*(?::|is)?\s*(\d{6,16})/i);
  if (refMatch) {
    referenceId = refMatch[1];
  }

  // 5. Merchant / Payee VPA Extraction
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  // Pattern A: "to <Payee> on <date>"
  const toMatch = body.match(/\bto\s+([^.\n]+?)\s+(?:on|ref|upi|avl|bal)\b/i);
  if (toMatch) {
    const rawTarget = toMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  // Pattern B: "towards <Merchant>"
  const towardsMatch = body.match(/\btowards\s+([^.\n]+?)(?:\.|\s+on|\s+upi|\s+ref|\s+avl|\s+bal|$)/i);
  if (towardsMatch) {
    merchantName = normalizeMerchantName(towardsMatch[1]);
  }

  // Pattern C: "VPA <vpa@bank>"
  const vpaMatch = body.match(/\bvpa\s+([^\s,]+@[^\s,]+)/i);
  if (vpaMatch) {
    payeeVpa = normalizeVpa(vpaMatch[1]);
  }

  if (!merchantName && isCredit) {
    const byMatch = body.match(/(?:by|from)\s+([^.\n]+?)(?:\s+on|\s+avl|\s+bal|\.|$)/i);
    if (byMatch) {
      merchantName = normalizeMerchantName(byMatch[1]);
    }
  }

  // 6. Channel Determination
  let channel: TransactionChannel = 'BANK';
  if (/upi/i.test(body) || payeeVpa) {
    channel = 'UPI';
  } else if (/card|pos/i.test(body)) {
    channel = 'CARD';
  } else if (/neft/i.test(body)) {
    channel = 'NEFT';
  } else if (/imps/i.test(body)) {
    channel = 'IMPS';
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
    bankName: 'HDFC Bank',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
