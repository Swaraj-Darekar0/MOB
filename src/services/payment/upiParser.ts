import { z } from 'zod';
import type { ParsedUPIQR } from '../../types';

/**
 * Zod schema for validating parsed UPI QR payload parameters.
 * Validates payee VPA format, currency (must be INR), and positive amount if present.
 * Uses .passthrough() to preserve additional merchant metadata and future fields.
 */
export const upiQRPayloadSchema = z
  .object({
    pa: z
      .string({ message: 'Payee VPA (pa) is required' })
      .min(1, 'Payee VPA (pa) cannot be empty')
      .refine(
        (vpa) => /^[^\s@]+@[^\s@]+$/.test(vpa),
        { message: 'Invalid payee VPA format' }
      ),
    pn: z.string().optional(),
    am: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined || val === '') return true;
          const num = Number(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Amount (am) must be a positive number' }
      ),
    cu: z
      .string()
      .optional()
      .default('INR')
      .refine(
        (val) => !val || val.toUpperCase() === 'INR',
        { message: 'Unsupported currency. Only INR is supported.' }
      ),
    tr: z.string().optional(),
    tn: z.string().optional(),
    mc: z.string().optional(),
    mid: z.string().optional(),
    sid: z.string().optional(),
    tid: z.string().optional(),
  })
  .passthrough();

export type UPIQRPayload = z.infer<typeof upiQRPayloadSchema>;

/**
 * Safely decodes a URI component, handling '+' as spaces and catching malformed URI errors.
 */
function safeDecode(val: string): string {
  try {
    return decodeURIComponent(val.replace(/\+/g, ' ')).trim();
  } catch {
    return val.replace(/\+/g, ' ').trim();
  }
}

/**
 * Extracts query parameters from a UPI URI query string into a normalized record with lowercase keys.
 */
function extractQueryParams(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!queryString) return params;

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    let rawKey = '';
    let rawVal = '';
    if (eqIdx !== -1) {
      rawKey = pair.substring(0, eqIdx);
      rawVal = pair.substring(eqIdx + 1);
    } else {
      rawKey = pair;
      rawVal = '';
    }

    const key = safeDecode(rawKey).toLowerCase();
    const val = safeDecode(rawVal);
    if (key) {
      params[key] = val;
    }
  }
  return params;
}

/**
 * Parses and validates a UPI QR payload (e.g. `upi://pay?pa=...&pn=...`).
 * Returns a `ParsedUPIQR` object indicating validity, dynamic/static status, and parsed fields.
 *
 * @param rawPayload The raw string obtained from the QR scanner.
 * @returns ParsedUPIQR
 */
export function parseUPIUri(rawPayload: string): ParsedUPIQR {
  if (!rawPayload || typeof rawPayload !== 'string' || !rawPayload.trim()) {
    return {
      isValid: false,
      payeeVpa: '',
      currency: 'INR',
      rawPayload: rawPayload ?? '',
      isDynamic: false,
      error: 'Empty or invalid QR payload',
    };
  }

  const trimmed = rawPayload.trim();

  // Validate scheme: must begin with upi://pay (case-insensitive)
  if (!trimmed.toLowerCase().startsWith('upi://pay')) {
    return {
      isValid: false,
      payeeVpa: '',
      currency: 'INR',
      rawPayload: trimmed,
      isDynamic: false,
      error: "Invalid UPI URI scheme. Expected 'upi://pay'",
    };
  }

  // Find query string
  const queryIndex = trimmed.indexOf('?');
  if (queryIndex === -1) {
    return {
      isValid: false,
      payeeVpa: '',
      currency: 'INR',
      rawPayload: trimmed,
      isDynamic: false,
      error: 'Missing query parameters in UPI URI',
    };
  }

  const queryString = trimmed.substring(queryIndex + 1);
  const rawParams = extractQueryParams(queryString);

  // Validate using Zod schema
  const validationResult = upiQRPayloadSchema.safeParse(rawParams);

  if (!validationResult.success) {
    const firstIssue = validationResult.error.issues?.[0];
    const errorMessage = firstIssue?.message || 'Invalid UPI QR payload';

    return {
      isValid: false,
      payeeVpa: rawParams.pa || '',
      payeeName: rawParams.pn || undefined,
      currency: (rawParams.cu || 'INR').toUpperCase(),
      rawPayload: trimmed,
      isDynamic: false,
      error: errorMessage,
    };
  }

  const data = validationResult.data;

  // Process amount and determine dynamic vs static
  let amount: number | undefined = undefined;
  if (data.am !== undefined && data.am !== '') {
    const parsedAmount = parseFloat(data.am);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      amount = parsedAmount;
    }
  }

  const isDynamic = amount !== undefined && amount > 0;

  return {
    isValid: true,
    payeeVpa: data.pa,
    payeeName: data.pn || undefined,
    amount,
    currency: (data.cu || 'INR').toUpperCase(),
    transactionRef: data.tr || undefined,
    transactionNote: data.tn || undefined,
    merchantCode: data.mc || undefined,
    merchantId: data.mid || undefined,
    storeId: data.sid || undefined,
    terminalId: data.tid || undefined,
    rawPayload: trimmed,
    isDynamic,
  };
}

// Aliases for convenience
export const parseUPIQRCode = parseUPIUri;
export const parseUPIPayload = parseUPIUri;
