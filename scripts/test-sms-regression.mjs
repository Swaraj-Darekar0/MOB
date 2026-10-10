/**
 * Section 47 Regression Test Runner for Financial SMS Ingestion & Banking Core
 * Pure, deterministic test suite verifying:
 * 1. Bank Parsers (HDFC, SBI, ICICI, Axis, Kotak, Federal, IDFC, Reversals)
 * 2. Negative Fixtures (OTP, Promotions, Bill Dues, Failed Txns, Untrusted Senders)
 * 3. Sender Trust Registry (DLT header evaluation)
 * 4. 7-Tier Categorization Engine (Known merchants, aliases, keywords, user rules)
 * 5. Deduplication & Invariant Integrity
 * 6. Balance Reconciliation Engine
 * 7. Money Utilities & Integer-Paise Arithmetic
 */

import { parseSms } from '../src/services/sms/parser/index.ts';
import { evaluateSenderTrust } from '../src/services/sms/trust/senderTrust.ts';
import { isBookableFinancialMessage } from '../src/services/sms/filter/financialFilter.ts';
import { classifyTransaction } from '../src/services/sms/categorization/classifier.ts';
import { computeMessageHash, computeTransactionFingerprint, isDuplicateMessage, isDuplicateTransaction } from '../src/services/sms/reconciliation/deduplicator.ts';
import { reconcileBalance } from '../src/services/sms/reconciliation/balanceReconciler';
import { toPaise, toRupees, formatPaise, addPaise, subPaise, roundPaise } from '../src/utils/money.ts';

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

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
  }
}

console.log('\n======================================================');
console.log('🧪 Section 47: Virtual Envelope SMS Engine Test Suite');
console.log('======================================================\n');

// --------------------------------------------------------------------------
// 1. POSITIVE BANK FIXTURES
// --------------------------------------------------------------------------
console.log('--- 1. Testing Positive Bank SMS Fixtures ---');

// 1.1 HDFC Bank UPI Debit
{
  const sms = 'Sent Rs.750.00 from HDFC Bank A/C **4321 to HOTEL XYZ on 05-10-26. UPI Ref 627912345678. Bal Rs.24300.00';
  const res = parseSms(sms, 'VK-HDFCBK');
  assert(res !== null, 'HDFC UPI Debit parsed successfully');
  assertEqual(res?.amountPaise, 75000, 'HDFC amount is 75000 paise (₹750.00)');
  assertEqual(res?.type, 'EXPENSE', 'HDFC type is EXPENSE');
  assertEqual(res?.accountLast4, '4321', 'HDFC accountLast4 is 4321');
  assertEqual(res?.referenceId, '627912345678', 'HDFC referenceId matches');
  assertEqual(res?.balanceAfterPaise, 2430000, 'HDFC balanceAfterPaise is 2430000 paise (₹24,300.00)');
  assertEqual(res?.merchantName, 'hotel xyz', 'HDFC merchantName is normalized');
  assertEqual(res?.channel, 'UPI', 'HDFC channel is UPI');
}

// 1.2 SBI UPI Debit
{
  const sms = 'Dear SBI User, your A/C X4321 debited by Rs.450.00 on 05Oct26 by transfer to SWIGGY Ref No 123456789. Avl Bal Rs:23,850.00';
  const res = parseSms(sms, 'AD-SBIINB');
  assert(res !== null, 'SBI UPI Debit parsed successfully');
  assertEqual(res?.amountPaise, 45000, 'SBI amount is 45000 paise (₹450.00)');
  assertEqual(res?.type, 'EXPENSE', 'SBI type is EXPENSE');
  assertEqual(res?.accountLast4, '4321', 'SBI accountLast4 is 4321');
  assertEqual(res?.referenceId, '123456789', 'SBI referenceId matches');
  assertEqual(res?.balanceAfterPaise, 2385000, 'SBI balanceAfterPaise is 2385000 paise (₹23,850.00)');
  assertEqual(res?.merchantName, 'swiggy', 'SBI merchantName is normalized');
}

