import { classifyUPIPayment } from './upiHandles';

/**
 * Constructs or updates a standard UPI payment URI (`upi://pay?...`).
 * Formats amount to 2 decimal places and properly encodes all query components.
 *
 * Security & NPCI Compliance Invariants:
 * 1. Preserves authentic scanned QR parameters:
 *    If `rawPayload` is provided, all merchant security & verification tags
 *    (mode, orgid, sign, mc, mid, sid, tid) are preserved intact.
 * 2. Prevents VPA Name Mismatch (anti-spoofing rule):
 *    Never encodes phone numbers or raw VPA handle prefixes into `pn`.
 *    Omitting `pn` when unverified allows Google Pay to safely resolve the
 *    official registered CBS name from NPCI without throwing a name mismatch error.
 * 3. Never injects fabricated `tr` references:
 *    Local tracking references (e.g. 'V1...') are kept in local DB only and
 *    omitted from merchant URIs to avoid order verification errors at the acquiring PSP.
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
  // 1. If authentic rawPayload from a scanned QR is available, preserve all original parameters
  if (params.rawPayload && params.rawPayload.trim().toLowerCase().startsWith('upi://pay')) {
    const raw = params.rawPayload.trim();
    const qIdx = raw.indexOf('?');
    if (qIdx !== -1) {
      const baseScheme = raw.substring(0, qIdx + 1);
      const queryStr = raw.substring(qIdx + 1);
      const existingParams: Record<string, string> = {};

      for (const pair of queryStr.split('&')) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        if (eqIdx !== -1) {
          const k = pair.substring(0, eqIdx);
          const v = pair.substring(eqIdx + 1);
          existingParams[k.toLowerCase()] = v;
        }
      }

      // Update amount to 2 decimal places
      existingParams['am'] = encodeURIComponent(params.am.toFixed(2));
      existingParams['cu'] = 'INR';

      if (params.tn && !existingParams['tn']) {
        existingParams['tn'] = encodeURIComponent(params.tn);
      }

      // If existingParams has a fabricated pn that is just a phone number or prefix, remove it
      if (existingParams['pn']) {
        try {
          const decodedPn = decodeURIComponent(existingParams['pn']).trim().toLowerCase();
          const vpaPrefix = (existingParams['pa'] ? decodeURIComponent(existingParams['pa']) : params.pa)
            .split('@')[0]
            ?.trim()
            .toLowerCase();
          if (/^\d{10}$/.test(decodedPn) || decodedPn === vpaPrefix) {
            delete existingParams['pn'];
          }
        } catch {
          // keep as is
        }
      }

      // Strip any internal V1 transaction ref if accidentally passed
      if (existingParams['tr'] && existingParams['tr'].startsWith('V1')) {
        delete existingParams['tr'];
      }

      // Reassemble query string preserving all original signed/merchant parameters
      const parts = Object.entries(existingParams).map(([k, v]) => `${k}=${v}`);
      return `${baseScheme}${parts.join('&')}`;
    }
  }

  // 2. Otherwise build clean compliant URI
  const queryParts: string[] = [];
  queryParts.push(`pa=${encodeURIComponent(params.pa)}`);

  // Sanitize pn: Only include pn if it's a real name (not a phone number, not identical to VPA prefix)
  const vpaPrefix = params.pa.split('@')[0]?.trim().toLowerCase();
  const trimmedPn = params.pn?.trim();
  const isPhoneNumber = Boolean(trimmedPn && /^\d{10}$/.test(trimmedPn));
  const isVpaPrefix = Boolean(trimmedPn && trimmedPn.toLowerCase() === vpaPrefix);

  if (trimmedPn && !isPhoneNumber && !isVpaPrefix) {
    queryParts.push(`pn=${encodeURIComponent(trimmedPn)}`);
  }

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

  if (params.tn) {
    queryParts.push(`tn=${encodeURIComponent(params.tn)}`);
  }
  if (params.url) {
    queryParts.push(`url=${encodeURIComponent(params.url)}`);
  }
  return `upi://pay?${queryParts.join('&')}`;
}
