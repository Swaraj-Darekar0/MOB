/**
 * Comprehensive Directory of Indian UPI PSP Handles and Deterministic Auto-Complete Engine.
 * Supports all major Third-Party Application Providers (TPAPs) and Payment Service Provider (PSP) Banks in India.
 */

export interface UPIHandleDefinition {
  handle: string;
  provider: string;
  tier: 1 | 2; // 1 = Top ~85% transaction volume (GPay, PhonePe, Paytm, BHIM, Amazon Pay, CRED), 2 = Major Banks
  bankKeywords?: string[];
}

export interface UPISuggestionItem {
  fullVpa: string;
  handle: string;
  provider: string;
  tier: 1 | 2;
  prefix: string;
  matchedPart?: string;
}

export const INDIAN_UPI_HANDLES: UPIHandleDefinition[] = [
  // --- Tier 1: Dominant TPAPs (~85% Volume) ---
  // Google Pay
  { handle: '@okaxis', provider: 'Google Pay', tier: 1, bankKeywords: ['axis'] },
  { handle: '@okhdfcbank', provider: 'Google Pay', tier: 1, bankKeywords: ['hdfc'] },
  { handle: '@oksbi', provider: 'Google Pay', tier: 1, bankKeywords: ['sbi', 'state bank'] },
  { handle: '@okicici', provider: 'Google Pay', tier: 1, bankKeywords: ['icici'] },

  // PhonePe
  { handle: '@ybl', provider: 'PhonePe', tier: 1, bankKeywords: ['yes', 'yes bank'] },
  { handle: '@ibl', provider: 'PhonePe', tier: 1, bankKeywords: ['icici'] },
  { handle: '@axl', provider: 'PhonePe', tier: 1, bankKeywords: ['axis'] },

  // Paytm
  { handle: '@paytm', provider: 'Paytm', tier: 1, bankKeywords: ['paytm'] },
  { handle: '@ptsbi', provider: 'Paytm', tier: 1, bankKeywords: ['sbi', 'state bank'] },
  { handle: '@ptaxis', provider: 'Paytm', tier: 1, bankKeywords: ['axis'] },
  { handle: '@pthdfc', provider: 'Paytm', tier: 1, bankKeywords: ['hdfc'] },
  { handle: '@ptyes', provider: 'Paytm', tier: 1, bankKeywords: ['yes'] },

  // BHIM / NPCI
  { handle: '@upi', provider: 'BHIM / NPCI', tier: 1, bankKeywords: ['bhim', 'npci'] },

  // Amazon Pay
  { handle: '@apl', provider: 'Amazon Pay', tier: 1, bankKeywords: ['amazon', 'axis'] },
  { handle: '@rapl', provider: 'Amazon Pay', tier: 1, bankKeywords: ['amazon', 'rbl'] },
  { handle: '@yapl', provider: 'Amazon Pay', tier: 1, bankKeywords: ['amazon', 'yes'] },

  // CRED
  { handle: '@cred', provider: 'CRED', tier: 1, bankKeywords: ['cred'] },
  { handle: '@axisb', provider: 'CRED', tier: 1, bankKeywords: ['cred', 'axis'] },
  { handle: '@cbaxis', provider: 'CRED', tier: 1, bankKeywords: ['cred', 'axis'] },

  // --- Tier 2: Major Indian Public, Private Banks & Fintechs ---
  // State Bank of India
  { handle: '@sbi', provider: 'State Bank of India', tier: 2, bankKeywords: ['sbi', 'state bank'] },

  // HDFC Bank
  { handle: '@hdfcbank', provider: 'HDFC Bank', tier: 2, bankKeywords: ['hdfc', 'payzapp'] },

  // ICICI Bank
  { handle: '@icici', provider: 'ICICI Bank', tier: 2, bankKeywords: ['icici', 'imobile'] },

  // Axis Bank
  { handle: '@axisbank', provider: 'Axis Bank', tier: 2, bankKeywords: ['axis'] },

  // Kotak Mahindra Bank
  { handle: '@kotak', provider: 'Kotak Bank', tier: 2, bankKeywords: ['kotak', 'kmbl', '811'] },
  { handle: '@kmbl', provider: 'Kotak Bank', tier: 2, bankKeywords: ['kotak', 'kmbl'] },

  // Bank of Baroda
  { handle: '@barodampay', provider: 'Bank of Baroda', tier: 2, bankKeywords: ['bob', 'baroda'] },
  { handle: '@bob', provider: 'Bank of Baroda', tier: 2, bankKeywords: ['bob', 'baroda'] },

  // Punjab National Bank
  { handle: '@pnb', provider: 'Punjab National Bank', tier: 2, bankKeywords: ['pnb', 'punjab'] },

  // IDFC FIRST Bank
  { handle: '@idfcbank', provider: 'IDFC FIRST Bank', tier: 2, bankKeywords: ['idfc'] },

  // IndusInd Bank
  { handle: '@indus', provider: 'IndusInd Bank', tier: 2, bankKeywords: ['indus', 'indusind'] },

  // Canara Bank
  { handle: '@canarabank', provider: 'Canara Bank', tier: 2, bankKeywords: ['canara'] },
  { handle: '@cnrb', provider: 'Canara Bank', tier: 2, bankKeywords: ['canara', 'cnrb'] },

  // Union Bank of India
  { handle: '@unionbank', provider: 'Union Bank of India', tier: 2, bankKeywords: ['union', 'ubi'] },
  { handle: '@uboi', provider: 'Union Bank of India', tier: 2, bankKeywords: ['union', 'uboi'] },

  // Bank of India
  { handle: '@boi', provider: 'Bank of India', tier: 2, bankKeywords: ['boi', 'bank of india'] },

  // Central Bank of India
  { handle: '@cbi', provider: 'Central Bank of India', tier: 2, bankKeywords: ['cbi', 'central'] },

  // Federal Bank
  { handle: '@federal', provider: 'Federal Bank', tier: 2, bankKeywords: ['federal', 'fi'] },

  // RBL Bank
  { handle: '@rbl', provider: 'RBL Bank', tier: 2, bankKeywords: ['rbl', 'ratnakar'] },

  // Yes Bank
  { handle: '@yesbank', provider: 'Yes Bank', tier: 2, bankKeywords: ['yes'] },
  { handle: '@yesg', provider: 'Groww (Yes Bank)', tier: 2, bankKeywords: ['groww', 'yes'] },

  // Indian Bank
  { handle: '@indianbank', provider: 'Indian Bank', tier: 2, bankKeywords: ['indian'] },

  // Airtel Payments Bank
  { handle: '@airtel', provider: 'Airtel Payments Bank', tier: 2, bankKeywords: ['airtel'] },

  // Jio Payments Bank
  { handle: '@jio', provider: 'Jio Payments Bank', tier: 2, bankKeywords: ['jio'] },

  // India Post Payments Bank
  { handle: '@postbank', provider: 'India Post Bank', tier: 2, bankKeywords: ['post', 'ippb'] },
  { handle: '@ippb', provider: 'India Post Bank', tier: 2, bankKeywords: ['post', 'ippb'] },

  // Bajaj Finserv
  { handle: '@abfspay', provider: 'Bajaj Finserv', tier: 2, bankKeywords: ['bajaj'] },

  // Freecharge / Axis
  { handle: '@freecharge', provider: 'Freecharge', tier: 2, bankKeywords: ['freecharge'] },

  // MobiKwik
  { handle: '@ikwik', provider: 'MobiKwik', tier: 2, bankKeywords: ['mobikwik', 'kwilk'] },

  // Jupiter / Fi
  { handle: '@jupiteraxis', provider: 'Jupiter Money', tier: 2, bankKeywords: ['jupiter', 'axis'] },
];

