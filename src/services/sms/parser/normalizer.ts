import { MoneyPaise, toPaise } from '../../../utils/money';

/**
 * Merchant and Narration Normalizer
 */

const PREFIX_STRIP_REGEX = /^(?:upi[-/:]|pos[-/:]|ecom[-/:]|neft[-/:]|imps[-/:]|vpa\s+|trf\s+to\s+|transfer\s+to\s+|to\s+|at\s+|info:\s*)/i;
const SUFFIX_STRIP_REGEX = /(?:[-/]upi|[-/]pos|[-/]imps|[-/]neft|[-/]ecom|\s+ltd\.?|\s+pvt\.?|\s+india|\s+retail)$/i;

/**
 * Normalizes merchant names for consistent identification and rule lookup.
 * Example: "UPI/SWIGGY/12345" -> "swiggy", "POS-STARBUCKS COFFEE" -> "starbucks coffee"
 */
export function normalizeMerchantName(rawName?: string | null): string {
  if (!rawName) return '';

  let cleaned = rawName
    .normalize('NFKD')
    .replace(/[^\w\s@.:-]/g, ' ')
    .trim()
    .toLowerCase();

  // Strip prefixes
  cleaned = cleaned.replace(PREFIX_STRIP_REGEX, '').trim();

  // If there are slash or colon separated components like "SWIGGY/123456/BANGALORE" or "SWIGGY:12345", take first meaningful word
  if (cleaned.includes('/') || cleaned.includes(':')) {
    const parts = cleaned.split(/[/:]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      cleaned = parts[0];
    }
  }

  // Strip common suffixes
  cleaned = cleaned.replace(SUFFIX_STRIP_REGEX, '').trim();

  // Remove repeated spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Normalizes a UPI VPA (Virtual Payment Address).
 * Example: "hotelxyz@okhdfcbank" -> "hotelxyz@okhdfcbank", cleans query strings or spaces.
 */
export function normalizeVpa(rawVpa?: string | null): string {
  if (!rawVpa) return '';

  let cleaned = rawVpa.trim().toLowerCase();
  // Strip URI params if present
  const qIdx = cleaned.indexOf('?');
  if (qIdx !== -1) {
    cleaned = cleaned.substring(0, qIdx);
  }

  // Remove any whitespace
  cleaned = cleaned.replace(/\s+/g, '');

  return cleaned;
}

/**
 * Extracts and parses a currency amount string into integer paise.
 * Example: "Rs. 750.50" -> 75050 paise, "INR 1,200" -> 120000 paise
 */
export function parseAmountToPaise(amountStr: string): MoneyPaise | null {
  if (!amountStr) return null;

  // Extract clean number characters
  const cleanStr = amountStr
    .replace(/[^0-9.]/g, '')
    .trim();

  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) {
    return null;
  }

  return toPaise(num);
}

/**
 * Cleans bank-reported account digits to 4 digits.
 * Example: "A/c **4321" -> "4321", "XX9876" -> "9876"
 */
export function extractAccountLast4(rawStr?: string | null): string | null {
  if (!rawStr) return null;
  const digitsOnly = rawStr.replace(/\D/g, '');
  if (digitsOnly.length >= 3) {
    return digitsOnly.slice(-4);
  }
  return null;
}
