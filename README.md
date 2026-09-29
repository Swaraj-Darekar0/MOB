<p align="center">
  <img src="assets/images/banner.png" alt="MOB Banner" width="90%" />
</p>

# MOB

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Platform-Android%20Only-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform: Android" />
  <img src="https://img.shields.io/badge/Framework-Expo%2057%20%7C%20RN%200.86-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <strong>A conscious virtual-envelope allocation and UPI payment-control layer for Android.</strong>
</p>

---

## The Concept

> *"Your bank balance is playing a small trick on you. Every time you scan a QR code, it shows you the whole pool—making you feel safe spending money that was already promised to your rent."*

Have you ever noticed how easy it is to spend money when you never feel it leave your hands?

When you scan a UPI QR code, your banking app happily flashes your total account balance. It feels reassuring. But that single number is deceptive: it pools your rent, your groceries, and your emergency savings together into one figure. In that split second before you pay, your brain only registers that large total and assumes you can comfortably afford the purchase.

**MOB breaks that illusion.**

MOB acts as a conscious filter between your impulse and your bank account:

1. **Your money stays untouched in your bank.** MOB never holds your funds or sends your financial data to external servers.
2. **Your spending is organized into virtual envelopes**—such as *Food*, *Rent*, *Shopping*, and *Fuel*.
3. **When you scan a merchant QR code, you spend strictly from that specific envelope**—not your entire life savings.

You see your actual spending runway *before* a single rupee moves. It removes the guesswork and replaces it with instant clarity.

---

> [!IMPORTANT]
> **Platform Notice:** MOB is currently released for **Android only**.

---

## Key Features

- **Virtual Allocation Buckets:** Allocate spending allowances into dedicated categories without opening separate bank accounts.
- **Dual Visual Perspectives:** View allocations as an analytical list or collapse them into a tactile, fanned card deck.
- **Smart Payee Recognition:** Automatically classifies merchant (P2M) vs. personal (P2P) payment QR codes.
- **Conscious Commitment:** Replaces accidental one-tap checkouts with an intentional slide-to-commit gesture before launching Google Pay.
- **100% Offline & Private:** Complete local-first accounting powered by local device storage with zero cloud dependencies.

---

## Getting Started

### Option 1: Install Pre-Built APK (Recommended)

1. Open your Android device browser and head to **[Releases](https://github.com/Swaraj-Darekar0/MOB/releases)**.
2. Download the latest `mob-release.apk`.
3. Tap the file to install *(allow "Install unknown apps" in Android settings if prompted)*.

---

### Option 2: Build & Run from Source

#### Prerequisites
- **Node.js** (v18.0 or newer)
- **npm** or **yarn**
- **Android Device** with [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) installed, or an active Android emulator

#### Installation

```bash
# Clone the repository
git clone https://github.com/Swaraj-Darekar0/MOB.git
cd MOB

# Install project dependencies
npm install
```

#### Running the Development Server

```bash
# Start the Expo development server targeting Android
npx expo start --android
```

Scan the terminal QR code using **Expo Go** on your Android device.

---

## How It Works (Workflow)

```
[1. Allocate]             [2. Scan QR]               [3. Commit]              [4. Complete]
Define allowances  --->   Scan any merchant UPI  ---> Confirm bucket runway ---> Handover to GPay
in virtual buckets        via camera reticle         via slide-to-commit      & update envelope
```

1. **Allocate:** Set monthly or weekly allowances for your essential envelopes.
2. **Scan:** Point the in-app camera at any Bharat/UPI QR code or input a VPA.
3. **Select Bucket & Commit:** Review the envelope's available balance and slide to commit.
4. **Pay:** MOB constructs the standardized UPI intent and hands off securely to Google Pay to complete the native transaction.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Core** | [Expo SDK 57](https://expo.dev), [React Native 0.86.3](https://reactnative.dev), [React 19](https://react.dev) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Navigation** | [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based routing) |
| **Animations & Gestures** | [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated/), [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) |
| **Hardware & Native APIs** | [`expo-camera`](https://docs.expo.dev/versions/latest/sdk/camera/), Native Android UPI Intent (`expo-intent-launcher`) |
| **Storage & State** | [Zustand](https://github.com/pmndrs/zustand), [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/), Local Storage |
| **Icons & Styling** | [`lucide-react-native`](https://lucide.dev/), Native StyleSheet |

---

## Project Structure

```text
MOB/
├── assets/images/              # Matte-black banner, adaptive icons, and splash screens
├── src/
│   ├── app/                    # File-based routes (Tabs, Onboarding, Payment flow)
│   │   ├── (onboarding)/       # First-run setup & allocation
│   │   ├── (tabs)/             # Dashboard tabs (Buckets, Cards, Settings)
│   │   ├── payment/            # Scan QR, confirmation, and result handlers
│   │   └── _layout.tsx         # Root provider wrapper & preloader
│   ├── components/
│   │   ├── common/             # Reusable UI primitives (Buttons, Inputs, Cards)
│   │   ├── dashboard/          # Envelope cards and balance telemetry
│   │   └── ui/                 # MorphingDeck, CreditCard, and SlideCommit
│   ├── services/
│   │   ├── db/                 # Local ledger and storage engine
│   │   └── payment/            # UPI URI parsing and intent dispatch
│   ├── store/                  # Global reactive state (useAppStore)
│   ├── theme/                  # Design tokens (colors, spacing, typography)
│   └── types/                  # TypeScript data models and interfaces
├── app.json                    # Expo application manifest
└── package.json                # Project dependencies and run scripts
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
