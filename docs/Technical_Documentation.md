# UPI Virtual Envelope App — Version 1 Technical Documentation

**Document status:** V1 Technical Architecture / Implementation Specification  
**Target platform:** Android first  
**Application framework:** React Native + Expo  
**Payment application:** Google Pay (V1)  
**Project type:** Hobby / experimental project  
**Primary financial model:** Virtual envelopes; no money is physically moved between envelopes  

---

## 0. Document Purpose and Scope

This document defines the intent, functional behavior, technical architecture, data model, payment flow, and implementation approach for Version 1 of the application.

The application is a **virtual money-allocation and UPI payment-control layer**. The user's real bank money remains in the user's bank account. The application maintains a local/application ledger showing how that money is conceptually allocated into virtual envelopes such as Food, Rent, Travel, Shopping, Savings, etc.

Version 1 intentionally avoids:

- becoming a bank or wallet;
- moving money into separate bank accounts for envelopes;
- becoming a UPI payment application/TPAP;
- automatic bank transaction synchronization through Account Aggregator;
- tracking every transaction the user makes outside the application;
- supporting multiple payment applications as separate custom integrations.

V1 focuses on one controlled payment path:

> **Envelope → scan UPI QR → resolve payee/amount → generate UPI payment intent → Google Pay → payment result → update the selected envelope.**

The UI is described only from a functional-flow perspective in this document. A separate future UI Design Documentation will define the design language, visual hierarchy, brand philosophy, components, dimensions, spacing, typography, colors, animation, and exact screen layouts.

---

# 1. Product Concept

The application presents a user's existing money as virtual envelopes without physically transferring or locking funds in the bank.

Example:

```text
Actual bank balance entered by user: ₹40,000

Virtual allocation:

Rent          ₹10,000
Food           ₹6,000
Travel         ₹4,000
Shopping       ₹3,000
Savings       ₹10,000
Unallocated    ₹7,000
--------------------------------
Total          ₹40,000
```

The application must maintain the following conceptual distinction:

### Actual balance

The user's real-world bank balance, initially entered manually in V1 and later potentially supplied/reconciled through a financial-data integration.

### Virtual allocation

A bookkeeping representation created by the app. Allocation changes do **not** change the actual bank balance.

### Actual payment

A successful UPI transaction that reduces the user's real bank balance and therefore reduces the selected virtual envelope in the app.

This distinction is fundamental to the architecture.

---

# 2. V1 Functional Scope

V1 contains these primary capabilities:

1. Phone-number-based app identity/login.
2. Manual entry of current starting bank balance.
3. Envelope creation during onboarding.
4. Percentage-based initial allocation setup.
5. Automatic conversion of those onboarding percentages into fixed rupee allocations.
6. After onboarding, envelopes are managed using **fixed rupee amounts**, not percentages.
7. Minimum and target thresholds can be stored for envelopes.
8. New money added after onboarding is recorded as **Unallocated**.
9. User can manually distribute unallocated money to envelopes.
10. Dashboard displaying actual tracked balance, allocated balance and unallocated balance.
11. Selecting an envelope opens the payment flow.
12. QR scanning using the device camera.
13. Parsing of a UPI payment QR payload.
14. Handling dynamic QR codes that contain an amount.
15. Handling static QR codes that do not contain an amount.
16. Payee UPI ID and payee name display when present in QR data.
17. Generate a `upi://pay` payment URI.
18. Launch Google Pay on Android.
19. Receive the external activity result when control returns to the app.
20. Interpret UPI response status and transaction identifiers.
21. Record the payment against the envelope that initiated it.
22. Deduct the envelope amount only after a successful result/defined finalization rule.
23. Handle failure, cancellation, submitted/pending and unknown states.

---

# 3. Non-Goals for V1

The following are explicitly outside V1:

- direct bank-account linking;
- Account Aggregator production integration;
- reading bank balance automatically;
- reading historical bank/UPI transactions automatically;
- watching Google Pay transaction history;
- notification scraping;
- direct integration with PhonePe, Amazon Pay, FamApp, POP, Paytm, etc.;
- operating as a TPAP;
- storing UPI PINs or bank credentials;
- physically separating money into bank sub-accounts;
- merchant settlement infrastructure;
- payment gateway/order-processing infrastructure for selling goods/services.

The application is a **consumer-side hobby project** rather than a regulated payment product.

---

# 4. High-Level Architecture

```text
                         USER
                           │
                           ▼
                 ┌──────────────────┐
                 │   EXPO APP        │
                 │ React Native      │
                 └─────────┬────────┘
                           │
            ┌──────────────┼───────────────┐
            │              │               │
            ▼              ▼               ▼
      User/Profile    Virtual Ledger    Payment Flow
            │              │               │
            │              │               ▼
            │              │          QR Scanner
            │              │               │
            │              │               ▼
            │              │          UPI Parser
            │              │               │
            │              │               ▼
            │              │          UPI URI Builder
            │              │               │
            │              │               ▼
            │              │        Android Intent
            │              │               │
            │              │               ▼
            │              │          Google Pay
            │              │               │
            │              │               ▼
            │              │          UPI payment
            │              │               │
            │              │               ▼
            │              │        Activity Result
            │              │               │
            │              └───────────────┘
            │                      │
            └──────────────────────▼
                              Transaction Record
```

The central application architecture should keep the **virtual ledger independent from the payment transport**. This allows a future payment provider or bank-data source to be introduced without rewriting the envelope engine.

---

# 5. Onboarding Flow

## 5.1 Step 1 — Phone Number

The user enters their mobile number.

Purpose in V1:

- identify the app user;
- support login/session identity;
- optionally prepare the app for future account/financial integrations.

The phone number is **not** used as a mechanism for fetching UPI history or bank balance.

```text
Phone number
     │
     ▼
App account/profile
```

### Important architectural rule

Do not treat:

> `mobile number → UPI account → transaction history`

as a valid V1 data path.

UPI participation and bank financial data access are separate concerns.

---

# 6. Initial Balance Setup

Immediately after phone-number setup, ask:

> **What is your current available bank balance?**

Example:

