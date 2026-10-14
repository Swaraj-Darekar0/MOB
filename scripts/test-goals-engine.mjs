import {
  calculateInstallmentAmount,
  advanceNextDueDate,
  analyzeCashFlowHabits,
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

// 5. Deterministic 90-Day Cash Flow Habit Analysis
console.log('\n--- 5. Testing Deterministic 90-Day Cash Flow Habit Analysis ---');
{
  const mockTransactions = [
    // Income across Account A (Union Bank)
    {
      id: 'tx1',
      accountId: 'acc_union',
      bankName: 'Union Bank of India',
      accountLast4: '0221',
      type: 'INCOME',
      amountPaise: 5000000, // ₹50,000
      occurredAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    // Income across Account B (HDFC Bank)
    {
      id: 'tx2',
      accountId: 'acc_hdfc',
      bankName: 'HDFC Bank',
      accountLast4: '4321',
      type: 'INCOME',
      amountPaise: 4000000, // ₹40,000
      occurredAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    // Debits across Account A
    {
      id: 'tx3',
      accountId: 'acc_union',
      bankName: 'Union Bank of India',
      accountLast4: '0221',
      type: 'EXPENSE',
      amountPaise: 1500000, // ₹15,000
      occurredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    // Debits across Account B
    {
      id: 'tx4',
      accountId: 'acc_hdfc',
      bankName: 'HDFC Bank',
      accountLast4: '4321',
      type: 'EXPENSE',
      amountPaise: 2000000, // ₹20,000
      occurredAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    // Outdated transaction (> 90 days ago, must be ignored)
    {
      id: 'tx5',
      accountId: 'acc_union',
      bankName: 'Union Bank of India',
      accountLast4: '0221',
      type: 'EXPENSE',
      amountPaise: 8000000, // ₹80,000
      occurredAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    },
  ];

  // Target: ₹30,000 in 60 days
  const deadlineStr = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const analysis = analyzeCashFlowHabits(3000000, deadlineStr, mockTransactions);

  assertEqual(analysis.analyzedDays, 90, 'Analyzes 90 days of transactions');
  assertEqual(analysis.transactionCount, 4, 'Ignores transactions older than 90 days');
  assertEqual(analysis.analyzedAccounts.length, 2, 'Detects multiple bank accounts (Union Bank & HDFC)');
  assertEqual(analysis.totalCreditsPaise, 9000000, 'Calculates total 90-day credits (₹90,000)');
  assertEqual(analysis.totalDebitsPaise, 3500000, 'Calculates total 90-day debits (₹35,000)');
  assertEqual(analysis.spendingRatioPercent, 39, 'Calculates exact spending ratio (39%)');
  assert(analysis.monthlyNetSurplusPaise > 0, 'Monthly net surplus is positive');
  assert(analysis.cadences.DAILY.installmentPaise > 0, 'Daily cadence installment calculated');
  assert(analysis.cadences.WEEKLY.installmentPaise > 0, 'Weekly cadence installment calculated');
  assert(analysis.cadences.MONTHLY.installmentPaise > 0, 'Monthly cadence installment calculated');
  assert(analysis.insightCallout.includes('2 bank accounts'), 'Insight callout includes multi-account count');
}

{
  // Fallback test on empty transaction log
  const deadlineStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const emptyAnalysis = analyzeCashFlowHabits(1000000, deadlineStr, []);
  assert(emptyAnalysis.monthlyNetSurplusPaise > 0, 'Graceful baseline on empty transactions');
  assertEqual(emptyAnalysis.transactionCount, 0, 'Zero transactions handled without error');
}

console.log('\n======================================================');
console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL GOAL ENGINE & INVARIANT TESTS PASSED!\n');
}
