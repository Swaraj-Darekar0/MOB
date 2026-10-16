import assert from 'node:assert';
import { buildUPIUri, deriveFallbackPayeeName } from '../src/services/payment/uriBuilder.ts';

console.log('\n======================================================================');
console.log('🧪 Section 53: NPCI-Compliant UPI URI Builder & Payee Name Guarantee');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. Testing deriveFallbackPayeeName (Solution B)
// -----------------------------------------------------------------------------
console.log('--- 1. Testing deriveFallbackPayeeName (Solution B) ---');

it('Returns provided pn when non-empty', () => {
  const result = deriveFallbackPayeeName('user@okaxis', 'Suresh Store');
  assert.strictEqual(result, 'Suresh Store');
});

it('Derives "UPI User {last4}" for 10-digit phone VPA without pn', () => {
  const result = deriveFallbackPayeeName('9876543210@okhdfcbank');
  assert.strictEqual(result, 'UPI User 3210');
});

it('Derives capitalized human name from dotted VPA', () => {
  const result = deriveFallbackPayeeName('suresh.kumar.sharma@paytm');
  assert.strictEqual(result, 'Suresh Kumar Sharma');
});

it('Derives capitalized human name from underscored VPA', () => {
  const result = deriveFallbackPayeeName('chai_point_cafe@ybl');
  assert.strictEqual(result, 'Chai Point Cafe');
});

it('Returns "UPI Beneficiary" fallback for malformed or empty prefix', () => {
  const result = deriveFallbackPayeeName('@okhdfcbank');
  assert.strictEqual(result, 'UPI Beneficiary');
});

// -----------------------------------------------------------------------------
// 2. Testing Solution A: Authentic Scanned QR Parameter & Signature Preservation
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Solution A: Scanned QR Preservation ---');

it('Retains authentic merchant pn verbatim in scanned QR', () => {
  const rawQR = 'upi://pay?pa=kirana@okhdfcbank&pn=Shree%20Ganesh%20Kirana&mc=5411&mode=01&orgid=180001';
  const built = buildUPIUri({
    pa: 'kirana@okhdfcbank',
    pn: 'Shree Ganesh Kirana',
    am: 120.5,
    rawPayload: rawQR,
  });

  assert.match(built, /pn=Shree%20Ganesh%20Kirana/i);
  assert.match(built, /pa=kirana@okhdfcbank/i);
  assert.match(built, /am=120\.50/);
  assert.match(built, /mc=5411/);
  assert.match(built, /mode=01/);
  assert.match(built, /orgid=180001/);
});

it('DOES NOT delete pn even if pn matches VPA prefix (Critical Bugfix)', () => {
  // Previously, if decodedPn === vpaPrefix, MOB deleted pn!
  const rawQR = 'upi://pay?pa=ramesh123@okhdfcbank&pn=ramesh123&mc=5499';
  const built = buildUPIUri({
    pa: 'ramesh123@okhdfcbank',
    pn: 'ramesh123',
    am: 50,
    rawPayload: rawQR,
  });

  assert.match(built, /pn=ramesh123/);
});

it('DOES NOT delete pn even if pn is a 10-digit phone number (Critical Bugfix)', () => {
  const rawQR = 'upi://pay?pa=9876543210@paytm&pn=9876543210&mc=5499';
  const built = buildUPIUri({
    pa: '9876543210@paytm',
    pn: '9876543210',
    am: 80,
    rawPayload: rawQR,
  });

  assert.match(built, /pn=9876543210/);
});

it('Preserves original query parameter order from scanned QR', () => {
  const rawQR = 'upi://pay?pa=shop@icici&mc=5411&pn=Daily%20Groceries&mode=01';
  const built = buildUPIUri({
    pa: 'shop@icici',
    am: 200,
    rawPayload: rawQR,
  });

  // Verify pa appears before mc, and mc before pn
  const paIdx = built.indexOf('pa=');
  const mcIdx = built.indexOf('mc=');
  const pnIdx = built.indexOf('pn=');

  assert.ok(paIdx < mcIdx, 'pa must appear before mc');
  assert.ok(mcIdx < pnIdx, 'mc must appear before pn');
});

it('Places cryptographic signature sign at the VERY END per NPCI v1.6+', () => {
  const rawQR = 'upi://pay?pa=store@hdfc&pn=SuperStore&sign=MEYCIQD123456789&mc=5411';
  const built = buildUPIUri({
    pa: 'store@hdfc',
    am: 350,
    rawPayload: rawQR,
  });

  assert.ok(built.endsWith('sign=MEYCIQD123456789'), 'sign must be at the very end of the URI');
});

it('Does NOT inject synthetic "MOB from" note into scanned merchant QRs', () => {
  const rawQR = 'upi://pay?pa=merchant@axis&pn=Merchant%20Name&mc=5411';
  const built = buildUPIUri({
    pa: 'merchant@axis',
    am: 50,
    tn: 'MOB from Groceries',
    rawPayload: rawQR,
  });

  assert.strictEqual(built.includes('MOB%20from'), false);
});

// -----------------------------------------------------------------------------
// 3. Testing Solution B: NPCI Mandatory pn Guarantee for Manual Input
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Solution B: Manual Input Mandatory pn ---');

it('Guarantees non-empty pn is ALWAYS present for phone number VPA', () => {
  const built = buildUPIUri({
    pa: '9876543210@okaxis',
    am: 100,
  });

  assert.match(built, /pn=UPI%20User%203210/);
});

it('Guarantees non-empty pn is ALWAYS present for name-based VPA', () => {
  const built = buildUPIUri({
    pa: 'anand.verma@okhdfcbank',
    am: 500,
  });

  assert.match(built, /pn=Anand%20Verma/);
});

it('Preserves user provided pn when explicitly passed in manual flow', () => {
  const built = buildUPIUri({
    pa: 'user@paytm',
    pn: 'Custom Payee',
    am: 75,
  });

  assert.match(built, /pn=Custom%20Payee/);
});

it('Formats amount to exact 2 decimal places and cu=INR', () => {
  const built = buildUPIUri({
    pa: 'user@paytm',
    am: 15,
  });

  assert.match(built, /am=15\.00/);
  assert.match(built, /cu=INR/);
});

console.log('\n======================================================================');
console.log(`📊 Suite Completed: ${passed} Passed, ${failed} Failed`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
}
