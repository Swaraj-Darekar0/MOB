# Ruposh (MOB) Mobile Application: Exhaustive Feature Map & System Architecture

> **Document Version**: 1.0.0  
> **Target Release**: Expo SDK 57 / React Native 0.86.3  
> **Database Engine**: Local SQLite (`mob.db`) with Write-Ahead Logging (`WAL`)  
> **Architecture Style**: Offline-first, Zero-Sum Virtual Envelope Budgeting, Client-Side UPI Intent & Telecom SMS Pipeline  
> **File Location**: `MOB/.wiki/feature_map.md`

---

## 1. Executive Architectural Overview & High-Level Topology

The **Ruposh (MOB)** mobile application is a privacy-preserving, zero-cloud financial operating system designed for the Indian banking and Unified Payments Interface (UPI) ecosystem. The application executes double-entry virtual envelope budgeting backed by a local SQLite ledger without relying on third-party backend servers, account aggregators, or external credential sharing.

The architecture comprises two primary unidirectional pipelines operating over a central SQLite ledger and reactive Zustand state store:

```
                          ┌──────────────────────────────────────┐
                          │     React Native Presentation UI     │
                          │   (Expo Router 57, Reanimated 4.5)   │
                          └──────────────────┬───────────────────┘
                                             │
                                             ▼
                          ┌──────────────────────────────────────┐
                          │         Zustand State Store          │
                          │        (src/store/useAppStore.ts)     │
                          └──────────┬────────────────┬──────────┘
                                     │                │
                     ┌───────────────┘                └───────────────┐
                     ▼                                                ▼
     ┌────────────────────────────────┐               ┌────────────────────────────────┐
     │    Outbound Payment Engine     │               │     Inbound SMS Pipeline       │
     │  - expo-camera QR Scanner      │               │  - Android Native SMS Reader   │
     │  - Zod URI Schema Parser       │               │  - TRAI DLT 47+ Sender Trust   │
     │  - P2M vs P2P Classifier       │               │  - Anti-Phantom Finance Filter │
     │  - Anti-Spoofing URI Builder   │               │  - 8 Bank Grammar Parsers      │
     │  - Multi-App Intent Dispatcher │               │  - DJB2/FNV-1a Deduplicator    │
     │  - Assisted P2P Launcher       │               │  - 3-Signal Payment Correlator │
     └───────────────┬────────────────┘               │  - 7-Tier Lexical Classifier   │
                     │                                └───────────────┬────────────────┘
                     │                                                │
                     └───────────────────────┬────────────────────────┘
                                             │
                                             ▼
                          ┌──────────────────────────────────────┐
                          │         Local SQLite Ledger          │
                          │       (src/services/db/database.ts)  │
                          │  - 14 Normalized Relational Tables   │
                          │  - 10 Optimized Query Indexes        │
                          │  - Atomic WAL Transactions           │
                          │  - Integer-Paise Math Precision      │
                          │  - Zero-Sum Conservation Invariant   │
                          └──────────────────────────────────────┘
```

---

## 2. Module 1: Root Architecture, Navigation & App Lifecycle

### Feature 1.1: Root Stack Navigator & Application Entry Gateway
- **Functional Role**: Establishes the foundational React Native stack navigator, orchestrates startup database initialization, verifies user onboarding status, and controls splash screen dismissal.
- **Exact Source Code Locations**:
  - `src/app/_layout.tsx` (Lines 1–137)
  - `src/app/index.tsx` (Lines 1–18)
- **Schema & State Interactions**:
  - On mount, `_layout.tsx` invokes `database.initDatabase()` to run table migrations and establish `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;`.
  - Calls `useAppStore.getState().loadInitialData()` to hydrate Zustand state slices (`user`, `envelopes`, `trackedBalance`, `goals`).
  - Evaluates `useAppStore.getState().isOnboarded`. If false, `src/app/index.tsx` redirects the user to `/(onboarding)/username`; if true, redirects to `/(tabs)`.
  - Configures the top-level route stack:
    - `index` (Route gateway)
    - `(onboarding)` (Horizontal slide onboarding flow)
    - `(tabs)` (Main bottom navigation tabs)
    - `payment/scan` (Camera modal presentation)
    - `payment/confirm` (Payment confirmation slide-up card)
    - `payment/result` (Payment status and receipt modal)
    - `activity` (Transaction ledger slide-up modal)
- **Failure Modes & Edge Cases**:
  - *Database Initialization Failure*: Catches file access errors (e.g. storage permissions denied) and prevents splash screen teardown until recovery or error dialogue display.
  - *Corrupted User Record*: If `users` table contains invalid rows, defaults `isOnboarded` to `false`, directing to initial onboarding setup.

### Feature 1.2: Bottom Tab Navigator & Rubber Physics Tab Bar
- **Functional Role**: Provides access to the primary four functional hubs (Dashboard, Cards, Goals, Settings) using an elastic, spring-animated floating pill tab bar.
- **Exact Source Code Locations**:
  - `src/app/(tabs)/_layout.tsx` (Lines 1–39)
  - `src/components/navigation/RubberBottomTabBar.tsx` (Lines 1–64)
- **Schema & State Interactions**:
  - Observes active route names (`index`, `cards`, `goals`, `settings`).
  - Maps routes to Lucide icons: `LayoutDashboard`, `CreditCard`, `Target`, `Settings`.
  - Leverages `RubberSegmentBar` with squish spring dynamics (`damping: 15`, `stiffness: 180`) to translate the highlight indicator capsule across tabs.
  - Consumes `colors.surfaceRaised` (`#1D1D1D`) and 24px border radius.
- **Failure Modes & Edge Cases**:
  - *Rapid Tab Switching*: Cancels in-flight spring animations cleanly without jitter using Reanimated shared values.
  - *Safe Area Insets*: Incorporates device bottom notch padding dynamically via `useSafeAreaInsets()`.

### Feature 1.3: Startup Decryption Splash Overlay
- **Functional Role**: Renders a cyber-themed ASCII text decryption animation overlay on initial app boot, concealing UI layout calculations until database hydration finishes.
- **Exact Source Code Locations**:
  - `src/components/common/DecryptedSplashOverlay.tsx` (Lines 1–85)
  - `src/app/_layout.tsx` (Lines 77–87)
- **Schema & State Interactions**:
  - Emits random glyph cycles before settling on "MOB // FINANCIAL OS".
  - Dismisses automatically when `showSplashOverlay` transitions to false and `SplashScreen.hideAsync()` resolves.
- **Failure Modes & Edge Cases**:
  - *Reduced Motion*: If user accessibility settings request reduced motion (`useReducedMotion`), bypasses glyph cycling and resolves immediately.

### Feature 1.4: AppState Foreground & Resume Reconciliation Listener
- **Functional Role**: Automatically triggers background financial reconciliation whenever the user switches back to MOB from third-party applications (such as Google Pay, PhonePe, or system settings).
- **Exact Source Code Locations**:
  - `src/app/_layout.tsx` (Lines 89–105)
- **Schema & State Interactions**:
  - Subscribes to `AppState.addEventListener('change', (nextAppState))`.
  - When `nextAppState === 'active'` and `isInitialized === true`:
    - Executes `useAppStore.getState().reconcileTrackedBalance()` to compare tracked paise against bank-reported SMS balances.
    - Executes `useAppStore.getState().runScheduledGoalAllocations()` to deduct pending calendar goal contributions.
- **Failure Modes & Edge Cases**:
  - *Uninitialized State*: Suppresses reconciliation calls if `isInitialized` is false to prevent race conditions during cold boot.
  - *Network Independence*: Operates entirely offline; does not fail if device lacks internet connectivity.

---

## 3. Module 2: Onboarding & Account Discovery

### Feature 2.1: Onboarding Stack Architecture
- **Functional Role**: Coordinates the 3-step linear account creation process with horizontal slide animations.
- **Exact Source Code Locations**:
  - `src/app/(onboarding)/_layout.tsx` (Lines 1–25)
- **Schema & State Interactions**:
  - Configures `Stack` with `animation: 'slide_from_right'`, `headerShown: false`, and `colors.surfaceBase` (`#060606`).
- **Failure Modes & Edge Cases**:
  - Prevents backward navigation past Step 1 to maintain deterministic state initialization.

### Feature 2.2: Step 1 - User Profile & Avatar Setup
- **Functional Role**: Captures user display name and profile avatar, providing camera roll selection or monogram generation.
- **Exact Source Code Locations**:
  - `src/app/(onboarding)/username.tsx` (Lines 1–120)
  - `src/components/ui/WorkspaceTopStepper.tsx` (Lines 1–70)
- **Schema & State Interactions**:
  - Avatar picker calls `expo-image-picker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })`.
  - Falls back to rendering user initials inside a circular container if no photo is picked.
  - Enforces minimum 2-character trimmed username validation.
  - Advances to `/(onboarding)/sms-permission` upon confirmation.
- **Failure Modes & Edge Cases**:
  - *Photo Permission Denied*: Renders monogram avatar fallback without blocking form progression.
  - *Whitespace Input*: Trims whitespace; disables proceed button if string length < 2.

### Feature 2.3: Step 2 - SMS Permission, Thinking Machine & Decrypted Account Discovery
- **Functional Role**: Requests Android SMS runtime permissions, initiates a 3-phase scanning state machine, parses historical banking SMS messages, and displays detected bank accounts with text scramble effects.
- **Exact Source Code Locations**:
  - `src/app/(onboarding)/sms-permission.tsx` (Lines 1–900)
  - `src/components/ui/ThoughtLine.tsx` (Lines 1–85)
  - `src/components/ui/DecryptedText.tsx` (Lines 1–95)
  - `src/services/sms/native/smsReader.ts` (Lines 1–96)
- **Schema & State Interactions**:
  - 3-Phase State Machine: `'IDLE'` -> `'THINKING'` -> `'REVEALED'`.
  - Displays `ThoughtLine` cycling through status strings: "Reading bank notifications...", "Parsing UPI reference numbers...", "Detecting account balances...".
  - Calls `requestSmsPermission()` (`READ_SMS`, `RECEIVE_SMS`). If granted, scans telecom messages; if ungranted or in simulator, loads synthetic onboarding bank records.
  - Discovered accounts (e.g. `Union Bank *0221`, `HDFC Bank **4321`) are presented with `DecryptedText` scramble animations.
  - Provides multi-account aggregation cards with toggle switches, allowing the user to select which accounts to include in total tracked balance.
- **Failure Modes & Edge Cases**:
  - *Permission Rejection*: Smoothly transitions to manual balance setup fallback screen without error dialogs.
  - *Empty Inbox*: If zero bank SMS messages are found, routes to `balance.tsx` for manual starting balance input.

### Feature 2.4: Step 3 - Percentage-Based Virtual Envelope Allocation
- **Functional Role**: Distributes the discovered initial balance across virtual budget envelopes using percentage sliders, enforcing zero-sum conservation.
- **Exact Source Code Locations**:
  - `src/app/(onboarding)/allocation.tsx` (Lines 1–170)
  - `src/components/ui/OnboardingActivationModal.tsx` (Lines 1–110)
- **Schema & State Interactions**:
  - Sets up default envelopes: Needs (50%), Wants (30%), Savings (20%).
  - Dynamically calculates:
    $$\text{unallocatedBalance} = \text{trackedBalance} - \sum \text{envelopeAllocations}$$
  - Real-time constraint: $\sum \text{percentages} \le 100\%$.
  - Completion CTA calls `useAppStore.completeOnboarding()`:
    - Writes `users` table record (`id`, `username`, `avatarUri`, `phoneNumber`).
    - Writes `accounts` table record for primary bank account.
    - Writes default `envelopes` with allocated amounts.
    - Records initial `balance_snapshots` row and `INITIAL_BALANCE` in `ledger_events`.
    - Triggers `OnboardingActivationModal` confetti celebration, then routes to `/(tabs)`.
- **Failure Modes & Edge Cases**:
  - *Over-Allocation*: Disables confirmation CTA if total percentage > 100%.

### Feature 2.5: Fallback Onboarding Interfaces
- **Functional Role**: Provides manual phone number capture and starting balance input when SMS discovery is bypassed or ungranted.
- **Exact Source Code Locations**:
  - `src/app/(onboarding)/phone.tsx` (Lines 1–100)
  - `src/app/(onboarding)/balance.tsx` (Lines 1–110)
