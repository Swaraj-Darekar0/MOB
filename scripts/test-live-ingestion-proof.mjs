/**
 * Proof & Verification Harness:
 * 1. Live Available Balance Extraction & Tracking Verification
 * 2. Bucket Classification & Envelope Deduction Proof
 * 3. Real Device Dataset Classification Metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSms } from '../src/services/sms/parser/index.ts';
import { classifyTransaction } from '../src/services/sms/categorization/classifier.ts';
import { SYSTEM_CATEGORIES } from '../src/services/sms/categorization/taxonomy.ts';
import { isBookableFinancialMessage } from '../src/services/sms/filter/financialFilter.ts';
import { evaluateSenderTrust } from '../src/services/sms/trust/senderTrust.ts';
import { toRupees, toPaise, formatPaise } from '../src/utils/money.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, '../docs/All Conversations 2026-10-10 170924.csv');
const CUTOFF_DATE = '2026-07-10 00:00:00';

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

console.log(`\n======================================================================`);
console.log(`🧪 PROOF HARNESS: LIVE BALANCE EXTRACTION & BUCKET CLASSIFICATION`);
console.log(`======================================================================\n`);

// -------------------------------------------------------------
// PART 1: SIMULATED LIVE BUCKET ALLOCATION & BALANCE APPENDING
// -------------------------------------------------------------
console.log(`--- PART 1: LIVE INGESTION SIMULATION INTO FORMED BUCKETS ---`);

// Initial user state (after onboarding):
const simulatedState = {
  trackedBalancePaise: toPaise(50000), // Starting balance ₹50,000
  lastReportedBalancePaise: toPaise(50000),
  envelopes: [
    { id: 'env_food', name: 'Food & Dining', currentAmount: 10000, targetAmount: 10000 },
    { id: 'env_groceries', name: 'Groceries', currentAmount: 8000, targetAmount: 8000 },
    { id: 'env_travel', name: 'Travel & Commute', currentAmount: 7500, targetAmount: 7500 },
    { id: 'env_shopping', name: 'Shopping', currentAmount: 7500, targetAmount: 7500 },
    { id: 'env_savings', name: 'Savings & Emergency', currentAmount: 10000, targetAmount: 10000 },
    { id: 'env_unallocated', name: 'Unallocated', currentAmount: 7000, targetAmount: 7000 },
  ],
  userRules: new Map([
    // Teach user-rule for local favorite merchants
    ['dk bhel', { envelopeId: 'env_food', categoryId: 'FOOD_DINING' }],
    ['sai supe', { envelopeId: 'env_groceries', categoryId: 'GROCERIES' }],
  ]),
};

console.log(`Initial Formed Buckets:`);
for (const env of simulatedState.envelopes) {
  console.log(`  • ${env.name.padEnd(20)}: ₹${env.currentAmount.toFixed(2)}`);
}
console.log(`  • Tracked Total Balance : ₹${(simulatedState.trackedBalancePaise / 100).toFixed(2)}`);
console.log(`  • Bank Reported Balance : ₹${(simulatedState.lastReportedBalancePaise / 100).toFixed(2)}\n`);

// Incoming real SMS stream sequence
const incomingTestSmsList = [
  {
    sender: 'VA-UNIONB-T',
    text: 'Union Bank of India A/c *0221 Debited Rs:69.00 on 04-08-2026 21:48:31 by Mob Bk ref no 103796819570, Fvg: SPOTIFY Avl Bal Rs:49931.00',
    description: 'Debit for Spotify subscription',
  },
  {
    sender: 'JK-UNIONB-T',
    text: 'Union Bank of India A/c *0221 Debited Rs:250.00 on 15-08-2026 14:10:00 by Mob Bk ref no 622389885584, Fvg: Blinkit Avl Bal Rs:49681.00',
    description: 'Debit for Blinkit order',
  },
  {
    sender: 'JD-UNIONB-T',
    text: 'Union Bank of India A/c *0221 Debited Rs:180.00 on 18-08-2026 19:30:00 by Mob Bk ref no 127582266027, Fvg: Swiggy Avl Bal Rs:49501.00',
    description: 'Debit for Swiggy food delivery',
  },
  {
    sender: 'VA-UNIONB-T',
    text: 'Union Bank of India A/c *0221 Debited Rs:20.00 on 10-10-2026 19:09:29 by Mob Bk ref no 664900521937, Fvg: Dk bhel Avl Bal Rs:49481.00',
    description: 'Debit for Dk bhel (classified via User Learned Rule)',
  },
  {
    sender: 'JM-UNIONB-T',
    text: 'Union Bank of India A/c *0221 Credited for Rs.1000.00 on 10-10-2026 20:00:00 by Mob Bk Rev Tran 660156503565 Avl Bal Rs:50481.00',
    description: 'Credit refund / reversal',
  },
];

console.log(`Processing incoming SMS stream...\n`);

for (const item of incomingTestSmsList) {
  const parsed = parseSms(item.text, item.sender, Date.now());
  if (!parsed) {
    console.error(`Failed to parse: ${item.text}`);
    continue;
  }

  // 1. Classify
  const classification = classifyTransaction({
    merchantName: parsed.merchantName,
    payeeVpa: parsed.payeeVpa,
    rawNarration: item.text,
    channel: parsed.channel,
    type: parsed.type,
    ruleLookup: (vpa, merch) => {
      if (merch && simulatedState.userRules.has(merch.toLowerCase())) {
        return simulatedState.userRules.get(merch.toLowerCase());
      }
      return null;
    },
  });

  const categoryId = classification.categoryId || 'UNCLASSIFIED';

  // 2. Map to formed bucket
  let mappedBucket = null;
  if (classification.ruleMatch?.envelopeId) {
    mappedBucket = simulatedState.envelopes.find(e => e.id === classification.ruleMatch.envelopeId);
  } else {
    mappedBucket = simulatedState.envelopes.find((e) => {
      const nameLower = e.name.toLowerCase();
      if (categoryId === 'FOOD_DINING' && (nameLower.includes('food') || nameLower.includes('dining'))) return true;
      if (categoryId === 'GROCERIES' && nameLower.includes('grocer')) return true;
      if (categoryId === 'TRANSPORT' && (nameLower.includes('travel') || nameLower.includes('commute'))) return true;
      if (categoryId === 'SHOPPING' && nameLower.includes('shop')) return true;
      if (categoryId === 'BILLS_UTILITIES' && (nameLower.includes('bill') || nameLower.includes('util'))) return true;
      return false;
    });
  }

  // 3. Deduct/Credit bucket and live balance
  const amtRupees = toRupees(parsed.amountPaise);
  if (parsed.type === 'EXPENSE') {
    if (mappedBucket) {
      mappedBucket.currentAmount -= amtRupees;
    } else {
      // Deduct unallocated if unclassified
      const unalloc = simulatedState.envelopes.find(e => e.id === 'env_unallocated');
      if (unalloc) unalloc.currentAmount -= amtRupees;
    }
    simulatedState.trackedBalancePaise -= parsed.amountPaise;
  } else if (parsed.type === 'INCOME' || parsed.type === 'REVERSAL') {
    const unalloc = simulatedState.envelopes.find(e => e.id === 'env_unallocated');
    if (unalloc) unalloc.currentAmount += amtRupees;
    simulatedState.trackedBalancePaise += parsed.amountPaise;
  }

  // 4. Live append reported available balance
  if (parsed.balanceAfterPaise) {
    simulatedState.lastReportedBalancePaise = parsed.balanceAfterPaise;
  }

  console.log(`📩 INCOMING SMS: "${item.description}"`);
  console.log(`   • Merchant / Payee    : ${parsed.merchantName || 'N/A'}`);
  console.log(`   • Amount              : ₹${amtRupees.toFixed(2)} [${parsed.type}]`);
  console.log(`   • Classified Category : ${categoryId} (via ${classification.tier})`);
  console.log(`   • Target Bucket       : ${mappedBucket ? mappedBucket.name : 'Unallocated'}`);
  console.log(`   • LIVE VIEWED BALANCE : ₹${(simulatedState.trackedBalancePaise / 100).toFixed(2)}`);
  console.log(`   • LIVE BANK BALANCE   : ₹${(simulatedState.lastReportedBalancePaise / 100).toFixed(2)}`);
  console.log(`   ------------------------------------------------------------`);
}

console.log(`\nFinal Formed Buckets State after Ingestion:`);
for (const env of simulatedState.envelopes) {
  console.log(`  • ${env.name.padEnd(20)}: ₹${env.currentAmount.toFixed(2)}`);
}
console.log(`  • Final Tracked Balance : ₹${(simulatedState.trackedBalancePaise / 100).toFixed(2)}`);
console.log(`  • Final Bank Balance    : ₹${(simulatedState.lastReportedBalancePaise / 100).toFixed(2)}\n`);

// -------------------------------------------------------------
// PART 2: REAL-WORLD 5,497 SMS DATASET CLASSIFICATION PROOF
// -------------------------------------------------------------
console.log(`======================================================================`);
console.log(`--- PART 2: CLASSIFICATION AUDIT ON USER'S REAL 5,497 SMS EXPORT ---`);
console.log(`======================================================================\n`);

const raw = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split(/\r?\n/);
let headerIndex = -1;
for (let i = 0; i < Math.min(10, lines.length); i++) {
  if (lines[i].includes('DateTime') && lines[i].includes('Content')) {
    headerIndex = i;
    break;
  }
}

const records = [];
let currentRecord = '';
for (let i = headerIndex + 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim() && !currentRecord) continue;
  currentRecord = currentRecord ? `${currentRecord}\n${line}` : line;
  const quoteCount = (currentRecord.match(/"/g) || []).length;
  if (quoteCount % 2 === 0) {
    records.push(currentRecord);
    currentRecord = '';
  }
}

const categoryStats = new Map();
const bucketMatches = new Map();
let totalBankTxns = 0;
let totalWithLiveBalance = 0;

for (const record of records) {
  const cols = parseCSVLine(record);
  if (cols.length < 5) continue;
  const [dateTime, direction, contact, phone, content] = cols;
  if (!dateTime || dateTime < CUTOFF_DATE || direction !== 'Received') continue;

  const sender = contact || phone || '';
  const filter = isBookableFinancialMessage(content);
  if (!filter.isBookable) continue;

  const parsed = parseSms(content, sender, new Date(dateTime).getTime());
  if (!parsed) continue;

  totalBankTxns++;
  if (parsed.balanceAfterPaise && parsed.balanceAfterPaise > 0) {
    totalWithLiveBalance++;
  }

  const classification = classifyTransaction({
    merchantName: parsed.merchantName,
    payeeVpa: parsed.payeeVpa,
    rawNarration: content,
    channel: parsed.channel,
    type: parsed.type,
    ruleLookup: () => null,
  });

  const catId = classification.categoryId || 'UNCLASSIFIED';
  categoryStats.set(catId, (categoryStats.get(catId) || 0) + 1);

  // Bucket simulation
  let bucketName = 'Review Queue (Unclassified)';
  if (catId === 'FOOD_DINING') bucketName = 'Food & Dining';
  else if (catId === 'GROCERIES') bucketName = 'Groceries';
  else if (catId === 'TRANSPORT') bucketName = 'Travel & Commute';
  else if (catId === 'SHOPPING') bucketName = 'Shopping';
  else if (catId === 'BILLS_UTILITIES' || catId === 'ENTERTAINMENT') bucketName = 'Rent & Utilities';
  else if (catId === 'INCOME' || catId === 'REFUND') bucketName = 'Unallocated / Income';

  bucketMatches.set(bucketName, (bucketMatches.get(bucketName) || 0) + 1);
}

console.log(`Total Bookable Transactions in Date Window: ${totalBankTxns}`);
console.log(`Live Available Balance Extracted          : ${totalWithLiveBalance} / ${totalBankTxns} (${((totalWithLiveBalance/totalBankTxns)*100).toFixed(1)}%)`);

console.log(`\n--- Bucket Breakdown for Real Transactions ---`);
const sortedBuckets = Array.from(bucketMatches.entries()).sort((a, b) => b[1] - a[1]);
for (const [bucket, count] of sortedBuckets) {
  console.log(`  • ${bucket.padEnd(30)}: ${count} transactions (${((count / totalBankTxns) * 100).toFixed(1)}%)`);
}

console.log(`\n--- Taxonomy Category Breakdown ---`);
const sortedCats = Array.from(categoryStats.entries()).sort((a, b) => b[1] - a[1]);
for (const [cat, count] of sortedCats) {
  console.log(`  • ${cat.padEnd(25)}: ${count} transactions`);
}

console.log(`\n======================================================================\n`);