// 1.3 ICICI POS / Card Debit
{
  const sms = 'ICICI Bank Acct XX4321 debited for Rs 1200.00 on 05-Oct-26. Info: POS/STARBUCKS. Available Balance is Rs 22,650.00.';
  const res = parseSms(sms, 'VM-ICICIB');
  assert(res !== null, 'ICICI POS Debit parsed successfully');
  assertEqual(res?.amountPaise, 120000, 'ICICI amount is 120000 paise (₹1,200.00)');
  assertEqual(res?.type, 'EXPENSE', 'ICICI type is EXPENSE');
  assertEqual(res?.accountLast4, '4321', 'ICICI accountLast4 is 4321');
  assertEqual(res?.balanceAfterPaise, 2265000, 'ICICI balanceAfterPaise is 2265000 paise (₹22,650.00)');
  assertEqual(res?.merchantName, 'starbucks', 'ICICI merchantName is starbucks');
  assertEqual(res?.channel, 'CARD', 'ICICI channel is CARD');
}

// 1.4 Axis Bank Salary Credit
{
  const sms = 'Your A/c no. XX4321 is credited with INR 35000.00 on 01-10-26 by SALARY. Avail Bal: INR 57,650.00';
  const res = parseSms(sms, 'AX-AXISBK');
  assert(res !== null, 'Axis Salary Credit parsed successfully');
  assertEqual(res?.amountPaise, 3500000, 'Axis amount is 3500000 paise (₹35,000.00)');
  assertEqual(res?.type, 'INCOME', 'Axis type is INCOME');
  assertEqual(res?.accountLast4, '4321', 'Axis accountLast4 is 4321');
  assertEqual(res?.balanceAfterPaise, 5765000, 'Axis balanceAfterPaise is 5765000 paise (₹57,650.00)');
  assertEqual(res?.merchantName, 'salary', 'Axis source is normalized to salary');
}

// 1.5 Kotak Bank UPI Debit
{
  const sms = 'Sent Rs.250.00 from Kotak Bank AC 4321 to BLINKIT on 05-10-26. UPI Ref 998877665544. Bal: Rs.24050.00';
  const res = parseSms(sms, 'BP-KOTAKB');
  assert(res !== null, 'Kotak UPI Debit parsed successfully');
  assertEqual(res?.amountPaise, 25000, 'Kotak amount is 25000 paise (₹250.00)');
  assertEqual(res?.type, 'EXPENSE', 'Kotak type is EXPENSE');
  assertEqual(res?.accountLast4, '4321', 'Kotak accountLast4 is 4321');
  assertEqual(res?.referenceId, '998877665544', 'Kotak referenceId matches');
  assertEqual(res?.balanceAfterPaise, 2405000, 'Kotak balanceAfterPaise is 2405000 paise (₹24,050.00)');
  assertEqual(res?.merchantName, 'blinkit', 'Kotak merchantName is blinkit');
}

// 1.6 Federal Bank UPI Debit
{
  const sms = 'Federal Bank: Rs 320.00 debited from A/C ...4321 to UBER on 05-10-26. Ref No 554433221100. Avl Bal Rs 23,730.00';
  const res = parseSms(sms, 'BW-FEDBNK');
  assert(res !== null, 'Federal Bank UPI Debit parsed successfully');
  assertEqual(res?.amountPaise, 32000, 'Federal amount is 32000 paise (₹320.00)');
  assertEqual(res?.type, 'EXPENSE', 'Federal type is EXPENSE');
  assertEqual(res?.accountLast4, '4321', 'Federal accountLast4 is 4321');
  assertEqual(res?.referenceId, '554433221100', 'Federal referenceId matches');
  assertEqual(res?.balanceAfterPaise, 2373000, 'Federal balanceAfterPaise is 2373000 paise (₹23,730.00)');
  assertEqual(res?.merchantName, 'uber', 'Federal merchantName is uber');
}

// 1.7 IDFC FIRST Bank UPI Debit
{
  const sms = 'Rs. 890.00 debited from IDFC FIRST Bank A/C XX4321 towards ZOMATO on 05-Oct-26. UPI Ref: 334455667788. Avl Bal Rs 22,840.00';
  const res = parseSms(sms, 'BZ-IDFCFB');
  assert(res !== null, 'IDFC FIRST Bank UPI Debit parsed successfully');
  assertEqual(res?.amountPaise, 89000, 'IDFC amount is 89000 paise (₹890.00)');
  assertEqual(res?.type, 'EXPENSE', 'IDFC type is EXPENSE');
  assertEqual(res?.accountLast4, '4321', 'IDFC accountLast4 is 4321');
  assertEqual(res?.referenceId, '334455667788', 'IDFC referenceId matches');
  assertEqual(res?.balanceAfterPaise, 2284000, 'IDFC balanceAfterPaise is 2284000 paise (₹22,840.00)');
  assertEqual(res?.merchantName, 'zomato', 'IDFC merchantName is zomato');
}

