import { ParsedTransaction } from '../../../types';
import { evaluateSenderTrust } from '../trust/senderTrust';
import { isBookableFinancialMessage } from '../filter/financialFilter';
import { parseHdfcSms } from './banks/hdfc';
import { parseSbiSms } from './banks/sbi';
import { parseIciciSms } from './banks/icici';
import { parseAxisSms } from './banks/axis';
import { parseKotakSms } from './banks/kotak';
import { parseFederalSms } from './banks/federal';
import { parseIdfcSms } from './banks/idfc';
import { parseGenericSms } from './banks/generic';

export {
  parseHdfcSms,
  parseSbiSms,
  parseIciciSms,
  parseAxisSms,
  parseKotakSms,
  parseFederalSms,
  parseIdfcSms,
  parseGenericSms,
};

/**
 * Pure, deterministic financial SMS parser.
 * 
 * Pipeline:
 * 1. Sender Trust Gate (Reject untrusted senders & spam headers)
 * 2. Financial SMS Filter (Reject OTP, promos, due bills, declined txns)
 * 3. Bank-Specific Grammar Parser
 * 4. Generic Fallback Parser
 * 
 * Invariants:
 * - Pure and synchronous
 * - Never calls network, database, or LLM
 * - Never mutates state
 */
export function parseSms(
  body: string,
  sender: string,
  timestamp: number = Date.now()
): ParsedTransaction | null {
  if (!body || !sender) return null;

  // 1. Sender Trust Gate
  const senderEval = evaluateSenderTrust(sender);
  if (!senderEval.isTrusted) {
    return null;
  }

  // 2. Financial SMS Filter Gate
  const filterResult = isBookableFinancialMessage(body);
  if (!filterResult.isBookable) {
    return null;
  }

  const bankName = senderEval.bankName || 'Bank';
  const header = senderEval.normalizedHeader;

  // 3. Bank-Specific Dispatch
  let parsed: ParsedTransaction | null = null;

  if (header.includes('HDFC') || bankName === 'HDFC Bank') {
    parsed = parseHdfcSms(body, sender, timestamp);
  } else if (header.includes('SBI') || bankName === 'State Bank of India') {
    parsed = parseSbiSms(body, sender, timestamp);
  } else if (header.includes('ICICI') || bankName === 'ICICI Bank') {
    parsed = parseIciciSms(body, sender, timestamp);
  } else if (header.includes('AXIS') || bankName === 'Axis Bank') {
    parsed = parseAxisSms(body, sender, timestamp);
  } else if (header.includes('KOTAK') || bankName === 'Kotak Mahindra Bank') {
    parsed = parseKotakSms(body, sender, timestamp);
  } else if (header.includes('FED') || bankName === 'Federal Bank') {
    parsed = parseFederalSms(body, sender, timestamp);
  } else if (header.includes('IDFC') || bankName.toUpperCase().includes('IDFC')) {
    parsed = parseIdfcSms(body, sender, timestamp);
  }

  // 4. Fallback to Generic Parser if bank-specific grammar missed or bank is another trusted institution
  if (!parsed) {
    parsed = parseGenericSms(body, sender, timestamp, bankName);
  }

  return parsed;
}
