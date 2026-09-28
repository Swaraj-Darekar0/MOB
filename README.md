<p align="center">
  <img src="assets/images/banner.png" alt="MOB" width="100%" />
</p>

# MOB

> *"Your bank balance is playing a small trick on you. Every time you scan a QR code, it shows you the whole pool—making you feel safe spending money that was already promised to your rent."*

---

## What is MOB?

Have you ever noticed how easy it is to spend money when you never feel it leave your hands?

When you scan a UPI QR code, your banking app happily shows you your total bank balance. It feels reassuring. But that single number is deceptive: it includes your rent, your groceries, and your emergency savings all pooled together. In that split second before you pay, your brain only registers that one large number and assumes you can afford the purchase.

**MOB breaks that illusion.**

MOB acts as a conscious filter between your impulse and your bank account:

1. **Your bank money stays untouched in your bank.** MOB does not hold your cash or connect to cloud servers.
2. **Your money is split into clear virtual envelopes**—like *Food*, *Rent*, *Shopping*, and *Fuel*.
3. **When you scan a merchant QR code, you spend from that specific envelope**—not your entire life savings.

You see your real spending limit *before* money leaves your account. It takes away the guesswork and replaces it with instant clarity.

---

> **Platform Availability:** MOB is currently released for **Android only**.

---

## Download & APK Installation

### 1. Download Pre-Built APK
1. Go to the **[Releases](https://github.com/Swaraj-Darekar0/MOB/releases)** section of this repository.
2. Download the latest `mob-release.apk`.
3. Open the file on your Android phone and tap **Install** *(enable "Install from unknown sources" if prompted by your browser)*.

---

## Development Setup

To build and run the project locally from source:

### Prerequisites
- Node.js (v18 or newer)
- npm or yarn
- Android device with **Expo Go** installed (or an Android emulator)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Swaraj-Darekar0/MOB.git
cd MOB

# Install dependencies
npm install

# Start the development server
npx expo start --android
```

Scan the terminal QR code with **Expo Go** on your Android device.

---

## Tech Stack

- **Platform:** Android (Expo SDK 57 / React Native 0.86)
- **Language:** TypeScript
- **Navigation:** Expo Router v4
- **Animation & Gestures:** React Native Reanimated & React Native Gesture Handler
- **Payments:** Native UPI Intent Protocol (Google Pay launch)
- **Storage:** Local AsyncStorage (100% offline, zero cloud tracking)

---

## License

MIT