/**
 * Deterministic Auto-Complete Matching Function:
 * Given user input, calculates the filtered list of suggestions based on:
 * 1. 10-digit phone number -> suggests top provider VPAs (<phone>@okaxis, <phone>@ybl, etc.)
 * 2. Input with '@' -> filters handles starting with the handle query (e.g. user@ok -> @okaxis, @okhdfcbank, @oksbi, @okicici)
 * 3. Alphanumeric username without '@' -> suggests top provider VPAs with that username
 */
export function getMatchingUPIHandles(rawInput: string): UPISuggestionItem[] {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return [];
  }

  const atIndex = trimmed.indexOf('@');

  // Case A: User has entered '@' or is typing the handle
  if (atIndex !== -1) {
    const prefix = trimmed.slice(0, atIndex);
    const handleQuery = trimmed.slice(atIndex).toLowerCase(); // e.g. "@" or "@ok" or "@sbi"
    const queryWithoutAt = handleQuery.replace('@', '');

    const userPrefix = prefix || '';

    // Filter handles that either start with query OR have bank keywords matching query
    const filtered = INDIAN_UPI_HANDLES.filter((item) => {
      if (handleQuery === '@') return true;
      if (item.handle.toLowerCase().startsWith(handleQuery)) return true;
      if (
        queryWithoutAt.length >= 2 &&
        item.bankKeywords?.some(
          (k) => k.startsWith(queryWithoutAt) || queryWithoutAt.startsWith(k)
        )
      ) {
        return true;
      }
      return false;
    });

    // Score & Sort: Exact prefix matches first, then Tier 1, then alphabetical
    filtered.sort((a, b) => {
      const aExact = a.handle.toLowerCase().startsWith(handleQuery);
      const bExact = b.handle.toLowerCase().startsWith(handleQuery);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.handle.localeCompare(b.handle);
    });

    return filtered.map((item) => ({
      fullVpa: `${userPrefix}${item.handle}`,
      handle: item.handle,
      provider: item.provider,
      tier: item.tier,
      prefix: userPrefix,
      matchedPart: queryWithoutAt,
    }));
  }

  // Case B: 10-digit mobile number or numeric input
  const digitsOnly = trimmed.replace(/\D/g, '');
  const isPhoneNumber = digitsOnly.length === 10 && digitsOnly === trimmed;

  if (isPhoneNumber) {
    // Phone number entered: Suggest high-volume handles first (GPay, PhonePe, Paytm, BHIM, Amazon Pay)
    return INDIAN_UPI_HANDLES.map((item) => ({
      fullVpa: `${digitsOnly}${item.handle}`,
      handle: item.handle,
      provider: item.provider,
      tier: item.tier,
      prefix: digitsOnly,
    }));
  }

  // Case C: Alphanumeric username without '@' (e.g. 'swaraj', 'rohit123')
  if (trimmed.length >= 2) {
    return INDIAN_UPI_HANDLES.map((item) => ({
      fullVpa: `${trimmed}${item.handle}`,
      handle: item.handle,
      provider: item.provider,
      tier: item.tier,
      prefix: trimmed,
    }));
  }

  return [];
}