- **Schema & State Interactions**:
  - Stores phone number in `profile` SQLite table.
  - Converts user-typed rupee amount to integer paise via `toPaise()` in `src/utils/money.ts`.
- **Failure Modes & Edge Cases**:
  - *Non-numeric Balance*: Blocks submission until a valid positive numeric value is entered.

---

## 4. Module 3: Dashboard, Telemetry & Envelopes

### Feature 3.1: Dashboard Hub & Deck Switcher
- **Functional Role**: Serves as the primary operational command center, displaying user profile header, review queue notification badge, three-tier balance telemetry, view mode switcher (Grid vs Stack), and envelope management cards.
- **Exact Source Code Locations**:
  - `src/app/(tabs)/index.tsx` (Lines 1–280)
- **Schema & State Interactions**:
  - Subscribes to `useAppStore` selectors: `user`, `trackedBalance`, `allocatedBalance`, `unallocatedBalance`, `envelopes`, `unclassifiedTransactions`.
  - Toggles between Grid and Stack presentations using `RubberSegmentBar` (`['Grid', 'Stack']`).
  - Launches "+ New Envelope" creation modal and envelope deletion confirmation modal.
- **Failure Modes & Edge Cases**:
  - *Empty State*: Renders onboarding CTA card when zero active envelopes exist.

### Feature 3.2: Three-Tier Real-Time Balance Telemetry
- **Functional Role**: Displays high-contrast, rolling-number telemetry separating total tracked wealth, envelope-allocated funds, and unallocated liquid cash.
- **Exact Source Code Locations**:
  - `src/components/dashboard/BalanceHeader.tsx` (Lines 1–115)
  - `src/components/ui/CountUp.tsx` (Lines 1–80)
  - `src/components/ui/NumberTicker.tsx` (Lines 1–90)
- **Schema & State Interactions**:
  - Primary Metric: Total Tracked Balance (Rupees).
  - Secondary Metrics: Allocated to Buckets & Available Unallocated Cash.
  - Implements `CountUp` and `NumberTicker` using Reanimated typography with `fontVariant: ['tabular-nums']`.
  - Mathematical Invariant Alert: If `trackedBalance !== allocatedBalance + unallocatedBalance`, renders an amber warning banner alerting the user to an internal accounting discrepancy.
- **Failure Modes & Edge Cases**:
  - *Precision Drift*: Evaluates values using integer paise arithmetic to ensure exact rupee equality.

### Feature 3.3: Dynamic Envelope Runway Card
- **Functional Role**: Renders 180px fixed-height bucket cards with color pips, category icons, allocated vs spent amounts, linear burn-down progress bar, and days-of-runway burn-rate calculations.
- **Exact Source Code Locations**:
  - `src/components/dashboard/EnvelopeCard.tsx` (Lines 1–140)
- **Schema & State Interactions**:
  - Computes spent percentage: $(\text{spent} / \text{allocated}) \times 100$.
  - Computes daily burn runway: divides remaining amount by 30-day average daily expense for that category.
  - Features quick tap-to-pay shortcut button, immediately opening `/payment/scan` with this envelope pre-selected.
- **Failure Modes & Edge Cases**:
  - *Overspent Envelope*: When current balance drops below zero, changes progress bar color to `colors.statusError` (`#E91429`) and renders negative badge.

### Feature 3.4: Dashboard Quick Actions Carousel
- **Functional Role**: Provides one-tap horizontal pill buttons for frequent operational tasks.
- **Exact Source Code Locations**:
  - `src/components/dashboard/QuickActions.tsx` (Lines 1–55)
- **Schema & State Interactions**:
  - Pills: "Add Money" (Opens cards deposit modal), "Move / Allocate" (Opens inter-bucket transfer modal), "New Envelope" (Opens bucket creation modal), "Scan QR" (Navigates to `/payment/scan`).
- **Failure Modes & Edge Cases**:
  - Adapts horizontally with scrolling on narrow screen widths without clipping.

### Feature 3.5: In-Flight Review Queue Trigger & Launch Auto-Open
- **Functional Role**: Alerts user to unclassified or ambiguous SMS transactions requiring manual envelope assignment, featuring launch-time auto-opening and top-left header badge.
- **Exact Source Code Locations**:
  - `src/components/dashboard/ReviewQueuePopup.tsx` (Lines 1–784)
  - `src/app/(tabs)/index.tsx` (Lines 44–75, Lines 130–155, Lines 420–435)
- **Schema & State Interactions**:
  - Anchored at top-left of dashboard header (`styles.reviewQueueBtn`).
  - Displays red notification dot badge (`styles.reviewQueueBadgeDot`) at symbol's top-right when `unclassifiedCount > 0`.
  - **Auto-Open Protocol**: Upon cold launch from closed state or resume from background (`AppState === 'active'`), automatically opens the Review Queue popup directly if `unclassifiedCount > 0`.
  - Manual dismissal within an active session prevents annoying repeated popups until new transactions arrive or app is resumed.
- **Failure Modes & Edge Cases**:
  - Red dot badge automatically hides when review queue count reaches zero.

---

## 5. Module 4: Cards & Inter-Bucket Transfers

### Feature 4.1: Virtual Card & Allocation Hub
- **Functional Role**: Provides virtual bank card visualization, visual budget proportion breakdown, and deposit/transfer modals.
- **Exact Source Code Locations**:
  - `src/app/(tabs)/cards.tsx` (Lines 1–320)
- **Schema & State Interactions**:
  - Renders 3D interactive `CreditCard`.
  - "Add Money" modal: Adds funds directly to unallocated balance using quick presets (+500, +1000, +2000, +5000 INR), creating `balance_snapshots` row and `MANUAL_MONEY_ADDED` ledger event.
  - "Put into Bucket" modal: Allocates unallocated cash to an envelope using percentage presets (25%, 50%, 75%, 100%).
  - "Move Between Buckets" modal: Performs atomic inter-envelope transfers without modifying total tracked balance.
- **Failure Modes & Edge Cases**:
  - *Over-allocation*: Prevents moving more funds than currently available in source envelope or unallocated cash.

### Feature 4.2: 3D Interactive Flip Card Presentation
- **Functional Role**: Simulates an interactive physical payment card with realistic 3D perspective flip and shine shaders.
- **Exact Source Code Locations**:
  - `src/components/ui/CreditCard.tsx` (Lines 1–95)
- **Schema & State Interactions**:
  - Front Face: Unmasked card representation, chip glyph, contactless icon, account holder name, Ruposh brand logo.
  - Back Face: Magnetic stripe, holographic signature strip, CVV, live ledger balance reveal.
  - Uses `react-native-reanimated` with `interpolate(flipProgress, [0, 1], [0, 180])` and `backfaceVisibility: 'hidden'`.
- **Failure Modes & Edge Cases**:
  - *Android Backface Bug*: Applies `perspective: 1000` to container to avoid rendering artifacts on Android OpenGL surfaces.

### Feature 4.3: Morphing Deck: Grid <-> Stack Layout
- **Functional Role**: Offers fluid gesture-driven transitioning between a 2-column scrollable grid and an interactive stacked deck with spring flyout on swipe.
- **Exact Source Code Locations**:
  - `src/components/ui/MorphingDeck.tsx` (Lines 1–150)
- **Schema & State Interactions**:
  - Listens to pan gestures via `react-native-gesture-handler`.
  - Animates card translation, rotation, and scale interpolations.
- **Failure Modes & Edge Cases**:
  - *Touch Collisions*: Disables vertical gesture responders during horizontal child swipes.

### Feature 4.4: Physics Spring Card Deck
- **Functional Role**: Renders a vertical card deck with spring resistance (`stiffness: 260`, `damping: 20`) and peek offsets.
- **Exact Source Code Locations**:
  - `src/components/ui/BucketStack.tsx` (Lines 1–120)
- **Schema & State Interactions**:
  - Displays top card with full opacity; background cards scale down (`0.95`, `0.90`) with vertical negative offsets.
- **Failure Modes & Edge Cases**:
  - Clamps index bounds to prevent swiping past the end of the array.

### Feature 4.5: Elastic Segmented Controller
- **Functional Role**: Provides a tactile segmented tab switcher with liquid rubber capsule physics.
- **Exact Source Code Locations**:
  - `src/components/ui/RubberSegmentBar.tsx` (Lines 1–90)
- **Schema & State Interactions**:
  - Shared value stretches indicator width during translation, then snaps back to tab boundaries upon arrival.
- **Failure Modes & Edge Cases**:
  - Respects reduced motion settings by snapping position instantly without spring elongation.

---

## 6. Module 5: Goals & Cadence Scheduler

### Feature 5.1: Dedicated Goals Management View & Adaptive Copilot Deck
- **Functional Role**: Coordinates savings goals, cadence progression, shortfall strain alerts, and the adaptive goal copilot reality deck.
- **Exact Source Code Locations**:
  - `src/app/(tabs)/goals.tsx` (Lines 1–860)
- **Schema & State Interactions**:
  - Displays active goals with target amount, saved amount, deadline date, and cadence tags.
  - Shortfall Strain Banner alerts the user when unallocated cash cannot cover upcoming installments.
  - Two-Step Goal Creation Modal:
    - Step 1: Captures goal name, target amount, emoji icon, and deadline date using an interactive calendar.
    - Step 2: Runs a deliberate `ThoughtLine` analysis sequence, then displays cash-flow telemetry and reality options.
  - Reality Offer Deck:
    - Option 1 (The Stress-Free Pace): Dilates deadline date to protect the user's current lifestyle.
    - Option 2 (The Envelope Trim Plan): Keeps original target date by trimming flexible envelopes like Dining and Shopping.
    - Option 3 (The Seed & Sprint Plan): Siphons idle unallocated cash upfront to lower monthly payments.
  - Manual Cadence Switcher: Allows the user to view and pick standard Daily, Weekly, or Monthly plans.
  - Feasibility Alert Banner: Displays Solvent, Balanced, or Deficit status based on 90-day cash flow.
  - Unlocked Pro Feature Hook: Simulates unlocked Pro copilot tier for development and testing.
- **Failure Modes & Edge Cases**:
  - *Past Date Selection*: Calendar picker blocks past dates to prevent negative schedule math.
  - *Zero Discretionary Surplus*: Disables Option 2 trim suggestions if no flexible envelopes have positive limits.

### Feature 5.2: Deterministic Goal Planning & Tradeoff Execution Engine
- **Functional Role**: Manages dedicated goal envelopes, automated scheduled deduction execution, partial allocations, and envelope trim execution.
- **Exact Source Code Locations**:
  - `src/services/goals/goalPlanner.ts` (Lines 1–380)
- **Schema & State Interactions**:
  - **Dedicated Virtual Envelope Invariant**: Links every goal record directly to an envelope with archetype `GOAL`.
  - **Reality Option Execution (`createGoalWithDedicatedBucket`)**:
    - For Option 2 (`SACRIFICE`): Compresses target limits on selected envelopes and moves available balance to unallocated cash.
    - Records `ALLOCATE_TO_ENVELOPE` ledger events to preserve complete audit history.
    - For Option 3 (`SEED_SPRINT`): Injects upfront seed cash from unallocated funds into the new goal envelope immediately.
  - **Partial Allocation Default**: On scheduled execution (`processScheduledGoalAllocations`), transfers available unallocated cash if balance is insufficient.
  - **Shortfall Logging**: Writes unfulfilled installment amounts to `goal_shortfalls` with `resolved = 0`.
  - **Shortfall Recovery (`moveMoneyToGoal`)**: Transfers money from surplus envelopes to clear shortfalls and recalculates installment schedules.
- **Failure Modes & Edge Cases**:
  - *Zero Unallocated Cash*: Allocates 0 paise, logs full shortfall, and advances next contribution date safely.

### Feature 5.3: Robust Nonparametric Statistics & 3-Way Reality Math
- **Functional Role**: Analyzes 90-day cash flow using robust statistics, evaluates goal feasibility, and computes reality offers.
- **Exact Source Code Locations**:
  - `src/services/goals/goalCalculations.ts` (Lines 1–460)
