# MOB — Virtual Envelope UPI Payment Control Layer

<p align="center">
  <strong>Take absolute control of your spending before money leaves your bank.</strong>
</p>

---

## Overview

**MOB** is a modern, dark-mode React Native + Expo Android application that acts as a **virtual money-allocation and UPI payment-control layer**. 

Your actual bank funds stay safely in your bank account. MOB maintains a high-precision local accounting ledger organized into virtual envelopes (pots/buckets) such as *Food*, *Rent*, *Shopping*, *Travel*, etc. When you scan a merchant UPI QR code or enter a UPI ID, MOB verifies envelope allocations, constructs the standardized UPI intent, launches Google Pay for secure payment, and updates your envelope balances accordingly.

---

## Key Features

- **Dark-Mode Resend / Linear Aesthetic**:
  - Jet-black base (`#060606`), elevated card surfaces (`#111215`), precision hairline borders (`#1C1D24`), and electric indigo accents (`#5E6AD2`).
  - Tactile micro-interactions with authentic spring physics.

- **Dual Bucket Visualization Modes**:
  - **Grid View**: Vertical card list with clear spacing and real-time balance metrics.
  - **Stack View**: React Bits-inspired 3D card deck with gestures, swipe-to-cycle, and optical viewport centering.
  - Smooth, real-time animated transitions between Grid and Stack driven by Reanimated physics.
  - Custom **Rubber Segment Bar** switch with squash-and-stretch fluid feedback.

- **Credit Card Interface**:
  - Unmasked 16-digit embossed typography with subtle drop-shadow.
  - Minimalist `"TAP FOR BALANCE"` top indicator.
  - Interactive 3D flip revealing available tracked balance.

- **Deterministic UPI Account Classification**:
  - Automatically identifies **P2M (Merchant)** vs **P2P (Personal)** payees across both QR scans and manual inputs using a 6-rule classification engine (MCC, POS terminals, 10-digit phone patterns, acquirer handles, and commercial keywords).

- **Deterministic Auto-Complete Dropdown**:
  - Directory covering Tier 1 PSP handles (`@okaxis`, `@ybl`, `@paytm`, `@upi`) and Tier 2 Indian banks (`@sbi`, `@hdfcbank`, `@icici`, `@barodampay`, etc.).
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

- **Framework**: [Expo SDK 54](https://expo.dev) (React Native 0.81)
- **Routing**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Animation**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
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
