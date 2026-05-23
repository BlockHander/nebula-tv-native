// ─────────────────────────────────────────────────
// Nebula TV — Login Screen (Remote-Friendly Pairing)
//
// Zero token typing on the TV remote.
// Instead, uses a local network pairing flow:
//
//   1. TV generates a short pairing code + local HTTP server
//   2. QR code encodes the TV's local URL with the code
//   3. User scans QR on phone → opens TV's pairing page
//   4. User pastes their Nebula token on the phone (easy!)
//   5. Phone POSTs the token to the TV over local network
//   6. TV logs in automatically
//
// Fallback: A "Manual Entry" button opens a condensed
// on-screen keyboard (last resort).
// ─────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useAuth } from '../context/AuthContext'
import {
  createPairingServer,
  getLocalIp,
} from '../services/PairingServer'
import TVKeyboard from '../components/TVKeyboard'

// ── TV Parallax Props ─────────────────────────

const TV_PARALLAX = {
  enabled: true,
  shiftDistanceX: 3,
  shiftDistanceY: 3,
  tiltAngle: 5,
  magnification: 1.05,
}
const TV_PARALLAX_SM = {
  enabled: true,
  shiftDistanceX: 2,
  shiftDistanceY: 2,
  tiltAngle: 3,
  magnification: 1.03,
}

// ── Component ─────────────────────────────────

export default function LoginScreen() {
  const { login } = useAuth()

  // ── Pairing State ──
  const [pairingCode, setPairingCode] = useState('')
  const [localIp, setLocalIp] = useState('0.0.0.0')
  const [serverPort, setServerPort] = useState(8888)
  const [isServerRunning, setIsServerRunning] = useState(false)
  const [isPaired, setIsPaired] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ipDetected, setIpDetected] = useState(false)

  // ── Manual Entry Fallback ──
  const [showManualEntry, setShowManualEntry] = useState(false)

  // ── Help Modal ──
  const [helpVisible, setHelpVisible] = useState(false)

  // ── Server Instance ──
  const serverRef = useRef<ReturnType<typeof createPairingServer> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Start Pairing Server ──
  useEffect(() => {
    let mounted = true

    async function initPairing() {
      // Detect local IP
      const ip = await getLocalIp()
      if (!mounted) return
      setLocalIp(ip)
      setIpDetected(ip !== '0.0.0.0')

      // Create and start pairing server
      const server = createPairingServer(async (token) => {
        // Token received via phone → auto-login
        if (!mounted) return
        setIsPaired(true)
        setIsConnecting(true)
        setError(null)

        try {
          await login(token.trim())
          // Navigation handled by auth gate in App.tsx
        } catch (err: unknown) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? (err as { message: string }).message
              : 'Connection failed. Please check your token and try again.'
          if (mounted) setError(msg)
        } finally {
          if (mounted) setIsConnecting(false)
        }
      })

      serverRef.current = server
      setPairingCode(server.code)

      try {
        const port = await server.start()
        if (mounted) {
          setServerPort(port)
          setIsServerRunning(true)
        }
      } catch (err: unknown) {
        console.warn('[NebulaPair] Failed to start pairing server:', err)
        // Continue anyway — QR will show the pairing code only
        if (mounted) setIsServerRunning(false)
      }

      // Poll pairing status as fallback
      pollTimerRef.current = setInterval(() => {
        if (serverRef.current?.isPaired()) {
          // Already handled by callback above
        }
      }, 2000)
    }

    initPairing()

    return () => {
      mounted = false
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      serverRef.current?.stop()
    }
  }, [login])

  // ── Manual Token Submit (from TVKeyboard fallback) ──
  const handleManualSubmit = useCallback(
    async (manualToken: string) => {
      setIsConnecting(true)
      setError(null)

      try {
        await login(manualToken.trim())
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Connection failed. Please check your token and try again.'
        setError(msg)
      } finally {
        setIsConnecting(false)
      }
    },
    [login],
  )

  // ── QR Code URL ─────────────────────────────
  const qrUrl = isServerRunning
    ? `http://${localIp}:${serverPort}/`
    : 'https://nebula.tv'

  // ── Render ──────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showManualEntry ? (
          <>
            {/* ── Manual Entry Fallback ── */}
            <View style={styles.brandSection}>
              <Text style={styles.brandIcon}>✦</Text>
              <Text style={styles.brandTitle}>Nebula TV</Text>
              <Text style={styles.brandSubtitle}>
                Enter your API token manually
              </Text>
            </View>
            <TVKeyboard
              onTokenComplete={handleManualSubmit}
              isConnecting={isConnecting}
              error={error}
            />
            <TouchableOpacity
              style={styles.backToPairing}
              onPress={() => setShowManualEntry(false)}
              activeOpacity={0.7}
              tvParallaxProperties={TV_PARALLAX_SM}
            >
              <Text style={styles.backToPairingText}>
                ← Back to pairing
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* ── Branding ── */}
            <View style={styles.brandSection}>
              <Text style={styles.brandIcon}>✦</Text>
              <Text style={styles.brandTitle}>Nebula TV</Text>
              <Text style={styles.brandSubtitle}>
                Connect your phone to sign in
              </Text>
            </View>

            {/* ── Pairing Code (large, readable from couch) ── */}
            <View style={styles.pairingSection}>
              <View style={styles.pairingCodeContainer}>
                <Text style={styles.pairingCodeLabel}>Pairing Code</Text>
                <Text style={styles.pairingCode}>{pairingCode}</Text>
              </View>

              {/* ── QR Code ── */}
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrUrl}
                    size={180}
                    backgroundColor="#ffffff"
                    color="#030712"
                  />
                </View>
              </View>

              {/* ── Connection Info ── */}
              <View style={styles.connectionInfo}>
                {isServerRunning && ipDetected ? (
                  <>
                    <Text style={styles.connectionUrl}>
                      {localIp}:{serverPort}
                    </Text>
                    <Text style={styles.connectionHint}>
                      Make sure your phone is on the same Wi-Fi network
                    </Text>
                  </>
                ) : (
                  <Text style={styles.connectionFallback}>
                    Open {'https://nebula.tv'} on your phone to get your token
                  </Text>
                )}
              </View>
            </View>

            {/* ── Status ── */}
            {isConnecting && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>
                  {isPaired
                    ? 'Token received! Signing in...'
                    : 'Waiting for phone...'}
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Bottom Bar ── */}
            <View style={styles.bottomBar}>
              {/* Help Button */}
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => setHelpVisible(true)}
                activeOpacity={0.6}
                tvParallaxProperties={TV_PARALLAX_SM}
              >
                <Text style={styles.helpButtonIcon}>?</Text>
                <View style={styles.helpButtonTextWrap}>
                  <Text style={styles.helpButtonTitle}>
                    Get your token
                  </Text>
                  <Text style={styles.helpButtonHint}>
                    How to find it
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Manual Entry Fallback */}
              <TouchableOpacity
                style={styles.manualButton}
                onPress={() => setShowManualEntry(true)}
                activeOpacity={0.6}
                tvParallaxProperties={TV_PARALLAX_SM}
              >
                <Text style={styles.manualButtonIcon}>⌨</Text>
                <Text style={styles.manualButtonText}>Manual Entry</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Help Modal ── */}
      {helpVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Get Your Nebula Token</Text>
            <Text style={styles.modalSubtitle}>
              Follow these steps on your phone or computer
            </Text>

            <View style={styles.stepsList}>
              <Step num={1} title="Open nebula.tv" detail="Log in with your Nebula account" />
              <Step num={2} title="Open Developer Tools" detail="Press F12 or Cmd+Option+I, then go to the Console tab" />
              <Step num={3} title="Get your token" detail='Type __NEBULA_DEV_TOKEN__ and press Enter' />
              <Step num={4} title="Copy & paste" detail="Copy the token, then scan the QR code to pair with your TV" />
              <Step num={5} title="Or use manual entry" detail="If scanning doesn't work, use the Manual Entry button" />
            </View>

            <View style={styles.modalHelpFooter}>
              <Text style={styles.modalHelpNote}>
                Your token is a long string of letters and numbers.
                It works like a password — keep it private.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setHelpVisible(false)}
              activeOpacity={0.6}
              tvParallaxProperties={TV_PARALLAX}
              hasTVPreferredFocus
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

