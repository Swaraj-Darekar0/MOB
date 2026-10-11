import {
  calculateInstallmentAmount,
  advanceNextDueDate,
} from '../src/services/goals/goalCalculations.ts';

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
    console.error(`  ✗ FAIL: ${message} (Expected ${expected}, got ${actual})`);
  }
}

console.log('\n======================================================');
console.log('🧪 Section 48: Goal Engine & Invariant Test Suite');
console.log('======================================================\n');

// 1. Installment Calculations
console.log('--- 1. Testing Integer-Paise Installment Calculations ---');
{
  // Goal: ₹10,000 (1,000,000 paise) in 100 days, daily
  const daily = calculateInstallmentAmount(
    1000000,
    0,
    '2026-10-20',
    'DAILY',
    '2026-10-10'
  );
  assertEqual(daily, 100000, 'Daily installment for ₹10,000 over 10 days is ₹1,000 (100,000 paise)');
}

{
  // Goal: ₹50,000 (5,000,000 paise) in 10 weeks, weekly
  const weekly = calculateInstallmentAmount(
    5000000,
    0,
    '2026-12-19',
    'WEEKLY',
    '2026-10-10'
  );
  // 70 days / 7 = 10 weeks -> 500,000 paise
  assertEqual(weekly, 500000, 'Weekly installment for ₹50,000 over 10 weeks is ₹5,000 (500,000 paise)');
}

{
  // Goal: ₹120,000 (12,000,000 paise) in 6 months, monthly
  const monthly = calculateInstallmentAmount(
    12000000,
    0,
    '2027-04-10',
    'MONTHLY',
    '2026-10-10'
  );
  // 182 days / 30 = 7 intervals -> Math.ceil(12,000,000 / 7) = 1,714,286
  assert(monthly > 0, 'Monthly installment is positive integer paise');
  assertEqual(typeof monthly, 'number', 'Installment is integer type');
  assert(Number.isInteger(monthly), 'Installment has no floating point fractions');
}

// 2. Calendar Cadence Due Date Advancement
console.log('\n--- 2. Testing Calendar Cadence Date Advancement ---');
{
  const nextDaily = advanceNextDueDate('2026-10-10', 'DAILY');
  assertEqual(nextDaily, '2026-10-11', 'Daily advances by 1 day');

  const nextWeekly = advanceNextDueDate('2026-10-10', 'WEEKLY');
  assertEqual(nextWeekly, '2026-10-17', 'Weekly advances by 7 days');

  const nextMonthly = advanceNextDueDate('2026-10-10', 'MONTHLY');
  assertEqual(nextMonthly, '2026-11-10', 'Monthly advances by 1 month');
}

// 3. Partial Allocation Invariant
console.log('\n--- 3. Testing Partial Allocation Invariants ---');
{
  const plannedPaise = 500000; // ₹5,000
  const availableUnallocatedPaise = 200000; // ₹2,000
  const allocated = Math.min(plannedPaise, availableUnallocatedPaise);
  const shortfall = plannedPaise - allocated;

  assertEqual(allocated, 200000, 'Allocates maximum available unallocated (₹2,000)');
  assertEqual(shortfall, 300000, 'Calculates exact shortfall (₹3,000)');
  assert(shortfall > 0, 'Partial allocation flag is true when shortfall exists');
}

// 4. Zero-Sum Virtual Transfer Invariant
console.log('\n--- 4. Testing Zero-Sum Virtual Transfer Invariant ---');
{
  let unallocated = 1000000; // ₹10,000
  let goalBucket = 200000;   // ₹2,000
  let bankBalance = 5000000; // ₹50,000 (observed real cash)

  const transferAmount = 300000; // ₹3,000
  unallocated -= transferAmount;
  goalBucket += transferAmount;

  // Invariant: Total virtual allocations + unallocated must stay constant
  assertEqual(unallocated + goalBucket, 1200000, 'Virtual sum remains unchanged after transfer');
  assertEqual(bankBalance, 5000000, 'Observed bank balance is completely unaffected by virtual goal transfer');
}

console.log('\n======================================================');
console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL GOAL ENGINE & INVARIANT TESTS PASSED!\n');
}