import type { VPAClassificationResult } from '../../types';
import { parseUPIUri } from './upiParser';

export type { VPAClassificationResult };

export interface UPIClassificationInput {
  payeeVpa?: string;
  merchantCode?: string;
  merchantId?: string;
  storeId?: string;
  terminalId?: string;
  rawPayload?: string;
}

// Backward compatibility alias for earlier type name
export type UPITargetClassification = VPAClassificationResult & {
  categoryLabel?: string;
};

/**
 * Known dedicated Merchant Aggregator / Acquirer Handles in India.
 * Transactions to these handles are strictly routed to Merchant Accounts.
 */
export const MERCHANT_PSP_HANDLES = new Set([
  '@paytmqr',
  '@bharatpe',
  '@ptqr',
  '@fkpos',
  '@mswipe',
  '@pinelabs',
  '@icicimerchant',
  '@kotakmerchant',
  '@hsbcmerchant',
  '@razorpay',
  '@cashfree',
  '@phonepeqr',
  '@airtelpos',
  '@payu',
  '@billdesk',
  '@ccavenue',
  '@hdfcpos',
  '@axispos',
  '@yesmerchant',
  '@indusmerchant',
  '@pos',
  '@qr',
  '@credpay',
  '@freechargepos',
  '@mobikwikpos',
  '@postpe',
  '@taprapyd',
  '@juspay',
  '@twid',
  '@fblpos',
  '@epaylater',
  '@rblpos',
  '@simpl',
  '@slice',
  '@easebuzz',
  '@airtelbiz',
]);

// Backward compatibility alias
export const MERCHANT_HANDLES = MERCHANT_PSP_HANDLES;

/**
 * Known merchant sub-domain markers inside the username/prefix.
 */
export const MERCHANT_SUBDOMAINS = ['.bpay', '.ibz', '.paytm', '.qr'] as const;

/**
 * Known merchant brand keywords inside the username/prefix.
 */
export const MERCHANT_BRAND_KEYWORDS = [
  'swiggy',
  'zomato',
  'irctc',
  'flipkart',
  'amazon',
  'uber',
  'ola',
  'bharatpe',
  'paytmmerchant',
  'paytmqr',
  'dunzo',
  'blinkit',
  'zepto',
  'bigbasket',
  'tatacliq',
  'dominos',
  'mcdonalds',
  'kfc',
  'starbucks',
  'myntra',
  'ajio',
  'nykaa',
  'makemytrip',
  'bookmyshow',
  'pvr',
  'inox',
  'cultfit',
] as const;

