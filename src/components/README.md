# Nebula TV — Phone Pairing Architecture

## Overview

The phone-pairing system allows a user to enter their Nebula API token from a
mobile browser, instead of using the Android TV on-screen remote keyboard.

## Components

### `src/services/PairingServer.ts`

A lightweight HTTP server implemented on top of `react-native-tcp-socket`. It
runs locally on the Android TV device and serves two endpoints:

- **`GET /`** — returns a self-contained HTML page (dark theme, mobile-responsive)
  with a token input form.
- **`POST /submit`** — accepts `{ "token": "..." }` JSON body, invokes a callback
  in the React Native app.

The server adds CORS headers (`Access-Control-Allow-Origin: *`) to all responses
so any mobile browser can reach it.

API surface:
| Function | Description |
|---|---|
| `startServer(port?)` | Begins listening; returns `{ port, ip }` |
| `stopServer()` | Shuts down the TCP listener |
| `setTokenCallback(fn)` | Registers the token-received handler |
| `getServerUrl()` | Returns `http://ip:port` for QR encoding |
| `isRunning()` | `true` while the server is active |

### `src/screens/LoginScreen.tsx`

The TV-optimized login screen, rewritten to support two tabs switched at the top:

1. **Pair from Phone** (default) — Shows a QR code and local URL. The user
   scans/scans on their phone, opens the page, pastes their token, and submits.
   The token is received by `PairingServer` and the app logs in automatically.
2. **Enter Manually** — The existing TextInput with on-screen keyboard and the
   help section showing how to obtain a dev token from `nebula.tv`.

### `src/services/PairingServer.ts` self-contained HTML page

The HTML page is stored inline as a string constant. It includes:
- Dark theme (`#030712` background, `#111827` cards) matching the Android TV app
- Large text input for the token
- "Connect to Nebula" button with loading spinner
- Success/error feedback messages
- Meta viewport for mobile responsiveness
- Brief step-by-step instructions for obtaining a token from `nebula.tv`
- `fetch()` POST to `http://<tv-ip>:<port>/submit`

No external resources are loaded — everything is inline.

## Data Flow

```
┌──────────────┐          ┌─────────────────┐          ┌────────────┐
│  Android TV  │          │   Phone (WiFi)   │          │  Nebula    │
│  (Server)    │          │   (Browser)      │          │  API       │
├──────────────┤          ├─────────────────┤          ├────────────┤
│ Start server │          │                  │          │            │
│ on :8080     │          │                  │          │            │
│ Show QR/URL  │◄────────►│ Scan QR/Open URL │          │            │
│              │  GET /   │ Show HTML form   │          │            │
│              │◄────────►│ Paste token      │          │            │
│              │ POST /   │ Submit           │          │            │
│              │ /submit  │                  │          │            │
│ Callback     │          │                  │          │            │
│ login(token) │──────────┼─────────────────►│──────────► Exchange   │
│              │          │                  │  Token   │            │
│ Auth gate    │          │                  │          │            │
│ → MainTabs   │          │                  │          │            │
└──────────────┘          └─────────────────┘          └────────────┘
```

## Requirements

- `react-native-tcp-socket` ^6.x — TCP socket server
- `expo-network` — local IP address detection
- `react-native-qrcode-svg` — QR code rendering on the TV screen

## Usage (developer)

```tsx
import { startServer, setTokenCallback, stopServer } from '../services/PairingServer'

// Register callback before starting
setTokenCallback((token) => {
  console.log('Received token:', token)
  login(token)
})

// Start the server
const { ip, port } = await startServer(8080)
console.log(`Server at http://${ip}:${port}`)

// Later...
await stopServer()
```

## Notes

- The server listens on `0.0.0.0` so it's reachable from any network interface.
- Port fallback: tries the requested port, then +1 up to +20, then OS-assigned.
- The server is automatically stopped when `LoginScreen` unmounts.
- The existing `src/services/pairing.ts` (native module approach) is preserved
  for reference; `PairingServer.ts` is a pure-JS/TS alternative.
