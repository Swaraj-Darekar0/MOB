# Ruposh (MOB) Technical Documentation Index

## 1. Document Overview

| Metadata Field | Specification |
| :--- | :--- |
| Application Name | Ruposh (MOB) Mobile Financial Operating System |
| Documentation Standard | ASD-STE-100 Simplified Technical English |
| Master Specification File | [feature_map.md](feature_map.md) |
| Target Runtime | Expo SDK 57 and React Native 0.86.3 |
| State Management | Zustand 5.0 |
| Local Ledger Engine | SQLite 3 (`mob.db`) with Write-Ahead Logging |

This document provides the master navigation index for the Ruposh (MOB) application.
Software engineers and artificial intelligence agents must read this document first.
This index outlines the core application architecture and document layout.
This document links directly to technical specifications in [feature_map.md](feature_map.md).
Reading this index optimizes token usage and speeds up system comprehension.

---

## 2. Executive Architectural Summary

The Ruposh application operates as a private, offline-first financial system.
The system runs locally on Android and iOS devices.
The application does not use remote cloud servers.
The application does not share user bank credentials with external parties.
The system tracks all financial events in a local SQLite ledger.
The database engine runs with write-ahead logging enabled.
All monetary calculations use integer paise to avoid rounding errors.
The software enforces zero-sum virtual envelope budgeting.
The tracked account balance always equals the allocated balance plus the unallocated balance.
Two unidirectional pipelines connect the user interface to the ledger.
The outbound payment engine builds Unified Payments Interface (UPI) intents.
The inbound telecom pipeline parses bank SMS notifications.
The system reconciles both pipelines inside the local ledger.

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React Native Presentation UI                │
│             (Expo Router 57, Reanimated Gestures)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Zustand State Store                     │
│                  (src/store/useAppStore.ts)                 │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│   Outbound Payment Engine  │  │    Inbound SMS Pipeline    │
│   - Camera QR Scanner      │  │    - Native SMS Ingestion  │
│   - NPCI Intent Dispatcher │  │    - 8 Bank Grammars       │
│   - Assisted P2P Launcher  │  │    - 3-Signal Correlator   │
└──────────────┬─────────────┘  └─────────────┬──────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Local SQLite Ledger                     │
│         (14 Normalized Tables, Integer-Paise Math)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Purpose and Scope of the Documentation

This technical index organizes all engineering knowledge for the MOB project.
The documentation describes all user interfaces, background services, and storage schemas.
Developers must consult this index to locate specific features.
The master specification file is [feature_map.md](feature_map.md).
The feature map contains full implementation details and source file mappings.

### Primary Documentation Objectives

- Provide a single entry point for all application documentation.
- Maintain a direct mapping between features and source code files.
- Document system invariants, data flows, and edge case handlers.
- Minimize token overhead for automated development workflows.

---

## 4. Navigation Guide for the Feature Map

The file [feature_map.md](feature_map.md) groups features into distinct functional modules.
Every feature entry follows a standardized four-part structure.
This consistent format allows rapid scanning and automated verification.

### Feature Specification Structure

| Component | Standard Content | Practical Purpose |
| :--- | :--- | :--- |
| Functional Role | Operational summary | Explains the exact responsibility of the component. |
| Exact Source Code Locations | Relative file paths and line ranges | Identifies where the code lives in the repository. |
| Schema & State Interactions | Database queries and Zustand actions | Details data persistence and state mutations. |
| Failure Modes & Edge Cases | Error handling and recovery paths | Explains how the system survives unexpected conditions. |

### Step-by-Step Navigation Procedure

Follow these procedural steps to investigate any feature:
1. Locate the target functional domain in the Master Module Index below.
2. Click the section link to navigate to the detailed topic in [feature_map.md](feature_map.md).
3. Review the exact file paths and line numbers listed in that section.
4. Open the source file in the repository to inspect the implementation.
5. Verify related database tables in `src/services/db/database.ts`.
6. Verify reactive store actions in `src/store/useAppStore.ts`.

---

## 5. Master Module and Section Index

The table below indexes all fourteen sections in [feature_map.md](feature_map.md).
Click any section link to open the corresponding technical specifications.

