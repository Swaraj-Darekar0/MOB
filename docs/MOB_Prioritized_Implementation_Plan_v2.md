# MOB — Prioritized Engineering Implementation Plan

**Purpose:** Give the IDE coding model a repository-aware, test-first plan for extending the existing MOB React Native + Expo application with reliable SMS transaction processing, a local financial ledger, regular buckets, separate goal buckets, automatic partial virtual allocations, shortfall recovery, dynamic goal replanning, and review notifications.

**Product decision:** V1 is a deterministic on-device financial tracking and goal-planning system. No in-app chat interface, bundled LLM, cloud model, Gemini/Siri assistant integration, or automatic bank transfer is required for this work. System-assistant integrations are future scope only.

**Non-negotiable instruction:** Extend the existing project. Do not create a second app, replace existing screens without evidence, reset user data, or integrate new functionality before completing the audit and readiness gates below.

---

# 0. First action — audit the existing project and SMS parser before changing anything

This is the first task for the IDE model. **Do not start feature implementation until the audit report is complete.** The team does not yet have a verified repository-state report in this plan, so the current implementation status must be discovered from the actual checkout. Do not claim a feature exists merely because it appears in an earlier specification.

## 0.1 Repository reconnaissance

Inspect the repository before editing files. Identify the existing equivalents for each responsibility; use their real paths and names in the report.

1. Project structure, package manager, Expo SDK, React Native version, TypeScript configuration, navigation, existing screens, state management, shared components and design system.
2. Current persistent storage/database, schema, migration mechanism, repository/service layer and whether state survives process death/restart.
3. Existing SMS permissions, Android manifest/config plugins/native modules, SMS inbox/history access, SMS receive listener/receiver, background task implementation, notification support and app-resume hooks.
4. Every file that parses SMS, extracts balance/amount/date/merchant/debit-credit/reference, categorizes transactions, deduplicates messages, updates balance, creates transactions or assigns bucket categories.
5. Existing balance, transaction, bucket/envelope and goal models; existing screens or flows for adding/editing buckets and reviewing transactions.
6. Existing tests, sample SMS fixtures, test scripts, lint/typecheck/build commands, CI and current known failures.
7. Platform behavior: what currently runs in foreground, on resume, while the app is backgrounded, after process death, after device reboot, and after force-stop. Separate verified behavior from assumptions.
8. App distribution requirements: current Android permissions declared, Android target SDK, Google Play declaration/policy status if known, iOS capabilities and any known blocker to broad SMS history access.

## 0.2 Produce the audit report in this format