- **Schema & State Interactions**:
  - **Robust Statistics**: Uses median and Median Absolute Deviation (MAD) with Hampel anomaly filter (scale factor 1.4826).
  - Filters windfall spikes (e.g., festival bonus) to prevent unrealistic goal commitments.
  - Decomposes cash flow into Essential Fixed Burn (Rent, EMI, Utilities) and Volatile Discretionary Outflow (Dining, Shopping).
  - Computes Disposable Free Cash Flow at median ($\text{DFCF}_{50}$) and conservative floor ($\text{DFCF}_{25}$).
  - **Cadence Decision Boundary**: Restricts Daily cadence to micro-goals ($\le \text{₹}3,000$). Demonstrates Monthly cadence dominance for salary earners.
  - **Feasibility Index $\Phi(T, \Delta t) \in [0, 1]$**: Classifies goals into Solvent Comfortable, Balanced Stretch, or Deficit Critical.
  - **Adaptive Deadline Dilation**: Solves minimal solvent timeline: $\Delta t^* = \lceil T / \text{DFCF}_{50} \rceil \times 30$ days.
  - Delivers plain ASD-STE-100 explanations with concise active sentences.
- **Failure Modes & Edge Cases**:
  - *No Transaction History*: Falls back safely to conservative default estimates without throwing errors.
  - *Zero Discretionary Spend*: Protects against division by zero in variance and ratio formulas.

---

## 7. Module 6: Payment Processing (Scanner, Confirmation, Result, Intent & Assisted P2P)

### Feature 6.1: Fullscreen Camera Scanner & Reticle
- **Functional Role**: Scans merchant UPI QR codes using device camera hardware, displays an animated HUD reticle, and manages torch illumination.
- **Exact Source Code Locations**:
  - `src/app/payment/scan.tsx` (Lines 1–647)
  - `src/components/ui/QRScannerReticle.tsx` (Lines 1–235)
- **Schema & State Interactions**:
  - Uses `expo-camera/CameraView` with `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`.
  - Renders 60fps compositor-only `QRScannerReticle` with corner L-brackets (15px border radius) and sweeping laser beam.
  - Displays header pill showing deducting envelope name and available balance.
  - On barcode scan, calls `parseUPIUri(data)`: if valid, routes to `/payment/confirm`.
- **Failure Modes & Edge Cases**:
  - *Camera Permission Denied*: Renders educational explanation box with "Grant Camera Access" button invoking `requestPermission()`.
  - *Corrupt QR*: Displays non-blocking red error banner inside reticle and auto-resets after 1.5 seconds.
  - *Simulator / No Camera*: Displays fallback with manual VPA input button.

### Feature 6.2: Manual UPI ID Auto-Complete Dropdown
- **Functional Role**: Allows users to enter a phone number or VPA manually, providing real-time deterministic handle completion suggestions.
- **Exact Source Code Locations**:
  - `src/app/payment/scan.tsx` (Lines 45–56, 79–129, 244–363)
  - `src/services/payment/upiHandles.ts` (Lines 6–221)
- **Schema & State Interactions**:
  - Evaluates input via `getMatchingUPIHandles(payeeInput)`:
    - 10 digits (`^\d{10}$`): Suggests `<phone>@okaxis`, `<phone>@ybl`, `<phone>@paytm`, `<phone>@oksbi`.
    - Handle prefix (`@ok`): Filters matching bank handles from directory.
  - On submit, constructs synthetic `ParsedUPIQR` and opens `/payment/confirm`.
- **Failure Modes & Edge Cases**:
  - *Invalid VPA Format*: Rejects submission if input fails regex `/^[^\s@]+@[^\s@]+$/`.

### Feature 6.3: Zod UPI QR Parser & Schema Validation
- **Functional Role**: Parses and validates raw UPI QR query parameters into typed domain objects.
- **Exact Source Code Locations**:
  - `src/services/payment/upiParser.ts` (Lines 9–190)
  - `src/types/index.ts` (Lines 96–112)
- **Schema & State Interactions**:
  - Requires scheme `upi://pay` (case-insensitive).
  - Validates query params via Zod schema `upiQRPayloadSchema`:
    - `pa` (Payee VPA, required)
    - `pn` (Payee name, optional)
    - `am` (Amount string, positive numeric)
    - `cu` (Currency, must be `INR`)
    - `tr`, `tn`, `mc`, `mid`, `sid`, `tid` (Preserved via `.passthrough()`)
  - Identifies Dynamic QR (`isDynamic = true` when amount > 0) vs Static QR.
- **Failure Modes & Edge Cases**:
  - *Non-INR Currency*: Throws validation error if `cu !== 'INR'`.
  - *Malformed URI Components*: Uses `safeDecode()` to handle unescaped `+` and `%` characters without throwing runtime exceptions.

### Feature 6.4: 5-Tier Payment Target Classifier (P2M vs P2P)
- **Functional Role**: Categorizes recipient as Peer-to-Merchant (`P2M`) or Peer-to-Personal (`P2P`) to select direct intent launch vs assisted P2P workflow.
- **Exact Source Code Locations**:
  - `src/services/payment/upiHandles.ts` (Lines 22–570)
- **Schema & State Interactions**:
  - 5-Tier Waterfall Evaluation:
    1. `mc` code present and `!= '0000'` -> `P2M`.
    2. Terminal tags (`mid`, `sid`, `tid`) present -> `P2M`.
    3. Phone-based VPA (`^\d{10}$`) and non-merchant handle -> `P2P`.
    4. Merchant PSP handle (`@paytmqr`, `@bharatpe`, `@ptqr`, etc.) -> `P2M`.
    5. Subdomain or brand keywords (`.bpay`, `.ibz`, `swiggy`, `zomato`, `mart`, `store`) -> `P2M`.
    6. Default fallback -> `P2P`.
- **Failure Modes & Edge Cases**:
  - *Ambiguous Handles*: Defaults safely to `P2P`, preventing blocked third-party intents.

### Feature 6.5: NPCI-Compliant URI Builder & Anti-Spoofing
- **Functional Role**: Assembles outbound `upi://pay` URIs strictly complying with NPCI standards while preventing gateway errors.
- **Exact Source Code Locations**:
  - `src/services/payment/uriBuilder.ts` (Lines 19–132)
- **Schema & State Interactions**:
  - Preserves scanned merchant signatures (`mode`, `orgid`, `sign`, `mc`, `mid`, `sid`, `tid`) when `rawPayload` is provided.
  - **Anti-Spoofing Rule**: Strips `pn` if it matches a 10-digit phone number or matches the VPA prefix, allowing Google Pay to safely resolve the registered Core Banking name.
  - **Internal Ref Sanitization**: Strips local tracking references (`tr` starting with `V1`) from outbound merchant URIs.
- **Failure Modes & Edge Cases**:
  - *VPA Name Mismatch*: Stripping unverified `pn` avoids acquiring bank rejections.

### Feature 6.6: Payment Confirmation & WebGL Shimmer Canvas
- **Functional Role**: Displays payment review details (payee, amount, deducting envelope) over an interactive WebGL pixel shader canvas.
- **Exact Source Code Locations**:
  - `src/app/payment/confirm.tsx` (Lines 1–928)
  - `src/components/ui/PixelCard.tsx` (Lines 1–85)
- **Schema & State Interactions**:
  - Renders `PixelCard` using `expo-gl` WebGL context.
  - Displays Payee verification badge, P2M/P2P tag, and bucket selector modal.
  - Validates requested amount against envelope balance; displays `warningBox` if amount exceeds available funds.
  - Listens to `AppState` to defrost UI after 600ms if user returns from Google Pay without callback data.
- **Failure Modes & Edge Cases**:
  - *WebGL Unsupported*: Falls back to flat `colors.surfaceRaised` container without crashing.

### Feature 6.7: Slide-to-Pay Interactive Gesture
- **Functional Role**: Enforces deliberate user confirmation via slide gesture before initiating payment.
- **Exact Source Code Locations**:
  - `src/components/ui/SlideCommit.tsx` (Lines 1–663)
- **Schema & State Interactions**:
  - Circular thumb handle (48px) with ArrowRight icon.
  - Snap threshold >= 85% drag completion.
  - Emits haptic vibration on commit.
  - Reverts to origin with spring physics if released before threshold.
- **Failure Modes & Edge Cases**:
  - Disables slider when requested amount > envelope available balance.

### Feature 6.8: Multi-App Intent Dispatcher & NPCI Failure Diagnostic Engine
- **Functional Role**: Dispatches payment intents to target UPI apps and decodes Android activity results into user-friendly diagnostic messages.
- **Exact Source Code Locations**:
  - `src/services/payment/paymentService.ts` (Lines 21–669)
- **Schema & State Interactions**:
  - Supported apps (`UPI_APPS`): `gpay` (`com.google.android.apps.nbu.paisa.user`), `phonepe` (`com.phonepe.app`), `paytm` (`net.one97.paytm`), `bhim` (`in.org.npci.upiapp`), `chooser` (`upi://pay`).
  - Launches intent via `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: upiUri, packageName })`.
  - Normalizes `tezResponse` JSON into statuses: `SUCCESS`, `FAILURE`, `CANCELLED`, `SUBMITTED`, `UNKNOWN`.
  - Diagnoses NPCI error codes:
    - `ZA` / `resultCode === 0` -> User Cancelled (No funds deducted).
    - `ZM`, `U30`, `Z9`, `Z8`, `Z7`, `U19` -> Limits Exceeded.
    - `Z6` -> UPI PIN Locked (24-hour block).
    - `ZD`, `XQ`, `XR` -> Payee Validation Error.
    - `BT`, `RB`, `XY`, `YC` -> Bank CBS Downtime.
- **Failure Modes & Edge Cases**:
  - *User Cancellation*: Updates status to `CANCELLED`; does not alter envelope or snapshot balances.

### Feature 6.9: Assisted P2P Flow & First-Party Launcher
- **Functional Role**: Circumvents Android P2P third-party intent blocking by executing an assisted copy-and-launch workflow.
- **Exact Source Code Locations**:
  - `src/services/payment/paymentService.ts` (Lines 685–809)
  - `src/app/payment/confirm.tsx` (Lines 353–468)
- **Schema & State Interactions**:
  - Invokes `executeAssistedP2PFlow(payeeVpa, targetApp)`:
    1. Copies recipient VPA to system clipboard via `expo-clipboard`.
    2. Opens UPI app in first-party standalone mode via `IntentLauncher.openApplication(packageName)` or fallback launcher activity (`com.google.android.apps.nbu.paisa.user.launcher.LauncherActivity`).
    3. Prompts user upon return: "Did you complete the transfer in your UPI app?"
    4. Upon confirmation, records payment as `SUCCESS` with mode `ASSISTED_P2P`.
- **Failure Modes & Edge Cases**:
  - *Target App Missing*: Opens Google Play Store page for the target package.

### Feature 6.10: Payment Result Reveal & Ledger Finalization
- **Functional Role**: Displays transaction receipt with cyberpunk pixel reveal mask and finalizes ledger updates.
- **Exact Source Code Locations**:
  - `src/app/payment/result.tsx` (Lines 1–390)
  - `src/components/ui/PixelRevealReceiptCard.tsx` (Lines 1–239)
- **Schema & State Interactions**:
  - Calls `useAppStore.recordPaymentResult(paymentId, status, response)` on mount.
  - Finalizes SQLite payment via `database.finalizePayment`:
    - If `SUCCESS`: Deducts envelope balance, updates `balance_snapshots`, and inserts `PAYMENT_SUCCESS` into `ledger_events`.
    - If non-`SUCCESS`: Updates status without financial deductions.
  - Renders `PixelRevealReceiptCard` with amount, payee, bucket, remaining balance, and reference ID.
- **Failure Modes & Edge Cases**:
  - *Duplicate Finalize Call*: Database transaction checks status idempotently.

### Feature 6.11: Android Package Visibility Config Plugin
- **Functional Role**: Injects Android 11+ `<queries>` declarations into `AndroidManifest.xml` during EAS prebuild to permit package discovery.
- **Exact Source Code Locations**:
  - `plugins/withAndroidQueries.js` (Lines 1–73)
  - `app.json` (Line 36)
- **Schema & State Interactions**:
  - Injects target packages: `com.google.android.apps.nbu.paisa.user`, `com.phonepe.app`, `net.one97.paytm`, `in.org.npci.upiapp`, `com.cred.club`, `in.amazon.mShop.android.shopping`, `com.whatsapp`.
  - Injects `<intent><data android:scheme="upi"/><action android:name="android.intent.action.VIEW"/></intent>`.
- **Failure Modes & Edge Cases**:
  - Prebuild plugin executes deterministically during EAS build.

---

## 8. Module 7: SMS Ingestion & Reconciliation Pipeline (Reader, Trust, Filter, Grammars, Correlator, Reconciler)