| Section # | Section Title | Documentation Link | Functional Scope | Primary Source Files |
| :--- | :--- | :--- | :--- | :--- |
| Section 1 | Executive Overview & Topology | [Architecture Overview](feature_map.md#1-executive-architectural-overview-high-level-topology) | Offline topology, zero-cloud architecture, and invariant rules | `src/app/_layout.tsx` |
| Section 2 | Root Navigation & App Lifecycle | [Module 1: Navigation](feature_map.md#2-module-1-root-architecture-navigation-app-lifecycle) | Startup decryption, route stack, rubber tabs, resume sync | `src/app/_layout.tsx`, `src/components/navigation/RubberBottomTabBar.tsx` |
| Section 3 | Onboarding & Account Discovery | [Module 2: Onboarding](feature_map.md#3-module-2-onboarding-account-discovery) | User setup, SMS permission scanner, envelope allocation | `src/app/(onboarding)/`, `src/services/sms/native/smsReader.ts` |
| Section 4 | Dashboard, Telemetry & Envelopes | [Module 3: Dashboard](feature_map.md#4-module-3-dashboard-telemetry-envelopes) | Three-tier balance header, envelope cards, review badge | `src/app/(tabs)/index.tsx`, `src/components/dashboard/` |
| Section 5 | Cards & Inter-Bucket Transfers | [Module 4: Cards](feature_map.md#5-module-4-cards-inter-bucket-transfers) | 3D card tilt, deposit modal, inter-bucket transfers | `src/app/(tabs)/cards.tsx`, `src/components/ui/CreditCard.tsx` |
| Section 6 | Goals & Cadence Scheduler | [Module 5: Goals](feature_map.md#6-module-5-goals-cadence-scheduler) | Savings targets, cadence scheduler, shortfall alerts | `src/app/(tabs)/goals.tsx`, `src/services/goals/` |
| Section 7 | Payment Processing Engine | [Module 6: Payments](feature_map.md#7-module-6-payment-processing-scanner-confirmation-result-intent-assisted-p2p) | QR scanner, NPCI URI builder, intent launcher, receipt reveal | `src/app/payment/`, `src/services/payment/` |
| Section 8 | SMS Ingestion & Reconciliation Pipeline | [Module 7: SMS Pipeline](feature_map.md#8-module-7-sms-ingestion-reconciliation-pipeline-reader-trust-filter-grammars-correlator-reconciler) | DLT sender trust, finance filter, 8 bank grammars, correlator | `src/services/sms/` |
| Section 9 | SQLite Ledger & Reactive State Store | [Module 8: Ledger & State](feature_map.md#9-module-8-local-sqlite-ledger-reactive-state-store-14-tables-10-indexes-zustand-slices-actions) | 14 database tables, 10 indexes, WAL mode, 14 Zustand slices | `src/services/db/`, `src/store/useAppStore.ts` |
| Section 10 | Activity Timeline & Review Queue | [Module 9: Activity](feature_map.md#10-module-9-activity-timeline-review-queue-rules) | Ledger timeline, search filters, merchant rule learning | `src/app/activity.tsx` |
| Section 11 | Settings, Profile & Telemetry | [Module 10: Settings](feature_map.md#11-module-10-settings-profile-telemetry) | Holographic card, database export, reset particle effects | `src/app/(tabs)/settings.tsx` |
| Section 12 | Design System & Accessibility | [Module 11: Design System](feature_map.md#12-module-11-resend-dark-design-system-accessibility-tokens) | Resend dark theme, 4px grid, 15px radius, reduced motion | `src/theme/`, `src/hooks/useReducedMotion.ts` |
| Section 13 | Comprehensive End-to-End Data Flows | [Data Flows](feature_map.md#13-section-12-comprehensive-end-to-end-data-flows) | Step-by-step traces for onboarding, UPI payments, and SMS reconciliation | `src/services/` |
| Section 14 | Source File Inventory & Matrix | [File Matrix](feature_map.md#14-appendix-complete-verified-source-file-inventory-matrix) | Complete verification matrix of all repository source files | Entire application source tree |

---

## 6. Core Technical Pipelines

The MOB platform relies on three core data pipelines.
Each pipeline operates deterministically without external network services.

### 6.1 Outbound Payment Intent Pipeline

The payment pipeline initiates and executes outbound merchant and peer payments.
The camera scanner reads the QR code payload.
The URI parser validates the payment string against the NPCI specification.
The system classifies the transaction as either merchant payment or person payment.
The user confirms the amount and selects a funding envelope.
The launcher builds a sanitized UPI intent URI.
The operating system passes the intent to installed banking apps.
The application records the pending transaction in the SQLite ledger.
Detailed documentation resides in [Module 6: Payments](feature_map.md#7-module-6-payment-processing-scanner-confirmation-result-intent-assisted-p2p).

### 6.2 Inbound SMS Ingestion & Reconciliation Pipeline

The SMS pipeline ingests banking notifications to update the local ledger.
The Android native module reads incoming telecom SMS text messages.
The trust filter checks the sender against the registered DLT sender whitelist.
The financial filter removes promotional text and one-time passwords.
Dedicated bank grammars parse transaction amounts, reference numbers, and payees.
The deduplicator hashes messages using DJB2 and FNV-1a algorithms.
The 3-signal correlator matches SMS receipts with pending outbound payments.
The system automatically updates envelope balances when a match succeeds.
Detailed documentation resides in [Module 7: SMS Pipeline](feature_map.md#8-module-7-sms-ingestion-reconciliation-pipeline-reader-trust-filter-grammars-correlator-reconciler).

### 6.3 Double-Entry Virtual Envelope Accounting

The ledger manages user balances with strict conservation rules.
Every rupee exists either in a virtual envelope or in the unallocated pool.
The mathematical formula governs all balance operations:

$$\text{Tracked Balance} = \sum \text{Envelope Balances} + \text{Unallocated Cash}$$

The system performs all calculations in integer paise.
One rupee equals one hundred paise.
This representation avoids floating-point precision loss.
The system runs consistency checks on application startup and foreground resume.
Detailed documentation resides in [Module 8: Ledger & State](feature_map.md#9-module-8-local-sqlite-ledger-reactive-state-store-14-tables-10-indexes-zustand-slices-actions).

---

## 7. Codebase Directory Organization

The table below maps the principal directories in the MOB codebase.

| Directory Path | Architectural Layer | Functional Responsibility |
| :--- | :--- | :--- |
| `src/app/` | Routing and Screens | Expo Router stack screens, tabs, and modals |
| `src/components/common/` | UI Presentation | Shared buttons, headers, splash screens, and text inputs |
| `src/components/dashboard/` | UI Presentation | Telemetry headers, envelope cards, and review queue |
| `src/components/navigation/` | UI Presentation | Rubber animated tab bar and floating action buttons |
| `src/components/ui/` | UI Primitives | Particle effects, count-up tickers, and glass containers |
| `src/hooks/` | Custom Hooks | Reanimated physics, sensor hooks, and reduced motion |
| `src/services/db/` | Data Persistence | SQLite schema definitions, migrations, and queries |
| `src/services/goals/` | Domain Services | Goal planning, shortfall calculation, and cadence scheduler |
| `src/services/payment/` | Domain Services | UPI parser, intent generator, and payment workflows |
| `src/services/sms/` | Domain Services | Native SMS reader, DLT filters, grammars, and correlator |
| `src/store/` | State Management | Zustand store slices and global business actions |
| `src/theme/` | Design Tokens | Resend dark color palette, spacing, and typography |
| `src/types/` | Type Contracts | TypeScript interfaces and database row definitions |
| `src/utils/` | Utility Library | Integer-paise money math, date helpers, and hashing |

---

## 8. Continuous Documentation Maintenance Rules

The project enforces mandatory documentation synchronization.
Every engineer and automated agent must follow these rules:
1. Update [feature_map.md](feature_map.md) whenever you modify existing features.
2. Add new feature descriptions and file mappings to [feature_map.md](feature_map.md) whenever you add new code.
3. Keep the file matrix in the appendix synchronized with all repository files.
4. Verify all sentence lengths and links in [INDEX.md](INDEX.md) using the automated verification tool.
5. Maintain active voice and direct phrasing in all documentation updates.

The workspace permanently records these rules in `MOB/.gemini.md` and the user workspace rules.
Automated review agents check compliance during continuous integration.

---

## 9. ASD-STE-100 Compliance Specifications & Verification

This document strictly complies with the ASD-STE-100 Simplified Technical English standard.
The table below lists the governing technical writing constraints.

| Rule Category | ASD-STE-100 Constraint | Implementation Standard |
| :--- | :--- | :--- |
| Sentence Length | Maximum 25 words per sentence | Sentences average 8 to 14 words |
| Voice | Active voice required | Subject performs the direct action |
| Clause Structure | One central idea per sentence | Minimal compound or subordinate clauses |
| Ambiguity Control | Approved technical terms only | Consistent domain vocabulary |
| Information Layout | Tables and structured lists | Tabular references for complex data |

### Automated Verification Command

Run the automated verification script from the project directory:

```bash
node scripts/verify-index.mjs
```

The script performs three independent verification checks:
1. Verifies that all sentences contain 25 words or fewer.
2. Verifies that all Markdown links and anchor targets exist.
3. Verifies that all referenced source code and directory paths exist on disk.
The verification passes when all checks succeed.
