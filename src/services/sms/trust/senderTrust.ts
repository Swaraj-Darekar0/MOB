import { SenderTrust } from '../../../types';

/**
 * Indian DLT Header & Bank Sender Registry
 * 
 * Indian transactional SMS headers follow the TRAI DLT format:
 * [2-letter Operator/Circle Prefix]-[6-character Principal Entity Header]
 * Example: VK-HDFCBK, AD-SBIINB, VM-ICICIB, AX-AXISBK, BP-KOTAKB, BW-FEDBNK
 */

interface BankSenderRecord {
  bankName: string;
  trust: SenderTrust;
  aliases: string[];
}

const BANK_SENDER_REGISTRY: Record<string, BankSenderRecord> = {
  // --- Public Sector Banks ---
  SBIINB: {
    bankName: 'State Bank of India',
    trust: 'BANK',
    aliases: ['SBIINB', 'SBMSMS', 'SBIPAY', 'SBICRD', 'SBISMS', 'SBIBK', 'SBIBNK', 'ATMSBI', 'SBICARD'],
  },
  PNBSMS: {
    bankName: 'Punjab National Bank',
    trust: 'BANK',
    aliases: ['PNBSMS', 'PNBALT', 'PNBTXN', 'PNBBNK', 'PUNBN', 'PNB'],
  },
  BOBTXN: {
    bankName: 'Bank of Baroda',
    trust: 'BANK',
    aliases: ['BOBTXN', 'BOBALT', 'BOBBNK', 'BOBSMS', 'BOBCRD', 'BOB', 'BARODA'],
  },
  CANBNK: {
    bankName: 'Canara Bank',
    trust: 'BANK',
    aliases: ['CANBNK', 'CANBAL', 'CANARA'],
  },
  UNIONB: {
    bankName: 'Union Bank of India',
    trust: 'BANK',
    aliases: ['UNIONB', 'UBITXN', 'UBIALT', 'UNIONBANK', 'UBOI'],
  },
  BOIIND: {
    bankName: 'Bank of India',
    trust: 'BANK',
    aliases: ['BOIIND', 'BOIBNK', 'BOI'],
  },
  INDIANB: {
    bankName: 'Indian Bank',
    trust: 'BANK',
    aliases: ['INDIANB', 'INDIANBK', 'INDIANBANK', 'INDNBK'],
  },
  CENTBK: {
    bankName: 'Central Bank of India',
    trust: 'BANK',
    aliases: ['CENTBK', 'CBOI', 'CENTRALBANK', 'CENTRAL'],
  },
  IOBCHN: {
    bankName: 'Indian Overseas Bank',
    trust: 'BANK',
    aliases: ['IOBCHN', 'IOB', 'IOBTXN'],
  },
  UCOBNK: {
    bankName: 'UCO Bank',
    trust: 'BANK',
    aliases: ['UCOBNK', 'UCOBANK', 'UCO'],
  },
  PSBANK: {
    bankName: 'Punjab & Sind Bank',
    trust: 'BANK',
    aliases: ['PSBANK', 'PSB', 'PUNJABSIND'],
  },
  IDBIBK: {
    bankName: 'IDBI Bank',
    trust: 'BANK',
    aliases: ['IDBIBK', 'IDBIBANK', 'IDBI'],
  },

  // --- Private Sector Banks ---
  HDFCBK: {
    bankName: 'HDFC Bank',
    trust: 'BANK',
    aliases: ['HDFCBK', 'HDFCBN', 'HDFCAL', 'HDFCSM', 'HDFCBANK', 'HDFC', 'HDFCB'],
  },
  ICICIB: {
    bankName: 'ICICI Bank',
    trust: 'BANK',
    aliases: ['ICICIB', 'ICICIT', 'ICICIS', 'ICICIP', 'ICICI'],
  },
  AXISBK: {
    bankName: 'Axis Bank',
    trust: 'BANK',
    aliases: ['AXISBK', 'AXISBN', 'AXISTX', 'AXISIN', 'AXISBANK', 'AXISB'],
  },
  KOTAKB: {
    bankName: 'Kotak Mahindra Bank',
    trust: 'BANK',
    aliases: ['KOTAKB', 'KOTAKN', 'KMBPAY', 'KMBLBK', 'KOTAKD', 'KOTAK'],
  },
  FEDBNK: {
    bankName: 'Federal Bank',
    trust: 'BANK',
    aliases: ['FEDBNK', 'FEDBK', 'FEDRAL', 'FEDFIB', 'FEDSCP', 'FEDERAL'],
  },
  IDFCFB: {
    bankName: 'IDFC First Bank',
    trust: 'BANK',
    aliases: ['IDFCFB', 'IDFCBK', 'IDFCFT', 'IDFC'],
  },
  INDUSB: {
    bankName: 'IndusInd Bank',
    trust: 'BANK',
    aliases: ['INDUSB', 'INDUSI', 'IIBLTX', 'INDUSIND'],
  },
  YESBNK: {
    bankName: 'Yes Bank',
    trust: 'BANK',
    aliases: ['YESBNK', 'YESPAY', 'YESTXN', 'YESB'],
  },
  BNDHN: {
    bankName: 'Bandhan Bank',
    trust: 'BANK',
    aliases: ['BNDHN', 'BANDHAN', 'BANDHANBK'],
  },
  RBLBNK: {
    bankName: 'RBL Bank',
    trust: 'BANK',
    aliases: ['RBLBNK', 'RBL', 'RATNAKAR'],
  },
  SIBSMS: {
    bankName: 'South Indian Bank',
    trust: 'BANK',
    aliases: ['SIBSMS', 'SIBBANK', 'SIB'],
  },
  KBLBNK: {
    bankName: 'Karnataka Bank',
    trust: 'BANK',
    aliases: ['KBLBNK', 'KTKBANK', 'KARBANK', 'KARNATAKA'],
  },
  CUBANK: {
    bankName: 'City Union Bank',
    trust: 'BANK',
    aliases: ['CUBANK', 'CUBLTD', 'CUB'],
  },
  DHANBK: {
    bankName: 'Dhanlaxmi Bank',
    trust: 'BANK',
    aliases: ['DHANBK', 'DHANLAXMI'],
  },
  SARBNK: {
    bankName: 'Saraswat Bank',
    trust: 'BANK',
    aliases: ['SARBNK', 'SARASWAT', 'SARASWATBANK'],
  },
  JKBANK: {
    bankName: 'Jammu & Kashmir Bank',
    trust: 'BANK',
    aliases: ['JKBANK', 'JKB', 'JKBNK', 'JKBANKL'],
  },
  DBSBNK: {
    bankName: 'DBS Bank India',
    trust: 'BANK',
    aliases: ['DBSBNK', 'DBS', 'DBSBANK'],
  },
  HSBCIN: {
    bankName: 'HSBC Bank India',
    trust: 'BANK',
    aliases: ['HSBC', 'HSBCIN'],
  },
  SCBANK: {
    bankName: 'Standard Chartered Bank',
    trust: 'BANK',
    aliases: ['SCBANK', 'STANCHART', 'STANDARDCHARTERED', 'SCB'],
  },
  AMEXIN: {
    bankName: 'American Express',
    trust: 'BANK',
    aliases: ['AMEX', 'AMEXIN'],
  },
  CITIBK: {
    bankName: 'Citi Bank',
    trust: 'BANK',
    aliases: ['CITI', 'CITIBANK'],
  },

  // --- Small Finance Banks ---
  AUBANK: {
    bankName: 'AU Small Finance Bank',
    trust: 'BANK',
    aliases: ['AUBANK', 'AUSFB', 'AU'],
  },
  EQUTAS: {
    bankName: 'Equitas Small Finance Bank',
    trust: 'BANK',
    aliases: ['EQUTAS', 'EQUITA', 'EQUITS', 'EQTSFB'],
  },
  UTKSPR: {
    bankName: 'Utkarsh Small Finance Bank',
    trust: 'BANK',
    aliases: ['UTKSPR', 'UTKARSH', 'UTKSFB'],
  },
  FINCAR: {
    bankName: 'Fincare Small Finance Bank',
    trust: 'BANK',
    aliases: ['FINCAR', 'FINCRB'],
  },
  UJJIVN: {
    bankName: 'Ujjivan Small Finance Bank',
    trust: 'BANK',
    aliases: ['UJJIVN', 'UJJIVAN'],
  },
  JANABK: {
    bankName: 'Jana Small Finance Bank',
    trust: 'BANK',
    aliases: ['JANABK', 'JANABANK', 'JANASF'],
  },
  SHIVLK: {
    bankName: 'Shivalik Small Finance Bank',
    trust: 'BANK',
    aliases: ['SHIVLK', 'SHIVAL'],
  },
  SURYOD: {
    bankName: 'Suryoday Small Finance Bank',
    trust: 'BANK',
    aliases: ['SURYOD', 'SURYAB'],
  },
  ESAFBK: {
    bankName: 'ESAF Small Finance Bank',
    trust: 'BANK',
    aliases: ['ESAFBK', 'ESAF'],
  },

  // --- Regional Rural & Cooperative Banks ---
  KGBANK: {
    bankName: 'Kerala Gramin Bank',
    trust: 'BANK',
    aliases: ['KGBANK', 'KERALAGR'],
  },
  DOPBNK: {
    bankName: 'Department of Posts',
    trust: 'BANK',
    aliases: ['DOPBNK', 'DOP'],
  },
  KVBANK: {
    bankName: 'Karur Vysya Bank',
    trust: 'BANK',
    aliases: ['KVBANK', 'KVB'],
  },
  TMBLTD: {
    bankName: 'Tamilnad Mercantile Bank',
    trust: 'BANK',
    aliases: ['TMBLTD', 'TMB'],
  },
  CSBBNK: {
    bankName: 'CSB Bank',
    trust: 'BANK',
    aliases: ['CSBBNK', 'CSBLTD'],
  },
  COSMOS: {
    bankName: 'Cosmos Co-operative Bank',
    trust: 'BANK',
    aliases: ['COSMOS', 'COSMOB'],
  },
  SVCBNK: {
    bankName: 'SVC Co-operative Bank',
    trust: 'BANK',
    aliases: ['SVCBNK', 'SVC'],
  },
  TJSBNK: {
    bankName: 'TJSB Sahakari Bank',
    trust: 'BANK',
    aliases: ['TJSBNK', 'TJSB'],
  },
  APGBNK: {
    bankName: 'Andhra Pragathi Grameena Bank',
    trust: 'BANK',
    aliases: ['APGBNK', 'APGB'],
  },
  MGBANK: {
    bankName: 'Maharashtra Gramin Bank',
    trust: 'BANK',
    aliases: ['MGBANK', 'MGB'],
  },

  // --- Payments Banks & Wallets ---
  IPBMSG: {
    bankName: 'India Post Payments Bank',
    trust: 'BANK',
    aliases: ['IPPB', 'IPBMSG', 'IPPBBN'],
  },
  PAYTMB: {
    bankName: 'Paytm Payments Bank',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['PAYTMB', 'PYTMBN', 'PAYTMP'],
  },
  AIRBNK: {
    bankName: 'Airtel Payments Bank',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['AIRBNK', 'AIRTEL'],
  },
  JIOPBS: {
    bankName: 'Jio Payments Bank',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['JIOPBS', 'JIOBNK'],
  },
  JIOPAY: {
    bankName: 'JioPay',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['JIOPAY'],
  },

  // --- Cards & Fintech / BNPL ---
  CREDCL: {
    bankName: 'CRED',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['CREDCL', 'CRED', 'CREDIN'],
  },
  ONECRD: {
    bankName: 'OneCard',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['ONECRD', 'ONECARD'],
  },
  SLICE: {
    bankName: 'Slice',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['SLICE', 'SLICEIT', 'SLCEIT'],
  },
  LZYPAY: {
    bankName: 'LazyPay',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['LZYPAY', 'LAZYPAY'],
  },
  JUPITR: {
    bankName: 'Jupiter',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['JUPITR', 'JUPITER'],
  },
  JUSPAY: {
    bankName: 'Amazon Pay',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['JUSPAY', 'APAY', 'AMAZONPAY'],
  },
  CSHFRE: {
    bankName: 'Cashfree',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['CSHFRE', 'CASHFREE'],
  },

  // --- Mutual Funds ---
  HDFCMF: {
    bankName: 'HDFC Mutual Fund',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['HDFCMF'],
  },
  NAVAMC: {
    bankName: 'Navi Mutual Fund',
    trust: 'KNOWN_FINANCIAL',
    aliases: ['NAVAMC', 'NAVIMF'],
  },
};