// 1.8 Refund / Reversal
{
  const sms = 'Rs. 450.00 refunded to your HDFC Bank A/C **4321 on 06-10-26. UPI Ref 112233445566. Bal Rs.23290.00';
  const res = parseSms(sms, 'VK-HDFCBK');
  assert(res !== null, 'Reversal SMS parsed successfully');
  assertEqual(res?.amountPaise, 45000, 'Reversal amount is 45000 paise (₹450.00)');
  assertEqual(res?.type, 'REVERSAL', 'Transaction marked as REVERSAL');
  assertEqual(res?.balanceAfterPaise, 2329000, 'Reversal balanceAfterPaise updated to 2329000 paise');
}

// 1.9 Punjab National Bank (PNB)
{
  const sms = 'Dear Customer, A/c *1234 debited for Rs 500.00 on 05-Oct-26 by UPI:SWIGGY:ref123. Avl Bal Rs 10000.00';
  const res = parseSms(sms, 'BZ-PNBSMS');
  assert(res !== null, 'PNB Debit parsed successfully');
  assertEqual(res?.bankName, 'Punjab National Bank', 'PNB bank name identified');
  assertEqual(res?.amountPaise, 50000, 'PNB amount is 50000 paise (₹500.00)');
  assertEqual(res?.type, 'EXPENSE', 'PNB type is EXPENSE');
  assertEqual(res?.accountLast4, '1234', 'PNB accountLast4 is 1234');
  assertEqual(res?.balanceAfterPaise, 1000000, 'PNB balance is 1000000 paise (₹10,000.00)');
  assertEqual(res?.merchantName, 'swiggy', 'PNB merchantName is swiggy');
}

// 1.10 Bank of Baroda (BOB) Card
{
  const sms = 'ALERT: INR 500.00 is spent on your BOB Credit Card ending 1234 at STARBUCKS on 05-Oct-26. Avl Limit INR 45000.00';
  const res = parseSms(sms, 'AX-BOBTXN-S');
  assert(res !== null, 'Bank of Baroda Card parsed successfully');
  assertEqual(res?.bankName, 'Bank of Baroda', 'Bank of Baroda bank name identified');
  assertEqual(res?.amountPaise, 50000, 'BOB amount is 50000 paise (₹500.00)');
  assertEqual(res?.type, 'EXPENSE', 'BOB type is EXPENSE');
  assertEqual(res?.accountLast4, '1234', 'BOB accountLast4 is 1234');
  assertEqual(res?.merchantName, 'starbucks', 'BOB merchantName is starbucks');
  assertEqual(res?.channel, 'CARD', 'BOB channel is CARD');
}

// 1.11 Canara Bank UPI Debit
{
  const sms = 'Dear Customer, Your A/C *4321 debited by Rs. 350.00 on 05-10-26 towards UPI/BLINKIT/7890. Avl Bal Rs 15400.00';
  const res = parseSms(sms, 'VK-CANBNK-S');
  assert(res !== null, 'Canara Bank parsed successfully');
  assertEqual(res?.bankName, 'Canara Bank', 'Canara Bank identified');
  assertEqual(res?.amountPaise, 35000, 'Canara amount is 35000 paise (₹350.00)');
  assertEqual(res?.merchantName, 'blinkit', 'Canara merchantName is blinkit');
  assertEqual(res?.channel, 'UPI', 'Canara channel is UPI');
}

// 1.12 OneCard Spending
{
  const sms = "You've made a transaction of Rs. 1200.00 on SWIGGY on card ending 4321.";
  const res = parseSms(sms, 'CP-ONECRD-S');
  assert(res !== null, 'OneCard transaction parsed successfully');
  assertEqual(res?.bankName, 'OneCard', 'OneCard bank name identified');
  assertEqual(res?.amountPaise, 120000, 'OneCard amount is 120000 paise (₹1,200.00)');
  assertEqual(res?.merchantName, 'swiggy', 'OneCard merchantName is swiggy');
  assertEqual(res?.accountLast4, '4321', 'OneCard accountLast4 is 4321');
  assertEqual(res?.channel, 'CARD', 'OneCard channel is CARD');
}

