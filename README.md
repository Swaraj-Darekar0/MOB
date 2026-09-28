<p align="center">
  <img src="assets/images/banner.png" alt="MOB — Virtual Envelope UPI Payment Control Layer" width="100%" />
</p>

# MOB

> *"Money isn't about mathematics. It's about attention, impulse, and the small illusions we tell ourselves before tapping a screen."*

<p align="center">
  <strong>A matte-black virtual allocation and conscious UPI payment-control layer.</strong>
</p>

---

## The Premise: A Small Psychological Sleight of Hand

Modern digital payments are designed as a conjuring trick. 

When you scan a merchant QR code, the friction is systematically erased. No cash leaves your wallet. No physical weight changes. Your brain registers the convenience, but completely misses the loss—until you check your bank balance days later and wonder where it vanished.

**MOB** introduces a deliberate, elegant pause into that trick.

Your actual bank funds stay safely tucked away in your bank account. MOB operates in the space between your impulse and the transaction: maintaining a high-precision, local psychological allocation ledger divided into tactile virtual envelopes (*Dining*, *Fuel*, *Rent*, *Shopping*). 

When you scan a UPI QR code or enter a VPA, MOB catches the intent first, verifies your envelope runway, and requires a physical gesture before handing you over to Google Pay. You stay in control of the reality, not the illusion.

---

## Conceptual Architecture

### 1. The Tactile Deck & The Grid (Spatial Memory)
Human beings don't think in spreadsheets; we think in space and touch.
- **The Grid**: When you need broad analytical clarity, your spending envelopes rest in an orderly, distraction-free matte-black row with real-time runway burn rates.
- **The Stack**: Tap the corner switch, and watch your rows collapse inward—fanning out under your thumb into a weighted physical card deck inspired by playing cards. Powered by fluid second-order spring dynamics, cards slide, tilt in 3D space, and cycle with organic momentum.

### 2. The 3D Unmasked Card (Perception vs. Reality)
Traditional cards are designed to flatter your ego with gold foil and abstract credit limits. MOB’s card interface turns that conceit on its head:
- An unmasked, deeply embossed 16-digit card face with tactile typography.
- With a single tap, the card flips smoothly in 3D space to reveal your *actual tracked runway*—what you can genuinely afford right now, stripped of bank illusions.

### 3. Slide-to-Commit (Conscious Intent vs. Careless Taps)
Tapping a button is an accident; sliding a weighted lever across glass is a decision. Before any UPI payment intent is launched, you physically slide to commit. That micro-second of physical resistance brings conscious awareness back to spending.

### 4. The Matte-Black Aesthetic (Obsidian, Glass & Electric Indigo)
Light and clutter are noisy. MOB is rendered in an intentional, pitch-dark matte palette:
- **Matte Base**: Deep absolute black (`#060606`) that disappears seamlessly into OLED displays.
- **Floating Cards**: Elevated surfaces (`#111215`) framed by precision 1px hairline borders (`#1C1D24`).
- **Electric Indigo**: Minimalist focal accents (`#5E6AD2`) that draw attention only to what matters.

### 5. Mind-Reading Payee Classification
When you scan a QR or type an address, MOB silently deduces who is on the other end:
- A 6-rule deterministic classification engine instantly identifies whether a payee is a **Merchant (P2M)** or a **Person (P2P)** using merchant category codes, terminal identifiers, and handle patterns.
- Merchant payments resolve with a crisp, minimal status; peer payments resolve with contextual clarity.

### 6. Absolute Local Sovereignty
A true mentalist never reveals secrets, and neither does your device:
- **Zero Cloud Leaks**: No third-party servers tracking your purchases or profiling your financial habits.
- **Local-First Ledger**: Your accounting history stays strictly on your device storage.

---

## Key Features

- **Matte-Black Obsidian Aesthetic**:
  - Jet-black base (`#060606`), elevated card surfaces (`#111215`), precision hairline borders (`#1C1D24`), and electric indigo accents (`#5E6AD2`).
  - Tactile micro-interactions with authentic second-order spring physics.

