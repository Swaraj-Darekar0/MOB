import { buildUPIUri } from '../src/services/payment/uriBuilder.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n======================================================');
console.log('🧪 UPI URI & Merchant Payment Invariant Test Suite');
console.log('======================================================\n');

// 1. Manual Phone Number Entry: pn must be stripped to prevent GPay VPA Name Mismatch
{
  const uri = buildUPIUri({
    pa: '9876543210@okaxis',
    pn: '9876543210',
    am: 100,
  });
  console.log('Test 1 URI:', uri);
  assert(!uri.includes('pn='), 'Phone number is omitted from pn to prevent VPA name mismatch in Google Pay');
  assert(uri.includes('pa=9876543210%40okaxis'), 'pa is encoded');
  assert(uri.includes('am=100.00'), 'am is formatted to 2 decimals');
}

// 2. Manual VPA Prefix Entry: pn matching VPA username must be omitted
{
  const uri = buildUPIUri({
    pa: 'kirana_store@paytm',
    pn: 'kirana_store',
    am: 250.5,
  });
  console.log('Test 2 URI:', uri);
  assert(!uri.includes('pn='), 'VPA prefix matching username is omitted from pn');
  assert(uri.includes('am=250.50'), 'am is formatted to 250.50');
}

// 3. Authentic Scanned Merchant QR with Digital Signature, Mode & OrgID
{
  const rawPayload = 'upi://pay?pa=paytmqr28100505@paytm&pn=Paytm%20Merchant&mc=5411&mode=02&orgid=159003&sign=MEQCIB123&tid=T99';
  const uri = buildUPIUri({
    rawPayload,
    pa: 'paytmqr28100505@paytm',
    pn: 'Paytm Merchant',
    am: 320,
    tr: 'V120261009143000ABCDEF', // Internal tracking ref should NOT be injected into merchant QR
  });
  console.log('Test 3 URI:', uri);
  assert(uri.includes('mode=02'), 'Preserves offline secure merchant mode=02');
  assert(uri.includes('orgid=159003'), 'Preserves acquiring bank orgid=159003');
  assert(uri.includes('sign=MEQCIB123'), 'Preserves cryptographic digital signature sign parameter');
  assert(uri.includes('mc=5411'), 'Preserves merchant code mc=5411');
  assert(uri.includes('tid=T99'), 'Preserves terminal ID tid=T99');
  assert(uri.includes('am=320.00'), 'Updates amount to 320.00');
  assert(!uri.includes('tr=V1'), 'Does NOT inject local internal V1 reference into merchant URI');
}

// 4. Fabricated V1 tracking reference protection
{
  const uri = buildUPIUri({
    pa: 'shop@okhdfcbank',
    mc: '5499',
    am: 50,
    tr: 'V120261009143000ABCDEF', // Fabricated ref
  });
  console.log('Test 4 URI:', uri);
  assert(!uri.includes('tr='), 'Fabricated local V1 reference is stripped from merchant URI');
}

// 5. Authentic Merchant Gateway Order Reference (non-V1) is preserved
{
  const uri = buildUPIUri({
    pa: 'shop@okhdfcbank',
    mc: '5499',
    am: 50,
    tr: 'ORDER_98765', // Authentic gateway order ID
  });
  console.log('Test 5 URI:', uri);
  assert(uri.includes('tr=ORDER_98765'), 'Authentic merchant order ID is preserved');
}

// 6. Legitimate Verified Payee Name is preserved
{
  const uri = buildUPIUri({
    pa: 'john.doe@okaxis',
    pn: 'John Doe',
    am: 500,
  });
  console.log('Test 6 URI:', uri);
  assert(uri.includes('pn=John%20Doe'), 'Legitimate verified payee name is included in URI');
}

console.log('\n======================================================');
console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL UPI URI & MERCHANT INVARIANT TESTS PASSED!\n');
}
