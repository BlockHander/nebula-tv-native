# Nebula TV

An **Android TV** client for [Nebula](https://nebula.tv) — streaming video from your favorite educational creators, designed for the 10-foot experience.

![Platform](https://img.shields.io/badge/platform-Android%20TV-3b82f6?style=flat-square)
![Build](https://img.shields.io/badge/build-expo%20%7C%20gradle-22c55e?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-9ca3af?style=flat-square)

---

## Features

- **Browse** your Nebula library — featured, trending, and all videos
- **Search** with a TV-optimized virtual keyboard (D-pad friendly)
- **Watch** HLS streams with play/pause controls
- **Explore** by category with horizontal chip filters
- **Sign in** with your Nebula API token via on-screen keyboard (no local network needed)
- **TV-first UI** — focus rings, parallax effects, overscan-safe margins, 10-foot typography

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 18+ | JS runtime |
| [JDK 17](https://adoptium.net/temurin/releases/) | 17.0.x | Android compilation |
| [Android Studio](https://developer.android.com/studio) | Latest | SDK manager + emulator |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | Latest | Build tooling |

### Android SDK Requirements

Installed via Android Studio's **SDK Manager** (`Tools` → `SDK Manager`):

| SDK Component | Version |
|---------------|---------|
| Android SDK Platform | 35 |
| Android SDK Build-Tools | 35.0.0 |
| Android SDK Command-line Tools | Latest |
| Android Emulator | Latest |
| Android SDK Platform-Tools | Latest |

### Environment Variables

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`):

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/path/to/jdk-17
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```

Verify:

```bash
java -version          # → 17.0.x
adb --version          # → Android Debug Bridge
npx react-native info  # → environment report
```

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/BlockHander/nebula-tv-native.git
cd nebula-tv-native

# 2. Install JS dependencies
npm install

# 3. (Optional) Pre-build native modules
npx expo prebuild --platform android

# 4. You're ready to build
```

---

## Building the APK

### 🔧 Debug APK (fast, for testing)

```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 📦 Release APK (optimized, production)

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

> **Note:** Release builds currently use the debug keystore. For production distribution, generate your own signing key:
> ```bash
> keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
> ```
> Then configure `android/app/build.gradle` → `signingConfigs.release`.

### ⚡ Optimized Build (limited RAM)

If you're on a machine with limited memory (e.g., <8GB RAM):

```bash
cd android
./gradlew assembleRelease --no-daemon -Dorg.gradle.jvmargs="-Xms256m -Xmx2048m" --max-workers=1
```

---

## Running on an Android TV Emulator

### Step 1: Create a TV Virtual Device

1. Open **Android Studio**
2. Click **Device Manager** (or `Tools` → `Device Manager`)
3. Click **+ Create device**
4. **Category:** Select **TV**
5. **Device:** Pick an Android TV device (e.g., **Android TV 1080p**, **ADT-3**, or **Nexus Player**)
6. **System Image:** Download and select a system image:
   - **API 35** (Android 15) — latest
   - **API 34** (Android 14) — stable
   - **API 33** (Android 13) — widely compatible
7. Click **Finish**

### Step 2: Launch the Emulator

```bash
# List available AVDs
emulator -list-avds

# Start a specific AVD
emulator -avd <your_tv_avd_name> -no-snapshot

# Or launch from Android Studio Device Manager (just click the play ▶️ button)
```

### Step 3: Install the APK

```bash
# Wait for the emulator to boot, then:
adb install android/app/build/outputs/apk/release/app-release.apk

# Or for debug builds:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

The app will appear in the TV launcher as **Nebula TV**.

### Step 4: D-Pad Navigation in the Emulator

The emulator toolbar has virtual D-pad buttons, or use keyboard shortcuts:

| Keyboard | D-Pad Action |
|----------|--------------|
| `↑` `↓` `←` `→` | Navigate |
| `Enter` | Select / OK |
| `Escape` | Back |
| `M` | Menu / Home |
| `P` | Play / Pause |

---

## Running on a Physical Android TV Device

### Method 1: USB Debugging

1. On your Android TV: **Settings** → **Device Preferences** → **About** → tap **Build** 7 times to enable Developer Options
2. **Settings** → **Device Preferences** → **Developer Options** → enable **USB Debugging**
3. Connect your TV and computer via USB (or use ADB over network — see below)
4. Verify connection: `adb devices` (should show your device)
5. Install:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Method 2: ADB over Network (Wi-Fi)

```bash
# 1. Find your TV's IP address
#    Settings → Network → About → IP address

# 2. Connect ADB
adb connect <tv_ip_address>:5555
#    Port 5555 is the default ADB port

# 3. Verify
adb devices
#    → <tv_ip_address>:5555 device

# 4. Install
adb install android/app/build/outputs/apk/release/app-release.apk
```

> **Note:** Some Android TV devices require enabling **ADB Debugging** in **Developer Options** first, and may prompt you to authorize the connection on-screen.

---

## Obtaining a Nebula API Token

Nebula TV uses the official Nebula API. You need an active Nebula subscription to use this app.

1. Open **nebula.tv** in a **desktop browser** and sign in
2. Open **Developer Tools** (`F12` or `Cmd+Option+I`)
3. Go to the **Console** tab
4. Type `__NEBULA_DEV_TOKEN__` and press **Enter**
5. The console displays your API token — a long alphanumeric string
6. Copy the token and enter it on the TV using the on-screen keyboard

> ⚠️ **Keep your token private.** It grants full API access to your Nebula account.

---

## Project Structure

```
nebula-tv-native/
├── App.tsx                     # App entry + TV-optimized tab bar
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Token entry with TV virtual keyboard
│   │   ├── HomeScreen.tsx      # Featured / Trending / All rows
│   │   ├── ExploreScreen.tsx   # Category filter + content grid
│   │   ├── SearchScreen.tsx    # TVKeyboard modal + results grid
│   │   ├── LibraryScreen.tsx   # Profile + placeholder sections
│   │   └── VideoScreen.tsx     # HLS player + metadata + related
│   ├── components/
│   │   ├── TVKeyboard.tsx      # D-pad character grid (A-Z, 0-9)
│   │   ├── ContentCard.tsx     # Video card with focus ring
│   │   ├── ContentRow.tsx      # Horizontal scrollable row
│   │   ├── CategoryChip.tsx    # Pill filter with parallax
│   │   ├── ErrorView.tsx       # Error + retry button
│   │   └── LoadingSpinner.tsx  # Loading state
│   ├── context/
│   │   └── AuthContext.tsx     # Auth state + AsyncStorage persistence
│   ├── services/
│   │   ├── api.ts              # Nebula API client (fetch)
│   │   └── PairingServer.ts    # Token validation + instructions
│   ├── constants/
│   │   └── api.ts              # API endpoints + storage keys
│   └── types/
│       ├── index.ts            # TypeScript interfaces
│       └── react-native-tv.d.ts # TV-specific prop types
├── android/                    # Android native project (generated by Expo)
├── package.json
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React Native](https://reactnative.dev/) (Expo-managed) |
| Navigation | [React Navigation](https://reactnavigation.org/) Native Stack |
| Video Player | [react-native-video](https://github.com/react-native-video/react-native-video) |
| QR Codes | [react-native-qrcode-svg](https://github.com/awesomejerry/react-native-qrcode-svg) |
| Icons | [react-native-vector-icons](https://github.com/oblador/react-native-vector-icons) |
| Networking | [expo-network](https://docs.expo.dev/versions/latest/sdk/network/) |
| Storage | [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) |
| HTTP API | Native `fetch()` |
| Build | Gradle (via Expo prebuild) |

---

## Troubleshooting

### ❌ Build fails with "Out of memory"

```bash
# Reduce Gradle memory and limit workers:
cd android
./gradlew assembleRelease --no-daemon -Dorg.gradle.jvmargs="-Xms256m -Xmx2048m" --max-workers=1
```

### ❌ "No compatible devices / emulators found"

Ensure an emulator is running or a device is connected:

```bash
adb devices
# Should show at least one device/emulator
```

If the emulator doesn't appear in `adb devices`, restart ADB:

```bash
adb kill-server
adb start-server
adb devices
```

### ❌ "Unresolved reference: NebulaHttpServerPackage"

This was removed. Make sure you're on the latest commit:

```bash
git pull
```

### ❌ App crashes on launch

Try clearing app data:

```bash
adb uninstall com.nebula.tv
adb install android/app/build/outputs/apk/release/app-release.apk
```

### ❌ "INTERNET" permission required

The app needs network access to reach Nebula's API. This is declared in `AndroidManifest.xml`. If you see network errors, verify the manifest includes:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

### ❌ Emulator is very slow

- Use a lower API level system image (API 33 is faster than 35)
- Enable **Hardware Acceleration** in AVD settings (uses your GPU)
- Increase emulator RAM (at least 2GB, prefer 4GB)
- Use `-no-snapshot` for cold boot, then snapshot after first boot

### ❌ TV keyboard doesn't show

The `tvParallaxProperties` and D-pad focus effects work with React Native's built-in Android TV support (core since RN 0.63). If focus navigation doesn't work:

- Make sure you're running on an actual Android TV device or TV emulator (not a phone emulator)
- Check `AndroidManifest.xml` includes `<uses-feature android:name="android.software.leanback" android:required="true"/>`

---

## License

MIT — see [LICENSE](LICENSE) for details.

*Not affiliated with Nebula (nebula.tv). This is an unofficial client.*