// 1.13 Yes Bank UPI Debit
{
  const sms = 'Rs. 250.00 debited from YES BANK A/c ending 4321 on 05/10/26 towards UBER. Avl Bal INR 18200.00';
  const res = parseSms(sms, 'AD-YESBNK');
  assert(res !== null, 'Yes Bank parsed successfully');
  assertEqual(res?.bankName, 'Yes Bank', 'Yes Bank identified');
  assertEqual(res?.amountPaise, 25000, 'Yes Bank amount is 25000 paise');
  assertEqual(res?.merchantName, 'uber', 'Yes Bank merchantName is uber');
}

// 1.14 IndusInd Bank
{
  const sms = 'Dear Customer, INR 600.00 has been debited from your A/c no. XX4321 on 05-10-26 towards ZOMATO. Total Bal: INR 12500.00';
  const res = parseSms(sms, 'VM-INDUSB');
  assert(res !== null, 'IndusInd Bank parsed successfully');
  assertEqual(res?.bankName, 'IndusInd Bank', 'IndusInd Bank identified');
  assertEqual(res?.amountPaise, 60000, 'IndusInd amount is 60000 paise');
  assertEqual(res?.merchantName, 'zomato', 'IndusInd merchantName is zomato');
  assertEqual(res?.balanceAfterPaise, 1250000, 'IndusInd balance is 1250000 paise');
}

// 1.15 Jupiter / Fintech
{
  const sms = 'Your Jupiter account ending 4321 was debited by Rs. 150.00 towards SWIGGY. Avl Bal Rs 4500.00';
  const res = parseSms(sms, 'AX-JUPITR-S');
  assert(res !== null, 'Jupiter parsed successfully');
  assertEqual(res?.bankName, 'Jupiter', 'Jupiter bank name identified');
  assertEqual(res?.amountPaise, 15000, 'Jupiter amount is 15000 paise');
  assertEqual(res?.merchantName, 'swiggy', 'Jupiter merchantName is swiggy');
}

// --------------------------------------------------------------------------
// 2. NEGATIVE FIXTURES (MUST BE REJECTED)
// --------------------------------------------------------------------------
console.log('\n--- 2. Testing Negative SMS Fixtures (Rejections) ---');

// 2.1 OTP SMS
{
  const sms = 'Your OTP for netbanking transaction of Rs 5000.00 is 492810. Do not share OTP with anyone. Valid for 10 mins.';
  const filter = isBookableFinancialMessage(sms);
  assertEqual(filter.isBookable, false, 'OTP message rejected by financial filter');
  assertEqual(filter.rejectReason, 'OTP_OR_VERIFICATION', 'OTP rejection reason identified');
  const res = parseSms(sms, 'VK-HDFCBK');
  assertEqual(res, null, 'parseSms returns null for OTP SMS');
}

// 2.2 Promotional Loan Offer
{
  const sms = 'Congratulations! You are pre-approved for personal loan of Rs 5,00,000 at flat 10% interest. Apply now.';
  const filter = isBookableFinancialMessage(sms);
  assertEqual(filter.isBookable, false, 'Promotional message rejected by financial filter');
  assertEqual(filter.rejectReason, 'PROMOTIONAL_OFFER', 'Promotional offer rejection reason identified');
  const res = parseSms(sms, 'BP-KOTAKB');
  assertEqual(res, null, 'parseSms returns null for promotional offer');
}

// 2.3 Bill Due Notification
{
  const sms = 'Dear Customer, your Credit Card bill of Rs. 14,500.00 is generated. Due date is 15-Oct-26. Pay now.';
  const filter = isBookableFinancialMessage(sms);
  assertEqual(filter.isBookable, false, 'Bill due message rejected by financial filter');
  assertEqual(filter.rejectReason, 'FUTURE_OR_BILL_DUE', 'Bill due rejection reason identified');
  const res = parseSms(sms, 'AX-AXISBK');
  assertEqual(res, null, 'parseSms returns null for bill due notification');
}

// 2.4 Failed Transaction
{
  const sms = 'Transaction of Rs 500.00 on your ICICI Bank Acct XX4321 has failed due to incorrect UPI PIN.';
  const filter = isBookableFinancialMessage(sms);
  assertEqual(filter.isBookable, false, 'Failed transaction rejected by financial filter');
  assertEqual(filter.rejectReason, 'PAYMENT_FAILED_OR_DECLINED', 'Failed payment rejection reason identified');
  const res = parseSms(sms, 'VM-ICICIB');
  assertEqual(res, null, 'parseSms returns null for failed payment');
}