// ── Step Component ────────────────────────────

function Step({ num, title, detail }: { num: number; title: string; detail: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{num}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDetail}>{detail}</Text>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    padding: 48,
  },
  content: {
    flex: 1,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },

  // ── Branding ──
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandIcon: {
    fontSize: 36,
    color: '#3b82f6',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 4,
  },

  // ── Pairing Section ──
  pairingSection: {
    alignItems: 'center',
    gap: 20,
  },
  pairingCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1e293b',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  pairingCodeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  pairingCode: {
    fontSize: 56,
    fontWeight: '900',
    color: '#60a5fa',
    fontFamily: 'monospace',
    letterSpacing: 14,
    textAlign: 'center',
  },
  qrContainer: {},
  qrWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: '#1e293b',
  },

  // ── Connection Info ──
  connectionInfo: {
    alignItems: 'center',
    maxWidth: 440,
  },
  connectionUrl: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 6,
  },
  connectionHint: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  connectionFallback: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Status ──
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#93c5fd',
  },

  // ── Error ──
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── Bottom Bar ──
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 28,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
    minHeight: 64,
  },
  helpButtonIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#60a5fa',
    width: 36,
    height: 36,
    lineHeight: 36,
    textAlign: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  helpButtonTextWrap: {},
  helpButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  helpButtonHint: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 1,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    minHeight: 64,
  },
  manualButtonIcon: {
    fontSize: 22,
  },
  manualButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#cbd5e1',
  },

  // ── Back to Pairing ──
  backToPairing: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToPairingText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#64748b',
  },

  // ── Help Modal ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 40,
    maxWidth: 680,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 28,
    textAlign: 'center',
  },
  stepsList: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  stepDetail: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
  },
  modalHelpFooter: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    width: '100%',
  },
  modalHelpNote: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
})