### Feature 7.1: Native Android Permissions & Inbox Reader
- **Functional Role**: Requests SMS runtime permissions and interfaces with incoming SMS notifications.
- **Exact Source Code Locations**:
  - `src/services/sms/native/smsReader.ts` (Lines 1–96)
  - `plugins/withAndroidSms.js` (Lines 1–40)
  - `app.json` (Lines 27–28)
- **Schema & State Interactions**:
  - `requestSmsPermission()` requests `READ_SMS` and `RECEIVE_SMS` via `PermissionsAndroid.requestMultiple`.
  - `withAndroidSms.js` injects `uses-permission` tags into `AndroidManifest.xml`.
  - Provides synthetic bank notification fixtures (`SYNTHETIC_TEST_FIXTURES`) for testing.
- **Failure Modes & Edge Cases**:
  - *Non-Android OS (iOS / Web)*: Bypasses native calls and returns synthetic fixtures safely.

### Feature 7.2: TRAI DLT Sender Trust Evaluator
- **Functional Role**: Verifies transactional SMS sender headers against verified Indian banking DLT headers, rejecting promotional spam.
- **Exact Source Code Locations**:
  - `src/services/sms/trust/senderTrust.ts` (Lines 1–477)
- **Schema & State Interactions**:
  - Cleans header via `extractPrincipalHeader(sender)`: Strips 2-letter operator prefix (`VK-`, `AD-`) and route suffixes (`-S`, `-T`).
  - Evaluates against `BANK_SENDER_REGISTRY` (47+ Indian banks: SBI, HDFC, ICICI, Axis, Kotak, Federal, IDFC, Union Bank, PNB, BOB, Canara, etc.).
  - Rejects untrusted headers matching spam patterns (`promo`, `offer`, `deal`, `loan`, `rummy`, `bet`).
  - Returns `SenderEvaluation`: `{ trust: 'BANK' | 'KNOWN_FINANCIAL' | 'UNKNOWN' | 'UNTRUSTED', isTrusted: boolean, bankName }`.
- **Failure Modes & Edge Cases**:
  - *Spam SMS*: Discards message immediately with zero state side-effects.

### Feature 7.3: Financial Filter & Non-Bookable Gate
- **Functional Role**: Filters out non-bookable messages (OTPs, offers, future bills, declined alerts) to prevent false ledger entries.
- **Exact Source Code Locations**:
  - `src/services/sms/filter/financialFilter.ts` (Lines 1–182)
- **Schema & State Interactions**:
  - Rejects:
    - OTPs / Verification codes (`otp`, `verification code`, `valid for`)
    - Promotional pre-approved loans and credit cards
    - Future debit reminders (`will be debited`, `due date is`, `bill generated`)
    - Declined or failed transactions (`declined`, `unsuccessful`, `failed`)
  - Requires positive amount pattern (`/(?:rs\.?:?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?/i`) and account/card/UPI context pattern.
  - Classifies transaction direction: `EXPENSE`, `INCOME`, `REVERSAL`.
- **Failure Modes & Edge Cases**:
  - *OTP Discard*: Drops OTP alerts safely without altering database.

### Feature 7.4: Bank Grammar Dispatcher & String Normalizer
- **Functional Role**: Dispatches trusted financial SMS to dedicated bank regex grammars and converts amounts to integer paise.
- **Exact Source Code Locations**:
  - `src/services/sms/parser/index.ts` (Lines 1–90)
  - `src/services/sms/parser/normalizer.ts` (Lines 1–95)
- **Schema & State Interactions**:
  - `normalizer.ts`:
    - `parseAmountToPaise`: Converts string amounts to integer paise (`₹750.50` -> `75050`).
    - `normalizeMerchantName`: Strips transaction prefixes (`UPI/`, `POS/`, `NEFT/`) and legal suffixes (`LTD`, `PVT`).
    - `normalizeVpa`: Lowercases and trims whitespace.
    - `extractAccountLast4`: Extracts last 3-4 digits from masked account strings.
  - `parseSms`: Dispatches to bank parser based on sender header, falling back to `generic.ts`.
- **Failure Modes & Edge Cases**:
  - *Ambiguous Bank Header*: Falls back safely to Generic Indian Banking grammar.

### Feature 7.5: Bank-Specific Grammar Parsers (8 Banks + Generic)
- **Functional Role**: Extracts structured fields (`amountPaise`, `accountLast4`, `balanceAfterPaise`, `referenceId`, `merchantName`) using bank-specific regex grammars.
- **Exact Source Code Locations**:
  - `src/services/sms/parser/banks/hdfc.ts` (Lines 1–105)
  - `src/services/sms/parser/banks/sbi.ts` (Lines 1–88)
  - `src/services/sms/parser/banks/icici.ts` (Lines 1–82)
  - `src/services/sms/parser/banks/axis.ts` (Lines 1–86)
  - `src/services/sms/parser/banks/kotak.ts` (Lines 1–88)
  - `src/services/sms/parser/banks/federal.ts` (Lines 1–84)
  - `src/services/sms/parser/banks/idfc.ts` (Lines 1–90)
  - `src/services/sms/parser/banks/union.ts` (Lines 1–113)
  - `src/services/sms/parser/banks/generic.ts` (Lines 1–171)
- **Schema & State Interactions**:
  - `hdfc.ts`: Matches `Rs. X`, `A/C **XXXX`, `Bal Rs. Y`, `UPI Ref X`.
  - `sbi.ts`: Matches `Rs X`, `A/C XXXXX`, `Avl Bal Rs: Y`, `Ref No X`.
  - `icici.ts`: Matches `Info: UPI/<Merchant>/<VPA>`, `Acct XX4321`.
  - `axis.ts`: Matches `INR X`, `A/c no. XX4321`, `Avail Bal: INR Y`.
  - `kotak.ts`: Matches `Rs.X`, `AC XXXX`, `Bal: Rs.Y`.
  - `federal.ts`: Matches `Rs.X`, `A/C XXXX`, `Bal Rs.Y`.
  - `idfc.ts`: Matches `Rs.X`, `A/C XXXX`, `Avl Bal Rs.Y`.
  - `union.ts`: Supports Union Bank colon formats (`Rs:100.00`, `Fvg: <Merchant>`, `Mob Bk ref no`).
  - `generic.ts`: Universal fallback for NPCI-compliant debit/credit messages.
- **Failure Modes & Edge Cases**:
  - *Missing Balance After*: Sets `balanceAfterPaise` to undefined; does not halt transaction extraction.

### Feature 7.6: Fast Message Deduplication & Hash Generator
- **Functional Role**: Computes hybrid string hashes to reject duplicate SMS deliveries and duplicate ledger bookings.
- **Exact Source Code Locations**:
  - `src/services/sms/reconciliation/deduplicator.ts` (Lines 1–66)
  - `src/services/db/database.ts` (Lines 1611–1635)
- **Schema & State Interactions**:
  - `computeMessageHash`: Uses pure TypeScript DJB2 + FNV-1a 64-bit hex hash over sender, body, and 1-minute time bucket.
  - Queries `transaction_messages` table with indexed `message_hash UNIQUE`.
  - Computes economic transaction fingerprint: `tx_{ref}_{last4}_{amt}_{target}_{timeWindow}` using 5-minute buckets.
- **Failure Modes & Edge Cases**:
  - *Duplicate SMS Received*: Halts processing immediately; returns `{ status: 'DUPLICATE' }`.

### Feature 7.7: 3-Signal In-Flight Payment Correlator
- **Functional Role**: Correlates incoming bank debit SMS messages with in-app payment attempts initiated during UPI scanning.
- **Exact Source Code Locations**:
  - `src/services/sms/reconciliation/paymentCorrelator.ts` (Lines 1–109)
- **Schema & State Interactions**:
  - Queries `payment_attempts` with `status IN ('INITIATED', 'SUBMITTED')`.
  - Scores correlation across 4 signals:
    1. Reference ID match (+50 points)
    2. Exact Amount match (+30 points)
    3. Payee VPA or Merchant Name match (+20 / +15 points)
    4. Time Proximity within 10 minutes (+15 points) / 30 minutes (+5 points)
  - Thresholds: Score >= 70 -> `CONFIRMED`; Score >= 50 -> `STRONG_MATCH`.
  - On confirmation, updates attempt to `SUCCESS`, maps debit to user's intended envelope, updates snapshot, and writes `PAYMENT_SUCCESS` ledger event.
- **Failure Modes & Edge Cases**:
  - *Delayed SMS (>10 mins)*: Reference ID (+50) and Amount (+30) total 80 points, still achieving `CONFIRMED`.

### Feature 7.8: Real-Time Balance Reconciler
- **Functional Role**: Verifies that virtual tracked ledger balance matches the actual bank balance reported in SMS alerts.
- **Exact Source Code Locations**:
  - `src/services/sms/reconciliation/balanceReconciler.ts` (Lines 1–60)
  - `src/services/db/database.ts` (Lines 725–755)
- **Schema & State Interactions**:
  - `reconcileBalance()` calculates:
    $$\text{differencePaise} = |\text{trackedBalancePaise} - \text{latestReportedBalancePaise}|$$
  - Sub-10 paise tolerance allowed for rounding. If delta > 10 paise, marks status as `MISMATCH`.
  - Renders reconciliation alert banner in `BalanceHeader.tsx`.
- **Failure Modes & Edge Cases**:
  - *Balance Mismatch*: Does not silently transfer or adjust money; alerts user to unlogged cash or offline spending.

### Feature 7.9: SMS Ingestion Orchestrator
- **Functional Role**: Coordinates the multi-stage SMS pipeline from deduplication to SQLite atomic transaction booking.
- **Exact Source Code Locations**:
  - `src/services/sms/ingestion/smsIngestionService.ts` (Lines 1–355)
- **Schema & State Interactions**:
  - Executes: Deduplication against `transaction_messages` & `ignored_message_hashes` -> Sender Trust -> Financial Filter -> Grammar Parser -> Correlator -> 7-Tier Lexical Classifier -> SQLite atomic transaction via `db.withTransactionSync`.
- **Failure Modes & Edge Cases**:
  - *Transaction Rollback*: If any SQL constraint fails, SQLite rolls back changes atomically.

### Feature 7.10: Live 5-Second SMS Polling Engine & App Lifecycle Synchronizer
- **Functional Role**: Periodically polls the native Android SMS inbox every 5 seconds while the app is in the foreground, immediately processing financial debits, credits, and review queue additions live.
- **Exact Source Code Locations**:
  - `src/services/sms/live/liveSmsEngine.ts` (Lines 1–150)
  - `src/hooks/useLiveSmsEngine.ts` (Lines 1–30)
  - `src/app/_layout.tsx` (Lines 40–60)
  - `src/app/(tabs)/index.tsx` (Lines 95–105)
- **Schema & State Interactions**:
  - Polling interval: runs every 5000ms via `setInterval` while `AppState.currentState === 'active'`.
  - Mutex concurrency guard: prevents redundant overlapping scans during long query executions.
  - External Debit SMS: auto-allocated to matching envelope, or pushed to Review Queue with red dot badge if unassigned.
  - Live Credit SMS (`INCOME` / `REFUND`): immediately increments tracked balance snapshot and updates `unallocatedBalance`.
  - Closed App Lifecycle: ceases polling when app is backgrounded or closed (zero battery drain). On cold start or resume to `active`, immediately triggers catch-up scan (`pollNow()`).
- **Failure Modes & Edge Cases**:
  - *Closed App*: Engine does not poll in background; automatically catches up on all missed SMS upon app launch.
  - *No Permission*: Skips silently without triggering intrusive OS permission popups during polling loop.

---

## 9. Module 8: Local SQLite Ledger & Reactive State Store (14 tables, 10 indexes, Zustand slices & actions)

### Feature 8.1: Relational Database Engine & Invariant Verification
- **Functional Role**: Serves as the central persistent relational storage engine, enforcing WAL mode, foreign keys, and zero-sum money conservation.
- **Exact Source Code Locations**:
  - `src/services/db/database.ts` (Lines 1–2065)