// 2.5 Untrusted Sender (Random 10-digit Phone Number)
{
  const sms = 'Rs. 500.00 debited from A/C 4321 to John on 05-10-26';
  const senderEval = evaluateSenderTrust('+919876543210');
  assertEqual(senderEval.isTrusted, false, 'Personal phone number rejected as untrusted sender');
  const res = parseSms(sms, '+919876543210');
  assertEqual(res, null, 'parseSms rejects transactions from personal 10-digit senders');
}

// 2.6 Balance Enquiry without Transaction
{
  const sms = 'Available balance in your A/C XX4321 is Rs 25,000.00 as of 05-Oct-26.';
  const filter = isBookableFinancialMessage(sms);
  assertEqual(filter.isBookable, false, 'Balance enquiry rejected by financial filter');
  assertEqual(filter.rejectReason, 'INFORMATIONAL_OR_BALANCE_ENQUIRY', 'Balance enquiry identified');
}

// --------------------------------------------------------------------------
// 3. SENDER TRUST EVALUATION
// --------------------------------------------------------------------------
console.log('\n--- 3. Testing Sender Trust Registry ---');

{
  const hdfc = evaluateSenderTrust('VK-HDFCBK');
  assertEqual(hdfc.isTrusted, true, 'VK-HDFCBK is trusted');
  assertEqual(hdfc.bankName, 'HDFC Bank', 'VK-HDFCBK bankName identified as HDFC Bank');
  assertEqual(hdfc.trust, 'BANK', 'VK-HDFCBK trust level is BANK');

  const sbi = evaluateSenderTrust('AD-SBIINB');
  assertEqual(sbi.isTrusted, true, 'AD-SBIINB is trusted');
  assertEqual(sbi.bankName, 'State Bank of India', 'AD-SBIINB bankName identified');

  const icici = evaluateSenderTrust('VM-ICICIB');
  assertEqual(icici.isTrusted, true, 'VM-ICICIB is trusted');

  const axis = evaluateSenderTrust('AX-AXISBK');
  assertEqual(axis.isTrusted, true, 'AX-AXISBK is trusted');

  const federal = evaluateSenderTrust('BW-FEDBNK');
  assertEqual(federal.isTrusted, true, 'BW-FEDBNK is trusted');

  const cred = evaluateSenderTrust('AD-CREDCL');
  assertEqual(cred.isTrusted, true, 'AD-CREDCL is trusted');
  assertEqual(cred.trust, 'KNOWN_FINANCIAL', 'CRED trust level is KNOWN_FINANCIAL');

  const pnb = evaluateSenderTrust('BZ-PNBSMS');
  assertEqual(pnb.isTrusted, true, 'BZ-PNBSMS is trusted');
  assertEqual(pnb.bankName, 'Punjab National Bank', 'PNB identified');

  const canara = evaluateSenderTrust('VK-CANBNK-S');
  assertEqual(canara.isTrusted, true, 'VK-CANBNK-S is trusted');
  assertEqual(canara.bankName, 'Canara Bank', 'Canara identified');

  const bob = evaluateSenderTrust('AX-BOBTXN-S');
  assertEqual(bob.isTrusted, true, 'AX-BOBTXN-S is trusted');
  assertEqual(bob.bankName, 'Bank of Baroda', 'BOB identified');

  const onecard = evaluateSenderTrust('CP-ONECRD-S');
  assertEqual(onecard.isTrusted, true, 'CP-ONECRD-S is trusted');
  assertEqual(onecard.bankName, 'OneCard', 'OneCard identified');

  const slice = evaluateSenderTrust('JD-SLICE-S');
  assertEqual(slice.isTrusted, true, 'JD-SLICE-S is trusted');
  assertEqual(slice.bankName, 'Slice', 'Slice identified');

  const ippb = evaluateSenderTrust('AD-IPBMSG-S');
  assertEqual(ippb.isTrusted, true, 'AD-IPBMSG-S is trusted');
  assertEqual(ippb.bankName, 'India Post Payments Bank', 'IPPB identified');

  const au = evaluateSenderTrust('AX-AUBANK');
  assertEqual(au.isTrusted, true, 'AX-AUBANK is trusted');
  assertEqual(au.bankName, 'AU Small Finance Bank', 'AU Small Finance Bank identified');

  const dbs = evaluateSenderTrust('VM-DBSBNK');
  assertEqual(dbs.isTrusted, true, 'VM-DBSBNK is trusted');
  assertEqual(dbs.bankName, 'DBS Bank India', 'DBS Bank identified');

  const kgb = evaluateSenderTrust('VK-KGBANK');
  assertEqual(kgb.isTrusted, true, 'VK-KGBANK is trusted');
  assertEqual(kgb.bankName, 'Kerala Gramin Bank', 'Kerala Gramin Bank identified');

  const spam = evaluateSenderTrust('DZ-LOAN4U');
  assertEqual(spam.isTrusted, false, 'DZ-LOAN4U is rejected');
}

