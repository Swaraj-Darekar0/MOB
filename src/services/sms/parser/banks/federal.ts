import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * Federal Bank SMS Parser
 */
export function parseFederalSms(body: string, sender: string, timestamp: number): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  const accountMatch = body.match(/(?:a\/c|acct)\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(/(?:bal(?:ance)?|avl\s*bal)\s*(?::|is)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  let referenceId: string | null = null;
  const refMatch = body.match(/(?:ref\s*no\.?|upi\s*ref)\s*(?::|is)?\s*(\d{6,16})/i);
  if (refMatch) {
    referenceId = refMatch[1];
  }

  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  const forMatch = body.match(/(?:for|towards|to)\s+([^.\n]+?)(?:\s+on|\s+bal|\.|$)/i);
  if (forMatch) {
    const rawTarget = forMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  if (!merchantName && isCredit) {
    const byMatch = body.match(/(?:by|from)\s+([^.\n]+?)(?:\s+on|\s+bal|\.|$)/i);
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
    bankName: 'Federal Bank',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
