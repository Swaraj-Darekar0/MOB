# MOB IDE Agent Prompt — Audit First, Do Not Implement Yet

You are working inside the **existing MOB React Native + Expo codebase**. Your first task is to discover the current implementation state and report how close the project is to the desired SMS + deterministic financial engine. Do not scaffold a new app, replace existing screens, delete data, or implement new functionality during this first milestone.

Read and follow the full engineering plan in `MOB_Prioritized_Implementation_Plan_v2.md` (or the supplied path where it is saved). This prompt authorizes **Milestone 0 only**.

## Audit the actual repository

1. Inspect project structure, Expo SDK/RN versions, package manager, navigation, state management, storage/database, migrations, current screens/components and available tests.
2. Locate the current SMS permission flow, manifest/config plugins/native modules, historical inbox scan, SMS receive path, parser modules, balance extraction, merchant/payee/category rules, deduplication, transaction storage, app-resume reconciliation, background work, notification setup and deep links.
3. Follow the real data flow from an SMS arriving (or being imported) to parser output, transaction record, bank-balance calculation, bucket change, and UI update. Cite exact file paths, symbols and callers.
4. Identify whether any code genuinely runs when the app's JavaScript runtime is not active. Distinguish foreground handling, app-resume scanning, native background capture, native background parsing and app-relaunch reconciliation. Do not infer background capability from the presence of an event listener.
5. Inspect current regular-bucket/envelope functionality, review/unclassified handling, goal support, database persistence and financial calculations.
6. Run existing typecheck, lint, unit tests, integration tests and relevant build commands if present. Record exact commands and results. Do not fix unrelated pre-existing failures during this audit.
7. Review the project's Android manifest/permission state and document the current SMS-permission policy risk. Do not add restricted SMS permissions or start a new broad-access implementation during this milestone. The policy path for financial SMS access must be verified before shipping or relying on broad inbox access.
8. Check native build configuration and Expo Go vs development-build limitations for the current project.

## Required deliverable

Create `docs/MOB_CURRENT_STATE_AUDIT.md` or use the repository's existing documentation convention. Include:

- Architecture diagram and exact data flow.
- A capability table with `verified working`, `partially implemented`, `present but unverified`, `missing`, or `blocked` status.
- For each row, evidence (file paths/function names), tests run, gap to target, risk and recommendation.
- SMS parser template/fixture coverage and unsupported/ambiguous message behavior.
- State of transaction deduplication, balance reconciliation, review queue, normal buckets and goals.
- Background/app-resume behavior verified on the actual code; explicitly separate assumptions from evidence.
- Current baseline typecheck/lint/test/build results.
- SMS policy/platform blockers and a usable fallback path if broad access is unavailable.
- A 0–100% readiness estimate **with explicit scoring rubric and evidence**. Do not fabricate a high score because files exist.
- An exact file-by-file plan for the first implementation milestone, reusing current abstractions and avoiding duplicate stores/services.
- A `not safe to proceed until` list of critical blockers.

## Stop condition

After producing the audit and baseline report, stop. Do not implement Goal Buckets, automatic/partial allocations, shortfall cards, bucket-to-goal transfers, notifications, native SMS changes or any other new feature until the project owner reviews the report and approves the next milestone.

## Overall product target for audit context

MOB should use a local deterministic ledger and planner. The user has ordinary buckets (Food, Rent, Savings, etc.) and a separate Goals area. Each goal has its own Goal Bucket. On a due date, the engine transfers as much as available from Unallocated into that Goal Bucket. If only part of the planned amount is available, it allocates that part, reports the shortfall, offers a user-confirmed `Move money to this goal` action from an existing regular bucket or another Goal Bucket, and recalculates affected schedules. Moving money between virtual buckets does not change the real bank balance. No LLM/chat UI or system-assistant integration is required for V1.
