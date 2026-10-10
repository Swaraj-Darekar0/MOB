import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * Kotak Mahindra Bank SMS Parser
 */
export function parseKotakSms(body: string, sender: string, timestamp: number): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid|sent)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction ("Rs.750.00", "Rs 750", "INR 750")
  const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction ("AC 4321", "A/c XX4321")
  const accountMatch = body.match(/(?:a\/c|ac)\s*(?:no\.?)?\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  // 3. Balance After Extraction ("Bal: Rs.24300.00", "Avail bal: Rs 24,300")
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(/(?:bal(?:ance)?|avail\s*bal)\s*(?::|is)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. UPI Reference ("UPI Ref 123456789")
  let referenceId: string | null = null;
  const refMatch = body.match(/(?:upi\s*ref(?:erence)?|ref\s*no\.?)\s*(?::|is)?\s*(\d{6,16})/i);
  if (refMatch) {
    referenceId = refMatch[1];
  }

  // 5. Merchant Extraction ("to HOTEL XYZ", "Info: UPI/HOTEL XYZ")
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  const toMatch = body.match(/\bto\s+([^.\n]+?)\s+(?:on|ref|upi|bal)\b/i);
  if (toMatch) {
    const rawTarget = toMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  const infoMatch = body.match(/info:\s*([^.\n]+)/i);
  if (infoMatch && !merchantName) {
    merchantName = normalizeMerchantName(infoMatch[1]);
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
    bankName: 'Kotak Mahindra Bank',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