Create `docs/MOB_CURRENT_STATE_AUDIT.md` (or the project's established documentation location). Include a concise architecture diagram and this matrix:

| Capability | Current status | Evidence (file + function/class) | Tests run and result | Gap to desired behavior | Risk | Recommendation |
|---|---|---|---|---|---|---|
| Initial SMS history scan | Verified / partial / missing / unknown | Exact repository path and symbols | Commands/fixtures and result | Gap | High/medium/low | Reuse/fix/add |
| Incoming SMS capture | ... | ... | ... | ... | ... | ... |
| App-resume reconciliation | ... | ... | ... | ... | ... | ... |
| Parser templates and validation | ... | ... | ... | ... | ... | ... |
| Transaction deduplication | ... | ... | ... | ... | ... | ... |
| Reported bank-balance handling | ... | ... | ... | ... | ... | ... |
| Transaction categorization | ... | ... | ... | ... | ... | ... |
| User correction/review queue | ... | ... | ... | ... | ... | ... |
| Normal buckets | ... | ... | ... | ... | ... | ... |
| Goal buckets and goal creation | ... | ... | ... | ... | ... | ... |
| Local persistence and migrations | ... | ... | ... | ... | ... | ... |
| Notifications/deep links | ... | ... | ... | ... | ... | ... |
| Goal scheduler and re-planning | ... | ... | ... | ... | ... | ... |
| Invariant/property/integration tests | ... | ... | ... | ... | ... | ... |

Classify each feature as one of:

- **Verified working** — source code inspected and a relevant test or repeatable device test passes.
- **Partially implemented** — implementation exists but has missing paths or failed tests.
- **Present but unverified** — code appears to exist, but evidence is insufficient.
- **Missing** — no current implementation found.
- **Blocked** — external policy, platform capability, build configuration or unknown dependency prevents confirmation.

End the report with:

- Current overall readiness: `0–100%` **with the scoring rubric shown**. This is an engineering estimate, not a claim of production completeness.
- Critical blockers.
- What can be reused as-is.
- What should be refactored.
- What must be added.
- What should not be touched.
- Recommended phase order based on dependencies discovered.
- Exact test/build commands executed and logs for failures.

Do not fabricate percentages or green checks. A feature without evidence is unverified, not complete.

## 0.3 Baseline tests before any new functionality

Run the current project's available commands before modifying code: typecheck, lint, unit tests, test build and any existing integration tests. Record existing failures so that they are not confused with regressions introduced by this work. If a command does not exist, record it as unavailable rather than silently skipping it.

Review the SMS parser with a fixture audit before expanding it. Collect and anonymize test fixtures for each bank/message format the app currently supports. Test amount parsing, debit/credit direction, transaction date vs message-arrival date, merchant extraction, reference/UTR extraction, reported post-transaction balance, failed transaction messages, refunds/reversals, transfers and duplicate notification messages. Never commit real personal SMS or account data to the repository.

## 0.4 Release-critical SMS feasibility gate

**Do not assume broad Android SMS permission access is automatically permitted for MOB.** Google Play's current restricted-permission documentation says SMS permissions require the app to be the designated default SMS or Assistant handler, while its SMS-permission policy page separately lists “SMS-based money management” as a use case that may qualify subject to review/approval. Resolve the applicable policy path for this exact product in Play Console/current policy before adding or shipping `READ_SMS` / `RECEIVE_SMS`. Record the decision and evidence in the audit. Official references:

- https://support.google.com/googleplay/android-developer/answer/16558241?hl=en-IN
- https://support.google.com/googleplay/android-developer/answer/10208820?hl=en-en

This is a **P0 release gate**, not a small implementation detail. Do not add restricted permissions as placeholders while eligibility is unresolved. Respect permission denial and provide a useful fallback such as manual starting balance and manual transaction entry or supported statement import. Do not claim the fallback has automatic inbox tracking.

Expo's custom native code and platform configuration require a development build rather than relying on Expo Go. Re-evaluate the app's native configuration before choosing the implementation. https://docs.expo.dev/workflow/customizing/

---

# 1. Product scope and boundaries

MOB is a local-first virtual money-allocation application. It uses available bank SMS and user input to maintain a best-effort record of actual bank balance and to show how that money has been virtually assigned. Allocation does **not** move money at the bank.

## In scope for this plan

1. Audit and strengthen current SMS parsing and financial history ingestion.
2. Maintain a reconciled local financial ledger.
3. Keep ordinary spending/savings buckets separate from Goal Buckets.
4. Parse and classify eligible transactions deterministically; queue ambiguous cases for review.
5. Show review cards in-app and notifications when review is needed in the background.
6. Let the user create a goal in a separate Goals section/tab with a target amount, name and deadline.
7. Generate daily, weekly or monthly schedules using exact calendar dates and integer-paise arithmetic.
8. Automatically transfer as much as is safely available from Unallocated into a Goal Bucket on each due date—**partial allocation is the confirmed default**.
9. Notify the user about the amount of a shortfall and offer a button to move money from other already-allocated ordinary buckets or Goal Buckets.
10. Recalculate the affected goal plan whenever its balance, remaining dates, transaction history or funding changes.
11. If moving from another Goal Bucket, update and re-evaluate the source goal as well as the destination goal.
12. Keep all core calculations deterministic and on-device; no chat model is needed.

## Out of scope

- Giving subjective or open-ended advice such as “Should I spend more this week?”
- A conversational chatbot as the primary interface.
- A custom/tiny LLM in V1.
- Gemini/Siri/Apple Intelligence/AppFunctions/App Intents integrations in this implementation phase.
- Executing UPI/bank transfers or claiming that virtual allocations move real bank money.
- Guaranteed real-time processing when Android has stopped or restricted app execution.
- Sending raw SMS or the financial ledger to a backend/cloud service.

---

# 2. Financial model and invariants — freeze these before planner implementation

## 2.1 Distinguish real bank cash from virtual allocations

Maintain separate values for:

- **Observed bank balance:** latest reliable bank-reported balance or a user-confirmed baseline adjusted by validated transactions; store its timestamp and confidence/coverage.
- **Unallocated balance:** virtual money not assigned to a regular bucket or a Goal Bucket.
- **Regular bucket balances:** for example Food, Rent & Utilities, Travel and Savings.
- **Goal Bucket balances:** one dedicated virtual bucket per goal, e.g. Goa Trip.
- **Unclassified/reconciliation suspense:** amount whose category or reconciliation is pending. It must not look like ordinary spendable money.
- **Reconciliation variance:** a discrepancy that cannot yet be safely explained by parsed SMS, pending transactions or incomplete account coverage.

When all financial events and categories are reconciled, enforce:

`Unallocated + sum(regular buckets) + sum(goal buckets) + signed suspense/reconciliation account = tracked bank balance`

Use a formally defined sign convention for suspense/variance. Do not silently force the ledger to match a new bank snapshot by changing a user's buckets.

A bank debit lowers actual bank cash. Its category attribution should lower the selected bucket. If the category is unknown, record it exactly once in the suspense/review ledger and keep it outside spendable funds until resolved. If a bucket does not have enough money for a real-world debit, show overspending/negative bucket status explicitly; do not hide the debit or silently borrow from another bucket.

## 2.2 A virtual goal contribution is an internal transfer

On a scheduled contribution:

- Unallocated decreases by the allocated amount.
- Destination Goal Bucket increases by the same amount.
- Overall virtual allocation stays unchanged.
- Observed bank balance does not change because this is not a bank transaction.
- The event is stored exactly once, with the schedule-installment ID and reason.

When the user moves money from an already-allocated bucket into a Goal Bucket:

- Source bucket decreases by the transferred amount.
- Destination Goal Bucket increases by exactly the same amount.
- Overall virtual allocation and bank balance are unchanged.
- Both affected goals/schedules are recalculated if the source or destination is a goal.

## 2.3 Money and date correctness

- Store INR amounts as integer **paise**, never binary floating-point currency.
- Convert to rupees only for display.
- Store transaction occurrence time separately from SMS arrival/processing time.
- Persist the selected local time zone and schedule/calendar policy used for goal dates.
- Define a fixed installment-rounding rule and assert each valid schedule sums exactly to the remaining target.
- Ensure stable date handling around month ends, leap days, daylight-saving changes where applicable, device time-zone changes and deadline boundaries.

## 2.4 Idempotency and auditability

- A given SMS/provider event must affect money once only, even if processed by multiple paths (receiver, worker, app-resume scan).
- Each scheduled installment is uniquely identified by goal ID + schedule version + due date (or equivalent stable key).
- Repeated execution cannot allocate twice.
- Corrections create a ledger correction/reclassification event; do not silently erase history.
- Database writes that update events, transaction state and bucket balances must be atomic.

## 2.5 User controls

- Auto-contributions are virtual allocations only and require explicit activation consent.
- Partial allocation is enabled by default once the user activates an automatic goal plan.
- MOB may use available Unallocated money for the scheduled amount but must not silently take money from regular or other goal buckets.
- Any cross-bucket transfer is user-initiated through the shortfall card and requires confirmation before commit.
- Transfers from another Goal Bucket must show that goal's reduced balance and revised plan before the user confirms.
- The user can pause/resume a goal, change its cadence, edit target/deadline, cancel/complete it or move money explicitly.

---

# 3. Proposed project architecture — adapt to existing code rather than duplicate it

The IDE model must map the following logical responsibilities to current repository paths and reuse current implementations where possible. Do not create duplicate balance stores or parallel bucket services.

## React Native UI

- Existing dashboard: observed bank balance, Unallocated money, last sync time, data coverage and review count.
- Existing ordinary Buckets area: Food, Rent, Savings, Travel and other normal allocations.
- **Separate Goals tab/section:** list of goals, status, current amount, amount remaining, deadline, next installment and current plan status.
- Goal creation/edit flow distinct from ordinary bucket creation. Creating a goal creates/links its dedicated Goal Bucket and schedule; it must not create a normal spending bucket accidentally.
- Goal detail: progress, selected cadence, next contribution date/amount, amount already contributed, shortfalls, plan history/recalculation explanation, pause/edit controls.
- Shortfall card/modal: expected installment, partial amount allocated, amount short, unallocated balance and due date; actions `Move money` and `Not now`/dismiss.
- Source-bucket transfer sheet: list eligible source buckets, distinguish ordinary buckets from Goal Buckets, display source balance before/after, destination goal balance after transfer and any source-goal plan impact.
- Transaction review queue: batch pending classification items, not one stacked modal per SMS.
- Local notification deep link: open the correct review queue item or goal shortfall.

The examples above are responsibilities, not mandatory route/component names. Preserve existing navigation conventions after the audit.

## Deterministic domain layer

Reuse or add equivalents of:

- `SmsIngestionService`
- `BankSmsParserRegistry`
- `TransactionNormalizer`
- `TransactionDeduplicator`
- `CategorizationRulesEngine`
- `FinancialLedgerService`
- `BalanceReconciliationService`
- `FinancialProfileService`
- `BucketTransferService`
- `GoalScheduleEngine`
- `GoalContributionExecutor`
- `GoalFeasibilityEvaluator`
- `GoalReplanner`
- `ReviewQueueService`
- `NotificationCoordinator`

Pure calculation functions should not depend on React components, navigation or global UI state. The UI should call domain/repository methods, not rewrite financial rules inline.

## Persistent storage

Use the existing local DB if the audit shows it is adequate. If not, evaluate Expo SQLite for the shared app database; it persists across app restarts on supported platforms: https://docs.expo.dev/versions/latest/sdk/sqlite/.

If native Android background code must process SMS while the React Native runtime is inactive, define one authoritative persistence contract. A native Kotlin path and JS path must not independently maintain competing balances. Decide database ownership and transaction semantics in P0. If native code and JS share SQLite, prove schema/version, concurrent writes, locking/transaction and migrations through integration tests.

---

# 4. Priority phases and exit gates

## P0 — Audit and feasibility (no feature changes until report)

**Deliverables**

1. `docs/MOB_CURRENT_STATE_AUDIT.md`.
2. SMS parser/fixture coverage inventory.
3. Baseline typecheck/lint/tests/build result.
4. App lifecycle/background behavior matrix.
5. Current policy/platform feasibility decision for SMS inbox access.
6. A proposed integration map naming exact existing files to reuse/modify and genuinely new files.

**Exit gate**

Do not continue until the owner has reviewed the audit and there is a credible path to the required SMS data. The model may propose code-level improvements, but it must not start implementing goal automation while the current balance/parser source of truth is unknown.

## P1 — Ledger correctness and migration safety

**Goal:** Make the current financial state trustworthy before automatic contributions.

- Inspect the current schema and retain compatible parts.
- Define or map entities: `SmsInboxEvent`, `Transaction`, `BankBalanceSnapshot`, `Bucket`, `Goal`, `LedgerEvent`, `GoalSchedule`, `ReviewItem`, `CategorizationRule`, `SyncCheckpoint`, `ReconciliationEvent`.
- Add only entities/columns missing from the current schema; avoid duplicate concepts.
- Use migrations that preserve all existing user data.
- Add atomic repository methods for credit/debit posting, internal bucket transfer, reclassification and goal contribution.
- Add invariant checks and idempotency keys.
- Add a documented opening-balance/baseline path.

**Tests before proceeding**

- Data survives restart and migration.
- Replaying an identical event has no additional effect.
- Every internal transfer has balanced source/destination entries.
- Bank-reported balance changes do not get counted as a second credit/debit if the original transaction SMS has already been applied.
- Reconciliation mismatch is surfaced, not silently corrected.

**Exit gate:** ledger invariants, idempotency and migration tests pass.

## P2 — SMS parser audit, hardening and ingestion

**Goal:** Build on the existing parser rather than starting a replacement before understanding it.

### Initial history import

- Default lookback for the first plan may be approximately 60 days, as agreed, but make the period configurable internally and record the actual coverage.
- Import only messages necessary for permitted financial functionality. Avoid retaining full raw message text longer than needed for parsing/review.
- Extract sender/template, transaction timestamp, SMS arrival timestamp, amount, debit/credit/transfer/refund type, merchant/payee, reference/UTR if present, reported resulting balance if present, and parser rule/version.
- Validate all required fields by bank/template before updating ledger.
- If no trusted opening or reported balance exists, ask the user for a baseline or label the reconstructed figure as provisional.

### Bank/template parser registry

- Preserve existing parser modules and supported formats after audit.
- Make parsing deterministic and fixture-driven.
- Distinguish bank transaction alerts from low-balance alerts, OTPs, promotional messages, transaction failure messages, card payment reminders, refund messages and account transfers.
- Never treat an own-account transfer as new income/expense if identifiable.
- Avoid counting credit-card purchase and credit-card bill payment twice as spending.
- Handle refunds/reversals as linked correction events, not unrelated income.
- Treat ambiguous amount/direction/date/balance as review/reconciliation items instead of silently mutating buckets.

### Incremental processing

- Store a reliable checkpoint, preferably using provider/message identifiers when available.
- Use an overlap window because provider ordering and message timing may vary, then deduplicate.
- Process only new/unprocessed items; do not reapply all previous messages every time the app opens.
- On every app launch/resume, reconcile available recent messages and any native event queue before refreshing balances and goals.

### True background handling

Do not assume JS listeners are active while the app is killed/backgrounded. Android's `SMS_RECEIVED` and telephony behavior, permission model, receiver duration and OEM battery policies need device verification. Keep a native receiver short; persist the event and use a verified native/durable path for work that must continue after the UI is inactive. Android WorkManager is appropriate for reliable deferrable work, but periodic work is not exact-time scheduling: https://developer.android.com/develop/background-work/background-tasks/persistent.

**Important acceptance distinction:**

- `Foreground/app-resume ingestion` — message data is processed when the app is open/resumed.
- `Background capture` — message event is durably queued when an incoming message arrives.
- `Background classification and ledger update` — full transaction parsing/ledger effects occur while the UI is inactive.

The app and audit must state which level is implemented and verified. Do not say “always tracks in real time” unless that exact behavior is tested on supported physical devices.

**Tests before proceeding**

- Golden fixtures for every supported bank/template.
- Invalid/unknown templates do not mutate balances.
- Duplicate/reordered/delayed message cases.
- Repeated resume/import does not double count.
- Failure/refund/reversal/internal transfer/card-payment cases.
- Permission denied/revoked cases.
- Android physical-device capture tests where policy access is permitted.

**Exit gate:** parser fixture suite and balance reconciliation tests pass; current limitations are explicit.

## P3 — Review queue and notification/alert infrastructure

**Goal:** Never let ambiguous transactions silently disappear.

### In-app review presentation

When MOB opens/resumes and processing leaves review items:

- Dim the background behind a modal/bottom sheet, not by directly modifying every underlying component's opacity.
- Show a concise card with transaction date, merchant/payee if known, amount, direction and reason review is needed.
- Display bucket options, `Unclassified / decide later`, and optionally `Remember this merchant/category`.
- Batch several pending items into one queue/card flow; do not stack one modal per message.
- Let the user navigate away; keep unresolved items visible with a count/status.
- On choice, reclassify the original transaction atomically; never record a second debit.

### Background notification

- When app is not visible and actionable review items exist, send a local notification such as “MOB has transactions to review.” Use privacy-safe notification content; don't expose amount/merchant on a lock screen unless the user opts in.
- Notification tap deep-links into the correct queue/item.
- Do not launch an activity directly from the SMS receiver or attempt a floating overlay above other apps.
- Handle Android 13+ `POST_NOTIFICATIONS` permission; if denied, queue items remain available in-app without claiming an alert was delivered. https://developer.android.com/develop/ui/compose/notifications/notification-permission
- Coalesce notifications to avoid repeated alerts for every message.

### Transaction resolution

- Unknown debit: reflect the actual debit once in the reconciliation/unclassified suspense ledger and keep the uncertain category out of spendable funds; allow reclassification to a normal bucket.
- Unknown credit: add the credit once to the observed/ledger balance, default it to Unallocated unless user rules explicitly specify otherwise, and offer category/allocation if needed.
- Low-confidence amount/direction: do not post a guessed bucket mutation; hold for confirmation/reconciliation.
- User correction may become a reusable merchant/sender rule only after an explicit choice. Store the rule scope and matching conditions.

**Exit gate:** items survive app restart, review resolution preserves the ledger invariants and no modal is stacked for every message.

## P4 — Separate Goal Buckets and goal creation UI

**Goal:** Create the data model and UX for goals as their own type, distinct from ordinary buckets.

### UI requirements

- Add or adapt a **Goals tab/section** separate from ordinary bucket management. Preserve current navigation layout where practical.
- Ordinary bucket creation stays in the existing Buckets flow.
- Goal creation is a separate form with: goal name, target amount, deadline, optional starting amount if it is not already represented in a Goal Bucket, cadence selection, activation consent, and optional unallocated reserve.
- The planner may show Daily / Weekly / Monthly options before the user chooses one; only one cadence is active per goal unless a later feature explicitly supports multiple schedules.
- Creating a goal creates exactly one associated Goal Bucket with a stable ID. Reopening/editing the goal must not create a duplicate bucket.
- Display target, Goal Bucket amount, remaining amount, deadline, selected cadence, next planned contribution, actual contributions, missed/partial installments and last recalculation reason.
- A goal can be paused, resumed, edited, archived or marked complete through explicit flows.

### Initial balance and existing savings

If the target is ₹30,000 and the Goal Bucket already contains ₹5,000, remaining required is ₹25,000. Do not also count that same ₹5,000 if the user moved it from a regular Savings bucket; the source bucket must have decreased in the same internal transfer.

### Goal model

At minimum, a goal needs:

- stable goal ID and associated Goal Bucket ID
- name, target amount in paise and deadline
- creation/last-update dates
- selected cadence, cadence anchor/weekday/month-day policy
- active/paused/completed/overdue state
- auto-allocation-enabled consent/version
- optional reserve and contribution policy settings
- current schedule version and last replan reason
- goal amount current value derived from ledger events, not a stale duplicate counter

**Exit gate:** creating/editing/reopening one goal has correct stable linkage; ordinary buckets and Goal Buckets are visually and logically distinct.

## P5 — Deterministic schedule generation and feasibility

**Goal:** Generate exact daily/weekly/monthly plans, then compare them with recent financial history.

### Mathematical schedule

Let:

- `targetPaise` = target amount.
- `goalBalancePaise` = current Goal Bucket balance.
- `remainingPaise = max(0, targetPaise - goalBalancePaise)`.
- `futureDueDates` = future contribution dates under the selected cadence, plan start and deadline.
- `n = futureDueDates.length`.

Rules:

- If `remainingPaise == 0`, mark funded and do not schedule further contributions.
- If `n == 0` and remaining is positive, mark overdue/replan-needed and ask the user to change target/deadline; do not divide by zero.
- Otherwise create installments whose sum equals `remainingPaise` exactly, distributing leftover paise via a documented deterministic rounding policy.
- Daily schedule: one eligible local-calendar date per day.
- Weekly schedule: selected weekday/anchor; only dates on/before the deadline.
- Monthly schedule: preserve selected day when possible, and use an explicit month-end rule (e.g. clamp to last day). Do not divide by a guessed count of months.
- Do not create an installment for a date earlier than the activation date or for a deadline-excluded date under the chosen convention.
- Store `scheduleVersion`, due date, planned amount, amount actually allocated, status, shortfall, event IDs, and replan reason.

### Feasibility inputs

Analyze the currently validated local transaction history—initially approximately two months—using:

- income credits with known coverage
- expenses by category
- recurring known expenses where deterministic recurrence evidence exists
- current Unallocated money
- existing regular and goal commitments
- goal balance and remaining target
- transaction coverage, unknown-transaction count, reversals/refunds/transfers and missing account caveats

Compute summary statistics transparently: per-period income/spending/net flow, robust typical values such as median where suitable, variability and known upcoming commitments. Do not treat a short SMS history as a complete household budget. Exclude own-account transfers and double-counted credit-card repayment where possible.

### Feasibility output

Return a typed status, metrics and reason codes, not an unstructured generated claim. Suggested statuses:

- `supported_by_recent_history`
- `stretched_against_recent_history`
- `insufficient_history`
- `deadline_passed`
- `already_funded`
- `requires_user_review` (reconciliation/data quality blocking reliable assessment)

If the schedule requires materially more money than the history suggests the user typically has available, the app should use a factual statement such as:

“Based on the financial activity MOB has recorded recently, your current pattern appears short of the amount required for this goal by about ₹X. You may need additional available funds, a change in spending/income, a lower target or a later deadline.”

Do not moralize, say the user “should create wealth,” or pretend the engine can guarantee future cash flow. The app can state that more funds or a plan change are required to meet the specified mathematical target by the deadline.

**Exit gate:** schedules are exact under paise rounding; historical data coverage and feasibility reasons are exposed; test cases are deterministic.

## P6 — Automatic partial virtual contributions, shortfall alerts and bucket-to-goal transfers

**Goal:** Execute each due schedule safely, allocate all eligible money available from Unallocated up to the installment, show any remainder as a shortfall, and let the user explicitly move already-allocated money if they choose.

### 6.1 Due contribution transaction

For each due installment:

1. Start an atomic repository transaction and claim the installment using a unique idempotency key.
2. Read the current goal balance and current Unallocated balance from the authoritative ledger, not cached UI state.
3. Compute `eligibleUnallocated = max(0, Unallocated - configuredReserve - other explicitly committed near-term amount)`.
4. Compute `actualAllocation = min(plannedInstallment, eligibleUnallocated)` in integer paise.
5. If `actualAllocation > 0`, post a paired internal transfer: Unallocated minus actualAllocation; destination Goal Bucket plus actualAllocation.
6. Record the installment as `completed` if it equals planned amount or `partial` if less. Store the original planned amount, actual amount, shortfall and ledger event ID.
7. If shortfall is positive, enqueue a user-visible shortfall item with actions to move allocated funds or continue without moving them.
8. Recalculate the goal plan using current Goal Bucket balance and **future due dates only**; persist a new schedule version and reason. Never create a second transfer during replan.
9. Commit. If the transaction fails, roll back both bucket changes and the installment status, then retry idempotently.

This is a virtual transfer only. It does not debit the bank account.

### 6.2 Required shortfall alert UX

Example content:

**Your Goa goal is short this week**

“Planned contribution: ₹500. MOB allocated ₹300 from Unallocated. ₹200 is still short. Your goal plan has been recalculated using the remaining amount and dates.”

Primary action button: **Move money to this goal**

Secondary action: **Not now**

The details should include the date, goal, planned amount, automatically allocated amount, shortfall, goal bucket balance and what happens next. Do not say the original full amount was saved if only part was allocated.

If app is foregrounded, show the card/modal with a dimmed backdrop. If app is backgrounded, use a local notification to bring the user back to the shortfall/goal. No floating overlay over other apps.

### 6.3 “Move money to this goal” flow

1. Open a sheet/card listing eligible **already-allocated source buckets** with clear type labels: ordinary bucket (e.g. Savings, Food, Rent) or another Goal Bucket.
2. For each source, show current balance and amount that would remain after a transfer. For another goal, show its target, remaining amount and whether its plan would become more stretched.
3. Let the user choose one or more source buckets and enter/accept an amount. Default amount may be the current shortfall, but do not silently transfer it.
4. Never offer the destination Goal Bucket as its own source. Never transfer more than the source bucket balance unless negative balances are an explicit, separately supported product feature (not V1).
5. Show a confirmation preview: source bucket(s) decrease by ₹X; destination goal bucket increases by ₹X; actual bank balance is unchanged; source/destination goal plans may be recalculated.
6. On confirmation, atomically post paired transfer entries and update the ledger.
7. Recalculate the destination goal and, for any source Goal Bucket, recalculate its schedule/feasibility too.
8. Show the post-transfer result and new next installments. If the user cancels, make no financial state change.

If the user moves from a regular Savings bucket, MOB transfers virtual allocation from Savings to the goal. If the user moves from another goal bucket, MOB must show and record the impact on both goals. Never move money from Rent/Food/another goal on MOB's own initiative.

### 6.4 “Not now” behavior

- Retain the partial amount already transferred from Unallocated.
- Keep the shortfall event visible in goal history.
- Continue with the recalculated future schedule; do not repeatedly prompt for the same event on every app launch.
- The user can reopen the goal/shortfall details later and transfer money if desired.
- If the deadline can no longer be met under the updated plan, mark the plan as stretched/overdue and explain the amount/date gap.

### 6.5 Replanning triggers

Recalculate affected goal(s) after:

- a full/partial/missed scheduled installment
- a manual allocation or transfer into/out of a Goal Bucket
- a user changes target, deadline, cadence, pause/resume or reserve
- a newly parsed debit/credit changes Unallocated or the underlying financial profile materially
- a reviewed transaction is categorized, reversed or corrected
- refunds/reversals arrive
- balance reconciliation finds a material mismatch
- moving money out of another Goal Bucket

Create a new version only when plan inputs or outcomes materially change. Preserve previous versions and the reason. Avoid notification spam from every tiny data change. Replan should be repeatable and deterministic from the same ledger snapshot.

### 6.6 No stacking missed contributions blindly

If the app misses several background execution windows, do not perform several old transfers at once just because they are now overdue. When execution resumes, reconcile due dates in order using current Unallocated balance, mark partial/missed periods honestly, and calculate a new future plan. This prevents an unexpected large sweep out of Unallocated.

**Exit gate:** partial allocation, alert, user-initiated transfer, source/destination goal replanning, cancel/no-op and database retry all pass idempotency and invariant tests.

## P7 — Background lifecycle, notification reliability and device verification

**Goal:** Implement only the background behavior the native platform can actually support and the distribution policy permits.

- Keep SMS receiver work short: validate/capture the event and persist/queue it safely.
- Do not assume the JS runtime is alive in the background.
- Use a verified native/domain service or durable background work for necessary processing. WorkManager persists deferrable tasks across process exit/reboot, but does not guarantee exact execution time; it is not a substitute for precise alarm scheduling. https://developer.android.com/develop/background-work/background-tasks/persistent
- When MOB resumes, sync before computing the latest goal status and reconcile any missed events.
- Re-check permissions; if SMS access is denied/revoked or policy access is unavailable, stop the restricted access and switch to the disclosed manual-data path.
- Request notification permission contextually on supported Android versions. If notifications are disabled, keep the review/shortfall in-app and show a badge.
- Verify actual behavior on physical devices, including at least one device with aggressive OEM battery management. Test background, process death, reboot and force-stop separately; force-stop may prevent work until the user explicitly relaunches the app.
- Keep an honest status in the UI: last successful sync time, coverage, and pending review count.

**Exit gate:** documented device matrix passes; marketing/UI language reflects tested limits, not assumed real-time delivery.

## P8 — Hardening, release and future boundary

- Add local data deletion/reset/export choices consistent with privacy policy, without accidental data loss.
- Ensure no raw SMS or ledger data is sent to a backend, logs, crash reports or analytics unintentionally.
- Review Android manifest, privacy disclosure, permission rationale and Google Play declaration path before release.
- Implement tests for upgrade from current production/local schema, app restart, partial write failure and notification denied.
- Only after deterministic engine and SMS pipeline are reliable, consider future system-assistant shortcuts/intents as a thin action adapter. They must call the same validated domain functions. This is not required for V1 and must not fork or replace financial logic.

---

# 5. Data entities and transaction semantics

The exact tables must be adapted to the existing persistence layer after P0. The following are logical entities, not a command to duplicate existing tables.

## SMS/transactions

- `SmsInboxEvent`: source identifier/fingerprint, sender alias, message timestamp, arrival timestamp, minimal raw content if required, parser status/version and processing status.
- `Transaction`: stable ID, linked source event, date, amount paise, type, merchant/payee, reference if available, category/status/confidence, linked bucket or suspense account, reversal/refund link.
- `BankBalanceSnapshot`: account alias, balance paise, timestamp, source, validation status and confidence.
- `SyncCheckpoint`: last read/processed position, overlap window and last successful sync.
- `CategorizationRule`: user-approved rule scope/pattern/category and active status.

## Buckets and ledger

- `Bucket`: stable ID, type (`regular`, `goal`, `unclassified/suspense` where appropriate), name, status and display properties.
- `LedgerEvent`: immutable transaction/transfer/allocation/reversal/reclassification record with amount paise, source/destination, event time, idempotency key, provenance and related entity IDs.
- `ReconciliationEvent`: previous and current observed balance, ledger totals, variance, reason and resolution.
- `ReviewItem`: event/transaction ID, review reason, options presented, status, user's decision and correction-rule choice.

## Goals and schedules

- `Goal`: goal ID, associated goal bucket ID, name, target paise, deadline, cadence, cadence anchor, status, auto-allocation consent/settings, reserve, current schedule version.
- `GoalScheduleVersion`: goal ID, version, calculation date/time-zone, input ledger revision, reason for recalculation and feasibility result.
- `GoalInstallment`: schedule version, due date, planned paise, actual allocated paise, shortfall paise, status (`scheduled`, `completed`, `partial`, `missed`, `cancelled`), linked ledger event and notification state.

Goal current balance should be derived from ledger events or maintained as a transactional projection that can be rebuilt and verified. Never treat both a ledger balance and a cached goal counter as separate sources of truth.

---

# 6. Edge-case handling catalogue

| Edge case | Required behavior | Tests/notes |
|---|---|---|
| Goal already has ₹5,000 against a ₹30,000 target | Remaining target is ₹25,000 | No double counting if money was transferred from Savings |
| Goal target already met | Stop future contributions and mark funded | Due worker must be idempotent and no-op |
| Deadline is today/past | No invalid future dates; present overdue/replan action | No divide-by-zero |
| Weekly/daily installment exceeds Unallocated | Allocate available amount partially; notify shortfall; replan | Confirmed default behavior |
| Unallocated is zero | Allocate ₹0, mark shortfall, notify/in-app queue; replan | Never make Unallocated negative |
| User presses “Move money” and cancels | No transfer | Assert unchanged balances |
| User transfers from normal Savings | Decrease Savings, increase destination Goal Bucket by same amount | Bank balance unchanged |
| User transfers from another Goal Bucket | Show impact, require confirmation, update both goals and schedules | Do not silently damage source goal |
| User selects destination goal as source | Disallow | No-op and validation test |
| Source balance less than entered transfer | Reject excess or allow only explicit capped amount | Never overdraw source in V1 |
| Several source buckets are selected | Atomic paired transfer(s) | All succeed or none; no partial DB corruption |
| New income message arrives | Update balance/Unallocated under user allocation rules, reconcile and re-evaluate goals | Avoid treating own-account transfer as income |
| Known debit appears | Decrease selected bucket once | Duplicate SMS no-op |
| Unknown debit | Record once in suspense/review state | Don't make it spendable or invent category |
| Unknown credit | Record as credit once; normally leave unallocated pending rule | No duplicate income |
| User resolves unknown debit | Reclassify existing event; no second debit | Invariant test |
| Refund/reversal appears | Link and reverse/adjust original event when confidence is sufficient | Do not count as regular income by default |
| Credit-card purchase and bill payment both exist | Prevent double-counted spending where linked | Test card flow and unmatched cases |
| SMS arrives late/out of order | Sort by transaction time, retain arrival time, reconcile and deduplicate | Replay test |
| Two receiver paths process same SMS | One financial effect | Idempotency across native and JS paths |
| App is killed/backgrounded | Native capture/processing only as verified; on resume sync again | Physical-device matrix |
| App force-stopped / OEM stops receiver | Do not claim guaranteed processing; reconcile on relaunch | Document limitation |
| Device reboots | Restore durable work/state and continue once OS permits | No duplicate installment |
| Notification permission denied | Pending item remains in-app with badge | No crash/no false “notified” status |
| SMS permission denied or revoked | Stop access; preserve manual path and mark data incomplete | Release/policy gate |
| No reliable opening balance | Request baseline or show provisional reconstruction | Do not display invented exact bank balance |
| Several accounts/SIMs | Track source account alias and avoid merging without explicit mapping | Reconciliation tests |
| User changes target/deadline/cadence | Recalculate and version plan | Keep history of previous schedules |
| User pauses goal | Do not execute paused due installments | Resume triggers future-only schedule calculation |
| Goal archived/deleted | Archive by default; if money returned to Unallocated, require explicit confirmation and balanced transfer | Never discard bucket balance |
| Goal bucket manually reduced/spent | Goal balance falls; remaining target and schedule recalculate | Keep transaction attribution explicit |
| Insufficient/incomplete SMS history | Mark financial profile confidence low/preliminary | Don't claim full affordability confidence |
| DB write fails during allocation | Roll back all transfer rows and installment status; retry safely | Failure injection test |
| Same review item opened repeatedly | One pending review and one resolution | Durable status |
| Time zone or month-end changes | Apply saved calendar policy and recompute future dates only | Leap-year/month-end tests |

---

# 7. Required test plan and proof before integration

## 7.1 Baseline regression tests

Before touching a feature, capture existing test/lint/typecheck/build results. After every phase, re-run the relevant baseline commands and identify regressions separately from pre-existing failures.

## 7.2 SMS parser tests

Maintain sanitized fixtures per supported bank/template covering:

- valid debit, credit and post-transaction balance
- merchant/payee and reference extraction
- duplicate and multipart SMS handling where applicable
- failed UPI/payment notifications
- refunds and reversals
- internal transfers
- credit-card purchase/statement payment
- balance inquiry and non-transaction alerts
- malformed, partial, unknown and out-of-order messages
- multiple account/SIM alias cases

Parser test output must include extracted fields, chosen rule, confidence/outcome and ledger action expected. Unknown input should produce a controlled review/no-op result rather than guessed money mutations.

## 7.3 Financial invariant/property tests

1. Replaying the same source event N times has the same financial result as replaying it once.
2. Internal transfers have a zero net effect on total allocated funds and observed bank balance.
3. A real external debit changes the recorded bank state exactly once.
4. Sum of all schedule installments equals remaining goal target exactly in paise.
5. Goal current balance includes a prior contribution only once.
6. Contribution amount equals `min(planned amount, eligible Unallocated)`.
7. Unallocated is never negative due to goal automation.
8. After a partial contribution, shortfall is `planned - actual`; a new schedule uses the new goal balance and remaining future dates.
9. Moving from another Goal Bucket updates source and destination balances by equal/opposite amounts and recalculates both plans.
10. Cancelling the move-money flow causes no state change.
11. Resolving a review item changes categorization without duplicating the transaction.
12. Transaction failure leaves either all paired ledger writes committed or none committed.
13. A completed/paused goal never receives a due allocation.
14. App-resume replay plus background capture does not duplicate the same event.

## 7.4 Goal math test cases

At minimum:

- target 30,000; goal bucket 0; valid future dates
- target 30,000; goal bucket 5,000
- target equal to goal balance
- target below goal balance (surplus handling must be explicit)
- one remaining contribution date
- no future dates and target still unfunded
- daily/weekly/monthly cadence around month-end and leap day
- contribution rounding with remainders in paise
- partial allocation where available Unallocated is zero, less than installment, equal to installment and greater than installment
- a later manual transfer covers all or part of a shortfall
- moving money out of a source Goal Bucket makes its plan stretched
- income or spending history missing/ambiguous
- multiple missed dates after background execution has been deferred

## 7.5 UI/integration tests

- Goal creation is distinct from ordinary bucket creation and links exactly one Goal Bucket.
- Goal list/detail show live ledger values.
- Shortfall card says planned vs allocated vs short amount correctly.
- `Move money` lists ordinary and goal buckets with transfer previews.
- Cancel/no permission paths work.
- Background notification deep-links to the correct goal/review item.
- Review queue handles batches without modal stacking.
- Updates persist after restart, upgrade and app migration.

## 7.6 Physical device and permission tests

Test supported Android OS versions, one mainstream device and one OEM device with aggressive battery restrictions. Record app state (foreground/background/process killed/force-stopped), permission state, notification permission state, message receipt, processing delay and expected outcome. An emulator test does not prove robust OEM background behavior.

---

# 8. What the IDE model must test before integrating each new functionality

The model must follow this protocol for every feature, not just the whole project:

1. **Inspect:** find the existing screen/service/schema and all callers before editing.
2. **State the current behavior:** cite real file paths and relevant functions/components in the task report.
3. **Reproduce:** add/run a failing test or recorded manual reproduction of the required gap.
4. **Define expected behavior:** cover success, missing data, user cancellation, permission denial, retry/replay and app restart.
5. **Check invariants:** write down which ledger invariant(s) the change touches.
6. **Make the smallest compatible change:** reuse existing abstractions; do not create a duplicate repository/service/store.
7. **Test the unit/domain code first:** no UI integration until pure logic passes.
8. **Test persistence and idempotency:** especially across app resume, duplicate messages and process restart.
9. **Integrate the UI/native path:** use the current design/navigation and one authoritative data repository.
10. **Run regression suite:** typecheck, lint, relevant tests and the relevant build.
11. **Update audit/implementation docs:** record exact changed files, test results, known limitations and next gate.
12. **Stop on financial invariant failure:** do not move to later phases while a money invariant or deduplication test is failing.

The model must not invent test results, claim physical device behavior from code inspection alone, or mark unknown capabilities as done.

---

# 9. Suggested execution backlog

Each phase should be delivered as a reviewable milestone rather than one large agent edit.

### Milestone 0 — Audit report only
- Inspect files and architecture.
- Run baseline tests.
- Map SMS parser paths and fixtures.
- Verify SMS permission/policy feasibility.
- Deliver `MOB_CURRENT_STATE_AUDIT.md` and an exact file-change plan.
- **No feature coding in this milestone.**

### Milestone 1 — Ledger invariants
- Schema/migration plan.
- Atomic ledger commands and idempotency keys.
- Existing balance/bucket reconciliation improvements.
- Unit/property tests.
- No automatic goal contribution UI yet.

### Milestone 2 — SMS pipeline reliability
- Fix missing parser templates/validation based on audit.
- Initial history scan and incremental checkpoint/deduplication.
- Review queue persistence.
- Background capture spike on real Android hardware if allowed.
- Document coverage/permission limitations.

### Milestone 3 — Review interaction
- In-app batch review card/queue.
- Bucket mapping and optional remember-rule action.
- Background notification/deep link.
- Test duplicate review and resolution.

### Milestone 4 — Goals and goal buckets
- Separate Goals tab/section.
- Goal creation/editing and associated Goal Bucket.
- Pure daily/weekly/monthly calendar schedule engine.
- Feasibility analysis based on validated recent history.
- Plan display, tests for exact totals and existing saved amounts.

### Milestone 5 — Automatic partial allocation
- Schedule activation/consent.
- Due installment executor with partial default.
- Shortfall card and `Move money` / `Not now` actions.
- Source-bucket picker and impact preview.
- Atomic transfer from regular bucket or another Goal Bucket.
- Recalculate destination and source goals after transfers.

### Milestone 6 — Dynamic replan/recovery
- New transaction/review/goal event triggers.
- Versioned future-only schedule recalculation.
- Recovery after missed background windows without sweeping old contributions.
- Notification coalescing and status badges.

### Milestone 7 — Release hardening
- Full regression/property/integration suite.
- Device/permission/background matrix.
- Migration/restart/failure-injection tests.
- Privacy and store compliance review.
- Update project README/docs with honest platform behavior.

---

# 10. Definition of done

The implementation is ready for a controlled release only when:

1. The audit accurately describes what was present before changes and how it compared to the target.
2. The existing MOB app is extended rather than replaced.
3. SMS parser behavior is backed by sanitized fixtures and validated outputs.
4. Every transaction and SMS event has one financial effect only.
5. The balance/allocation invariant is checked and discrepancies are visible.
6. Normal buckets and Goal Buckets have separate, unambiguous UX and data semantics.
7. A goal with prior savings subtracts those savings from the target remaining.
8. Daily/weekly/monthly schedules reach the exact target in paise when followed.
9. On a due date, MOB allocates up to the eligible Unallocated amount; partial allocation is the confirmed default.
10. A shortfall accurately states planned, actually allocated and missing amounts.
11. The user can choose to move money from an ordinary or another goal bucket; MOB previews the effect and requires confirmation.
12. Moving money is atomic and may replan both source and destination goals.
13. Declining a transfer keeps the partial contribution, records the shortfall and replans future dates without duplicate allocations.
14. App-resume reconciliation works after missed or delayed background events.
15. Background tracking limitations and SMS permission eligibility are verified and accurately disclosed.
16. Manual fallback remains usable if SMS/notification permission is unavailable.
17. The core feature works entirely without an LLM or assistant integration.

---

# 11. Official platform references to re-check during implementation

Platform and distribution rules can change. Re-check these at P0 and before release:

- Google Play restricted SMS/call-log permission guidance: https://support.google.com/googleplay/android-developer/answer/16558241?hl=en-IN
- Google Play SMS/call-log permitted-use/exception guidance: https://support.google.com/googleplay/android-developer/answer/10208820?hl=en-en
- Expo custom native code/development builds: https://docs.expo.dev/workflow/customizing/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Android persistent background work/WorkManager: https://developer.android.com/develop/background-work/background-tasks/persistent
- Android notification permission: https://developer.android.com/develop/ui/compose/notifications/notification-permission
- Android telephony SMS intent reference: https://developer.android.com/reference/android/provider/Telephony.Sms.Intents

---

# Final instruction to the IDE model

**Begin with Milestone 0 only.** Inspect the existing repository and SMS parsing implementation, run baseline tests, and deliver the current-state audit with exact file paths, verified behavior, gaps, blockers and closeness-to-target scoring. Do not implement Goals, partial allocation, SMS background handling or new native functionality until the audit and SMS policy/platform feasibility gate are documented. Once approved, proceed phase by phase, with financial invariant tests passing before each later phase.