/**
 * Known promotional, spam, or telemarketing header indicators to reject immediately.
 */
const UNTRUSTED_HEADER_PATTERNS = [
  /promo/i,
  /offer/i,
  /deal/i,
  /discount/i,
  /loan/i,
  /rummy/i,
  /bet/i,
  /casino/i,
];

export interface SenderEvaluation {
  trust: SenderTrust;
  bankName?: string;
  normalizedHeader: string;
  isTrusted: boolean;
}

/**
 * Strips telecom circle prefix (e.g. "VK-", "AD-", "AX-", "JM-") and route suffixes (-S, -T) from Indian SMS sender headers.
 */
export function extractPrincipalHeader(sender: string): string {
  if (!sender) return '';
  let cleaned = sender.trim().toUpperCase();
  const dashIndex = cleaned.indexOf('-');
  if (dashIndex !== -1 && dashIndex <= 4) {
    cleaned = cleaned.substring(dashIndex + 1);
  }
  // Strip trailing DLT route suffix if present (-S, -T, -P, -G, -D)
  const lastDashIndex = cleaned.lastIndexOf('-');
  if (lastDashIndex !== -1 && cleaned.length - lastDashIndex <= 3) {
    cleaned = cleaned.substring(0, lastDashIndex);
  }
  return cleaned;
}

