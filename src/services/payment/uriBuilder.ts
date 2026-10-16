import { classifyUPIPayment } from './upiHandles';

/**
 * Derives an NPCI-compliant, non-empty fallback Payee Name (`pn`)
 * when not explicitly present in the scanned QR or manual input.
 *
 * Per NPCI UPI Linking Specification, `pn` is MANDATORY (M).
 * Omitting `pn` causes banking switches and Google Pay to decline post-PIN
 * with error code PJ5 / C08 (Mandatory Payee Name Missing / Invalid Receiver Name).
 */
export function deriveFallbackPayeeName(vpa: string, providedPn?: string): string {
  if (providedPn && providedPn.trim().length > 0) {
    return providedPn.trim().slice(0, 99);
  }

  const prefix = (vpa || '').split('@')[0]?.trim() || '';

  // 1. If 10-digit phone number: "UPI User {last4}"
  if (/^\d{10}$/.test(prefix)) {
    return `UPI User ${prefix.slice(-4)}`;
  }

  // 2. If alphabetic / dotted prefix (e.g., "suresh.kumar" -> "Suresh Kumar")
  if (prefix) {
    const cleanName = prefix
      .replace(/[._\-+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    if (cleanName.length > 0) {
      return cleanName.slice(0, 99);
    }
  }

  return 'UPI Beneficiary';
}

/**
 * Constructs or updates a standard UPI payment URI (`upi://pay?...`).
 * Formats amount to 2 decimal places and properly encodes all query components.
 *
 * Security & NPCI Compliance Invariants:
 * 1. Solution A (Preserves authentic scanned QR parameters & signatures):
 *    - Never strips or deletes `pn`. Scanned payee names are preserved verbatim.
 *    - Preserves original parameter ordering from scanned QRs.
 *    - Keeps cryptographic signature (`sign=`) strictly at the end of the query string.
 *    - Never injects synthetic notes (`tn`) into scanned merchant QRs to avoid payload corruption.
 * 2. Solution B (NPCI Mandatory `pn` Guarantee):
 *    - Guarantees `pn` is ALWAYS present and non-empty across both scanned and manual payments.
 *    - Derives clean human-readable fallbacks for manual VPA entries.
 * 3. Never injects fabricated `tr` references:
 *    - Local tracking references (e.g. 'V1...') are kept in local DB only and
 *      omitted from merchant URIs to avoid order verification errors at acquiring PSPs.
 */
export function buildUPIUri(params: {
  pa: string;
  pn?: string;
  am: number;
  tr?: string;
  tn?: string;
  mc?: string;
  mid?: string;
  sid?: string;
  tid?: string;
  url?: string;
  rawPayload?: string;
}): string {
  // 1. Solution A: If authentic rawPayload from a scanned QR is available, preserve all original parameters
  if (params.rawPayload && params.rawPayload.trim().toLowerCase().startsWith('upi://pay')) {
    const raw = params.rawPayload.trim();
    const qIdx = raw.indexOf('?');
    if (qIdx !== -1) {
      const baseScheme = raw.substring(0, qIdx + 1);
      const queryStr = raw.substring(qIdx + 1);

      // Track parameter order to preserve authentic signed query sequence
      const paramOrder: string[] = [];
      const paramMap: Record<string, string> = {};

      for (const pair of queryStr.split('&')) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        if (eqIdx !== -1) {
          const rawKey = pair.substring(0, eqIdx);
          const rawVal = pair.substring(eqIdx + 1);
          const lowerKey = rawKey.toLowerCase();
          if (!paramMap[lowerKey]) {
            paramOrder.push(lowerKey);
          }
          paramMap[lowerKey] = rawVal;
        }
      }

      // Update amount to 2 decimal places
      if (!paramMap['am'] || parseFloat(decodeURIComponent(paramMap['am'])) !== params.am) {
        if (!paramMap['am']) paramOrder.push('am');
        paramMap['am'] = encodeURIComponent(params.am.toFixed(2));
      }
      if (!paramMap['cu']) {
        paramOrder.push('cu');
        paramMap['cu'] = 'INR';
      }

      // MANDATORY NPCI GUARANTEE: Never delete pn!
      // If the scanned QR lacked pn, derive a valid fallback pn
      if (!paramMap['pn']) {
        const fallback = deriveFallbackPayeeName(params.pa, params.pn);
        paramOrder.push('pn');
        paramMap['pn'] = encodeURIComponent(fallback);
      }

      // Do NOT inject synthetic 'tn' (e.g. "MOB from Food") into a scanned merchant QR
      // unless user provided an explicit custom note and original QR didn't have one
      if (params.tn && !paramMap['tn'] && !params.tn.startsWith('MOB from')) {
        paramOrder.push('tn');
        paramMap['tn'] = encodeURIComponent(params.tn);
      }

      // Strip any internal V1 transaction ref if accidentally passed
      if (paramMap['tr'] && decodeURIComponent(paramMap['tr']).startsWith('V1')) {
        const trIdx = paramOrder.indexOf('tr');
        if (trIdx !== -1) paramOrder.splice(trIdx, 1);
        delete paramMap['tr'];
      }

      // If 'sign' is present, NPCI v1.6+ mandates it MUST be the final parameter
      if (paramMap['sign']) {
        const signIdx = paramOrder.indexOf('sign');
        if (signIdx !== -1) {
          paramOrder.splice(signIdx, 1);
          paramOrder.push('sign');
        }
      }

      // Reassemble query string strictly preserving the original merchant parameter order
      const parts = paramOrder.map((key) => `${key}=${paramMap[key]}`);
      return `${baseScheme}${parts.join('&')}`;
    }
  }

  // 2. Solution B: Otherwise build clean, strictly NPCI-compliant URI for manual input
  const queryParts: string[] = [];
  queryParts.push(`pa=${encodeURIComponent(params.pa)}`);

  // MANDATORY NPCI REQUIREMENT: Always include non-empty pn!
  const finalPn = deriveFallbackPayeeName(params.pa, params.pn);
  queryParts.push(`pn=${encodeURIComponent(finalPn)}`);

  // Intelligent Merchant vs P2P distinction using deterministic VPA Classification Engine:
  const classification = classifyUPIPayment({
    payeeVpa: params.pa,
    merchantCode: params.mc,
    merchantId: params.mid,
    storeId: params.sid,
    terminalId: params.tid,
  });
  const isMerchant = classification.isMerchant;

  if (isMerchant) {
    if (params.mc) queryParts.push(`mc=${encodeURIComponent(params.mc)}`);
    if (params.mid) queryParts.push(`mid=${encodeURIComponent(params.mid)}`);
    if (params.sid) queryParts.push(`sid=${encodeURIComponent(params.sid)}`);
    if (params.tid) queryParts.push(`tid=${encodeURIComponent(params.tid)}`);
  }

  queryParts.push(`am=${encodeURIComponent(params.am.toFixed(2))}`);
  queryParts.push('cu=INR');

  // Only include tr if provided by the merchant originally (never local generated V1 refs)
  if (params.tr && !params.tr.startsWith('V1')) {
    queryParts.push(`tr=${encodeURIComponent(params.tr)}`);
  }

  // Only include custom note if provided and not synthetic default
  if (params.tn && !params.tn.startsWith('MOB from')) {
    queryParts.push(`tn=${encodeURIComponent(params.tn)}`);
  }
  if (params.url) {
    queryParts.push(`url=${encodeURIComponent(params.url)}`);
  }
  return `upi://pay?${queryParts.join('&')}`;
}
