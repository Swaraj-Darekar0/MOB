# MOB — Current State Audit & Verification Baseline (Milestone 0)

> **Audit Date:** 2026-10-10  
> **Repository:** MOB (React Native + Expo SDK 57)  
> **Target Scope:** Milestone 0 Audit per `MOB_IDE_Milestone_0_Audit_Prompt.md` & `MOB_Prioritized_Implementation_Plan_v2.md`  
> **Status:** AUDIT COMPLETE — Awaiting approval before Milestone 1 feature implementation

---

## 1. Executive Summary & Readiness Score

| Evaluation Dimension | Weight | Earned Points | Status |
|---|:---:|:---:|---|
| **1. Parser Grammar & Bank Coverage** | 20% | 11.5 / 20 | Partially Implemented (Synthetic suite 100%, Real device export 5.3% due to `Rs:` colon & `SBIUPI` header) |
| **2. Sender Trust & Financial Filtering** | 15% | 12.0 / 15 | Partially Implemented (47 trusted headers, strict OTP/promo filters; missing `SBIUPI` alias) |
| **3. Ledger Invariants & Integer-Paise Math** | 20% | 18.0 / 20 | Verified Working (Zero float math, deterministic hashing, SQLite schema with accounts & transactions) |
| **4. Native Ingestion & Android Runtime** | 15% | 4.0 / 15 | Blocked / Missing (Permissions declared, but native `content://sms/inbox` reader & background headless receiver absent) |
| **5. Buckets, Goal Buckets & Shortfall Recovery** | 20% | 7.0 / 20 | Missing (Standard envelopes exist; separate Goal Buckets, partial allocations & shortfall cards not implemented) |
| **6. Google Play Policy & Fallback Path** | 10% | 5.5 / 10 | Present but Unverified (Permissions declared; requires financial exception declaration & zero-permission fallback) |
| **OVERALL READINESS SCORE** | **100%** | **58.0%** | **MILESTONE 0 AUDIT COMPLETE** |

---

## 2. System Architecture & Exact Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CURRENT INGESTION & DATA FLOW                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 [Real-time SMS]              [Historical Inbox]              [In-App Payment Flow]
        │                             │                                 │
        ▼                             ▼                                 ▼
 (BroadcastReceiver)         (ContentResolver)                  payment/confirm.tsx
   *NOT IMPLEMENTED*          *SYNTHETIC ONLY*                   paymentService.ts
        │                             │                                 │
        └──────────────┬──────────────┘                                 ▼
                       │                                      insertPaymentAttempt()
                       ▼                                                │
         processIncomingSms()                                           │
      (smsIngestionService.ts)                                          │
                       │                                                │
     ┌─────────────────┴─────────────────┐                              │
     ▼                                   ▼                              │
1. Deduplicator                    2. Sender Trust                      │
   computeMessageHash()               evaluateSenderTrust()             │
   (SHA-256 hash match)               (DLT 6-char header check)         │
     │                                   │                              │
     └─────────────────┬─────────────────┘                              │
                       │                                                │
                       ▼                                                │
             3. Financial Filter                                        │
                isBookableFinancialMessage()                            │
                (Rejects OTP, Promos, Future Bills, Declined)           │
                       │                                                │
                       ▼                                                │
             4. Grammar Parser                                          │
                parseSms() ──► 8 Bank Grammar Parsers                   │
                (HDFC, SBI, ICICI, Axis, Kotak, Fed, IDFC, Generic)     │
                       │                                                │
                       ▼                                                │
             5. 3-Signal Correlator ◄───────────────────────────────────┘
                correlatePaymentWithSms()
                (Time delta + Amount paise + Payee/Ref matching)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
 [Match Found: In-App]          [No Match: External]
       │                               │
       ▼                               ▼
 updatePaymentAttempt(SUCCESS)  6. 7-Tier Lexical Classifier
 Deduct from mapped envelope       classifyTransaction()
                                (VPA Rules -> Dictionary -> Keywords)
                                       │
                                       ▼
 7. Local SQLite Ledger Update (database.ts)
    ├── insertTransaction() [amount_paise, balance_after_paise, type, channel]
    ├── insertTransactionMessage() [message_hash unique]
    ├── updateAccountBalances() [tracked_balance_paise, last_reported_balance_paise]
    └── insertLedgerEvent() [PAYMENT_SUCCESS / REFUND / ADJUSTMENT]
                       │
                       ▼
 8. Presentation Layer (React Native / Zustand)
    ├── BalanceHeader.tsx [Tracked Balance, Allocated, Unallocated, Reconciled/Mismatch]
    └── activity.tsx [Activity & Ledger Audit Trail, Payment Receipts]