/**
 * Known commercial & merchant category keywords inside the username/prefix.
 */
export const MERCHANT_CATEGORY_KEYWORDS = [
  'store',
  'shop',
  'mart',
  'trader',
  'traders',
  'billing',
  'merchant',
  'pos',
  'qr',
  'retail',
  'enterprise',
  'enterprises',
  'services',
  'bazaar',
  'agency',
  'agencies',
  'medical',
  'pharmacy',
  'restaurant',
  'cafe',
  'hotel',
  'supermarket',
  'kirana',
  'bakers',
  'hospital',
] as const;

// Backward compatibility alias
export const MERCHANT_INDICATORS = [
  ...MERCHANT_SUBDOMAINS,
  ...MERCHANT_BRAND_KEYWORDS,
  ...MERCHANT_CATEGORY_KEYWORDS,
];

/**
 * Checks whether a UPI handle belongs to a known merchant-acquiring PSP.
 */
export function isMerchantPSPHandle(handle: string): boolean {
  if (!handle) return false;
  const lower = handle.toLowerCase();
  if (MERCHANT_PSP_HANDLES.has(lower)) return true;
  if (lower.endsWith('merchant') || lower.endsWith('pos') || lower.endsWith('qr')) {
    return true;
  }
  return false;
}

/**
 * Deterministically classifies a UPI address or QR payload as MERCHANT (P2M) vs PERSONAL (P2P).
 *
 * Check 1: Explicit QR Merchant Code (mc exists, non-empty, and != '0000').
 * Check 2: Explicit Merchant/Store/Terminal IDs (mid, sid, tid).
 * Check 3: Phone number based VPAs (^\d{10}@...) are always PERSONAL (P2P), unless acquiring handle is merchant.
 * Check 4: Merchant-specific PSP handles (@paytmqr, @bharatpe, @ptqr, @fkpos, @mswipe, @pinelabs, etc.).
 * Check 5: Merchant sub-domain & keyword indicators in prefix/username (.bpay, .ibz, pos, store, shop, qr, mart, traders, billing, swiggy, zomato, irctc, etc.).
 *
 * @param input Either a UPI VPA string, a raw UPI URI, or an object containing parsed QR/VPA fields.
 * @returns VPAClassificationResult with { isMerchant: boolean; type: 'P2M' | 'P2P'; reason: string }
 */