```text
₹40,000
```

V1 records this as a **user-provided starting balance snapshot**.

It is not bank-verified.

### Data

```ts
initialBalance: number
currentTrackedBalance: number
```

At initialization:

```text
initialBalance = 40000
currentTrackedBalance = 40000
```

The application should clearly label this as:

> **Tracked balance / manually entered balance**

rather than implying live synchronization with the bank.

---

# 7. Envelope / Bucket Creation

The user creates categories such as:

- Rent
- Food
- Travel
- Shopping
- Savings
- Bills
- Entertainment
- Emergency

For each envelope, the user can define threshold-related values.

Recommended model:

```ts
interface Envelope {
  id: string;
  name: string;
  currentAmount: number;
  minimumAmount?: number;
  targetAmount?: number;
  maximumAmount?: number;
  sortOrder: number;
  isActive: boolean;
}
```

### Meaning of threshold fields

**Current amount:** amount presently allocated to this envelope.

**Minimum amount:** amount the user wants to retain as a minimum safety/requirement level.

**Target amount:** preferred allocation level.

**Maximum amount:** optional upper allocation level.

These values are not percentages and are not bank reservations. They are rules for the virtual ledger.

---

# 8. Initial Allocation Logic

During onboarding only, allow the user to allocate the current balance using percentages because percentage setup is convenient for first-time initialization.

Example:

```text
Starting balance = ₹40,000

Rent       25%
Food       15%
Travel     10%
Shopping   10%
Savings    25%
Free        5%
Unallocated 10%
```

Convert immediately to rupee values:

```text
Rent        ₹10,000
Food         ₹6,000
Travel       ₹4,000
Shopping     ₹4,000
Savings     ₹10,000
Free         ₹2,000
Unallocated  ₹4,000
```

### Critical rule

After this initialization:

> **Percentages are no longer the operating model.**

The application's authoritative envelope state is based on:

- current rupee amount;
- minimum threshold;
- target amount;
- optional maximum amount;
- unallocated balance.

This avoids the problem where every expenditure would force all envelope percentages to be recalculated.

---

# 9. Virtual Ledger Rules

The ledger must obey a conservation rule:

```text
Current tracked balance
    =
Sum of all envelope balances
+
Unallocated balance
```

Example:

```text
Actual tracked balance = ₹40,000

Rent          ₹10,000
Food           ₹6,000
Travel         ₹4,000
Shopping       ₹3,000
Savings       ₹10,000
Unallocated    ₹7,000
-----------------------
Total          ₹40,000
```

### Allocation does not change actual bank balance

Moving ₹1,000 from Unallocated → Food means:

```text
Bank: unchanged
Food: +₹1,000
Unallocated: -₹1,000
```

### Payment changes both tracked balance and the envelope

Successful ₹750 Food payment:

```text
Tracked balance: ₹40,000 → ₹39,250
Food:            ₹6,000 → ₹5,250
```

This distinction must be represented in code rather than inferred from UI state.

---

# 10. Adding New Money After Onboarding

After setup, money added to the tracked balance should **not** be automatically distributed according to old onboarding percentages.

Example:

```text
Current tracked balance = ₹40,000
User adds new money    = ₹20,000
```

The new state becomes:

```text
Current tracked balance = ₹60,000
Unallocated             = previous unallocated + ₹20,000
```

The user then manually allocates the new money:

```text
+₹5,000 Food
+₹5,000 Travel
+₹10,000 Savings
```

or leaves part/all of it as Unallocated.

### Required transaction type

Create a ledger event:

```ts
{
  type: "MANUAL_MONEY_ADDED",
  amount: 20000,
  destination: "UNALLOCATED"
}
```

---

# 11. Dashboard / Main Screen Functional Information

The main screen should expose, at minimum:

### Actual / tracked balance

```text
₹40,000
```

### Allocated balance

```text
₹33,000
```

### Unallocated balance

```text
₹7,000
```

### Envelope list

Example:

```text
Rent
₹10,000 / ₹10,000

Food
₹5,800 / ₹6,000

Travel
₹3,200 / ₹4,000

Shopping
₹2,000 / ₹3,000

Savings
₹10,000 / ₹10,000
```

The UI design of these components will be specified separately in the future UI Design Documentation.

---

# 12. Payment Entry Model

The primary V1 payment action is:

> **Pay from this envelope**

Recommended flow:

```text
Envelope selected
      ↓
Scan UPI QR
      ↓
Read payee + amount
      ↓
Confirm / enter amount
      ↓
Launch Google Pay
      ↓
Payment
      ↓
Return to app
      ↓
Process response
      ↓
Update envelope
```

### Why QR-first is preferred

Scanning first allows the app to discover the recipient before asking the user to confirm the payment amount.

This supports both:

1. dynamic merchant QR containing amount;
2. static QR containing only payee details.

---

# 13. QR Scanning Architecture

Use Expo Camera for scanning QR codes.

Current Expo documentation provides `CameraView` and `onBarcodeScanned`, with QR included as a supported barcode type. `expo-camera` is available for Android and can be configured through the Expo config plugin. [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)

Illustrative implementation:

```tsx
import { CameraView } from 'expo-camera';

<CameraView
  barcodeScannerSettings={{
    barcodeTypes: ['qr'],
  }}
  onBarcodeScanned={({ data }) => {
    handleQRCode(data);
  }}
/>
```

The scanner should reject unsupported QR contents and only proceed when the payload is a valid UPI payment URI or a supported UPI QR representation.

---

# 14. UPI QR Parsing

A UPI QR may encode a URI in the form:

```text
upi://pay?pa=merchant@upi&pn=MERCHANT%20NAME&am=750&cu=INR&tr=...
```

Common fields relevant to this project include:

| Parameter | Meaning | V1 use |
|---|---|---|
| `pa` | Payee VPA / UPI ID | Required recipient data |
| `pn` | Payee name | Display to user |
| `am` | Amount | Prefill amount when present |
| `cu` | Currency | Validate INR |
| `tn` | Transaction note | Optional |
| `tr` | Transaction reference | Correlation/reference |
| `mc` | Merchant/category information when supplied | Optional metadata |
| `mid` | Merchant ID when supplied | Optional metadata |
| `sid` | Store ID when supplied | Optional metadata |
| `tid` | Terminal ID when supplied | Optional metadata |

