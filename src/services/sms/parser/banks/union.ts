import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * Union Bank of India SMS Parser
 * 
 * Supports:
 * - Debited Rs:100.00 on DD-MM-YYYY HH:MM:SS by Mob Bk ref no X, Fvg: Y Avl Bal Rs:Z
 * - Credited for Rs.161.00 on DD-MM-YYYY by Mob Bk Rev Tran ref no X Avl Bal Rs:Z
 * - SB A/c *0221 Credited for Rs.X by NEFT/ SENDER UTR: Y Avl Bal Rs:Z
 */
export function parseUnionBankSms(
  body: string,
  sender: string,
  timestamp: number
): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid|withdrawn)\b/i.test(body);
  const isCredit = /\bcredited\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded|refund|rev\s*tran)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction (Union Bank commonly formats as "Rs:100.00" or "Rs.100.00")
  const amountMatch = body.match(/(?:rs\.?:?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction ("A/c *0221", "SB A/c *0221", "A/C ...0221")
  const accountMatch = body.match(/(?:a\/c\s*(?:no\.?)?)\s*(?:[x*.]*)(\d{3,4})\b/i);
  const accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;

  // 3. Balance After Extraction ("Avl Bal Rs:2242.47", "Bal Rs.2242.47")
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(
    /(?:avl\s*bal|bal(?:ance)?)\s*(?::|is)?\s*(?:rs\.?:?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. Reference Extraction ("ref no 614519138970", "UTR: 123456789")
  let referenceId: string | null = null;
  const refMatch = body.match(
    /(?:ref\s*no\.?|utr(?:\s*no\.?)?|rrn|txn\s*(?:id|no\.?))\s*(?::|is|\/)?\s*([a-zA-Z0-9]{6,20})/i
  );
  if (refMatch) {
    referenceId = refMatch[1];
  }

  // 5. Merchant / Payee Extraction
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  // Pattern A: Fvg: (Favouring - standard Union Bank beneficiary tag)
  const fvgMatch = body.match(/fvg:\s*([^,.\n]+?)(?:\s+avl|\.|$)/i);
  if (fvgMatch) {
    const rawTarget = fvgMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  // Pattern B: NEFT / IMPS / Transfer sender or merchant
  if (!merchantName) {
    const neftMatch = body.match(/(?:neft|imps|rtgs)\/\s*([^/,\n]+?)(?:\s+utr|\s+ref|\s+avl|\.|$)/i);
    if (neftMatch) {
      merchantName = normalizeMerchantName(neftMatch[1]);
    }
  }

  // Pattern C: "by Mob Bk Rev Tran" (reversal)
  if (!merchantName && isReversal) {
    merchantName = 'Payment Reversal';
  }

  // Pattern D: Generic "to" or "towards" fallback
  if (!merchantName) {
    const toMatch = body.match(/(?:to|towards)\s+([^,.\n]+?)(?:\s+ref|\s+on|\s+avl|\.|$)/i);
    if (toMatch) {
      merchantName = normalizeMerchantName(toMatch[1]);
    }
  }

  let channel: TransactionChannel = 'BANK';
  if (/mob\s*bk|upi/i.test(body) || payeeVpa) {
    channel = 'UPI';
  } else if (/card|pos/i.test(body)) {
    channel = 'CARD';
  } else if (/atm/i.test(body)) {
    channel = 'ATM';
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
    bankName: 'Union Bank of India',
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.95,
  };
}