export function classifyUPIPayment(
  input: string | UPIClassificationInput | null | undefined
): VPAClassificationResult {
  if (!input) {
    return {
      isMerchant: false,
      type: 'P2P',
      reason: 'Empty UPI payment input',
    };
  }

  let payeeVpa = '';
  let merchantCode: string | undefined;
  let merchantId: string | undefined;
  let storeId: string | undefined;
  let terminalId: string | undefined;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.toLowerCase().startsWith('upi://pay')) {
      const parsed = parseUPIUri(trimmed);
      payeeVpa = parsed.payeeVpa || '';
      merchantCode = parsed.merchantCode;
      merchantId = parsed.merchantId;
      storeId = parsed.storeId;
      terminalId = parsed.terminalId;
    } else {
      payeeVpa = trimmed;
    }
  } else {
    payeeVpa = input.payeeVpa || '';
    merchantCode = input.merchantCode;
    merchantId = input.merchantId;
    storeId = input.storeId;
    terminalId = input.terminalId;

    if (!merchantCode && input.rawPayload && input.rawPayload.toLowerCase().startsWith('upi://pay')) {
      const parsed = parseUPIUri(input.rawPayload);
      if (!payeeVpa) payeeVpa = parsed.payeeVpa || '';
      if (!merchantCode) merchantCode = parsed.merchantCode;
      if (!merchantId) merchantId = parsed.merchantId;
      if (!storeId) storeId = parsed.storeId;
      if (!terminalId) terminalId = parsed.terminalId;
    }
  }

  // Check 1: Explicit QR Merchant Code (mc exists, non-empty, and != '0000')
  const trimmedMc = merchantCode?.trim();
  if (trimmedMc && trimmedMc !== '' && trimmedMc !== '0000') {
    return {
      isMerchant: true,
      type: 'P2M',
      reason: `Explicit Merchant Category Code (mc: ${trimmedMc})`,
    };
  }

  // Check 2: Explicit Merchant/Store/Terminal IDs (mid, sid, tid)
  const hasMid = Boolean(merchantId && merchantId.trim() !== '');
  const hasSid = Boolean(storeId && storeId.trim() !== '');
  const hasTid = Boolean(terminalId && terminalId.trim() !== '');

  if (hasMid || hasSid || hasTid) {
    const parts = [
      hasMid && `mid: ${merchantId?.trim()}`,
      hasSid && `sid: ${storeId?.trim()}`,
      hasTid && `tid: ${terminalId?.trim()}`,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      isMerchant: true,
      type: 'P2M',
      reason: `Explicit Merchant Terminal Identifiers (${parts})`,
    };
  }

  // Normalize VPA
  const normalizedVpa = payeeVpa.trim().toLowerCase();
  const atIndex = normalizedVpa.indexOf('@');
  const username = atIndex !== -1 ? normalizedVpa.slice(0, atIndex) : normalizedVpa;
  const handle = atIndex !== -1 ? normalizedVpa.slice(atIndex) : '';

  // Check 4 helper: is it a merchant-specific PSP handle?
  const isMerchantHandle = isMerchantPSPHandle(handle);

  // Check 3: Phone number based VPAs (^\d{10}@...) are always PERSONAL (P2P)
  // (Unless acquiring handle is a dedicated merchant handle like @paytmqr)
  const isPhoneNumber = /^\d{10}$/.test(username);
  if (isPhoneNumber && !isMerchantHandle) {
    return {
      isMerchant: false,
      type: 'P2P',
      reason: `Phone number based personal VPA (${username})`,
    };
  }

  // Check 4: Merchant-specific PSP handles (@paytmqr, @bharatpe, @ptqr, @fkpos, @mswipe, @pinelabs, etc.)
  if (isMerchantHandle) {
    return {
      isMerchant: true,
      type: 'P2M',
      reason: `Merchant-specific PSP handle (${handle})`,
    };
  }

  // Check 5: Merchant sub-domain & keyword indicators in prefix/username
  // 5a. Sub-domain indicators (e.g. .bpay, .ibz, .paytm, .qr)
  for (const subdomain of MERCHANT_SUBDOMAINS) {
    if (username.includes(subdomain)) {
      return {
        isMerchant: true,
        type: 'P2M',
        reason: `Merchant sub-domain indicator (${subdomain})`,
      };
    }
  }

  // 5b. Brand keywords in username (e.g. swiggy, zomato, irctc, flipkart, etc.)
  for (const brand of MERCHANT_BRAND_KEYWORDS) {
    if (username.includes(brand)) {
      return {
        isMerchant: true,
        type: 'P2M',
        reason: `Merchant brand indicator (${brand})`,
      };
    }
  }

  // 5c. Category keywords in username (store, shop, mart, traders, billing, etc.)
  for (const kw of MERCHANT_CATEGORY_KEYWORDS) {
    // Delimited match: e.g. "kirana.store", "pos_delhi", "my-shop", "billing123"
    const delimitedRegex = new RegExp(`(^|[._\\d-])${kw}([._\\d-]|$)`, 'i');
    if (delimitedRegex.test(username)) {
      return {
        isMerchant: true,
        type: 'P2M',
        reason: `Merchant category indicator (${kw})`,
      };
    }

    // Compound ending: e.g. "quickmart", "coffeeshop", "guptatraders"
    if (username.endsWith(kw)) {
      return {
        isMerchant: true,
        type: 'P2M',
        reason: `Merchant suffix indicator (${kw})`,
      };
    }

    // Compound beginning: e.g. "storefresh", "posmachine"
    if (username.startsWith(kw)) {
      return {
        isMerchant: true,
        type: 'P2M',
        reason: `Merchant prefix indicator (${kw})`,
      };
    }
  }

  // Default fallback: Unclassified or personal VPA
  return {
    isMerchant: false,
    type: 'P2P',
    reason: 'Default personal / unverified UPI VPA',
  };
}

// Backward compatibility wrapper for classifyUPITarget
export function classifyUPITarget(input: {
  payeeVpa: string;
  merchantCode?: string;
  merchantId?: string;
  storeId?: string;
  terminalId?: string;
}): UPITargetClassification {
  const result = classifyUPIPayment(input);
  return {
    ...result,
    categoryLabel: result.isMerchant ? 'Merchant Account' : 'Personal Account',
  };
}

