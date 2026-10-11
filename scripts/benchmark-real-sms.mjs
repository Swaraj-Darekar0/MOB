import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSms } from '../src/services/sms/parser/index.ts';
import { evaluateSenderTrust } from '../src/services/sms/trust/senderTrust.ts';
import { isBookableFinancialMessage } from '../src/services/sms/filter/financialFilter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, '../docs/All Conversations 2026-10-10 170924.csv');

// Cutoff: 3 months back from 2026-10-10 -> 2026-07-10
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

function runBenchmark() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/);
  
  // Find header row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('DateTime') && lines[i].includes('Content')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Could not find CSV header row');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`📊 REAL-WORLD SMS BENCHMARK HARNESS`);
  console.log(`Analyzing messages from: >= ${CUTOFF_DATE}`);
  console.log(`======================================================\n`);

  let totalRows = 0;
  let inDateRange = 0;
  let receivedCount = 0;
  let sentCount = 0;

  const senderCounts = new Map();
  const bankSenders = new Map();
  const filterRejections = new Map();
  let filterPassed = 0;
  let parsedSuccess = 0;
  let parsedFailed = 0;
  let balanceCount = 0;
  const allParsedTxns = [];

  const sampleFilterRejections = [];
  const sampleParserFailures = [];
  const sampleSuccesses = [];

  // Reconstruct multiline CSV records
  const records = [];
  let currentRecord = '';

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && !currentRecord) continue;
    
    currentRecord = currentRecord ? `${currentRecord}\n${line}` : line;
    
    // Count quotes to check if record is complete
    const quoteCount = (currentRecord.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      records.push(currentRecord);
      currentRecord = '';
    }
  }

  totalRows = records.length;

  for (const record of records) {
    const cols = parseCSVLine(record);
    if (cols.length < 5) continue;

    const [dateTime, direction, contact, phone, content] = cols;
    if (!dateTime || dateTime < CUTOFF_DATE) {
      continue;
    }

    inDateRange++;

    if (direction === 'Received') {
      receivedCount++;
    } else {
      sentCount++;
      continue; // Skip sent messages
    }

    const sender = contact || phone || 'UNKNOWN';
    senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);

    const trust = evaluateSenderTrust(sender);
    if (trust.isTrusted) {
      bankSenders.set(sender, (bankSenders.get(sender) || 0) + 1);
    }

    const filter = isBookableFinancialMessage(content);
    if (!filter.isBookable) {
      const reason = filter.rejectReason || 'UNKNOWN';
      filterRejections.set(reason, (filterRejections.get(reason) || 0) + 1);
      
      // If sender was trusted bank but filter rejected, save sample for analysis
      if (trust.isTrusted && sampleFilterRejections.length < 10) {
        sampleFilterRejections.push({
          sender,
          bankName: trust.bankName,
          reason,
          content: content.replace(/\r?\n/g, ' ').substring(0, 140),
        });
      }
    } else {
      filterPassed++;
      // Now test full parseSms
      const parsed = parseSms(content, sender, new Date(dateTime).getTime());
      if (parsed) {
        parsedSuccess++;
        if (parsed.balanceAfterPaise !== undefined && parsed.balanceAfterPaise > 0) {
          balanceCount++;
        }
        allParsedTxns.push({
          dateTime,
          sender,
          parsed,
          content,
        });
        if (sampleSuccesses.length < 10) {
          sampleSuccesses.push({
            sender,
            amountPaise: parsed.amountPaise,
            type: parsed.type,
            merchant: parsed.merchantName,
            account: parsed.accountLast4,
            balance: parsed.balanceAfterPaise,
            content: content.replace(/\r?\n/g, ' ').substring(0, 100),
          });
        }
      } else {
        parsedFailed++;
        if (sampleParserFailures.length < 15) {
          sampleParserFailures.push({
            sender,
            bankName: trust.bankName,
            content: content.replace(/\r?\n/g, ' ').substring(0, 140),
          });
        }
      }
    }
  }

  console.log(`Total CSV Records: ${totalRows}`);
  console.log(`Records in Date Range (>= ${CUTOFF_DATE}): ${inDateRange}`);
  console.log(`Received SMS: ${receivedCount}, Sent SMS: ${sentCount}`);
  console.log(`Unique Senders in Range: ${senderCounts.size}`);
  console.log(`Messages from Trusted Financial Senders: ${Array.from(bankSenders.values()).reduce((a, b) => a + b, 0)}`);
  console.log(`\n--- Top 25 Senders in Range (Received) ---`);
  const sortedSenders = Array.from(senderCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [s, c] of sortedSenders.slice(0, 25)) {
    const t = evaluateSenderTrust(s);
    console.log(`   - ${s} [${t.isTrusted ? t.bankName : 'UNTRUSTED'}]: ${c} msgs`);
  }

  console.log(`\n--- Financial Filter Performance ---`);
  console.log(`Filter Passed (Bookable candidates): ${filterPassed}`);
  console.log(`Filter Rejected: ${Array.from(filterRejections.values()).reduce((a, b) => a + b, 0)}`);
  console.log(`Rejection Reasons Breakdown:`);
  const sortedRejections = Array.from(filterRejections.entries()).sort((a, b) => b[1] - a[1]);
  for (const [r, c] of sortedRejections) {
    console.log(`   - ${r}: ${c}`);
  }

  console.log(`\n--- Parser Accuracy on Filtered Candidates ---`);
  console.log(`Successfully Parsed: ${parsedSuccess}`);
  console.log(`Failed / Missed: ${parsedFailed}`);
  if (filterPassed > 0) {
    console.log(`Parse Conversion Rate: ${((parsedSuccess / filterPassed) * 100).toFixed(1)}%`);
  }
  console.log(`\n--- Available Account Balance Extraction ---`);
  console.log(`Transactions with Live Account Balance: ${balanceCount} / ${parsedSuccess} (${((balanceCount / parsedSuccess) * 100).toFixed(1)}%)`);

  // Sort chronologically
  allParsedTxns.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  console.log(`\n======================================================`);
  console.log(`💰 LATEST ACCOUNT BALANCE PER BANK & ACCOUNT`);
  console.log(`======================================================`);
  
  const accountLatest = new Map();
  for (const t of allParsedTxns) {
    const key = `${t.parsed.bankName || 'Unknown Bank'} (A/c *${t.parsed.accountLast4 || 'N/A'})`;
    accountLatest.set(key, t);
  }

  for (const [acc, t] of accountLatest.entries()) {
    console.log(`\nAccount: ${acc}`);
    console.log(`Last Transaction Date: ${t.dateTime}`);
    console.log(`Last Transaction: [${t.parsed.type}] ₹${(t.parsed.amountPaise / 100).toFixed(2)} to/from ${t.parsed.merchantName || 'N/A'}`);
    if (t.parsed.balanceAfterPaise) {
      console.log(`CURRENT REPORTED BALANCE: ₹${(t.parsed.balanceAfterPaise / 100).toFixed(2)} (${t.parsed.balanceAfterPaise} paise)`);
    } else {
      console.log(`Reported Balance in last SMS: Not provided in SMS body`);
    }
    console.log(`Last SMS Snippet: "${t.content.replace(/\r?\n/g, ' ')}"`);
  }

  console.log(`\n--- Most Recent 5 Bank Transactions ---`);
  for (const t of allParsedTxns.slice(-5)) {
    const balStr = t.parsed.balanceAfterPaise ? `Avl Bal: ₹${(t.parsed.balanceAfterPaise / 100).toFixed(2)}` : 'No Bal in SMS';
    console.log(`${t.dateTime} | ${t.parsed.bankName} *${t.parsed.accountLast4 || 'N/A'} | [${t.parsed.type}] ₹${(t.parsed.amountPaise / 100).toFixed(2)} | ${balStr} | ${t.parsed.merchantName || ''}`);
  }

  console.log(`\n--- Sample Successfully Parsed Real Transactions ---`);
  for (const s of sampleSuccesses) {
    console.log(`[${s.type}] ₹${(s.amountPaise / 100).toFixed(2)} | Acc: *${s.account || 'N/A'} | Merch: ${s.merchant || 'N/A'} | Bal: ${s.balance ? '₹' + (s.balance / 100).toFixed(2) : 'N/A'}`);
    console.log(`   Snippet: "${s.content}"`);
  }

  console.log(`\n--- Sample Filter Rejections from Trusted Banks ---`);
  for (const f of sampleFilterRejections) {
    console.log(`[${f.reason}] ${f.sender} (${f.bankName || 'N/A'}): "${f.content}"`);
  }

  console.log(`\n--- Sample Parser Failures (Filter Passed, but Parser Missed) ---`);
  for (const p of sampleParserFailures) {
    console.log(`[PARSER_MISSED] ${p.sender} (${p.bankName || 'N/A'}): "${p.content}"`);
  }

  console.log(`\n======================================================\n`);
}

runBenchmark();
