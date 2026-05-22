// ──────────────────────────────────────────────
// Nebula TV — Pairing Screen (TV-optimized)
// Two modes:
//   1. Manual token entry (TV remote friendly)
//   2. Phone pairing (local HTTP server, IP + code)
// ──────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as Network from 'expo-network'
import { useAuth } from '../context/AuthContext'
import { startPairingServer, stopPairingServer } from '../services/pairing'

type PairingMode = 'manual' | 'phone'

export default function PairingScreen() {
  const { login } = useAuth()

  // ── Tab / Mode ──────────────────────────────
  const [mode, setMode] = useState<PairingMode>('phone')

  // ── Manual token entry state ────────────────
  const [token, setToken] = useState('')
  const [manualConnecting, setManualConnecting] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  // ── Phone pairing state ─────────────────────
  const [ipAddress, setIpAddress] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [serverPort, setServerPort] = useState<number | null>(null)
  const [serverStarting, setServerStarting] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pairingStatus, setPairingStatus] = useState<
    'waiting' | 'connected' | 'error'
  >('waiting')
  const [pairingError, setPairingError] = useState<string | null>(null)
  const serverStartedRef = useRef(false)

  // ── Generate a random 4-digit code ───────────
  const generateCode = useCallback(() => {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    setPairingCode(code)
    return code
  }, [])

  // ── Start the HTTP server on mount ────────────
  useEffect(() => {
    let cancelled = false

    async function initServer() {
      try {
        // Get local IP
        const ip = await Network.getIpAddressAsync()
        if (cancelled) return
        setIpAddress(ip)

        // Generate pairing code
        const code = generateCode()

        // Start HTTP server on a port in 8080–8100 range
        const basePort = 8080
        const portOffset = Math.floor(Math.random() * 21) // 0–20
        const port = basePort + portOffset

        const actualPort = await startPairingServer(port, code, (token) => {
          // Token received from phone via HTTP server
          if (cancelled) return
          setPairingStatus('connected')
          handleTokenFromPhone(token)
        })

        if (cancelled) return
        setServerPort(actualPort)
        serverStartedRef.current = true
        setServerStarting(false)
      } catch (err: unknown) {
        if (cancelled) return
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Failed to start pairing server'
        setServerError(msg)
        setServerStarting(false)
      }
    }

    initServer()

    return () => {
      cancelled = true
      if (serverStartedRef.current) {
        stopPairingServer().catch(() => {})
      }
    }
  }, [generateCode])

  // ── Handle token from phone pairing ───────────
  const handleTokenFromPhone = useCallback(
    async (userToken: string) => {
      setPairingStatus('connected')
      try {
        await login(userToken)
        // Navigation handled automatically by auth gate
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Pairing failed'
        setPairingStatus('error')
        setPairingError(msg)
      }
    },
    [login],
  )

  // ── Manual connect handler ────────────────────
  const handleManualConnect = useCallback(async () => {
    const trimmed = token.trim()
    if (!trimmed) {
      setManualError('Please enter your API token.')
      return
    }

    setManualConnecting(true)
    setManualError(null)

    try {
      await login(trimmed)
      // Navigation handled automatically by auth gate
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Connection failed. Please check your token and try again.'
      setManualError(msg)
    } finally {
      setManualConnecting(false)
    }
  }, [token, login])

  // ── Build the URL for phone pairing ───────────
  const pairingUrl =
    ipAddress && serverPort && pairingCode
      ? `http://${ipAddress}:${serverPort}?code=${pairingCode}`
      : null

  // ── Render ────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Branding ── */}
      <View style={styles.branding}>
        <Text style={styles.brandTitle}>Nebula TV</Text>
        <Text style={styles.brandSubtitle}>
          Sign in to watch your Nebula library
        </Text>
      </View>

      {/* ── Mode Tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === 'phone' && styles.tabActive]}
          onPress={() => setMode('phone')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              mode === 'phone' && styles.tabTextActive,
            ]}
          >
            Pair with Phone
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'manual' && styles.tabActive]}
          onPress={() => setMode('manual')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              mode === 'manual' && styles.tabTextActive,
            ]}
          >
            Manual Token
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Phone Pairing Panel ── */}
      {mode === 'phone' && (
        <View style={styles.card}>
          {serverStarting ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={styles.statusText}>Starting pairing server…</Text>
            </View>
          ) : serverError ? (
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>Server Error</Text>
              <Text style={styles.errorDetail}>{serverError}</Text>
              <Text style={styles.hintText}>
                Try restarting the app or use Manual Token mode instead.
              </Text>
            </View>
          ) : pairingStatus === 'waiting' ? (
            <>
              {/* ── IP Address ── */}
              <View style={styles.displayGroup}>
                <Text style={styles.displayLabel}>TV IP Address</Text>
                <Text style={styles.displayValueIP}>
                  {ipAddress ?? '…'}
                </Text>
              </View>

              {/* ── Pairing Code ── */}
              <View style={styles.displayGroup}>
                <Text style={styles.displayLabel}>Pairing Code</Text>
                <Text style={styles.displayValueCode}>{pairingCode}</Text>
              </View>

              {/* ── URL ── */}
              <View style={styles.urlCard}>
                <Text style={styles.urlLabel}>
                  Open this URL on your phone browser
                </Text>
                <Text style={styles.urlValue} selectable>
                  {pairingUrl ?? '…'}
                </Text>
              </View>

              {/* ── Instructions ── */}
              <View style={styles.instructions}>
                <Text style={styles.instructionStep}>
                  1. Make sure your phone is on the same Wi-Fi network
                </Text>
                <Text style={styles.instructionStep}>
                  2. Open the URL above on your phone
                </Text>
                <Text style={styles.instructionStep}>
                  3. Enter the pairing code shown above
                </Text>
                <Text style={styles.instructionStep}>
                  4. Sign in with your Nebula account on your phone
                </Text>
              </View>

              {/* ── Waiting indicator ── */}
              <View style={styles.waitingRow}>
                <ActivityIndicator color="#9ca3af" size="small" />
                <Text style={styles.waitingText}>
                  Waiting for phone…
                </Text>
              </View>
            </>
          ) : pairingStatus === 'connected' ? (
            <View style={styles.centerState}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Connected!</Text>
              <Text style={styles.statusText}>
                You are now signed in.
              </Text>
            </View>
          ) : pairingStatus === 'error' ? (
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>Pairing Failed</Text>
              <Text style={styles.errorDetail}>
                {pairingError ?? 'An unknown error occurred'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setPairingStatus('waiting')
                  setPairingError(null)
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Manual Token Panel ── */}
      {mode === 'manual' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Enter API Token</Text>

          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="Paste your token here"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={!manualConnecting}
            returnKeyType="go"
            onSubmitEditing={handleManualConnect}
          />

          {/* ── Error ── */}
          {manualError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{manualError}</Text>
            </View>
          )}

          {/* ── Connect Button ── */}
          <TouchableOpacity
            style={[
              styles.button,
              manualConnecting && styles.buttonDisabled,
            ]}
            onPress={handleManualConnect}
            disabled={manualConnecting}
            activeOpacity={0.7}
          >
            {manualConnecting ? (
              <View style={styles.buttonLoading}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.buttonText}>Connecting…</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    backgroundColor: '#030712',
  },

  // ── Branding ──

  branding: {
    alignItems: 'center',
    marginBottom: 36,
  },

  brandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f9fafb',
    letterSpacing: 1,
  },

  brandSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },

  // ── Tabs ──

  tabRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    marginBottom: 20,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },

  tab: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  tabActive: {
    backgroundColor: '#1d4ed8',
  },

  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },

  tabTextActive: {
    color: '#ffffff',
  },

  // ── Card ──

  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
  },

  // ── Section ──

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Display Groups (IP + Code) ──

  displayGroup: {
    alignItems: 'center',
    marginBottom: 20,
  },

  displayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  displayValueIP: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#030712',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },

  displayValueCode: {
    fontSize: 42,
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 8,
    backgroundColor: '#030712',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },

  // ── URL Display ──

  urlCard: {
    backgroundColor: '#030712',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    marginBottom: 20,
  },

  urlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 10,
    textAlign: 'center',
  },

  urlValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Instructions ──

  instructions: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  instructionStep: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 24,
    marginBottom: 6,
    paddingLeft: 8,
  },

  // ── Waiting ──

  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },

  waitingText: {
    fontSize: 15,
    color: '#9ca3af',
  },

  // ── Center state (loading / error / success) ──

  centerState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },

  statusText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // ── Success ──

  successIcon: {
    fontSize: 48,
    color: '#22c55e',
    fontWeight: '700',
  },

  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22c55e',
  },

  // ── Error ──

  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
  },

  errorDetail: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    lineHeight: 20,
  },

  hintText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Retry ──

  retryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Button ──

  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Input ──

  input: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    minHeight: 48,
    marginBottom: 16,
  },
})
