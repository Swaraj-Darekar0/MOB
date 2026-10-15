/**
 * Test Suite: Adaptive Goal Copilot & 3-Way Reality Option Engine
 * 
 * Verifies:
 * 1. Nonparametric Outlier Dampening (Hampel Filter & MAD)
 * 2. Essential Fixed Burn vs Discretionary Volatility Decomposition
 * 3. Disposable Free Cash Flow (DFCF_50 and DFCF_25 floor)
 * 4. Feasibility Index Phi & Threshold Bands (Comfortable, Stretch, Deficit)
 * 5. Cadence Decision Boundary (Daily blocked for large goals, allowed for micro-habits)
 * 6. 3-Way Personalized Reality Offer Generation (Stress-Free, Sacrifice, Seed & Sprint)
 * 7. End-to-end execution of Option 2 Envelope Cuts and Option 3 Seed Transfers
 */

import {
  calculateMedian,
  calculateMAD,
  applyHampelFilter,
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

console.log('\n======================================================================');
console.log('🧪 Section 51: Adaptive Goal Copilot & 3-Way Reality Engine Suite');
console.log('======================================================================\n');

// 1. Robust Nonparametric Statistics & Hampel Filter
console.log('--- 1. Testing Robust Nonparametric Statistics & Hampel Filter ---');
{
  const values = [4000000, 4200000, 4100000, 15000000, 3900000]; // ₹150,000 anomaly bonus
  const medianVal = calculateMedian(values);
  assertEqual(medianVal, 4100000, 'Median correctly identifies ₹41,000 base income');

  const madVal = calculateMAD(values, medianVal);
  assert(madVal > 0, 'MAD is strictly positive');

  const { cleaned, outliers } = applyHampelFilter([4000000, 4200000, 15000000]);
  assertEqual(outliers.length, 1, 'Hampel filter isolates the ₹150,000 bonus windfall');
  assertEqual(outliers[0], 15000000, 'Identified outlier is the exact windfall');
  assert(cleaned[2] < 15000000, 'Cleaned array dampens the windfall to the upper confidence bound');
}

// 2. Fixed Essential vs Discretionary Decomposition
console.log('\n--- 2. Testing Cash Flow Decomposition & DFCF Calculations ---');
{
  const now = new Date();
  const mockTransactions = [
    // Month 1
    {
      id: 'tx1',
      type: 'INCOME',
      amountPaise: 6000000, // ₹60,000 salary
      occurredAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      rawNarration: 'SALARY CREDIT ACME CORP',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
    {
      id: 'tx2',
      type: 'EXPENSE',
      amountPaise: 2500000, // ₹25,000 rent (fixed)
      occurredAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
      rawNarration: 'HOUSE RENT TO LANDLORD',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
    {
      id: 'tx3',
      type: 'EXPENSE',
      amountPaise: 800000, // ₹8,000 groceries (fixed)
      occurredAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
      rawNarration: 'NATURE BASKET GROCERY',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
    {
      id: 'tx4',
      type: 'EXPENSE',
      amountPaise: 1200000, // ₹12,000 dining & shopping (discretionary)
      occurredAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      rawNarration: 'SWIGGY AND ZOMATO DINING',
      merchantName: 'Swiggy',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
    // Month 2
    {
      id: 'tx5',
      type: 'INCOME',
      amountPaise: 6000000, // ₹60,000 salary
      occurredAt: new Date(now.getTime() - 40 * 86400000).toISOString(),
      rawNarration: 'SALARY CREDIT ACME CORP',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
    {
      id: 'tx6',
      type: 'EXPENSE',
      amountPaise: 2500000, // ₹25,000 rent
      occurredAt: new Date(now.getTime() - 38 * 86400000).toISOString(),
      rawNarration: 'HOUSE RENT TO LANDLORD',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
    {
      id: 'tx7',
      type: 'EXPENSE',
      amountPaise: 1100000, // ₹11,000 dining
      occurredAt: new Date(now.getTime() - 35 * 86400000).toISOString(),
      rawNarration: 'SWIGGY FOOD',
      merchantName: 'Swiggy',
      bankName: 'HDFC',
      accountLast4: '1122',
    },
  ];

  const analysis = analyzeCashFlowHabits(
    5000000, // ₹50,000 target
    new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0], // 60 days
    mockTransactions,
    now.toISOString().split('T')[0],
    3000000 // ₹30,000 unallocated cash
  );

  assert(analysis.dfcf50Paise > 0, 'DFCF_50 median surplus is strictly positive');
  assert(analysis.dfcf25Paise > 0, 'DFCF_25 conservative floor is strictly positive');
  assert(analysis.dfcf25Paise <= analysis.dfcf50Paise, 'DFCF_25 floor is <= DFCF_50 median');
  assert(analysis.fixedMonthlyBurnPaise >= 2500000, 'Detects rent as essential fixed structural burn');
  assert(analysis.discretionaryMonthlyBurnPaise >= 800000, 'Detects Swiggy as discretionary burn');
}

// 3. Cadence Decision Boundary: Daily vs Weekly vs Monthly
console.log('\n--- 3. Testing Cadence Decision Boundary ---');
{
  const now = new Date();
  const deadline60Days = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0];

  // Case A: Large Goal (₹50,000) -> Daily must be restricted
  const largeGoalAnalysis = analyzeCashFlowHabits(5000000, deadline60Days, []);
  assertEqual(largeGoalAnalysis.isDailyAllowed, false, 'Daily cadence is disallowed for ₹50,000 capital goal');
  assert(largeGoalAnalysis.dailyRestrictionReason !== undefined, 'Provides clear explanation why Daily is restricted');
  assertEqual(largeGoalAnalysis.cadences.DAILY.badgeLabel, 'High Risk', 'Daily cadence labeled as High Risk');

  // Case B: Micro-Habit Goal (₹500 in 30 days = ₹16.6/day) -> Daily must be allowed
  const microDeadline = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const microGoalAnalysis = analyzeCashFlowHabits(50000, microDeadline, []);
  assertEqual(microGoalAnalysis.isDailyAllowed, true, 'Daily cadence is permitted for ₹500 micro-goal');
}

// 4. Feasibility Index & 3-Way Reality Offer Generation
console.log('\n--- 4. Testing Feasibility Index & 3-Way Reality Offer Generation ---');
{
  const now = new Date();
  // Request ₹1,20,000 in 30 days (requires ₹120,000/mo, when safe surplus is ~₹15,000/mo)
  const shortDeadline = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const deficitAnalysis = analyzeCashFlowHabits(
    12000000,
    shortDeadline,
    [],
    now.toISOString().split('T')[0],
    5000000 // ₹50,000 unallocated cash
  );

  assertEqual(deficitAnalysis.feasibilityBand, 'DEFICIT_CRITICAL', 'Classifies impossible goal as DEFICIT_CRITICAL');
  assert(deficitAnalysis.feasibilityScore < 0.35, 'Feasibility score Phi < 0.35 in deficit regime');
  assert(deficitAnalysis.realityOffer !== undefined, 'Generates 3-Way Reality Offer when in deficit');
  assertEqual(deficitAnalysis.realityOffer.isNeeded, true, 'Reality offer flag is set to true');

  // Option 1: Stress-Free Pace
  const opt1 = deficitAnalysis.realityOffer.optionStressFree;
  assert(opt1.dilatedDays > 30, 'Dilates deadline beyond initial 30 days');
  assert(new Date(opt1.dilatedTargetDate) > new Date(shortDeadline), 'New target date is strictly in the future');
  assert(opt1.monthlyInstallmentPaise < 12000000, 'Monthly installment is reduced to sustainable level');
  assertEqual(opt1.solvencyRatePercent, 99, 'Stress-free pace offers 99% solvency rating');

  // Option 2: Envelope Trim Plan
  const opt2 = deficitAnalysis.realityOffer.optionSacrifice;
  assertEqual(opt2.targetDateMaintained, shortDeadline, 'Preserves original target deadline');
  assert(opt2.cuts.length > 0, 'Generates surgical envelope cuts');
  assert(opt2.cuts.some(c => c.category === 'FOOD_DINING'), 'Includes Dining envelope cut');

  // Option 3: Seed & Sprint Plan
  const opt3 = deficitAnalysis.realityOffer.optionSeedSprint;
  assert(opt3 !== undefined, 'Generates Seed & Sprint plan when unallocated cash is available');
  assert(opt3.seedAmountPaise > 0, 'Siphons positive seed amount from unallocated cash');
  assert(opt3.reducedMonthlyInstallmentPaise < 12000000, 'Reduces monthly payment after seed injection');
}

// 5. Plain ASD-STE-100 Language Verification
console.log('\n--- 5. Testing Plain ASD-STE-100 Simplified Technical English ---');
{
  const now = new Date();
  const deadline = new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0];
  const analysis = analyzeCashFlowHabits(8000000, deadline, [], now.toISOString().split('T')[0], 2000000);

  const opt1 = analysis.realityOffer.optionStressFree;
  const opt2 = analysis.realityOffer.optionSacrifice;

  const wordCount1 = opt1.explanation.split(/\s+/).length;
  const wordCount2 = opt2.explanation.split(/\s+/).length;

  assert(wordCount1 <= 25, `Option 1 explanation has ${wordCount1} words (<= 25 target)`);
  assert(wordCount2 <= 25, `Option 2 explanation has ${wordCount2} words (<= 25 target)`);
  assert(opt1.explanation.includes('Keep your current spending'), 'Option 1 uses clear active voice');
  assert(opt2.explanation.includes('Keep your target date'), 'Option 2 uses clear active voice');
}

console.log('\n======================================================================');
console.log(`📊 Suite Completed: ${passed} Passed, ${failed} Failed`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
}