// --------------------------------------------------------------------------
// 4. 7-TIER DETERMINISTIC LEXICAL CLASSIFIER
// --------------------------------------------------------------------------
console.log('\n--- 4. Testing 7-Tier Lexical Categorization Engine ---');

{
  // Tier 3: Known Merchant Dictionary (Swiggy -> FOOD_DINING)
  const swiggy = classifyTransaction({ merchantName: 'swiggy' });
  assertEqual(swiggy.categoryId, 'FOOD_DINING', 'swiggy -> FOOD_DINING');
  assertEqual(swiggy.reason, 'KNOWN_MERCHANT', 'swiggy classified via KNOWN_MERCHANT');

  // Tier 3: Known Merchant Dictionary (Zomato -> FOOD_DINING)
  const zomato = classifyTransaction({ merchantName: 'zomato' });
  assertEqual(zomato.categoryId, 'FOOD_DINING', 'zomato -> FOOD_DINING');

  // Tier 3: Starbucks -> FOOD_DINING
  const starbucks = classifyTransaction({ merchantName: 'starbucks' });
  assertEqual(starbucks.categoryId, 'FOOD_DINING', 'starbucks -> FOOD_DINING');

  // Tier 3: Blinkit -> GROCERIES
  const blinkit = classifyTransaction({ merchantName: 'blinkit' });
  assertEqual(blinkit.categoryId, 'GROCERIES', 'blinkit -> GROCERIES');

  // Tier 3: Uber -> TRANSPORT
  const uber = classifyTransaction({ merchantName: 'uber' });
  assertEqual(uber.categoryId, 'TRANSPORT', 'uber -> TRANSPORT');

  // Tier 6: Salary -> INCOME
  const salary = classifyTransaction({ type: 'INCOME', merchantName: 'salary' });
  assertEqual(salary.categoryId, 'INCOME', 'salary credit -> INCOME');

  // Tier 6: ATM -> CASH_ATM
  const atm = classifyTransaction({ channel: 'ATM', rawNarration: 'ATM Cash Withdrawal' });
  assertEqual(atm.categoryId, 'CASH_ATM', 'ATM withdrawal -> CASH_ATM');

  // Tier 6: Reversal -> REFUND
  const reversal = classifyTransaction({ type: 'REVERSAL' });
  assertEqual(reversal.categoryId, 'REFUND', 'Reversal -> REFUND');

  // Tier 1: User VPA Rule Override
  const customRules = [
    { normalizedVpa: 'myshop@okhdfcbank', categoryId: 'SHOPPING' },
    { normalizedMerchant: 'corner bakery', categoryId: 'FOOD_DINING' },
  ];

  const customVpa = classifyTransaction({
    payeeVpa: 'myshop@okhdfcbank',
    merchantName: 'myshop',
    customRules,
  });
  assertEqual(customVpa.categoryId, 'SHOPPING', 'User VPA rule overrides default');
  assertEqual(customVpa.reason, 'USER_VPA_RULE', 'USER_VPA_RULE prioritized');

  // Tier 2: User Merchant Rule Override
  const customMerchant = classifyTransaction({
    merchantName: 'corner bakery',
    customRules,
  });
  assertEqual(customMerchant.categoryId, 'FOOD_DINING', 'User Merchant rule applied');
  assertEqual(customMerchant.reason, 'USER_MERCHANT_RULE', 'USER_MERCHANT_RULE prioritized');
}