The implementation should preserve fields it does not currently use instead of deleting them during parsing.

### Example dynamic QR

```text
upi://pay?
pa=hotelxyz@upi
&pn=HOTEL%20XYZ
&am=750
&cu=INR
```

Result:

```text
Payee: HOTEL XYZ
UPI ID: hotelxyz@upi
Amount: ₹750
```

### Example static QR

```text
upi://pay?
pa=hotelxyz@upi
&pn=HOTEL%20XYZ
&cu=INR
```

Result:

```text
Payee: HOTEL XYZ
UPI ID: hotelxyz@upi
Amount: not specified
```

The user must enter the amount before payment.

The UPI linking specification distinguishes cases where the amount is supplied from those where it is absent, and defines additional payment constraints such as minimum amount where provided.

---

# 15. Amount Handling Rules

## Dynamic QR — amount supplied

If `am` is present:

1. parse the amount;
2. validate it as a positive INR amount;
3. compare against the envelope's available balance;
4. show the payee and amount for confirmation;
5. use that amount in the payment request.

Example:

```text
Food balance: ₹1,200
QR amount: ₹750

Allowed:
₹750 ≤ ₹1,200
```

## Static QR — amount absent

If `am` is absent:

1. display payee information;
2. request an amount from the user;
3. validate amount against available envelope balance;
4. create the payment request using that amount.

## Insufficient envelope balance

Example:

```text
Food available: ₹400
Requested payment: ₹750
```

Do not launch payment.

Show:

> Insufficient Food balance.

The user must either:

- allocate money to Food from Unallocated; or
- choose another supported flow if introduced later.

---

# 16. UPI Payment Intent Construction

Google Pay's India developer documentation demonstrates the Android UPI intent pattern using a `upi://pay` URI and the Google Pay Android package name:

```text
com.google.android.apps.nbu.paisa.user
```