- **Schema & State Interactions**:
  - Opens `mob.db` via `expo-sqlite/next` (`SQLite.openDatabaseSync('mob.db')`).
  - Configures `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;`.
  - **14 Relational Tables Defined**:
    1. `users` (`id`, `username`, `avatarUri`, `createdAt`, `phoneNumber`)
    2. `balance_snapshots` (`id`, `amount`, `source`, `createdAt`)
    3. `envelopes` (`id`, `name`, `archetype`, `currentAmount`, `allocatedAmount`, `minimumAmount`, `targetAmount`, `maximumAmount`, `icon`, `color`, `sortOrder`, `isActive`, `isUnallocated`)
    4. `ledger_events` (`id`, `type`, `amount`, `sourceEnvelopeId`, `destinationEnvelopeId`, `paymentId`, `note`, `createdAt`)
    5. `payment_transactions` (`id`, `envelopeId`, `requestedAmount`, `payeeVpa`, `payeeName`, `qrPayload`, `transactionRef`, `status`, `upiTxnId`, `approvalRefNo`, `responseCode`, `returnedAmount`, `createdAt`, `completedAt`)
    6. `profile` (`id`, `phone_number`, `created_at`, `updated_at`)
    7. `accounts` (`id`, `display_name`, `bank_name`, `account_last4`, `currency`, `source`, `initial_balance_paise`, `tracked_balance_paise`, `last_reported_balance_paise`, `created_at`, `updated_at`)
    8. `transactions` (`id`, `account_id`, `type`, `amount_paise`, `currency`, `merchant_name`, `payee_vpa`, `raw_narration`, `category_id`, `envelope_id`, `reference_id`, `upi_txn_id`, `account_last4`, `balance_after_paise`, `bank_name`, `channel`, `source`, `confidence`, `occurred_at`, `created_at`)
    9. `transaction_messages` (`id`, `transaction_id`, `sender`, `message_hash`, `received_at`, `parser_version`)
    10. `payment_attempts` (`id`, `envelope_id`, `requested_amount_paise`, `payee_name`, `payee_vpa`, `qr_payload`, `transaction_ref`, `upi_txn_id`, `approval_ref_no`, `response_code`, `returned_amount_paise`, `status`, `created_at`, `updated_at`)
    11. `merchant_rules` (`id`, `normalized_merchant`, `normalized_vpa`, `category_id`, `envelope_id`, `source`, `priority`, `created_at`, `updated_at`)
    12. `category_rules` (`id`, `pattern`, `match_type`, `category_id`, `priority`, `enabled`)
    13. `goals` (`id`, `name`, `target_amount_paise`, `current_balance_paise`, `cadence`, `installment_amount_paise`, `deadline`, `next_contribution_date`, `status`, `envelope_id`, `created_at`, `updated_at`)
    14. `goal_shortfalls` (`id`, `goal_id`, `due_date`, `planned_amount_paise`, `allocated_amount_paise`, `shortfall_amount_paise`, `unallocated_available_paise`, `resolved`, `created_at`)
  - **10 Performance & Uniqueness Indexes**:
    - `idx_transactions_account ON transactions(account_id)`
    - `idx_transactions_occurred ON transactions(occurred_at)`
    - `idx_transactions_ref ON transactions(reference_id)`
    - `idx_messages_hash ON transaction_messages(message_hash)`
    - `idx_payment_attempts_ref ON payment_attempts(transaction_ref)`
    - `idx_merchant_rules_vpa ON merchant_rules(normalized_vpa)`
    - `idx_merchant_rules_merchant ON merchant_rules(normalized_merchant)`
    - `idx_goals_status ON goals(status)`
    - `idx_goals_next_date ON goals(next_contribution_date)`
    - `idx_shortfalls_goal ON goal_shortfalls(goal_id)`
  - **Conservation Invariant Engine (`checkConservationInvariant`)**:
    $$\text{difference} = |\text{trackedBalance} - (\text{allocatedBalance} + \text{unallocatedBalance})| < 0.01$$
- **Failure Modes & Edge Cases**:
  - *Invariant Breach*: Emits console error and triggers UI warning banner if difference >= 0.01.

### Feature 8.2: Integer-Paise Money Architecture
- **Functional Role**: Guarantees financial math precision by computing all monetary values in integer paise (1 INR = 100 paise), avoiding IEEE 754 floating-point drift.
- **Exact Source Code Locations**:
  - `src/utils/money.ts` (Lines 1–84)
  - `src/types/index.ts` (Line 1)
- **Schema & State Interactions**:
  - Type: `type MoneyPaise = number;`
  - Functions:
    - `toPaise(rupees: number): MoneyPaise` -> `Math.round(rupees * 100)`
    - `toRupees(paise: MoneyPaise): number` -> `paise / 100`
    - `addPaise(...amounts: MoneyPaise[]): MoneyPaise`
    - `subPaise(a: MoneyPaise, b: MoneyPaise): MoneyPaise`
    - `formatPaise(paise: MoneyPaise, showDecimalsIfZero?: boolean): string`
- **Failure Modes & Edge Cases**:
  - Rounding error completely eliminated by performing addition and subtraction solely on integer values.

### Feature 8.3: TypeScript Domain Interfaces
- **Functional Role**: Declares structural interfaces and domain contracts across all application modules.
- **Exact Source Code Locations**:
  - `src/types/index.ts` (Lines 1–389)
- **Schema & State Interactions**:
  - Defines `Envelope`, `LedgerEvent`, `PaymentTransaction`, `ParsedUPIQR`, `PaymentAttempt`, `Transaction`, `Account`, `Goal`, `GoalShortfall`, `MerchantRule`, `CategoryRule`, `UserProfile`.
- **Failure Modes & Edge Cases**:
  - Type-checked with zero errors (`npx tsc --noEmit` exit code 0).

### Feature 8.4: Zustand Reactive Application State Store
- **Functional Role**: Centralized reactive state store driving all UI views, rehydrated directly from SQLite relational tables.
- **Exact Source Code Locations**:
  - `src/store/useAppStore.ts` (Lines 1–618)
- **Schema & State Interactions**:
  - **Direct Relational Hydration Pattern**: State mutations execute SQLite queries in `database.ts`, then call `getUpdatedStoreState()` to refresh the Zustand slice directly from database state.
  - **14 Reactive State Slices**: `isInitialized`, `user`, `trackedBalance`, `allocatedBalance`, `unallocatedBalance`, `envelopes`, `ledgerEvents`, `paymentTransactions`, `transactions`, `unclassifiedTransactions`, `primaryAccount`, `reconciliationResult`, `merchantRules`, `goals`, `shortfalls`, `isLoading`.
  - **22 Store Action Methods**:
    1. `loadInitialData()`
    2. `completeOnboarding()`
    3. `updateProfileImage()`
    4. `addMoney()`
    5. `allocateToEnvelope()`
    6. `transferBetweenEnvelopes()`
    7. `createCustomEnvelope()`
    8. `deleteEnvelope()`
    9. `recordManualSpend()`
    10. `recordPayment()`
    11. `recordPaymentResult()`
    12. `ingestSmsMessage()`
    13. `reconcileTrackedBalance()`
    14. `teachMerchantRule()`
    15. `assignTransactionToBucket()`
    16. `createGoal()`
    17. `updateGoal()`
    18. `deleteGoal()`
    19. `runScheduledGoalAllocations()`
    20. `recoverShortfall()`
    21. `resetBucketsAndActivity()`
    22. `resetDatabase()`
- **Failure Modes & Edge Cases**:
  - *Concurrency*: Relational rehydration ensures UI state never drifts from on-disk database truth.

---

## 10. Module 9: Activity Timeline, Review Queue & Rules

### Feature 9.1: Unified Activity & Audit Timeline
- **Functional Role**: Presents a filterable audit trail of all transactions, bank events, and ledger adjustments with detail inspection modals.
- **Exact Source Code Locations**:
  - `src/app/activity.tsx` (Lines 1–210)
  - `src/components/ui/AnimatedPillTabs.tsx` (Lines 1–80)
- **Schema & State Interactions**:
  - Filters via `AnimatedPillTabs`: `'All'`, `'Review'`, `'Bank'`, `'Payments'`, `'Ledger'`.
  - Transaction detail modal shows raw SMS notification body, categorization confidence, matched rule ID, and bucket reassignment button.
- **Failure Modes & Edge Cases**:
  - *Empty Timeline*: Displays illustration when filtered category contains zero transactions.

### Feature 9.2: 75% Viewport Review Queue Modal & Rule Learning
- **Functional Role**: Interactive transaction review deck anchored to top-left of dashboard for allocating unclassified SMS transactions, featuring explicit "Unallocated" support, live balance displays, and zero new-bucket creation affordances.
- **Exact Source Code Locations**:
  - `src/components/dashboard/ReviewQueuePopup.tsx` (Lines 1–784)
  - `src/store/useAppStore.ts` (Lines 484–540)
  - `src/services/db/database.ts` (Lines 1525–1574)
  - `src/services/sms/ingestion/smsIngestionService.ts` (Lines 130–185)
- **Schema & State Interactions**:
  - Occupies 75% width and 75% height of screen with spring zoom transition from the top-left origin.
  - **Transaction Card**: Prominently shows person/merchant name, VPA sub-label, amount formatted in ₹ with tabular-nums (`formatPaise(item.amountPaise, true)`), readable date, and raw SMS snippet.
  - **Bucket Selection Section**:
    - **Dedicated "Unallocated" Option Card**: Placed as first selectable card with dashed neutral styling and live `unallocatedBalance`. Allocating to Unallocated updates transaction `envelope_id = 'unallocated'`, deducts from `balance_snapshots` (reducing unallocated balance), and logs a ledger audit event without modifying any envelope.
    - **Categorized Buckets**: Distinct cards displaying envelope name, color pip, and live balance (`₹X,XXX`). Tapping deducts from the envelope and tracked balance snapshot.
    - **Zero New-Bucket Affordance**: Per design constraint, no bucket creation controls are rendered in the review modal.
  - **Deterministic Rule Learning**:
    - Selecting an envelope or Unallocated calls `teachMerchantRule`: persists a high-priority rule in SQLite `merchant_rules` (`priority: 10`) keyed by normalized payee VPA and merchant name.
    - Subsequent incoming SMS transactions matching this payee automatically allocate to the specified destination (`envelopeId` or `'unallocated'`) without appearing in the review queue.
- **Failure Modes & Edge Cases**:
  - *Consecutive Allocation Stability*: Decoupled animations and safe index clamping ensure flawless transition between cards without crashing or blank renders.
  - *Queue Clean State*: Displays emerald checkmark confirmation when all items have been assigned.

### Feature 9.3: 7-Tier Lexical Categorization Engine
- **Functional Role**: Classifies raw SMS transactions into categories using deterministic rules and local dictionaries without cloud AI.
- **Exact Source Code Locations**:
  - `src/services/sms/categorization/classifier.ts` (Lines 1–193)
  - `src/services/sms/categorization/merchantDictionary.ts` (Lines 1–406)
  - `src/services/sms/categorization/taxonomy.ts` (Lines 1–174)
- **Schema & State Interactions**:
  - Evaluates 7 Hierarchical Tiers:
    - **Tier 1 (Confidence 1.0)**: Exact User VPA Rule (from SQLite `merchant_rules`).
    - **Tier 2 (Confidence 0.98)**: Exact User Merchant Name Rule.
    - **Tier 3 (Confidence 0.95)**: Known Merchant Dictionary (150+ Indian brands: Swiggy, Zomato, Blinkit, Zepto, Uber, Ola, Dominos, KFC, Amazon, Flipkart, Netflix, etc.).
    - **Tier 4 (Confidence 0.85)**: Strong Token Overlap with known merchants (token intersection length >= 3).
    - **Tier 5 (Confidence 0.80)**: Category Keyword Match in narration (e.g. `petrol`, `fuel`, `hospital`, `cinema`).
    - **Tier 6 (Confidence 0.70–0.95)**: Channel / Transaction Context (ATM -> `CASH_ATM`, Salary -> `INCOME`, Reversal -> `REFUND`).
    - **Tier 7 (Confidence 0.0)**: Ambiguous -> `UNCLASSIFIED` (Sent to Review Queue).
- **Failure Modes & Edge Cases**:
  - *Unrecognized Merchant*: Defaults to Tier 7 `UNCLASSIFIED`, queuing in Review Queue rather than miscategorizing.

---

## 11. Module 10: Settings, Profile & Telemetry

### Feature 10.1: User Settings & Profile Photo Lifecycle
- **Functional Role**: Allows user to manage profile details, edit avatar photo with live preview and persistence, trigger inbox re-scanning, and perform bucket/database resets.
- **Exact Source Code Locations**:
  - `src/app/(tabs)/settings.tsx` (Lines 1–350)
  - `src/store/useAppStore.ts` (Lines 210–288)
  - `src/services/db/database.ts` (Lines 280–342)