```

---

## 3. Comprehensive Capability Assessment Matrix

| Capability | Current Status | Evidence (File + Symbol) | Tests Run & Result | Gap to Target Spec | Risk | Recommendation |
|---|---|---|---|---|:---:|---|
| **Initial SMS History Scan** | **Missing** | `src/services/sms/native/smsReader.ts#requestSmsPermission` | Manual code inspection: returns `SYNTHETIC_TEST_FIXTURES` | No Android ContentResolver bridge to query `content://sms/inbox` | **High** | Implement native Turbomodule / Expo native module for inbox query |
| **Incoming SMS Capture** | **Blocked / Missing** | `plugins/withAndroidSms.js` | Inspect Android Manifest plugin | Manifest has permissions, but no native `BroadcastReceiver` or headless task exists | **High** | Implement Android BroadcastReceiver or rely on app-resume polling |
| **App-Resume Reconciliation** | **Partially Implemented** | `src/services/sms/reconciliation/balanceReconciler.ts#reconcileBalances` | Unit test passed (100%) | Triggered on demand; not hooked into `AppState.addEventListener('change')` | **Medium** | Wire `reconcileBalances` to AppState resume event in root layout |
| **Parser Templates & Validation** | **Partially Implemented** | `src/services/sms/parser/index.ts#parseSms` | `test-sms-regression.mjs` (172/172 pass); Real device benchmark (5.3% pass) | Union Bank `Rs:` colon & SBI UPI `JD-SBIUPI-S` missing; `Fvg:` beneficiary missing | **High** | Expand grammar regexes for `Rs:` and add Union Bank / SBI UPI grammar |
| **Transaction Deduplication** | **Verified Working** | `src/services/sms/reconciliation/deduplicator.ts#computeMessageHash` | Unit test passed; SQLite unique constraint on `message_hash` | Fully deterministic SHA-256 hash incorporating sender, normalized body, timestamp | **Low** | Reuse as-is |
| **Reported Bank Balance Handling** | **Verified Working** | `src/services/sms/reconciliation/balanceReconciler.ts` | Unit tests verify sub-10 paise tolerance & mismatch flags | Handles `balanceAfterPaise`, tracks variance, displays reconciliation banner | **Low** | Reuse as-is |
| **Transaction Categorization** | **Verified Working** | `src/services/sms/categorization/classifier.ts#classifyTransaction` | Tested across 7 tiers (Swiggy, Blinkit, Uber, Salary, Cash) | 22 system categories, 150+ merchant dictionary entries, user VPA overrides | **Low** | Reuse as-is |
| **User Correction / Review Queue** | **Partially Implemented** | `src/app/activity.tsx` | UI inspection | Displays audit details & categories, but lacks batch unclassified review workflow | **Medium** | Add dedicated review batch card/sheet for `UNCLASSIFIED` items |
| **Normal Buckets / Envelopes** | **Verified Working** | `src/app/(tabs)/index.tsx`, `database.ts#getEnvelopes` | CRUD, allocations, zero-sum unallocated balance working | Implements virtual envelope model with integer-paise math | **Low** | Reuse as-is |
| **Goal Buckets & Goal Creation** | **Missing** | `src/types/index.ts` | Code inspection | No separate Goals tab, no Goal Bucket entity, no target/cadence schedule | **High** | Add Goals section, Goal Buckets, and installment planner in Phase 3 |
| **Automatic Partial Allocations** | **Missing** | N/A | Code inspection | No scheduled due-date worker; no partial allocation from Unallocated | **High** | Implement deterministic schedule evaluator with partial funding default |
| **Shortfall Cards & Recovery** | **Missing** | N/A | Code inspection | No shortfall card or cross-bucket transfer confirmation dialog | **High** | Build shortfall UI modal with clear virtual impact before user confirm |
| **Local Persistence & Migrations** | **Verified Working** | `src/services/db/database.ts` | SQLite schema with 10 tables, indexes, paise integers | Stores accounts, transactions, payment attempts, rules, envelopes, ledger | **Low** | Reuse as-is |
| **Google Pay Intent Launch & Invariants** | **Verified Working** | `src/services/payment/uriBuilder.ts`, `confirm.tsx` | `test-upi-uri.mjs` (15/15 pass) | Prevents VPA name mismatch, preserves standee signatures, Assisted Mode | **Low** | Reuse as-is |

