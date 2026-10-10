import { ClassificationResult, SystemCategory, TransactionChannel, TransactionType } from '../../../types';
import { KNOWN_MERCHANTS } from './merchantDictionary';
import { normalizeMerchantName, normalizeVpa } from '../parser/normalizer';

export type RuleLookupFn = (vpa?: string, merchant?: string) => { categoryId: string; envelopeId?: string } | null;

/**
 * 7-Tier Deterministic Lexical Classification Engine
 * 
 * Pipeline:
 * Tier 1: Exact User VPA Rule (from past user corrections)
 * Tier 2: Exact User Merchant Rule
 * Tier 3: Known Merchant Dictionary (Exact Alias or VPA match)
 * Tier 4: Strong Token Overlap with Known Merchants
 * Tier 5: Category Keyword Match in narration
 * Tier 6: Transaction Type & Channel Context (ATM, Refund, Income)
 * Tier 7: Unclassified (Request user feedback to learn new rule)
 */

export interface ClassifierInput {
  merchantName?: string | null;
  payeeVpa?: string | null;
  rawNarration?: string | null;
  channel?: TransactionChannel;
  type?: TransactionType;
  customRules?: Array<{
    normalizedMerchant?: string;
    normalizedVpa?: string;
    categoryId: SystemCategory;
  }>;
  ruleLookup?: RuleLookupFn;
}

export function classifyTransaction(input: ClassifierInput): ClassificationResult {
  const normVpa = input.payeeVpa ? normalizeVpa(input.payeeVpa) : '';
  const normMerchant = input.merchantName ? normalizeMerchantName(input.merchantName) : '';
  const narration = (input.rawNarration || '').toLowerCase();

  // Tier 1: Exact User VPA Rule (Highest Priority)
  if (normVpa) {
    if (input.customRules) {
      const match = input.customRules.find((r) => r.normalizedVpa === normVpa);
      if (match) {
        return {
          categoryId: match.categoryId,
          confidence: 1.0,
          reason: 'USER_VPA_RULE',
        };
      }
    }
    if (input.ruleLookup) {
      const userVpaRule = input.ruleLookup(normVpa, undefined);
      if (userVpaRule) {
        return {
          categoryId: userVpaRule.categoryId as SystemCategory,
          confidence: 1.0,
          reason: 'USER_VPA_RULE',
        };
      }
    }
  }

  // Tier 2: Exact User Merchant Rule
  if (normMerchant) {
    if (input.customRules) {
      const match = input.customRules.find((r) => r.normalizedMerchant === normMerchant);
      if (match) {
        return {
          categoryId: match.categoryId,
          confidence: 0.98,
          reason: 'USER_MERCHANT_RULE',
        };
      }
    }
    if (input.ruleLookup) {
      const userMerchantRule = input.ruleLookup(undefined, normMerchant);
      if (userMerchantRule) {
        return {
          categoryId: userMerchantRule.categoryId as SystemCategory,
          confidence: 0.98,
          reason: 'USER_MERCHANT_RULE',
        };
      }
    }
  }

  // Tier 3: Known Merchant Dictionary (Exact alias or VPA handle match)
  if (normMerchant || normVpa) {
    for (const merchant of KNOWN_MERCHANTS) {
      // Check VPA handles
      if (normVpa && merchant.vpaHandles) {
        if (merchant.vpaHandles.some((h) => normVpa.includes(h) || h === normVpa)) {
          return {
            categoryId: merchant.category,
            confidence: 0.95,
            reason: 'KNOWN_MERCHANT',
          };
        }
      }

      // Check alias exact equality or normalized contains
      if (normMerchant) {
        for (const alias of merchant.aliases) {
          if (normMerchant === alias || normMerchant.startsWith(alias) || normMerchant.endsWith(alias)) {
            return {
              categoryId: merchant.category,
              confidence: 0.95,
              reason: 'KNOWN_MERCHANT',
            };
          }
        }
      }
    }
  }

  // Tier 4: Strong Token Overlap with Known Merchants
  if (normMerchant) {
    const merchantTokens = normMerchant.split(/\s+/).filter((t) => t.length >= 3);
    for (const merchant of KNOWN_MERCHANTS) {
      for (const alias of merchant.aliases) {
        const aliasTokens = alias.split(/\s+/).filter((t) => t.length >= 3);
        const hasOverlap = merchantTokens.some((mt) => aliasTokens.includes(mt));
        if (hasOverlap) {
          return {
            categoryId: merchant.category,
            confidence: 0.85,
            reason: 'LEXICAL',
          };
        }
      }
    }
  }

  // Tier 5: Category Keyword Match in Narration
  if (narration || normMerchant) {
    const searchTarget = `${normMerchant} ${narration}`;
    for (const merchant of KNOWN_MERCHANTS) {
      if (merchant.keywords) {
        for (const kw of merchant.keywords) {
          if (searchTarget.includes(kw)) {
            return {
              categoryId: merchant.category,
              confidence: 0.80,
              reason: 'KEYWORD',
            };
          }
        }
      }
    }
  }

  // Tier 6: Transaction Type & Channel Context
  if (input.channel === 'ATM' || /\batm\b/i.test(narration)) {
    return {
      categoryId: 'CASH_ATM',
      confidence: 0.95,
      reason: 'CHANNEL',
    };
  }

  if (input.type === 'INCOME' || /\bsalary\b/i.test(narration)) {
    return {
      categoryId: 'INCOME',
      confidence: 0.90,
      reason: 'CHANNEL',
    };
  }

  if (input.type === 'REFUND' || input.type === 'REVERSAL') {
    return {
      categoryId: 'REFUND',
      confidence: 0.90,
      reason: 'CHANNEL',
    };
  }

  // If VPA contains personal bank handle (e.g. okaxis, okhdfcbank, ybl, ibl) and no merchant was identified:
  if (normVpa && /@(okhdfcbank|okaxis|oksbi|okicici|ybl|ibl|axl|paytm|apl)$/i.test(normVpa)) {
    return {
      categoryId: 'TRANSFER',
      confidence: 0.70,
      reason: 'CHANNEL',
    };
  }

  // Tier 7: Unclassified (Ambiguous or Unknown Merchant)
  return {
    categoryId: 'UNCLASSIFIED',
    confidence: 0.0,
    reason: 'UNCLASSIFIED',
  };
}