- **Schema & State Interactions**:
  - Profile photo set during onboarding Step 1 (`username.tsx`) forwards across `sms-permission.tsx` and `allocation.tsx`, committing to SQLite `users` table via `saveUserProfile(username, cleanAvatar)`.
  - In-app photo editing: Tapping pencil button on `<ReflectiveCard />` launches gallery picker and executes `updateProfileImage(uri)`, committing to SQLite via `updateUserAvatar(uri)` and refreshing Zustand `user.avatarUri`.
  - "Reset Buckets & Activity": Wipes envelopes and transactions, returning all funds to unallocated balance.
  - "Factory Reset": Completely deletes all SQLite tables and returns to onboarding.
- **Failure Modes & Edge Cases**:
  - *No Photo / Whitespace*: Normalizes empty or blank URIs to `undefined`, seamlessly falling back to GPU 3D pixel sculpt.
  - *Accidental Reset*: Requires double-confirmation dialog before executing data wipe.

### Feature 10.2: 3D Reflective Holographic Profile Card & WebGL Mosaic Relief Tiles
- **Functional Role**: Displays user profile on an interactive monolithic card with 3D WebGL mosaic relief tiles (`PixelSculptImage`), transforming user avatar photos or procedural metallic textures into tactile 3D displaced blocks with chamfered seams, bevel normals, specular shine, and real-time touch ripple physics.
- **Exact Source Code Locations**:
  - `src/components/ui/ReflectiveCard.tsx` (Lines 1–370)
  - `src/components/ui/PixelSculptImage.tsx` (Lines 1–815)
- **Schema & State Interactions**:
  - Resolves `effectiveAvatar = avatarUri || user?.avatarUri`.
  - Background surface: Renders GPU-accelerated 3D Pixel Sculpt relief tiles (`PixelSculptImage`) with `source={effectiveAvatar || ''}`. When an avatar photo exists, WebGL samples luminance at tile centers to elevate tiles into 3D relief blocks. When absent, it renders a procedural high-contrast dark metallic cyber silhouette.
  - Interactive touch ripple: `onTouchStart` and `onTouchMove` calculate normalized UV coordinates and invoke `pixelSculptRef.current?.triggerRipple(u, v, 1.0)`, generating propagating wave ripples across the 3D mosaic tiles.
  - Interactive touch tilt: calculates normalized coordinates on `onTouchMove` to drive Reanimated 3D perspective rotation (`rotateX`, `rotateY`, `scale`) and specular reflection sheen sweep.
- **Failure Modes & Edge Cases**:
  - Disables continuous motion and sweeps when `useReducedMotion` is active or touch ends.

### Feature 10.3: Fullscreen Canvas Particle Dissolve Effect
- **Functional Role**: Executes high-energy visual particle explosion overlay during database reset and major state transitions.
- **Exact Source Code Locations**:
  - `src/components/ui/FullscreenParticleEffect.tsx` (Lines 1–130)
- **Schema & State Interactions**:
  - Emits 80+ dynamic canvas particles fading and dispersing outward over 1200ms.
- **Failure Modes & Edge Cases**:
  - Automatically unmounts canvas upon animation completion to free memory.

---

## 12. Module 11: Resend Dark Design System & Accessibility Tokens

### Feature 11.1: Resend Dark Palette Tokens
- **Functional Role**: Defines strict dark mode color constants conforming to Resend dark aesthetic standards.
- **Exact Source Code Locations**:
  - `src/theme/colors.ts` (Lines 1–32)
  - `src/theme/index.ts` (Lines 1–10)
- **Schema & State Interactions**:
  - Surfaces: `surfaceBase: '#060606'`, `surfaceRaised: '#1D1D1D'`, `surfaceElevated: '#141414'`, `surfaceOverlay: '#000000'`.
  - Accents: `accent: '#5E6AD2'`, `accentHover: '#727DE0'`, `accentLight: '#FEFEFE'`, `accentDark: '#060606'`.
  - Typography: `textPrimary: '#FFFFFF'`, `textSecondary: '#BBBBBB'`, `textTertiary: '#6E6E6E'`, `textDisabled: '#404040'`.
  - Borders: `borderDefault: '#191919'`, `borderHighlight: '#2A2A2A'`, `borderActive: '#5E6AD2'`.
  - Status: `statusSuccess: '#1DB954'`, `statusWarning: '#FFA000'`, `statusError: '#E91429'`, `statusPending: '#5E6AD2'`.
- **Failure Modes & Edge Cases**:
  - Applied uniformly across all screens; light mode is disabled.

### Feature 11.2: 4px Grid Spacing & 15px Border Radius Tokens
- **Functional Role**: Enforces strict 4px grid spacing and standard 15px border radii.
- **Exact Source Code Locations**:
  - `src/theme/spacing.ts` (Lines 1–23)
- **Schema & State Interactions**:
  - Spacing Scale: `xxs: 2`, `xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `xxl: 24`, `xxxl: 32`, `huge: 60`.
  - Border Radius Scale: `sm: 10`, `default: 15`, `md: 15`, `lg: 15`, `pill: 24`, `full: 9999`.
- **Failure Modes & Edge Cases**:
  - All cards, modals, and input fields adhere to `borderRadius.default` (15px).

### Feature 11.3: Typography Scale & Tabular Numerals
- **Functional Role**: Standardizes font sizing, letter spacing, and tabular figure styling for financial numbers.
- **Exact Source Code Locations**:
  - `src/theme/typography.ts` (Lines 1–49)
- **Schema & State Interactions**:
  - Hierarchy: `h1` (32px, -0.5 letter spacing), `h2` (24px, -0.3 letter spacing), `h3` (18px), `body` (14px, 20px line height), `bodyMuted` (14px), `caption` (12px), `tabularFigure` (`fontVariant: ['tabular-nums']`), `buttonText` (14px, 600 weight).
- **Failure Modes & Edge Cases**:
  - `tabular-nums` prevents number shaking/jittering during CountUp rolling animations.

### Feature 11.4: Platform Fallback Constants
- **Functional Role**: Supplies platform fallback colors and standard font stacks for Expo navigation theme wrappers.
- **Exact Source Code Locations**:
  - `src/constants/theme.ts` (Lines 1–35)
- **Schema & State Interactions**:
  - Configures dark theme default colors.
- **Failure Modes & Edge Cases**:
  - Provides fallback if custom theme fails to load.

### Feature 11.5: Reduced Motion Accessibility Hook
- **Functional Role**: Detects system accessibility preference for reduced motion and disables heavy spring animations.
- **Exact Source Code Locations**:
  - `src/hooks/useReducedMotion.ts` (Lines 1–39)
- **Schema & State Interactions**:
  - Queries `AccessibilityInfo.isReduceMotionEnabled()`.
  - Listens to `reduceMotionChanged` events.
  - Consumed by `PixelCard`, `CountUp`, `MorphingDeck`, `SlideCommit`.
- **Failure Modes & Edge Cases**:
  - Defaults to `false` if `AccessibilityInfo` query rejects.

### Feature 11.6: Standard Design System Components
- **Functional Role**: Encapsulates atomic UI building blocks adhering to Resend design tokens.
- **Exact Source Code Locations**:
  - `src/components/common/Button.tsx` (Lines 1–80)
  - `src/components/common/Card.tsx` (Lines 1–60)
  - `src/components/common/Input.tsx` (Lines 1–70)
  - `src/components/ui/GeometricPreloader.tsx` (Lines 1–65)
  - `src/components/ui/ResendGlowCard.tsx` (Lines 1–75)
  - `src/components/ui/PixelSculptImage.tsx` (Lines 1–95)
- **Schema & State Interactions**:
  - `Button.tsx`: High-contrast variants (`primary`, `secondary`, `outline`).
  - `Card.tsx`: Standard 15px border radius container with `surfaceRaised` background and 1px `borderDefault` border.
  - `Input.tsx`: Form text input with focus highlight border.
  - `GeometricPreloader.tsx`: Minimal wireframe loading spinner.
  - `ResendGlowCard.tsx`: Container with radial gradient border glow.
  - `PixelSculptImage.tsx`: WebGL 3D displacement tile relief shader.
- **Failure Modes & Edge Cases**:
  - Components render gracefully across iOS, Android, and Web platforms.

---

## 13. Section 12: Comprehensive End-to-End Data Flows

### 13.1 Flow 1: Unified In-App Merchant Payment Trace (QR Scan -> UPI Intent -> Google Pay -> SMS -> Correlator -> SQLite Ledger)

This sequence traces the complete lifecycle of a user scanning a merchant QR code, executing payment via Google Pay, receiving a telecom bank debit SMS, correlating the intent, and booking the ledger transaction:

```
Step 1: Optical Scan
  User points camera at merchant QR code.
  `src/app/payment/scan.tsx` (`CameraView`) scans barcode payload `upi://pay?pa=merchant@okhdfcbank&pn=Chai+Point&am=120.00&mc=5812`.
  `QRScannerReticle.tsx` renders laser sweeping line.

Step 2: Zod URI Parsing & Target Classification
  `parseUPIUri()` in `src/services/payment/upiParser.ts` parses query parameters and validates via `upiQRPayloadSchema`.
  `classifyUPIPayment()` in `src/services/payment/upiHandles.ts` inspects `mc: '5812'` and classifies target as `P2M`.
  Scanner navigates to `/payment/confirm` with envelope ID and parsed QR object.

Step 3: Confirmation Review & SlideCommit Gesture
  `src/app/payment/confirm.tsx` renders `PixelCard.tsx` WebGL shimmer background.
  User verifies: Payee "Chai Point", Amount "₹120.00", Deducting Bucket "Dining" (Balance: ₹1,500.00).
  User drags `SlideCommit.tsx` circular handle past >= 85% threshold.

Step 4: Pending Attempt Insertion & URI Generation
  `confirm.tsx` inserts a pending record into `payment_transactions` and `payment_attempts`:
    - `transactionRef`: `V1-1718000000-XYZ`
    - `status`: `'INITIATED'`
    - `requested_amount_paise`: 12000
    - `payee_vpa`: `merchant@okhdfcbank`
  `buildUPIUri()` in `src/services/payment/uriBuilder.ts` generates outbound URI:
    - Strips internal `tr=V1...` reference to prevent acquirer gateway rejection.
    - Preserves merchant tags (`mc=5812`).
    - Strips `pn` if it equals a phone number or VPA prefix (Anti-Spoofing Rule).

Step 5: Android UPI Intent Launch
  `launchUPIIntent()` in `src/services/payment/paymentService.ts` dispatches:
    `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: upiUri, packageName: 'com.google.android.apps.nbu.paisa.user' })`.
  Android launches Google Pay in the foreground. MOB enters background state.

Step 6: Payment Execution in Google Pay
  User confirms payment and enters UPI PIN inside Google Pay.
  Google Pay completes Core Banking Solution (CBS) debit.

Step 7: AppState Resume & Intent Normalization
  User returns to MOB. `_layout.tsx` detects `AppState === 'active'`.
  `normalizeUPIResponse()` in `paymentService.ts` parses `tezResponse`:
    - `Status`: `'SUCCESS'`
    - `txnId`: `'UPI-TXN-987654321'`
    - `ApprovalRefNo`: `'412356789012'`

Step 8: Telecom SMS Arrival & Deduplication Gate
  Concurrently, bank sends transaction alert:
    `"Debited Rs.120.00 from A/C **4321 on 15-Oct-26 towards Chai Point UPI Ref 412356789012. Avl Bal Rs.24,880.00 - HDFC Bank"`
  `processIncomingSms()` in `src/services/sms/ingestion/smsIngestionService.ts` is invoked.
  `computeMessageHash()` in `src/services/sms/reconciliation/deduplicator.ts` generates DJB2/FNV-1a 64-bit hash `msg_a7b8c9d0e1f2`.
  Verifies hash is not in `transaction_messages`.

Step 9: Sender Trust & Financial Filter Gates
  `evaluateSenderTrust('VK-HDFCBK')` in `src/services/sms/trust/senderTrust.ts`:
    - Cleans header to `HDFCBK`.
    - Matches HDFC Bank in `BANK_SENDER_REGISTRY` -> `trust: 'BANK'`.
  `isBookableFinancialMessage()` in `src/services/sms/filter/financialFilter.ts`:
    - Checks negative filters: Not an OTP, not promotional, not a future bill.
    - Confirms debit keyword `Debited`, amount `Rs.120.00`, account context `A/C **4321`.
    - Returns `direction: 'EXPENSE'`.