---

## 4. Real-World SMS Benchmark Report (5,497 Device Messages)

### 4.1 Methodology & Filter Range
- **Source Dataset:** `docs/All Conversations 2026-10-10 170924.csv` (Device export from Android SMS Exporter).
- **Date Window Filter:** Messages on or after **`2026-07-10 00:00:00`** (last 3 calendar months). Older messages excluded per user instructions.
- **Total Export Records:** 5,497
- **Records in 3-Month Window:** 570
- **Received SMS:** 565 | **Sent SMS:** 5
- **Unique Senders in Range:** 148

### 4.2 Benchmark Execution Results

```
======================================================
📊 REAL-WORLD BENCHMARK RESULTS (JUL 10 – OCT 10, 2026)
======================================================
1. Sender Trust Classification:
   - Trusted Financial Bank Senders: 280 messages (49.6%)
   - Untrusted / Promo / Personal Senders: 285 messages (50.4%)
   
   Top Trusted Bank Headers in Real Dataset:
   • VA-UNIONB-T / JK-UNIONB-T / JM-UNIONB-T (Union Bank): 231 messages
   • JD-SBIUPI-S / JK-SBIUPI-S / JX-SBIUPI-S (SBI UPI):      30 messages (Classified UNTRUSTED!)
   • kotak811_... via Google RBM:                            7 messages
   • JM-JIOPAY-S (JioPay):                                   6 messages

2. Financial Filter Analysis:
   - Passed (Bookable candidates): 38 messages
   - Rejected: 527 messages
     • NO_AMOUNT_FOUND: 432 (False Negatives: Union Bank "Rs:15.00")
     • OTP_OR_VERIFICATION: 72 (Accurate True Negatives)
     • NO_ACCOUNT_OR_UPI_CONTEXT: 15 (Accurate)
     • PROMOTIONAL_OFFER: 6 (Accurate)
     • UNCERTAIN_DIRECTION: 2 (Accurate)

3. Parser Accuracy on Candidates:
   - Successfully Parsed: 2 messages
   - Missed / Failed: 36 messages
   - Conversion Rate on Real Data: 5.3%
```

### 4.3 Root Cause of Real-World Gaps & Required Fixes

