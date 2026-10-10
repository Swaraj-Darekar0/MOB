import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * ICICI Bank SMS Parser
 */
export function parseIciciSms(body: string, sender: string, timestamp: number): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction ("Rs 750.00", "INR 750.00")
  const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction ("Acct XX4321", "account XX4321")
  const accountMatch = body.match(/(?:acct|a\/c|account)\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  // 3. Balance After Extraction ("Available Balance is Rs 24,300.00", "Avl Bal: Rs 24300")
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(/(?:available\s*balance|avl\s*bal|bal(?:ance)?)\s*(?:is|:)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. Merchant & Reference Extraction from Info block
  // ICICI format: "Info: UPI/HOTEL XYZ/hotel@upi" or "Info: POS/MERCHANT"
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;
  let referenceId: string | null = null;

  const infoMatch = body.match(/info:\s*([^.\n]+)/i);
  if (infoMatch) {
    const infoStr = infoMatch[1].trim();
    const parts = infoStr.split('/').map((p) => p.trim());
    if (parts.length >= 2) {
      // e.g. ["UPI", "HOTEL XYZ", "hotel@upi"]
      const target = parts[1];
      if (target.includes('@')) {
        payeeVpa = normalizeVpa(target);
      } else {
        merchantName = normalizeMerchantName(target);
      }
      if (parts[2] && parts[2].includes('@')) {
        payeeVpa = normalizeVpa(parts[2]);
      }
    } else {
      merchantName = normalizeMerchantName(infoStr);
    }
  }

  // Fallback reference extraction
  const refMatch = body.match(/(?:ref\s*no\.?|txn\s*id|upi\s*ref)\s*(?::|is)?\s*(\d{6,16})/i);
  if (refMatch) {
    referenceId = refMatch[1];
  }

  let channel: TransactionChannel = 'BANK';
  if (/upi/i.test(body) || payeeVpa) {
    channel = 'UPI';
  } else if (/pos|card/i.test(body)) {
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
    bankName: 'ICICI Bank',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