Step 10: Bank Grammar Parsing
  `parseSms()` dispatches to `src/services/sms/parser/banks/hdfc.ts`.
  Extracts:
    - `amountPaise`: 12000
    - `accountLast4`: `'4321'`
    - `referenceId`: `'412356789012'`
    - `merchantName`: `'Chai Point'`
    - `balanceAfterPaise`: 2488000

Step 11: 3-Signal Payment Correlation
  `correlatePaymentWithSms()` in `src/services/sms/reconciliation/paymentCorrelator.ts`:
    - Signal 1: Exact Approval Ref No / Reference ID match (`412356789012`) -> +50 points
    - Signal 2: Exact Amount match (12000 paise) -> +30 points
    - Signal 3: Merchant name match ("Chai Point") -> +20 points
    - Signal 4: Time delta < 1 minute -> +15 points
    - Total Score: 115 / 100 -> Status: `CONFIRMED`.

Step 12: Atomic SQLite Ledger Update & Conservation Invariant
  `smsIngestionService.ts` executes atomic transaction via `db.withTransactionSync`:
    1. Updates `payment_attempts` SET `status = 'SUCCESS'`, `upi_txn_id = 'UPI-TXN-987654321'`.
    2. Updates `envelopes` SET `currentAmount = currentAmount - 120.00` WHERE `id = 'dining'`.
    3. Inserts `balance_snapshots` row recording new tracked total (₹24,880.00).
    4. Inserts `ledger_events` record with `type = 'PAYMENT_SUCCESS'`, `amount = 120.00`.
    5. Inserts `transactions` record linked to Dining envelope.
    6. Inserts `transaction_messages` recording message hash `msg_a7b8c9d0e1f2`.
    7. Calls `checkConservationInvariant()` -> Verifies `trackedBalance == allocatedBalance + unallocatedBalance`.

Step 13: Receipt Reveal Screen
  `src/app/payment/result.tsx` displays `PixelRevealReceiptCard.tsx`:
    - Animated cyberpunk unmasking reveals "₹120.00 Paid to Chai Point".
    - Displays remaining Dining bucket balance: "₹1,380.00 remaining".
    - User taps "Done", returning to Dashboard.
```

---

### 13.2 Flow 2: Assisted P2P Workflow Trace

```
Step 1: User Scans Personal QR / Enters Mobile Number
  QR payload contains personal VPA: `upi://pay?pa=9876543210@okaxis&pn=Ramesh+Kumar`.
  `classifyUPIPayment()` in `src/services/payment/upiHandles.ts` detects 10-digit phone number and non-merchant handle -> Classifies as `P2P`.

Step 2: Human Interstitial Modal
  `src/app/payment/confirm.tsx` detects `P2P` classification.
  Renders 4-step modal explaining: "Android security rules block direct third-party personal transfers. We will copy the VPA and open your UPI app."

Step 3: User Slides to Commit
  User drags `SlideCommit.tsx` slider.
  Calls `handleLaunchAssistedP2P()` in `confirm.tsx`.
  Inserts `payment_attempts` record with `status: 'INITIATED'`.

Step 4: Clipboard Copy & First-Party Launch
  `executeAssistedP2PFlow()` in `src/services/payment/paymentService.ts`:
    - Calls `Clipboard.setStringAsync('9876543210@okaxis')`.
    - Dispatches `IntentLauncher.openApplication('com.google.android.apps.nbu.paisa.user')`.
    - Direct launcher activity opens Google Pay in first-party standalone mode.

Step 5: User Transfers & Returns
  User pastes VPA into Google Pay, completes transfer, and switches back to MOB.
  `AppState` listener detects return.
  Confirmation dialog appears: "Did you complete the transfer of ₹500 to Ramesh Kumar?"

Step 6: Ledger Commit
  User taps "Yes, Completed":
    - Calls `finalizePayment(SUCCESS)`.
    - Deducts ₹500 from selected envelope and `balance_snapshots`.
    - Inserts `ledger_events` row.
    - Routes to `result.tsx` showing success receipt.
```

---

### 13.3 Flow 3: Autonomous External Transaction Ingestion Trace

```
Step 1: Telecom SMS Arrival Outside App
  User spends ₹350 at Swiggy using desktop laptop or card; phone receives SMS:
    `"INR 350.00 debited from A/C XX9821 on 15-OCT-26 towards UPI/SWIGGY/swiggy@icici. Avl Bal: INR 18,200.00 - Axis Bank"`

Step 2: Pipeline Gate Evaluation
  `smsIngestionService.processIncomingSms()`:
    1. Deduplication: Hash generated and checked -> Not a duplicate.
    2. Trust Gate: `AXISBK` header authenticated as `BANK`.
    3. Financial Gate: Validated as `EXPENSE`, amount `350.00`, account `XX9821`.
    4. Grammar Parser: `src/services/sms/parser/banks/axis.ts` extracts `amountPaise: 35000`, `merchant: 'SWIGGY'`, `payeeVpa: 'swiggy@icici'`.

Step 3: Correlation Miss
  `correlator.correlatePaymentWithSms()`:
    - No in-flight in-app payment attempts found -> Returns null.

Step 4: 7-Tier Lexical Classification
  `classifyTransaction()` in `src/services/sms/categorization/classifier.ts`:
    - Tier 1 (User VPA Rule): No match.
    - Tier 2 (User Merchant Rule): No match.
    - Tier 3 (Known Merchant Dictionary): Matches `"SWIGGY"` in `KNOWN_MERCHANTS`:
      - Category: `FOOD_DINING`
      - Confidence: `0.95`

Step 5: Envelope Mapping & Review Queue Routing
  System checks active envelopes:
    - If user has an envelope mapped to `FOOD_DINING` (e.g. "Food"):
      - Deducts ₹350 from "Food" envelope.
      - Updates `balance_snapshots` and writes `ledger_events`.
    - If user has NO matching envelope or transaction is `UNCLASSIFIED`:
      - Inserts into `transactions` table with `envelope_id = NULL`.
      - Increments Review Queue badge count on Dashboard.

Step 6: User Review Queue Assignment & Rule Learning
  User taps Review Queue badge on Dashboard:
    - `ReviewQueuePopup.tsx` opens showing Swiggy transaction card.
    - User taps "Dining Out" envelope.
    - System calls `assignTransactionToBucket()`:
      - Deducts ₹350 from "Dining Out".
      - Inserts new custom rule in `merchant_rules` table (`normalized_merchant = 'swiggy'`, `envelope_id = 'dining-out'`).
    - Next time an SMS arrives from Swiggy, Tier 2 automatically routes to "Dining Out"!
```

---

### 13.4 Flow 4: Goal Cadence Execution & Shortfall Recovery Trace

```
Step 1: Scheduled Cadence Trigger
  App boots or returns to foreground via `AppState` listener.
  Invokes `useAppStore.runScheduledGoalAllocations()`.

Step 2: Installment Evaluation
  `goalPlanner.processScheduledGoalAllocations()` queries `goals` where `status = 'ACTIVE'` and `next_contribution_date <= today`.
  For Goal "MacBook Pro" (Target: ₹1,50,000, Cadence: Monthly, Required Installment: ₹12,500):
    - Checks `unallocatedBalancePaise`.

Step 3: Partial Allocation Default
  Case A: Unallocated Cash has ₹15,000.
    - Transfers ₹12,500 from Unallocated Cash to Goal Virtual Envelope (`archetype = 'GOAL'`).
    - Updates `next_contribution_date` by +1 month via `advanceNextDueDate()`.
  Case B: Unallocated Cash has only ₹4,000 (Shortfall of ₹8,500).
    - Transfers available ₹4,000 to Goal Envelope.
    - Generates record in `goal_shortfalls`:
      `shortfall_amount_paise = 850000`, `resolved = 0`.
    - Updates goal's `next_contribution_date`.

Step 4: Shortfall Alert & User Recovery
  `src/app/(tabs)/goals.tsx` detects unresolved shortfall; renders amber Shortfall Strain Alert card.
  User taps "Fix Shortfall":
    - Opens Shortfall Recovery modal.
    - User selects source envelope "Entertainment" (which has ₹10,000 surplus).
    - Calls `useAppStore.recoverShortfall('entertainment', goalId, 850000)`.
    - Performs atomic transfer from Entertainment envelope to Goal Envelope.
    - Updates `goal_shortfalls` SET `resolved = 1`.
    - Recalculates remaining installment obligations.
```

---

### 13.5 Flow 5: Onboarding & Account Discovery Lifecycle Trace

```
Step 1: App Boot First Run
  `_layout.tsx` initializes `mob.db` SQLite database.
  `index.tsx` checks `useAppStore.isOnboarded` -> `false`.
  Redirects to `/(onboarding)/username`.

Step 2: Profile Setup
  `username.tsx`: User inputs name "Aarav" and picks avatar photo.
  Taps Continue -> Routes to `sms-permission.tsx`.

Step 3: Inbox Scanning & Account Discovery
  `sms-permission.tsx`:
    - User grants `READ_SMS` permission.
    - State machine transitions to `THINKING`. `ThoughtLine.tsx` cycles status text.
    - `smsReader.ts` scans messages.
    - Finds Union Bank (*0221, ₹35,000) and HDFC Bank (**4321, ₹25,000).
    - State transitions to `REVEALED`.
    - `DecryptedText.tsx` animates masked numbers and reveals total: ₹60,000.
    - User keeps both accounts toggled on.
    - Taps Continue -> Routes to `allocation.tsx`.

Step 4: Virtual Envelope Percentage Allocation
  `allocation.tsx`:
    - Total Tracked: ₹60,000.
    - Sliders: Needs (50% = ₹30,000), Wants (30% = ₹18,000), Savings (15% = ₹9,000).
    - Remainder: ₹3,000 (5%) automatically allocated to Unallocated Liquid Cash.
    - User taps "Activate Operating System".

Step 5: Completion & Invariant Verification
  `useAppStore.completeOnboarding()`:
    - Writes user to `users` table.
    - Writes bank accounts to `accounts` table.
    - Writes Needs, Wants, Savings to `envelopes` table.
    - Inserts `balance_snapshots` row: ₹60,000.00.
    - Sets `isOnboarded: true`.
    - Checks conservation invariant: `|60000 - (30000 + 18000 + 9000 + 3000)| < 0.01` -> PASSED.
    - Displays `OnboardingActivationModal.tsx` confetti celebration.
    - Routes to `/(tabs)/index.tsx` (Dashboard).
