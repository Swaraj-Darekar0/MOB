import { TransactionType } from '../../../types';

/**
 * Financial SMS Filter
 * 
 * Strict non-bookable filters to prevent phantom expenses and reject:
 * - OTP / Verification codes
 * - Promotional offers & cashbacks without debits
 * - Balance enquiries
 * - Credit card limit updates
 * - KYC / Account reminders
 * - Future debits ("will be debited", "scheduled to debit", "due")
 * - Declined or failed transactions
 * - Collect / Mandate requests
 */

export interface FilterResult {
  isBookable: boolean;
  rejectReason?: string;
  detectedType?: TransactionType;
}

// 1. Definite Non-Bookable / Negative Signal Regexes
const OTP_PATTERNS = [
  /\b(?:otp|one\s*time\s*password|verification\s*code|security\s*code)\b/i,
  /\bdo\s*not\s*share\s*(?:your)?\s*(?:otp|code|password)\b/i,
  /\bvalid\s*for\s*\d+\s*(?:mins|minutes|seconds)\b/i,
  /\buse\s*code\s*\d{4,8}\b/i,
];

const PROMOTION_PATTERNS = [
  /\b(?:congratulations|exclusive\s*offer|pre-approved|eligible\s*for\s*loan|apply\s*now|flat\s*\d+%\s*off|cashback\s*offer|click\s*here\s*to\s*avail)\b/i,
  /\b(?:win\s*up\s*to|claim\s*your\s*reward|bonus\s*points)\b/i,
];

const FUTURE_OR_PENDING_PATTERNS = [
  /\bwill\s*be\s*debited\b/i,
  /\bscheduled\s*(?:for|to\s*be)\s*debit(?:ed)?\b/i,
  /\bdue\s*date\s*is\b/i,
  /\bminimum\s*amount\s*due\b/i,
  /\btotal\s*amount\s*due\b/i,
  /\bbill\s*(?:is|generated|due)\b/i,
  /\breminder\s*to\s*pay\b/i,
];

const FAILED_PATTERNS = [
  /\b(?:failed|failure|declined|unsuccessful|rejected|could\s*not\s*be\s*processed|transaction\s*cancelled)\b/i,
  /\bhas\s*failed\b/i,
];

const INFORMATIONAL_PATTERNS = [
  /\b(?:available\s*balance|avail\s*bal|bal\s*enq|balance\s*enquiry|statement\s*for|credit\s*limit\s*(?:is|enhanced)|kyc\s*(?:update|pending|mandatory))\b/i,
  /\brequest\s*received\b/i,
  /\bmandate\s*(?:created|requested)\b/i,
  /\bcollect\s*request\b/i,
];

// 2. Positive Signal Keywords
const DEBIT_KEYWORDS = [
  /\bdebited\b/i,
  /\bdeducted\b/i,
  /\bspent\b/i,
  /\bpaid\b/i,
  /\bpurchase\b/i,
  /\bwithdrawn\b/i,
  /\bsent\b/i,
  /\btransferred\b/i,
  /\btransaction\s+of\b/i,
  /\bbooking\s+of\b/i,
  /\bfueled\b/i,
];

const CREDIT_KEYWORDS = [
  /\bcredited\b/i,
  /\breceived\b/i,
  /\bdeposited\b/i,
];

const REVERSAL_KEYWORDS = [
  /\breversed\b/i,
  /\breversal\b/i,
  /\breturned\b/i,
  /\brefunded\b/i,
  /\brefund\b/i,
];

const AMOUNT_PATTERN = /(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:inr|rs\.?)/i;
const ACCOUNT_OR_VPA_PATTERN = /(?:a\/c|acct|account|card|vpa|upi|ending|xx\d{2,4}|\*{2,}\d{2,4})/i;

/**
 * Deterministic filter to verify if an SMS represents a completed, bookable transaction.
 */
export function isBookableFinancialMessage(body: string): FilterResult {
  if (!body || typeof body !== 'string') {
    return { isBookable: false, rejectReason: 'EMPTY_BODY' };
  }

  const cleanBody = body.trim();

  // 1. Check for OTP
  for (const pattern of OTP_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return { isBookable: false, rejectReason: 'OTP_OR_VERIFICATION' };
    }
  }

  // 2. Check for Promotional message
  for (const pattern of PROMOTION_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return { isBookable: false, rejectReason: 'PROMOTIONAL_OFFER' };
    }
  }

  // 3. Check for Future/Due bills
  for (const pattern of FUTURE_OR_PENDING_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return { isBookable: false, rejectReason: 'FUTURE_OR_BILL_DUE' };
    }
  }

  // 4. Check for Failed/Declined attempts
  for (const pattern of FAILED_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return { isBookable: false, rejectReason: 'PAYMENT_FAILED_OR_DECLINED' };
    }
  }

  // 5. Check for Informational / Balance Enquiry without actual transaction
  for (const pattern of INFORMATIONAL_PATTERNS) {
    // Only reject if it doesn't also contain a debit/credit event
    if (pattern.test(cleanBody) && !/\b(?:debited|credited|spent|withdrawn|paid|sent|transferred|transaction\s+of|booking|fueled)\b/i.test(cleanBody)) {
      return { isBookable: false, rejectReason: 'INFORMATIONAL_OR_BALANCE_ENQUIRY' };
    }
  }

  // 6. Must contain an explicit Amount indicator
  if (!AMOUNT_PATTERN.test(cleanBody)) {
    return { isBookable: false, rejectReason: 'NO_AMOUNT_FOUND' };
  }

  // 7. Must contain an Account / Card / UPI context indicator
  if (!ACCOUNT_OR_VPA_PATTERN.test(cleanBody)) {
    return { isBookable: false, rejectReason: 'NO_ACCOUNT_OR_UPI_CONTEXT' };
  }

  // 8. Determine Action Direction
  const isReversal = REVERSAL_KEYWORDS.some((kw) => kw.test(cleanBody));
  if (isReversal) {
    return {
      isBookable: true,
      detectedType: 'REVERSAL',
    };
  }

  const isDebit = DEBIT_KEYWORDS.some((kw) => kw.test(cleanBody));
  if (isDebit) {
    return {
      isBookable: true,
      detectedType: 'EXPENSE',
    };
  }

  const isCredit = CREDIT_KEYWORDS.some((kw) => kw.test(cleanBody));
  if (isCredit) {
    return {
      isBookable: true,
      detectedType: 'INCOME',
    };
  }

  return {
    isBookable: false,
    rejectReason: 'UNCERTAIN_DIRECTION',
  };
}