// --------------------------------------------------------------------------
// 5. DEDUPLICATION & INVARIANT INTEGRITY
// --------------------------------------------------------------------------
console.log('\n--- 5. Testing Deduplication & Invariant Integrity ---');

{
  const hash1 = computeMessageHash('VK-HDFCBK', 'Sent Rs.750.00 from HDFC Bank A/C **4321', 1728100000000);
  const hash2 = computeMessageHash('VK-HDFCBK', 'Sent Rs.750.00 from HDFC Bank A/C **4321', 1728100000000);

  assertEqual(hash1, hash2, 'Message hash is deterministic and reproducible');
  assert(hash1.startsWith('msg_'), 'Message hash has expected prefix');

  const fp1 = computeTransactionFingerprint({
    amountPaise: 75000,
    referenceId: '627912345678',
    occurredAt: '2026-10-05T12:00:00.000Z',
    accountLast4: '4321',
    merchantName: 'hotel xyz',
  });

  const fp2 = computeTransactionFingerprint({
    amountPaise: 75000,
    referenceId: '627912345678',
    occurredAt: '2026-10-05T12:00:00.000Z',
    accountLast4: '4321',
    merchantName: 'hotel xyz',
  });

  assertEqual(fp1, fp2, 'Transaction fingerprint is deterministic across duplicate events');
  assert(fp1.includes('627912345678'), 'Fingerprint incorporates referenceId');
  assert(fp1.includes('75000'), 'Fingerprint incorporates amountPaise');
}

// --------------------------------------------------------------------------
// 6. BALANCE RECONCILIATION ENGINE
// --------------------------------------------------------------------------
console.log('\n--- 6. Testing Balance Reconciliation Engine ---');

{
  // 6.1 Perfect Match
  const rec1 = reconcileBalance(2430000, 2430000);
  assertEqual(rec1.status, 'RECONCILED', 'Identical balances produce RECONCILED status');
  assertEqual(rec1.isReconciled, true, 'isReconciled is true');
  assertEqual(rec1.differencePaise, 0, 'Difference is 0');

  // 6.2 Missing Outflow (Tracked balance higher than bank balance -> untracked debit)
  const rec2 = reconcileBalance(2500000, 2425000);
  assertEqual(rec2.status, 'MISMATCH', 'Different balance produces MISMATCH status');
  assertEqual(rec2.isReconciled, false, 'isReconciled is false');
  assertEqual(rec2.differencePaise, 75000, 'Difference is +75000 paise (+₹750.00 difference)');

  // 6.3 Missing Inflow (Tracked balance lower than bank balance -> untracked credit)
  const rec3 = reconcileBalance(2000000, 2500000);
  assertEqual(rec3.status, 'MISMATCH', 'Different balance produces MISMATCH status');
  assertEqual(rec3.isReconciled, false, 'isReconciled is false');
  assertEqual(rec3.differencePaise, -500000, 'Difference is -500000 paise (-₹5,000.00 difference)');

  // 6.4 Drift within tolerance (under 10 paise)
  const rec4 = reconcileBalance(2430000, 2430005);
  assertEqual(rec4.status, 'RECONCILED', 'Sub-10 paise variance treated as RECONCILED');
  assertEqual(rec4.isReconciled, true, 'isReconciled is true for sub-10 paise variance');
}

// --------------------------------------------------------------------------
// 7. MONEY UTILITIES & INTEGER-PAISE ARITHMETIC
// --------------------------------------------------------------------------
console.log('\n--- 7. Testing Money Utilities & Integer-Paise Arithmetic ---');

{
  assertEqual(toPaise(750.50), 75050, 'toPaise(750.50) === 75050');
  assertEqual(toRupees(75050), 750.50, 'toRupees(75050) === 750.50');
  assertEqual(formatPaise(2430000), '₹24,300', 'formatPaise(2430000) === "₹24,300"');
  assertEqual(formatPaise(2430000, true), '₹24,300.00', 'formatPaise(2430000, true) === "₹24,300.00"');
  assertEqual(addPaise(10050, 20025), 30075, 'addPaise(10050, 20025) === 30075');
  assertEqual(subPaise(30075, 10050), 20025, 'subPaise(30075, 10050) === 20025');
  assertEqual(roundPaise(100.499), 100, 'roundPaise rounds to exact integer');
}

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 100% REGRESSION SUITE PASSED!\n');
  process.exit(0);
}