```

---

## 14. Appendix: Complete Verified Source File Inventory & Matrix

Every single relative file path listed in the matrix below exists on disk under `d:/sub-projects/ruposh/MOB` and has been verified by the automated path test suite:

| # | Relative File Path (under `MOB/`) | Primary Module | Core Functionality & Exported Symbols |
|---|---|---|---|
| 1 | `app.json` | Project Configuration | Expo configuration, camera & SMS permissions, package bundle identifiers |
| 2 | `plugins/withAndroidQueries.js` | Module 6: Payments | Android 11+ `<queries>` package visibility for 7 UPI apps & `upi://` scheme |
| 3 | `plugins/withAndroidSms.js` | Module 7: SMS Pipeline | Android manifest injector for `READ_SMS` and `RECEIVE_SMS` permissions |
| 4 | `src/app/_layout.tsx` | Module 1: Root Navigation | Root Stack navigator, SQLite initialization, splash teardown, AppState resume listener |
| 5 | `src/app/index.tsx` | Module 1: Root Navigation | App gateway redirector checking `useAppStore.isOnboarded` |
| 6 | `src/app/(tabs)/_layout.tsx` | Module 1: Root Navigation | Bottom tabs layout hosting `RubberBottomTabBar` |
| 7 | `src/components/navigation/RubberBottomTabBar.tsx` | Module 1: Root Navigation | Floating pill bottom tab bar with elastic squish spring physics |
| 8 | `src/components/common/DecryptedSplashOverlay.tsx` | Module 1: Root Navigation | Fullscreen ASCII startup decryption animation overlay |
| 9 | `src/app/(onboarding)/_layout.tsx` | Module 2: Onboarding | Horizontal slide animation onboarding stack container |
| 10 | `src/app/(onboarding)/username.tsx` | Module 2: Onboarding | Step 1: User display name, avatar library picker, initials monogram |
| 11 | `src/components/ui/WorkspaceTopStepper.tsx` | Module 2: Onboarding | Top step progress indicator (Step 1 of 3) |
| 12 | `src/app/(onboarding)/sms-permission.tsx` | Module 2: Onboarding | Step 2: 3-phase SMS scanner, `ThoughtLine`, `DecryptedText` account reveal |
| 13 | `src/components/ui/ThoughtLine.tsx` | Module 2: Onboarding | AI thought reasoning text cycler with vertical fade animation |
| 14 | `src/components/ui/DecryptedText.tsx` | Module 2: Onboarding | Scramble glyph decipher reveal animation |
| 15 | `src/app/(onboarding)/allocation.tsx` | Module 2: Onboarding | Step 3: Percentage envelope slider allocation and remainder cash tracking |
| 16 | `src/components/ui/OnboardingActivationModal.tsx` | Module 2: Onboarding | Celebratory onboarding completion modal with confetti particle animation |
| 17 | `src/app/(onboarding)/phone.tsx` | Module 2: Onboarding | Fallback manual phone number input screen |
| 18 | `src/app/(onboarding)/balance.tsx` | Module 2: Onboarding | Fallback manual starting balance input screen |
| 19 | `src/app/(tabs)/index.tsx` | Module 3: Dashboard | Dashboard command center, review queue badge, Grid/Stack deck switcher |
| 20 | `src/components/dashboard/BalanceHeader.tsx` | Module 3: Dashboard | Three-tier balance telemetry, `CountUp` animations, mismatch warning banner |
| 21 | `src/components/ui/CountUp.tsx` | Module 3: Dashboard | High-precision rolling number animation component |
| 22 | `src/components/ui/NumberTicker.tsx` | Module 3: Dashboard | Tabular numeral rolling digit ticker |
| 23 | `src/components/dashboard/EnvelopeCard.tsx` | Module 3: Dashboard | 180px fixed height envelope card, burn-down progress bar, days-of-runway |
| 24 | `src/components/dashboard/QuickActions.tsx` | Module 3: Dashboard | Horizontal action pills: Add Money, Allocate, New Envelope, Scan QR |
| 25 | `src/components/dashboard/ReviewQueuePopup.tsx` | Module 3, 9: Review Queue | 75% viewport unclassified card stack with instant rule teaching |
| 26 | `src/app/(tabs)/cards.tsx` | Module 4: Cards | Card hub, 3D flip card, Add Money modal, Put into Bucket, Move Money |
| 27 | `src/components/ui/CreditCard.tsx` | Module 4: Cards | 3D perspective flip card (front: 16-digit layout; back: balance reveal) |
| 28 | `src/components/ui/MorphingDeck.tsx` | Module 4: Cards | Gesture-driven morphing transition between 2-column grid and stacked card deck |
| 29 | `src/components/ui/BucketStack.tsx` | Module 4: Cards | Reanimated physics spring card deck with peek offsets |
| 30 | `src/components/ui/RubberSegmentBar.tsx` | Module 4: Cards | Segmented controller with elastic liquid capsule indicator |
| 31 | `src/app/(tabs)/goals.tsx` | Module 5: Goals | Savings goals view, 3-way reality offer deck, cadence options, shortfall alerts |
| 32 | `src/services/goals/goalPlanner.ts` | Module 5: Goals | Deterministic goal planner, envelope cuts execution, seed injections, shortfall recovery |
| 33 | `src/services/goals/goalCalculations.ts` | Module 5: Goals | Robust statistics, Hampel filter, DFCF cash flow, feasibility score, reality math |
| 34 | `src/app/payment/scan.tsx` | Module 6: Payments | Fullscreen camera QR scanner, reticle overlay, manual UPI auto-complete |
| 35 | `src/components/ui/QRScannerReticle.tsx` | Module 6: Payments | 60fps compositor-only camera HUD reticle and sweeping laser beam |
| 36 | `src/services/payment/upiHandles.ts` | Module 6: Payments | 50+ PSP handle dictionary, `getMatchingUPIHandles()`, 5-tier P2M/P2P classifier |
| 37 | `src/services/payment/upiParser.ts` | Module 6: Payments | `parseUPIUri()`, Zod `upiQRPayloadSchema`, dynamic/static QR detection |
| 38 | `src/services/payment/uriBuilder.ts` | Module 6: Payments | `buildUPIUri()`, parameter preservation, VPA prefix sanitizer, anti-spoofing |
| 39 | `src/app/payment/confirm.tsx` | Module 6: Payments | Payment review, `PixelCard` WebGL shader, `SlideCommit`, P2P interstitial |
| 40 | `src/components/ui/PixelCard.tsx` | Module 6: Payments | WebGL interactive shimmering pixel background canvas via `expo-gl` |
| 41 | `src/components/ui/SlideCommit.tsx` | Module 6: Payments | Interactive slide-to-pay slider with >= 85% threshold and snap physics |
| 42 | `src/services/payment/paymentService.ts` | Module 6: Payments | `launchUPIIntent()`, `normalizeUPIResponse()`, NPCI error diagnostics, `executeAssistedP2PFlow()` |
| 43 | `src/services/payment/index.ts` | Module 6: Payments | Payment module barrel export |
| 44 | `src/app/payment/result.tsx` | Module 6: Payments | Payment result receipt screen and database finalization |
| 45 | `src/components/ui/PixelRevealReceiptCard.tsx` | Module 6: Payments | Animated cyberpunk pixel unmasking receipt card |
| 46 | `src/services/sms/native/smsReader.ts` | Module 7: SMS Pipeline | Android runtime SMS permission requests and synthetic test fixtures |
| 47 | `src/services/sms/trust/senderTrust.ts` | Module 7: SMS Pipeline | TRAI DLT header cleaner, 47+ Indian bank registry, spam header rejection |
| 48 | `src/services/sms/filter/financialFilter.ts` | Module 7: SMS Pipeline | Non-bookable financial gate (rejects OTPs, promos, future bills, declined alerts) |
| 49 | `src/services/sms/parser/index.ts` | Module 7: SMS Pipeline | `parseSms()` deterministic bank grammar dispatcher |
| 50 | `src/services/sms/parser/normalizer.ts` | Module 7: SMS Pipeline | `parseAmountToPaise()`, merchant name cleaner, VPA normalizer, account extractor |
| 51 | `src/services/sms/parser/banks/hdfc.ts` | Module 7: SMS Pipeline | HDFC Bank regex grammar parser |
| 52 | `src/services/sms/parser/banks/sbi.ts` | Module 7: SMS Pipeline | State Bank of India regex grammar parser |
| 53 | `src/services/sms/parser/banks/icici.ts` | Module 7: SMS Pipeline | ICICI Bank regex grammar parser |
| 54 | `src/services/sms/parser/banks/axis.ts` | Module 7: SMS Pipeline | Axis Bank regex grammar parser |
| 55 | `src/services/sms/parser/banks/kotak.ts` | Module 7: SMS Pipeline | Kotak Mahindra Bank regex grammar parser |
| 56 | `src/services/sms/parser/banks/federal.ts` | Module 7: SMS Pipeline | Federal Bank regex grammar parser |
| 57 | `src/services/sms/parser/banks/idfc.ts` | Module 7: SMS Pipeline | IDFC FIRST Bank regex grammar parser |
| 58 | `src/services/sms/parser/banks/union.ts` | Module 7: SMS Pipeline | Union Bank of India regex grammar parser (colon amount & Fvg support) |
| 59 | `src/services/sms/parser/banks/generic.ts` | Module 7: SMS Pipeline | Universal Indian banking and NPCI SMS fallback grammar parser |
| 60 | `src/services/sms/reconciliation/deduplicator.ts` | Module 7: SMS Pipeline | DJB2 + FNV-1a hybrid hash `computeMessageHash()`, transaction fingerprinting |
| 61 | `src/services/sms/reconciliation/paymentCorrelator.ts` | Module 7: SMS Pipeline | 3-signal payment correlator (`CONFIRMED` on score >= 70) |
| 62 | `src/services/sms/reconciliation/balanceReconciler.ts` | Module 7: SMS Pipeline | Real-time balance reconciler with sub-10 paise tolerance checking |
| 63 | `src/services/sms/ingestion/smsIngestionService.ts` | Module 7: SMS Pipeline | Core orchestrator `processIncomingSms()` coordinating entire pipeline |
| 63a | `src/services/sms/live/liveSmsEngine.ts` | Module 7: SMS Pipeline | 5-second polling interval engine, AppState lifecycle listener, and mutex lock |
| 63b | `src/hooks/useLiveSmsEngine.ts` | Module 7: SMS Pipeline | React hook observing live SMS status and manual triggers |
| 64 | `src/services/db/database.ts` | Module 8: SQLite Ledger | SQLite database instance, 14 tables, 10 indexes, WAL mode, conservation invariant |
| 65 | `src/utils/money.ts` | Module 8: Money Math | Integer-paise arithmetic: `toPaise`, `toRupees`, `addPaise`, `subPaise`, `formatPaise` |
| 66 | `src/types/index.ts` | Module 8: Types | Domain models: `ParsedUPIQR`, `PaymentAttempt`, `Transaction`, `Envelope`, `Goal` |
| 67 | `src/store/useAppStore.ts` | Module 8: Zustand Store | Centralized reactive Zustand store (14 state slices, 22 action methods) |
| 68 | `src/app/activity.tsx` | Module 9: Activity | Slide-up modal sheet, transaction timeline, audit detail view |
| 69 | `src/components/ui/AnimatedPillTabs.tsx` | Module 9: Activity | Segmented pill tab switcher for timeline filtering |
| 70 | `src/services/sms/categorization/classifier.ts` | Module 9: Categorization | 7-tier deterministic lexical categorization engine `classifyTransaction()` |
| 71 | `src/services/sms/categorization/taxonomy.ts` | Module 9: Categorization | 22 system categories metadata, colors, icons, and descriptions |
| 72 | `src/services/sms/categorization/merchantDictionary.ts`| Module 9: Categorization | Known merchant catalog (150+ Indian brands, VPAs, aliases) |
| 73 | `src/app/(tabs)/settings.tsx` | Module 10: Settings | Settings screen, profile edit, SMS re-scan, database export, reset actions |
| 74 | `src/components/ui/ReflectiveCard.tsx` | Module 10: Settings | 3D gyroscope/touch tilt holographic surface with specular reflections |
| 75 | `src/components/ui/FullscreenParticleEffect.tsx` | Module 10: Settings | Fullscreen canvas particle explosion effect for data resets |
| 76 | `src/theme/colors.ts` | Module 11: Design System | Resend dark palette tokens (`surfaceBase: '#060606'`, `accent: '#5E6AD2'`) |
| 77 | `src/theme/spacing.ts` | Module 11: Design System | 4px grid spacing scale and mandatory 15px border radius scale |
| 78 | `src/theme/typography.ts` | Module 11: Design System | Typography hierarchy and `tabularFigure` tabular numbers configuration |
| 79 | `src/theme/index.ts` | Module 11: Design System | Theme tokens barrel export |
| 80 | `src/constants/theme.ts` | Module 11: Design System | Platform fallback constants and theme colors |
| 81 | `src/hooks/useReducedMotion.ts` | Module 11: Design System | Accessibility hook detecting `AccessibilityInfo.isReduceMotionEnabled` |
| 82 | `src/components/common/Button.tsx` | Module 11: Design System | High-contrast styled button component |
| 83 | `src/components/common/Card.tsx` | Module 11: Design System | Standard 15px radius card container with subtle 1px border |
| 84 | `src/components/common/Input.tsx` | Module 11: Design System | Accessible form text input with focus highlight |
| 85 | `src/components/ui/GeometricPreloader.tsx` | Module 11: Design System | Minimal geometric wireframe loading spinner |
| 86 | `src/components/ui/ResendGlowCard.tsx` | Module 11: Design System | Card container with soft radial accent border glow |
| 87 | `src/components/ui/PixelSculptImage.tsx` | Module 11: Design System | WebGL 3D displacement tile relief shader |
| 88 | `src/components/ui/index.ts` | Module 11: Design System | Re-export barrel for UI presentation components |

---

*Authored and verified by Worker 1 (Technical Writer & Systems Documenter) for Milestone M1.*