- **Dual Bucket Visualization Modes**:
  - **Grid View**: Vertical card list with clear spacing and real-time balance metrics.
  - **Stack View**: React Bits-inspired 3D card deck with gestures, swipe-to-cycle, and optical viewport centering.
  - Smooth, real-time animated transitions between Grid and Stack driven by Reanimated physics.
  - Custom **Rubber Segment Bar** switch with squash-and-stretch fluid feedback.

- **Interactive 3D Credit Card**:
  - Unmasked 16-digit embossed typography with subtle drop-shadow.
  - Minimalist `"TAP FOR BALANCE"` top indicator.
  - Interactive 3D flip revealing available tracked balance.

- **Deterministic UPI Account Classification**:
  - Automatically identifies **P2M (Merchant)** vs **P2P (Personal)** payees across both QR scans and manual inputs using a 6-rule classification engine (MCC, POS terminals, 10-digit phone patterns, acquirer handles, and commercial keywords).

- **Deterministic Auto-Complete Directory**:
  - Covers Tier 1 PSP handles (`@okaxis`, `@ybl`, `@paytm`, `@upi`) and Tier 2 Indian banks (`@sbi`, `@hdfcbank`, `@icici`, `@barodampay`, etc.).
  - Top 4 suggestions visible with smooth vertical scrolling for remaining matches.

- **Streamlined Single-Action Payment Failure/Cancellation Flow**:
  - **P2P Payments**: Informative *"Payment Cancelled"* notice with a single **"Return to Dashboard"** button.
  - **Merchant Payments**: Informative *"Payment Incomplete"* notice with a single **"OK"** button.
  - Resilient `AppState` listener with automatic defrosting to prevent UI freezes on Android app switches.

- **Slide-to-Commit Payment Micro-Interaction**:
  - Spring-based interactive slider to authorize payment before launching Google Pay.

- **Local-First Architecture**:
  - Zero external cloud dependencies for privacy.
  - Instant local storage persistence powered by `AsyncStorage`.

---

## Tech Stack

- **Framework**: [Expo SDK 57](https://expo.dev) (React Native 0.86.3)
- **Routing**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Animation**: [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated/)
- **Gestures**: [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- **Camera / QR**: [`expo-camera`](https://docs.expo.dev/versions/latest/sdk/camera/)
- **Icons**: [`lucide-react-native`](https://lucide.dev/)
- **Storage**: [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/)

---

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn
- Expo Go on an Android device (or an Android emulator)

### Installation

```bash
# Clone the repository
git clone https://github.com/Swaraj-Darekar0/MOB.git
cd MOB

# Install dependencies
npm install
```

### Running the App

```bash
# Start the Expo development server
npx expo start
```

Scan the QR code with **Expo Go** on your Android device.

---

## Project Structure

```text
MOB/
├── assets/images/              # App icons, splash screens, and adaptive assets
├── src/
│   ├── app/                    # Expo Router file-based pages
│   │   ├── (onboarding)/       # Onboarding flow (Phone, Balance, Bucket setup)
│   │   ├── (tabs)/             # Main dashboard tabs (Buckets, Cards, Settings)
│   │   ├── payment/            # Payment screens (Scan QR, Confirm, Result)
│   │   └── _layout.tsx         # Root layout with providers & preloader
│   ├── components/
│   │   ├── common/             # Reusable UI primitives (Button, Card, Input)
│   │   ├── dashboard/          # Dashboard components (EnvelopeCard, BalanceHeader)
│   │   ├── navigation/         # Custom navigation bars (RubberBottomTabBar)
│   │   └── ui/                 # Animated micro-interactions (MorphingDeck, CreditCard, PixelCard, SlideCommit, RubberSegmentBar)
│   ├── services/
│   │   ├── db/                 # Local ledger and storage engine
│   │   └── payment/            # UPI URI parser, classification, and intent launcher
│   ├── store/                  # Global reactive state (useAppStore)
│   ├── theme/                  # Design tokens (colors, spacing, typography)
│   └── types/                  # TypeScript data models and interfaces
├── app.json                    # Expo configuration
├── package.json
└── tsconfig.json
```

---

## License

MIT
