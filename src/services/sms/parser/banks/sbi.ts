import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * State Bank of India (SBI) SMS Parser
 */
export function parseSbiSms(body: string, sender: string, timestamp: number): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid|withdrawn)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction
  const amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction (SBI uses "A/C X4321", "A/C ...4321")
  const accountMatch = body.match(/(?:a\/c\s*(?:no\.?)?)\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  // 3. Balance After Extraction ("Avl Bal Rs:24,300.00", "Bal Rs.24300")
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(/(?:avl\s*bal|bal(?:ance)?)\s*(?::|is)?\s*(?:rs\.?|inr|₹)?(?::)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. Reference ID ("Ref No 123456789", "UPI Ref: 123456")
  let referenceId: string | null = null;
  const refMatch = body.match(/(?:ref\s*(?:no\.?)?|upi\s*ref(?:erence)?)\s*(?::|is)?\s*(\d{6,16})/i);
  if (refMatch) {
    referenceId = refMatch[1];
  }

  // 5. Merchant / Payee Extraction
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  const transferMatch = body.match(/(?:transfer\s+to|paid\s+to|trf\s+to)\s+([^.\n]+?)(?:\s+ref|\s+on|\s+avl|\.|$)/i);
  if (transferMatch) {
    const rawTarget = transferMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  if (!merchantName && isCredit) {
    const byMatch = body.match(/(?:by|from)\s+([^.\n]+?)(?:\s+ref|\s+on|\s+avl|\.|$)/i);
    if (byMatch) {
      merchantName = normalizeMerchantName(byMatch[1]);
    }
  }

  let channel: TransactionChannel = 'BANK';
  if (/upi/i.test(body) || payeeVpa) {
    channel = 'UPI';
  } else if (/card|atm/i.test(body)) {
    channel = /atm/i.test(body) ? 'ATM' : 'CARD';
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
    bankName: 'State Bank of India',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