/**
 * Pure deterministic evaluation of an SMS sender header.
 */
export function evaluateSenderTrust(rawSender: string): SenderEvaluation {
  if (!rawSender) {
    return {
      trust: 'UNTRUSTED',
      normalizedHeader: '',
      isTrusted: false,
    };
  }

  const senderUpper = rawSender.trim().toUpperCase();
  const principalHeader = extractPrincipalHeader(senderUpper);

  // Check untrusted patterns
  for (const pattern of UNTRUSTED_HEADER_PATTERNS) {
    if (pattern.test(senderUpper) || pattern.test(principalHeader)) {
      return {
        trust: 'UNTRUSTED',
        normalizedHeader: principalHeader,
        isTrusted: false,
      };
    }
  }

  // Exact or alias match in bank registry
  for (const [key, record] of Object.entries(BANK_SENDER_REGISTRY)) {
    if (principalHeader === key || record.aliases.includes(principalHeader)) {
      return {
        trust: record.trust,
        bankName: record.bankName,
        normalizedHeader: principalHeader,
        isTrusted: true,
      };
    }

    // Match if sender contains known bank suffix (e.g. *HDFCBK*)
    for (const alias of record.aliases) {
      if (principalHeader.endsWith(alias) || principalHeader.includes(alias)) {
        return {
          trust: record.trust,
          bankName: record.bankName,
          normalizedHeader: principalHeader,
          isTrusted: true,
        };
      }
    }
  }

  // Generic heuristic: If header ends with "BK", "BNK", "BN", "TXN" from a valid DLT header
  if (
    senderUpper.length >= 6 &&
    senderUpper.includes('-') &&
    (principalHeader.endsWith('BK') ||
      principalHeader.endsWith('BNK') ||
      principalHeader.endsWith('BN') ||
      principalHeader.endsWith('TXN') ||
      principalHeader.endsWith('PAY') ||
      principalHeader.endsWith('CRD'))
  ) {
    return {
      trust: 'KNOWN_FINANCIAL',
      bankName: 'Bank',
      normalizedHeader: principalHeader,
      isTrusted: true,
    };
  }

  return {
    trust: 'UNKNOWN',
    normalizedHeader: principalHeader,
    isTrusted: false,
  };
}