The documented payment URI parameters include `pa`, `pn`, `mc`, `tr`, `tn`, `am`, `cu`, and `url`. Google also states that applications should support the generic UPI intent mechanism in addition to a Google Pay-specific call. [Google Pay India Android UPI Intent](https://developers.google.com/pay/india/api/android/in-app-payments)

Illustrative URI:

```text
upi://pay?
pa=hotelxyz%40upi&
pn=HOTEL%20XYZ&
am=750.00&
cu=INR&
tr=FOOD_20260926_0001
```

### V1 local reference

Every payment initiated by the application must generate a unique local reference:

```text
V1-{timestamp}-{randomSuffix}
```

Example:

```text
V1-20260926T143015Z-A81F2C
```

This reference is attached to `tr` when supported by the payment request format and is used to match the returning payment with the correct envelope.

---

# 17. Google Pay Launch Strategy

## V1 decision

The project will target **Google Pay only** rather than implementing separate adapters for Google Pay, PhonePe, Amazon Pay, FamApp, POP, Paytm, etc.

There are two technically possible launch approaches.

### Approach A — Explicitly target Google Pay

Set the intent's package to:

```text
com.google.android.apps.nbu.paisa.user
```

This is the deterministic approach if the product requirement is:

> **"This application uses Google Pay for V1 payments."**

Google's official example uses `Intent.ACTION_VIEW`, sets the `upi://pay` URI, sets the Google Pay package, and starts the activity for a result. [Google Pay India Android UPI Intent](https://developers.google.com/pay/india/api/android/in-app-payments)

### Approach B — Generic UPI intent / Android chooser

Do not set `packageName`; instead launch the generic `upi://pay` intent.

Android then resolves the installed application capable of handling that intent. If one application is available, Android can launch it directly; if multiple applications can handle the intent, Android can show a chooser. Android documents that the operating system manages intent resolution and default-app selection. [Android intents and filters](https://developer.android.com/guide/components/intents-filters)

### Important clarification about "Always"

The application **cannot programmatically force Android to make Google Pay the permanent default UPI handler**.

Whether the device displays an "Always" / default-app option, and exactly where the user manages that preference, is controlled by the Android version and device manufacturer.

Therefore the V1 implementation should not depend on a particular chooser UI or on the presence of an "Always" checkbox.

Recommended V1 behavior:

1. Check whether Google Pay is installed.
2. If installed, launch Google Pay explicitly for the V1 payment flow.
3. If not installed, show a clear message and send the user to the Google Play Store installation page.
4. After installation, retry the payment flow.

A later version can optionally introduce a generic UPI chooser.

---

# 18. Expo / Android Intent Implementation

Expo provides `expo-intent-launcher` for Android intents. Its current API supports passing a `data` URI and an optional `packageName`, and returns an `IntentLauncherResult` containing `data`, `extra`, and `resultCode`. [Expo IntentLauncher](https://docs.expo.dev/versions/v54.0.0/sdk/intent-launcher/)

Example architecture-level implementation:

```ts
import * as IntentLauncher from 'expo-intent-launcher';

const GOOGLE_PAY_PACKAGE =
  'com.google.android.apps.nbu.paisa.user';

const result = await IntentLauncher.startActivityAsync(
  'android.intent.action.VIEW',
  {
    data: upiUri,
    packageName: GOOGLE_PAY_PACKAGE,
  }
);

console.log(result.resultCode);
console.log(result.data);
console.log(result.extra);
```

`IntentLauncherParams` supports `data` and an optional `packageName`; specifying `packageName` explicitly targets one application. [Expo IntentLauncher](https://docs.expo.dev/versions/v54.0.0/sdk/intent-launcher/)

### Package-installed check

The app should determine whether Google Pay exists before launching it.

Because Android package visibility rules can restrict discovery of installed applications, Android provides manifest `<queries>` declarations for packages/intents that an app needs to interact with. Expo supports Android manifest queries through configuration. [Android package visibility](https://developer.android.com/training/package-visibility/automatic) [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)

The Google Pay documentation itself instructs Android 11+ integrations to declare the Google Pay package in `<queries>`. [Google Pay Android overview](https://developers.google.com/pay/india/api/android/overview)

Example concept for `app.json` / config-plugin-generated manifest:

```json
{
  "expo": {
    "android": {
      "package": "com.example.virtualenvelopes"
    }
  }
}
```

The actual `<queries>` entry should be generated through Expo configuration rather than hand-editing generated native files when using Continuous Native Generation.

---

# 19. Payment Response / Result Processing

There are two different result layers and they must not be confused.

### Layer 1 — Android activity result

Expo returns an `IntentLauncherResult` containing:

```text
resultCode
data
extra
```

The Android result code alone does **not** mean that the UPI payment succeeded. [Expo IntentLauncher](https://docs.expo.dev/versions/v54.0.0/sdk/intent-launcher/)

### Layer 2 — UPI / Google Pay payment status

Google Pay's documented response includes a `tezResponse` field containing response information such as:

- `toVpa`
- `txnId`
- `responseCode`
- `Status`
- `amount`
- `txnRef`

Possible status values include `SUBMITTED`, `SUCCESS`, and `FAILURE`. Google marks older flat response fields such as `txnId`, `responseCode`, `ApprovalRefNo`, `Status`, and `txnRef` as deprecated in favor of `tezResponse`. [Google Pay response](https://developers.google.com/pay/india/api/web/googlepay-response)

### V1 response state machine

```text
INITIATED
   │
   ▼
EXTERNAL_APP_OPENED
   │
   ├───────────────┐
   ▼               ▼
SUCCESS          FAILURE
   │               │
   ▼               ▼
POST_PAYMENT     RELEASE_PENDING
   │
   ▼
ENVELOPE_DEDUCTED

SUBMITTED / UNKNOWN
   │
   ▼
PENDING_RECONCILIATION
```

The exact parsing implementation must be based on real-device results from the Google Pay build used by the project.

---

# 20. Transaction Record and Envelope Deduction

Every payment must create a local payment record **before** launching Google Pay.

Recommended structure:

```ts
type PaymentStatus =
  | 'INITIATED'
  | 'SUBMITTED'
  | 'SUCCESS'
  | 'FAILURE'
  | 'CANCELLED'
  | 'UNKNOWN';

interface PaymentTransaction {
  id: string;
  envelopeId: string;
  requestedAmount: number;
  payeeVpa: string;
  payeeName?: string;
  qrPayload?: string;
  transactionRef: string;
  status: PaymentStatus;
  upiTxnId?: string;
  approvalRefNo?: string;
  responseCode?: string;
  returnedAmount?: number;
  createdAt: string;
  completedAt?: string;
}
```

### Why `requestedAmount` and `returnedAmount` are separate

Your application knows what it asked the UPI app to pay before the external payment begins.

The returned payment response may contain an amount, but your application must not assume every response implementation exposes every field identically.

Therefore:

```text
requestedAmount = authoritative application expectation
returnedAmount  = response data when available
```

Google specifically warns that the amount appearing in its response might differ from the originally requested amount and instructs merchant implementations to verify against the expected amount. [Google Pay response](https://developers.google.com/pay/india/api/web/googlepay-response)

---

# 21. Payee / Merchant Information

For QR-based payment initiation, the app can know the payee information **before** launching Google Pay when it exists in the scanned QR payload.

Example:

```text
pn = HOTEL XYZ
pa = hotelxyz@upi
```

The app should show:

```text
Payee: HOTEL XYZ
UPI ID: hotelxyz@upi
```

Do not claim that the `pn` value is independently verified legal identity.

The application can additionally retain merchant identifiers such as `mc`, `mid`, `sid`, or `tid` when they are supplied.

### "Who exactly?"

For a person-to-person or merchant transaction, the app can reliably display the payee name/VPA that is supplied through the UPI payment data when available. It does not automatically gain independent legal/KYC verification of the beneficiary from the QR payload alone.

---

# 22. Payment Flow — Complete Sequence

```text
USER
 │
 │ 1. Opens Food envelope
 ▼
YOUR APP
 │
 │ 2. Shows Food available amount
 │
 │ 3. User taps Pay
 ▼
QR SCANNER
 │
 │ 4. Scan merchant QR
 ▼
QR PARSER
 │
 ├── pa → payee VPA
 ├── pn → payee name
 ├── am → amount, if present
 ├── tr → existing reference, if present
 └── other metadata
 │
 ▼
PAYMENT CONFIRMATION
 │
 ├── dynamic QR → amount already known
 └── static QR  → user enters amount
 │
 ▼
PAYMENT RECORD CREATED
 │
 status = INITIATED
 │
 ▼
UPI URI BUILDER
 │
 ▼
ANDROID INTENT
 │
 package = Google Pay
 │
 ▼
GOOGLE PAY
 │
 │ User reviews payment
 │ User selects/uses bank account
 │ User enters UPI PIN
 │
 ▼
BANK / UPI NETWORK
 │
 ▼
GOOGLE PAY RESULT
 │
 ▼
EXPO INTENT RESULT
 │
 ▼
RESPONSE PARSER
 │
 ├── SUCCESS
 ├── FAILURE
 ├── SUBMITTED
 └── UNKNOWN
 │
 ├──────── SUCCESS ────────┐
 │                         │
 ▼                         ▼
Payment finalized      Record failure/pending
 │
 ▼
Food bucket - ₹750
 │
 ▼
Updated dashboard
```

---

# 23. Pending / Failure / Cancellation Handling

The application must never equate "user returned to our app" with "payment succeeded".

## SUCCESS

```text
PaymentTransaction.status = SUCCESS
Envelope.currentAmount -= requestedAmount
TrackedBalance -= requestedAmount
```

## FAILURE

```text
PaymentTransaction.status = FAILURE
No envelope deduction
No tracked-balance deduction
```

## USER CANCELLATION

```text
PaymentTransaction.status = CANCELLED
No envelope deduction
```

## SUBMITTED

```text
PaymentTransaction.status = SUBMITTED
Do not treat as final success
```

For a hobby V1, the app can show:

> Payment submitted. Verify status before considering it completed.

For a production financial/payment product, final settlement/status verification must be performed through the appropriate PSP/payment infrastructure. Google explicitly states that payment responses should be verified through the relevant PSP/payment provider and that signature verification should be used when applicable. [Google Pay response](https://developers.google.com/pay/india/api/web/googlepay-response) [Google Pay signature verification](https://developers.google.com/pay/india/api/web/sign-verify)

---

# 24. Google Pay Response Verification — V1 Position

Google Pay provides a signed response mechanism. Its current documentation states that successful responses can include a signature and `signatureKeyId`, and recommends verifying the signature using Google's public key. It also recommends checking VPA, transaction ID, and amount. Responses without valid signature verification should not be treated as trusted success for a production merchant workflow. [Google Pay signature verification](https://developers.google.com/pay/india/api/web/sign-verify)

### V1 hobby implementation

The application should still create its architecture so a verification layer can be inserted:

```text
Google Pay response
       ↓
Response parser
       ↓
Signature / integrity verifier (pluggable)
       ↓
Payment state resolver
       ↓
Ledger update
```

Do not design the ledger so that the UI directly subtracts money based only on a button click.

---

# 25. Data Model

A minimal V1 data model can be local-first.

## User

```ts
interface UserProfile {
  id: string;
  phoneNumber: string;
  createdAt: string;
}
```

## Account snapshot

```ts
interface BalanceSnapshot {
  id: string;
  amount: number;
  source: 'USER_ENTERED' | 'MANUAL_ADJUSTMENT';
  createdAt: string;
}
```

## Envelope

```ts
interface Envelope {
  id: string;
  name: string;
  currentAmount: number;
  minimumAmount?: number;
  targetAmount?: number;
  maximumAmount?: number;
  isActive: boolean;
}
```

## Ledger event

```ts
interface LedgerEvent {
  id: string;
  type:
    | 'INITIAL_BALANCE'
    | 'MANUAL_MONEY_ADDED'
    | 'ALLOCATE_TO_ENVELOPE'
    | 'MOVE_BETWEEN_ENVELOPES'
    | 'PAYMENT_SUCCESS'
    | 'REFUND'
    | 'REVERSAL'
    | 'ADJUSTMENT';
  amount: number;
  sourceEnvelopeId?: string;
  destinationEnvelopeId?: string;
  paymentId?: string;
  createdAt: string;
}
```

## Payment

Use the `PaymentTransaction` object defined earlier.

---

# 26. Recommended Storage Strategy

For V1, use local persistent storage.

Recommended options:

- Expo SQLite for structured relational local data;
- SecureStore for sensitive small values such as session secrets/tokens, if any are introduced;
- normal application state for transient payment-flow state.

Do not store:

- UPI PIN;
- bank password;
- debit-card PIN;
- OTP;
- sensitive authentication secrets belonging to Google Pay/banks.

SQLite is preferable to a flat JSON blob once envelopes, ledger events and payment records exist.

---

# 27. Recommended Technology Stack

## Mobile

- React Native
- Expo
- Expo Router (recommended for screen/navigation structure)
- TypeScript

## Camera / QR

- `expo-camera`

Expo currently documents QR/barcode scanning through `CameraView`. [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)

## Android intents

- `expo-intent-launcher`
- Android `Intent.ACTION_VIEW`
- UPI `upi://pay` URI

Expo's IntentLauncher supports arbitrary intent action strings, a data URI, optional package targeting, and an activity result. [Expo IntentLauncher](https://docs.expo.dev/versions/v54.0.0/sdk/intent-launcher/)

## External/deep links

- `expo-linking` where appropriate

Expo's Linking module can determine whether installed applications can handle a URL and can open external deep links. [Expo Linking](https://docs.expo.dev/versions/latest/sdk/linking/)

## Persistence

- `expo-sqlite`

## State management

Recommended:

- Zustand for lightweight application state;
- or React Context + reducers if the project remains small.

## Validation

- Zod for runtime validation of QR-parsed objects and payment response payloads.

## Testing

- Jest
- React Native Testing Library
- Android physical-device tests
- ADB-based intent/installation checks

---

# 28. Expo Build Strategy

Although Expo Go can be useful during ordinary application development, the final payment flow should be tested in an **Android development build / native-capable build** because payment intent behavior, manifest configuration, package visibility, deep-link return behavior and installed-application resolution depend on the native Android application configuration.

Recommended process:

```text
Development
   ↓
Expo project
   ↓
Development build
   ↓
Install on real Android device
   ↓
Google Pay installed
   ↓
Test QR → intent → payment → return
```

The application should not be considered payment-flow complete until the exact Google Pay behavior is verified on a physical Android device.

---

# 29. Google Pay Installation / Availability Flow

## Case A — Google Pay installed

```text
User taps Pay
      ↓
Check Google Pay availability
      ↓
YES
      ↓
Launch Google Pay UPI intent
```

## Case B — Google Pay not installed

```text
User taps Pay
      ↓
Google Pay not detected
      ↓
Blocking explanation
      ↓
Install Google Pay
      ↓
Google Play Store
      ↓
User installs
      ↓
Return to app
      ↓
Retry payment
```

The exact Play Store installation URI should be treated as a configuration constant rather than hard-coded throughout the codebase.

---

# 30. Android Default-App / "Always Use Google Pay" Behavior

The project should distinguish three concepts:

### Explicit package launch

```text
packageName = com.google.android.apps.nbu.paisa.user
```

This targets Google Pay directly.

### Generic UPI intent

```text
upi://pay?... 
```

Android resolves a suitable UPI application.

### User-selected default

Android may let the user select an application as a default for a supported action depending on the device/OS. The app does not control the appearance or persistence of this system UI.

For the V1 requirement "we want Google Pay", **explicit package launch is the most deterministic implementation**.

---

# 31. UPI Request Example

Example dynamic QR parsed from a merchant:

```text
Payee VPA: hotelxyz@upi
Payee Name: HOTEL XYZ
Amount: ₹750
Currency: INR
```

Create a local reference:

```text
V1-20260926T143015Z-A81F2C
```

Construct:

```text
upi://pay?pa=hotelxyz%40upi&pn=HOTEL%20XYZ&am=750.00&cu=INR&tr=V1-20260926T143015Z-A81F2C
```

Launch through Android intent.

---

# 32. QR-to-Payment Pseudocode

```ts
async function startEnvelopePayment(envelope: Envelope) {
  const scan = await scanUPIQRCode();

  const parsed = parseUPIUri(scan.data);

  if (!parsed.isValid) {
    throw new Error('Unsupported or invalid UPI QR');
  }

  const requestedAmount = parsed.amount
    ?? await askUserForAmount();

  validateAmount(requestedAmount, envelope.currentAmount);

  const paymentId = createId();
  const transactionRef = createTransactionRef(paymentId);

  const payment = createPendingPayment({
    id: paymentId,
    envelopeId: envelope.id,
    requestedAmount,
    payeeVpa: parsed.payeeVpa,
    payeeName: parsed.payeeName,
    transactionRef,
    qrPayload: scan.data,
  });

  await savePayment(payment);

  const upiUri = buildUPIPaymentUri({
    payeeVpa: parsed.payeeVpa,
    payeeName: parsed.payeeName,
    amount: requestedAmount,
    transactionRef,
    currency: 'INR',
  });

  const result = await launchGooglePay(upiUri);

  const normalized = normalizeUPIResponse(result);

  await resolvePayment(paymentId, normalized);
}
```

---

# 33. Response Normalization

Do not let raw Google Pay result structures leak into the rest of the application.

Create:

```ts
interface NormalizedUPIResponse {
  status: 'SUCCESS' | 'FAILURE' | 'SUBMITTED' | 'UNKNOWN' | 'CANCELLED';
  txnId?: string;
  txnRef?: string;
  approvalRefNo?: string;
  responseCode?: string;
  toVpa?: string;
  amount?: number;
}
```

Then:

```text
Raw Android result
       ↓
Google Pay adapter/parser
       ↓
NormalizedUPIResponse
       ↓
Payment state machine
       ↓
Ledger
```

This is important because future payment applications or future UPI API changes can be isolated to the adapter/parser layer.

---

# 34. Exact Transaction Fields the App Should Preserve

For every completed or attempted payment, preserve:

```text
Local payment ID
Envelope ID
Requested amount
QR payload
Payee VPA
Payee name
Transaction reference
UPI transaction ID (when returned)
Approval reference (when returned)
UPI response code (when returned)
Returned amount (when returned)
Payment status
Created time
Completed time
```

This allows the transaction history to answer:

> What envelope initiated the payment?

> How much did the application ask to pay?

> Who was the stated payee?

> Which UPI ID was used?

> What reference/transaction identifiers were returned?

> Did the external payment report success, failure or submitted status?

---

# 35. What the App Can and Cannot Know in V1

| Information | V1 availability |
|---|---|
| Selected envelope | Yes — app knows it |
| Requested amount | Yes |
| UPI ID from QR | Yes when encoded |
| Payee name from QR | Yes when encoded |
| Fixed QR amount | Yes when encoded |
| User-entered amount | Yes |
| Google Pay selected/used | Yes because V1 explicitly launches GPay |
| UPI transaction ID | Expected where returned |
| UPI status | Expected where returned |
| Google Pay richer response fields | Yes where Google Pay returns them |
| Legal/KYC identity of payee | No |
| Bank balance automatically | No |
| Entire UPI history | No |
| Transactions made separately in Google Pay | No |
| Transactions made in other UPI apps | No |
| User's UPI PIN | No and must never be collected |
| Bank account credentials | No |
| Which bank account user ultimately used inside Google Pay | Not something V1 should depend on |

---

# 36. Important Google Pay Integration Qualification

Google's official India documentation for payment integration is written for merchant applications and lists prerequisites including verified UPI merchant/bank details and APIs for payment-status checking. [Google Pay India Android Overview](https://developers.google.com/pay/india/api/android/overview)

Therefore the project should distinguish:

### Technical prototype capability

The Android device can construct and launch the UPI intent and invoke Google Pay.

### Production merchant integration

A production application that is acting as a merchant and relying on payment verification must satisfy the applicable Google Pay, bank, PSP, NPCI and other requirements.

Because this project is a **hobby application for controlling personal spending envelopes**, V1 should not represent itself as an online merchant or attempt to provide merchant settlement functionality.

The payment-flow implementation must be validated on the intended device/app combination before relying on it.

---

# 37. Security Requirements

The application must never collect or store:

- UPI PIN;
- bank login password;
- OTP;
- debit card PIN;
- card CVV;
- Google Pay authentication credentials.

The app only prepares a payment request and hands authentication/payment execution to Google Pay.

### Local data

Protect account/session information using platform-appropriate storage. Encrypt sensitive local data if sensitive secrets are introduced.

### QR data

Treat scanned QR payloads as untrusted external input.

Validate:

- protocol (`upi`);
- authority (`pay` where expected);
- required VPA/payee information;
- amount format;
- currency;
- malicious or unsupported query parameters.

Never execute arbitrary URLs or code obtained from the QR.

---

# 38. Ledger Integrity Rules

These invariants must always hold:

### Rule 1

```text
Envelope balances ≥ 0
```

### Rule 2

```text
Unallocated balance ≥ 0
```

### Rule 3

```text
Tracked balance = envelope total + unallocated
```

### Rule 4

Allocation transfer does not change tracked balance.

### Rule 5

Successful payment decreases tracked balance.

### Rule 6

Successful payment decreases only the envelope that initiated it.

### Rule 7

Failed/cancelled payment does not decrease an envelope.

### Rule 8

Pending payment remains explicitly identifiable.

### Rule 9

Every payment has a unique local payment ID.

### Rule 10

A payment cannot be deducted twice because of duplicate result processing.

Use an idempotency key such as:

```text
payment.id
```

and/or returned UPI transaction ID/reference.

---

# 39. Example End-to-End Scenario

### Initial setup

User enters:

```text
Current bank balance = ₹40,000
```

Initial allocation:

```text
Rent       25% → ₹10,000
Food       15% → ₹6,000
Travel     10% → ₹4,000
Shopping   10% → ₹4,000
Savings    25% → ₹10,000
Unallocated 15% → ₹6,000
```

### Payment

User opens:

> Food

Available:

```text
₹6,000
```

User taps:

> Pay

Scans:

```text
HOTEL XYZ
hotelxyz@upi
₹750
```

User confirms:

```text
Pay ₹750 from Food
```

App launches Google Pay.

Google Pay returns success.

App records:

```text
Bucket: Food
Amount: ₹750
Payee: HOTEL XYZ
VPA: hotelxyz@upi
Status: SUCCESS
```

Ledger becomes:

```text
Food = ₹5,250
Tracked balance = ₹39,250
```

---

# 40. Static QR Example

QR contains:

```text
pa=restaurant@upi
pn=RESTAURANT XYZ
cu=INR
```

No amount exists.

Application shows:

```text
Restaurant XYZ
restaurant@upi

Enter amount
₹______
```

User enters:

```text
₹520
```

The app validates:

```text
Food available = ₹1,200
₹520 <= ₹1,200
```

Then creates the UPI payment request for ₹520 and launches Google Pay.

---

# 41. Testing Strategy

## Test group A — QR parsing

Test:

- valid dynamic QR;
- valid static QR;
- malformed URI;
- encoded/unencoded characters;
- missing payee VPA;
- unsupported currency;
- invalid amount;
- amount with decimal values;
- signed payload preservation;
- additional unknown parameters.

## Test group B — Envelope logic

Test:

- initial allocation;
- rounding;
- total exactly equals starting balance;
- allocation from Unallocated;
- insufficient balance;
- adding new money;
- moving money between envelopes;
- minimum threshold warnings;
- payment success;
- payment failure;
- duplicate payment result.

## Test group C — Google Pay

On a physical Android device:

1. Google Pay installed.
2. Google Pay configured with a usable payment account.
3. Static merchant QR.
4. Dynamic merchant QR.
5. Payment cancelled.
6. Payment succeeds.
7. Payment fails due to insufficient funds.
8. Payment times out.
9. User leaves Google Pay and returns.
10. App is resumed from background.
11. Google Pay returns a result with missing optional fields.
12. Google Pay unavailable/not installed.

## Test group D — Intent behavior

Test:

- explicit Google Pay package;
- generic `upi://pay` on a device with only Google Pay;
- generic `upi://pay` on a device with multiple UPI apps;
- package visibility behavior on Android 11+;
- return-to-app behavior.

---

# 42. Development Milestones

## Milestone 1 — Local financial engine

Implement:

- onboarding;
- initial balance;
- envelopes;
- initial percentage allocation;
- post-onboarding fixed-amount allocations;
- thresholds;
- Unallocated;
- ledger event model;
- dashboard.

No payment integration yet.

## Milestone 2 — QR scanner

Implement:

- camera permissions;
- QR scanning;
- UPI URI validation;
- QR parser;
- dynamic/static amount handling.

## Milestone 3 — Google Pay intent

Implement:

- Google Pay package detection;
- UPI URI builder;
- explicit Google Pay intent;
- return result;
- raw response logging in development.

## Milestone 4 — Response normalization

Implement:

- status parser;
- transaction reference matching;
- transaction history record;
- payment state machine.

## Milestone 5 — Ledger integration

Implement:

- SUCCESS → deduction;
- FAILURE → no deduction;
- CANCELLED → no deduction;
- SUBMITTED → pending;
- idempotency.

## Milestone 6 — Device compatibility testing

Test across:

- multiple Android versions;
- multiple OEM devices;
- different Google Pay states;
- dynamic/static QR examples.

---

# 43. Future Architecture Extension — Bank/AA Integration

This is deliberately **not V1**, but the codebase should be designed so it can later be added.

Current V1:

```text
Manual balance
      ↓
Virtual ledger
      ↓
Google Pay payment flow
```

Possible future:

```text
Account Aggregator / approved financial-data source
                     ↓
              Bank transactions
                     ↓
             Transaction engine
                     ↓
          Virtual envelope reconciliation
```

The future integration must not be hard-wired into the envelope engine.

Recommended abstraction:

```ts
interface TransactionProvider {
  connect(): Promise<void>;
  fetchTransactions(): Promise<ExternalTransaction[]>;
  disconnect(): Promise<void>;
}
```

V1 can use:

```text
ManualProvider
```

Future versions can add an appropriate financial-data provider once eligibility and integration requirements are satisfied.

---

# 44. Future Automatic Categorization

The current V1 payment flow already knows the envelope that initiated a payment.

Therefore payments made through V1 do not need AI to determine the category:

```text
Selected envelope = Food
Payment = ₹750
       ↓
Food - ₹750
```

If future bank/AA transaction feeds are introduced, a categorization engine can classify external transactions:

```text
Merchant / UPI transaction
        ↓
Categorization
        ↓
Food / Travel / Shopping / etc.
        ↓
Envelope reconciliation
```

This future capability should not be mixed with the V1 payment-initiated flow.

---

# 45. Future Refund / Reversal Model

Although not required for first implementation, the data model should allow:

```text
PAYMENT_SUCCESS
      ↓
REFUND
      ↓
Envelope +₹X
```

and:

```text
PAYMENT_SUCCESS
      ↓
REVERSAL
      ↓
Envelope +₹X
```

Do not model refunds as new unrelated income.

They should reference the original payment when an authoritative relationship exists.

---

# 46. Architectural Principle: Payment App vs Money App

This project should remain conceptually:

> **Money organization + payment initiation**

rather than:

> **new UPI network/payment processor**

Google Pay remains responsible for payment authentication and execution.

Your app is responsible for:

- envelope state;
- payment context;
- payee/amount presentation before hand-off;
- associating the payment with a bucket;
- ledger state after return.

This keeps the hobby implementation small and modular.

---

# 47. Architectural Principle: QR Data Is the Primary Pre-Payment Source

For V1, the application should prefer information already encoded in the scanned QR.

Therefore:

```text
QR
 ↓
Payee VPA
Payee name
Amount (if supplied)
Merchant metadata (if supplied)
 ↓
Payment confirmation
```

The application should **not** attempt to query Google Pay for merchant details before payment.

Google Pay is the payment execution layer, not the source of merchant metadata for the pre-payment screen.

---

# 48. Architectural Principle: Response Is for Payment State, Not Category

The envelope is known before the payment starts.

Therefore the returned payment response should be used primarily to establish:

- whether the payment succeeded;
- whether it failed;
- whether it is pending/submitted;
- transaction/reference identifiers;
- returned payment information where supplied.

Do not try to infer:

```text
Which envelope?
```

from the response.

The envelope is already known from the local payment record.

---

# 49. V1 Decision Summary

The implementation decisions are:

| Area | V1 decision |
|---|---|
| Framework | React Native + Expo |
| Platform | Android first |
| Login identity | Mobile number |
| Bank connection | None |
| Initial bank balance | Manual user entry |
| Initial envelope setup | Percentage-based convenience |
| Ongoing envelope model | Fixed rupee amounts |
| Thresholds | Minimum / target / optional maximum |
| New money | Goes to Unallocated |
| Actual money movement between envelopes | None |
| Payment initiation | From selected envelope |
| QR scanner | Expo Camera |
| QR type | UPI QR |
| Static QR | Ask amount |
| Dynamic QR | Use encoded amount |
| Pre-payment payee info | Parse from QR |
| Payment mechanism | Android UPI intent |
| Payment app | Google Pay only in V1 |
| Google Pay launch | Prefer explicit package for deterministic V1 |
| Android chooser | Optional future generic mode |
| Result handling | Intent result + UPI response parser |
| Payment status | SUCCESS / FAILURE / SUBMITTED / UNKNOWN / CANCELLED |
| Ledger update | Only on finalized successful payment |
| Full UPI history | Not supported |
| External Google Pay payments | Not tracked in V1 |
| Account Aggregator | Future scope |
| Backend | Optional/minimal for V1; local-first preferred |
| UI design documentation | Separate future document |

---

# 50. Final V1 Architecture

```text
                         ┌─────────────────────────┐
                         │        USER             │
                         │   Mobile number         │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │       EXPO APP          │
                         │ React Native + TS       │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
      ┌───────────────┐       ┌───────────────┐       ┌────────────────┐
      │ User Profile  │       │ Virtual Ledger│       │ Payment Engine │
      └───────────────┘       └───────┬───────┘       └───────┬────────┘
                                      │                       │
                              ┌───────┴───────┐               │
                              │               │               │
                              ▼               ▼               ▼
                          Envelopes       Unallocated    Expo Camera
                              │                               │
                              │                               ▼
                              │                          UPI QR Parser
                              │                               │
                              │                               ▼
                              │                         Payment Builder
                              │                               │
                              │                               ▼
                              │                       Android Intent
                              │                               │
                              │                               ▼
                              │                         GOOGLE PAY
                              │                               │
                              │                               ▼
                              │                         UPI PAYMENT
                              │                               │
                              │                               ▼
                              └───────────────────────┬───────┘
                                                      │
                                                      ▼
                                             Activity/UPI Result
                                                      │
                                                      ▼
                                             Response Normalizer
                                                      │
                                          ┌───────────┼───────────┐
                                          │           │           │
                                       SUCCESS      FAILURE    SUBMITTED
                                          │           │           │
                                          ▼           ▼           ▼
                                   Deduct bucket   No deduct    Pending
                                          │
                                          ▼
                                    Updated ledger
```

---

# 51. Future UI Documentation

This technical document intentionally does not prescribe the visual design.

A separate **UI Design Documentation** should later define:

- design methodology;
- brand philosophy;
- visual identity;
- design language;
- typography system;
- color system;
- iconography;
- spacing system;
- envelope/card components;
- button states;
- payment states;
- QR scanner composition;
- exact placement of screen elements;
- interaction hierarchy;
- empty states;
- loading states;
- success/failure states;
- animation/motion principles;
- accessibility;
- responsive behavior across Android devices.

The UI document should implement the functional screens and states defined in this technical document rather than redefine the underlying product behavior.

---

# 52. Primary References

1. **Google Pay for India — Android UPI Intent Integration**  
   https://developers.google.com/pay/india/api/android/in-app-payments

2. **Google Pay for India — Android Overview / Prerequisites**  
   https://developers.google.com/pay/india/api/android/overview

3. **Google Pay for India — Response Handling**  
   https://developers.google.com/pay/india/api/web/googlepay-response

4. **Google Pay for India — Signature Verification**  
   https://developers.google.com/pay/india/api/web/sign-verify

5. **Google Pay for India — Payment Flow**  
   https://developers.google.com/pay/india/api/android/app-flow

6. **Android Developers — Intents and Intent Filters**  
   https://developer.android.com/guide/components/intents-filters

7. **Android Developers — Package Visibility**  
   https://developer.android.com/training/package-visibility/automatic

8. **Expo — Camera**  
   https://docs.expo.dev/versions/latest/sdk/camera/

9. **Expo — IntentLauncher**  
   https://docs.expo.dev/versions/v54.0.0/sdk/intent-launcher/

10. **Expo — Linking**  
    https://docs.expo.dev/versions/latest/sdk/linking/

11. **Expo — Build Properties / Android manifest queries**  
    https://docs.expo.dev/versions/latest/sdk/build-properties/

12. **Sahamati / Account Aggregator ecosystem**  
    https://sahamati.org.in/

---

# 53. Final Product Intent

The simplest description of Version 1 is:

> **A React Native + Expo Android application that lets a user organize their existing bank balance into virtual money envelopes and initiate Google Pay UPI payments from a selected envelope. The app scans the recipient's UPI QR, captures payee and amount information available in the QR, hands the actual payment to Google Pay through an Android UPI intent, receives the payment result, and updates the selected virtual envelope accordingly.**

The application does **not** physically move money into envelopes. The envelopes are an internal accounting layer around the user's manually tracked balance.

The first version deliberately leaves automatic bank/UPI history synchronization and Account Aggregator integration for a future phase.
