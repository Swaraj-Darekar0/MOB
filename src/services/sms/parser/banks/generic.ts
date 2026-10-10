import { ParsedTransaction, TransactionChannel } from '../../../../types';
import { parseAmountToPaise, normalizeMerchantName, normalizeVpa, extractAccountLast4 } from '../normalizer';

/**
 * Generic Indian Banking & UPI SMS Parser
 * 
 * Handles transactions from any trusted bank or financial sender that conforms
 * to standard Indian banking grammar (NPCI / RBI transaction guidelines).
 */
export function parseGenericSms(
  body: string,
  sender: string,
  timestamp: number,
  bankName: string = 'Bank'
): ParsedTransaction | null {
  const isDebit = /\b(?:debited|spent|paid|deducted|withdrawn|sent|transferred|booking|fueled|purchased|transaction\s+of)\b/i.test(body);
  const isCredit = /\b(?:credited|received|deposited)\b/i.test(body);
  const isReversal = /\b(?:reversed|reversal|refunded|refund)\b/i.test(body);

  if (!isDebit && !isCredit && !isReversal) return null;

  // 1. Amount Extraction
  let amountMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) {
    amountMatch = body.match(/(?:debited|credited|spent|transferred|paid)\s+(?:by|with|for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  }
  if (!amountMatch) return null;
  const amountPaise = parseAmountToPaise(amountMatch[1]);
  if (!amountPaise) return null;

  // 2. Account Extraction
  const accountMatch = body.match(/(?:a\/c|acct|account|card|ending)\s*(?:no\.?|is|ending|in|with)?\s*(?:[x*.]*)(\d{3,4})\b/i);
  let accountLast4 = accountMatch ? extractAccountLast4(accountMatch[1]) : null;
  if (!accountLast4) {
    const rawDigitsMatch = body.match(/(?:[x*]{2,})(\d{3,4})\b/i);
    if (rawDigitsMatch) {
      accountLast4 = extractAccountLast4(rawDigitsMatch[1]);
    }
  }

  // 3. Balance After Extraction
  let balanceAfterPaise: number | null = null;
  const balMatch = body.match(
    /(?:bal(?:ance)?|avl\s*bal|available\s*bal(?:ance)?|total\s*bal(?:ance)?|clear\s*balance|avl\s*lmt|avl\s*limit|available\s*limit)\s*(?::|is)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (balMatch) {
    balanceAfterPaise = parseAmountToPaise(balMatch[1]);
  }

  // 4. Reference Extraction
  let referenceId: string | null = null;
  const refMatch = body.match(
    /(?:upi\s*ref(?:\s*no\.?)?|ref\s*(?:no\.?)?|txn\s*(?:id|no\.?)|rrn|utr)\s*(?::|is|\/)?\s*([a-zA-Z0-9]{6,20})/i
  );
  if (refMatch) {
    referenceId = refMatch[1];
  }

  // 5. Merchant & VPA Extraction
  let merchantName: string | null = null;
  let payeeVpa: string | null = null;

  const vpaMatch = body.match(/(?:vpa|upi\s*id)\s+([^\s,]+@[^\s,]+)/i);
  if (vpaMatch) {
    payeeVpa = normalizeVpa(vpaMatch[1]);
  }

  // Check explicit Info: pattern (e.g., "Info: POS/STARBUCKS" or "Info: SWIGGY")
  const infoMatch = body.match(/info:\s*([^.\n]+?)(?:\s+bal|\.|$)/i);
  if (infoMatch) {
    const rawTarget = infoMatch[1].trim();
    if (rawTarget.includes('@')) {
      payeeVpa = normalizeVpa(rawTarget);
    } else {
      merchantName = normalizeMerchantName(rawTarget);
    }
  }

  // Check UPI token pattern (e.g. "UPI:SWIGGY:123" or "UPI/SWIGGY/123")
  if (!merchantName) {
    const upiTokenMatch = body.match(/\bupi[:/]([a-zA-Z0-9_\s]+?)[:/]/i);
    if (upiTokenMatch && !/^\d+$/.test(upiTokenMatch[1].trim())) {
      merchantName = normalizeMerchantName(upiTokenMatch[1]);
    }
  }

  // Check high-confidence prepositions: "towards", "at", "to"
  if (!merchantName) {
    const highConfMatch = body.match(/(?:towards|at|\bto)\s+([^.\n]+?)(?:\s+on|\s+ref|\s+upi|\s+bal|\s+card|\.|$)/i);
    if (highConfMatch) {
      const rawTarget = highConfMatch[1].trim();
      if (rawTarget.includes('@')) {
        payeeVpa = normalizeVpa(rawTarget);
      } else {
        merchantName = normalizeMerchantName(rawTarget);
      }
    }
  }

  // Check card-specific "on <merchant> on card" pattern (e.g. OneCard)
  if (!merchantName) {
    const cardOnMatch = body.match(/\bon\s+([^.\n]+?)\s+on\s+card/i);
    if (cardOnMatch) {
      merchantName = normalizeMerchantName(cardOnMatch[1]);
    }
  }

  // Fallback "for <merchant>" or "on <merchant>" (ensuring it's not "on <date>" or "on your card")
  if (!merchantName) {
    const generalMatch = body.match(/(?:\bfor|\bon)\s+(?!card|your\s+card|\d{1,2}[-/]\d{1,2}|rs\.?|inr|₹)([^.\n]+?)(?:\s+on|\s+ref|\s+upi|\s+bal|\s+card|\.|$)/i);
    if (generalMatch) {
      const rawTarget = generalMatch[1].trim();
      if (rawTarget.includes('@')) {
        payeeVpa = normalizeVpa(rawTarget);
      } else {
        merchantName = normalizeMerchantName(rawTarget);
      }
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
  } else if (/card|pos/i.test(body) || sender.toUpperCase().includes('CRD')) {
    channel = 'CARD';
  } else if (/atm/i.test(body)) {
    channel = 'ATM';
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
    bankName,
    channel,
    occurredAt: new Date(timestamp).toISOString(),
    sender,
    confidence: 0.85,
  };
}