1. **The Colon Currency Bug (`Rs:`, `Rs.:` vs `Rs.`):**
   - *Observation:* Union Bank of India (the user's primary bank in this dataset) formats amounts as:
     `"Union Bank of India A/c *0221 Debited Rs:15.00 on 26-07-2026 19:15:33 by Mob Bk ref no 620716460969, Fvg: RAMA JAR Avl Bal Rs:4727.42"`
   - *Root Cause:* `financialFilter.ts`'s regex `/(?:rs\.?|inr|₹)\s*[\d,]+/` required either `rs` or `rs.` followed by whitespace. The colon `:` caused **200+ legitimate transactions** to fail with `NO_AMOUNT_FOUND`.
   - *Fix:* Update currency regex across filter and parsers to `/(?:rs\.?|rs:|inr|₹)\s*[\d,]+/i`.

2. **SBI UPI DLT Header Alias Missing (`SBIUPI`):**
   - *Observation:* 30 real credit notifications came from `JD-SBIUPI-S`, `JK-SBIUPI-S`, `JX-SBIUPI-S`:
     `"Dear SBI User, your A/c X0221-credited by Rs.80 on 13Jul26 transfer from ATHARV ASHOK DARKE Ref No 619438089398 -SBI"`
   - *Root Cause:* `senderTrust.ts` had `SBIINB`, `SBMSMS`, `SBIPAY`, but lacked `SBIUPI`. The sender trust gate rejected all 30 messages as `UNTRUSTED`.
   - *Fix:* Add `SBIUPI` to `SBIINB` aliases in `senderTrust.ts`.

3. **Beneficiary Extraction via `Fvg:` (Favouring):**
   - *Observation:* Union Bank specifies the payee as `Fvg: RAMA JAR`, `Fvg: SPOTIFY`, `Fvg: Blinkit`.
   - *Fix:* Add `Fvg:\s*([^,.\n]+)` pattern to merchant normalizer.

---

## 5. Native Runtime, Background & Platform Realities

1. **Foreground Runtime:**
   - When the user has the app open, all JavaScript code runs synchronously. Ingesting, parsing, deduplication, and UI updates work properly.
2. **Background / JS Inactive Reality:**
   - **No code currently runs in the background.** `withAndroidSms.js` injects permissions into `AndroidManifest.xml`, but does **not** register an Android `<receiver>` or headless JS task.
   - When Android puts the app to sleep or kills the process, incoming SMS will **not** be intercepted in real time.
3. **App-Resume Strategy:**
   - The verified, battery-efficient, and policy-compliant strategy for V1 is **App-Resume Ingestion**:
     Whenever the app returns to foreground (`AppState === 'active'`), query the recent SMS inbox for messages received since the last synced timestamp, deduplicate via `message_hash`, and reconcile balances.

---

## 6. Google Play Store Policy & Release Feasibility Gate

- **Policy Status:** `READ_SMS` and `RECEIVE_SMS` are classified as **High-Risk / Restricted Permissions** by Google Play.
- **Eligibility:** Under Google Play's Financial SMS policy update, apps providing **personal financial management** may qualify for an exception, but require:
  1. Prominent in-app disclosure before requesting permission.
  2. Play Console declaration video demonstrating core financial features.
  3. Strict zero-cloud privacy guarantee (all processing on-device).
- **Mandatory Release Fallback Path (Zero-Permission Mode):**
  If the user denies SMS permission or Google Play rejects the declaration:
  - App allows manual account balance entry.
  - User can manually log transactions or import exported CSV/statements.
  - Virtual envelopes, goal planning, and Assisted Transfer UPI payments work completely offline without permissions.

---

## 7. Baseline Test & Build Status

- **TypeScript Compilation:** `npx tsc --noEmit` ── **0 errors (PASSED)**
- **UPI URI & Merchant Invariant Suite:** `npx tsx scripts/test-upi-uri.mjs` ── **15 / 15 Passed (100%)**
- **SMS Parser Regression Suite:** `npx tsx scripts/test-sms-regression.mjs` ── **172 / 172 Passed (100%)**
- **Real Device SMS Benchmark Suite:** `npx tsx scripts/benchmark-real-sms.mjs` ── **Executed against 570 real messages; identified 3 concrete grammar gaps.**

---

## 8. Not Safe to Proceed Until (Critical Blockers)

1. **Fix Real-Device Parser Regressions:**
   - Update `financialFilter.ts` and `normalizer.ts` to support `Rs:` colon amounts and `Fvg:` beneficiary tags.
   - Add `SBIUPI` to `senderTrust.ts`.
   - Implement dedicated `parseUnionBankSms` parser.
2. **User Review & Approval of Milestone 0 Audit:**
   - In accordance with `MOB_IDE_Milestone_0_Audit_Prompt.md`, stop and obtain user confirmation before writing Milestone 1 feature code (Goal Buckets, automated schedule replanner, shortfall recovery).
