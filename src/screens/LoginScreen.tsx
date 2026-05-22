// ──────────────────────────────────────────────
// Nebula TV — Login Screen (TV-optimized)
// Two modes:
//   1. "Pair from Phone" — QR code + local HTTP pairing server
//   2. "Enter Manually"  — TextInput with on-screen keyboard
// ──────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useAuth } from '../context/AuthContext'
import {
  startServer,
  stopServer,
  setTokenCallback,
  getServerUrl,
  isRunning,
} from '../services/PairingServer'

type ActiveTab = 'phone' | 'manual'

export default function LoginScreen() {
  const { login } = useAuth()

  // ── Tab state ────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('phone')

  // ── Phone pairing state ──────────────────────
  const [serverStarting, setServerStarting] = useState(false)
  const [serverRunning, setServerRunning] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [pairingStatus, setPairingStatus] = useState<
    'idle' | 'waiting' | 'connected' | 'error'
  >('idle')
  const [pairingError, setPairingError] = useState<string | null>(null)
  const pairingStartedRef = useRef(false)

  // ── Manual token entry state ─────────────────
  const [token, setToken] = useState('')
  const [manualConnecting, setManualConnecting] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [helpExpanded, setHelpExpanded] = useState(false)

  // ── Start pairing server ─────────────────────
  const handleStartPairing = useCallback(async () => {
    if (serverRunning || serverStarting) return

    setServerStarting(true)
    setServerError(null)
    setPairingStatus('idle')
    setPairingError(null)

    try {
      // Register the token callback BEFORE starting the server
      setTokenCallback(async (receivedToken: string) => {
        setPairingStatus('connected')
        try {
          await login(receivedToken)
          // Navigation handled automatically by auth gate
        } catch (err: unknown) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? (err as { message: string }).message
              : 'Pairing failed'
          setPairingStatus('error')
          setPairingError(msg)
        }
      })

      const { port, ip } = await startServer(8080)
      const url = `http://${ip}:${port}`
      setServerUrl(url)
      setServerRunning(true)
      setPairingStatus('waiting')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to start pairing server'
      setServerError(msg)
      setPairingStatus('idle')
    } finally {
      setServerStarting(false)
    }
  }, [serverRunning, serverStarting, login])

  // ── Auto-start on mount ──────────────────────
  useEffect(() => {
    if (!pairingStartedRef.current) {
      pairingStartedRef.current = true
      handleStartPairing()
    }
  }, [handleStartPairing])

  // ── Stop server on unmount ───────────────────
  useEffect(() => {
    return () => {
      if (isRunning()) {
        stopServer().catch(() => {})
      }
    }
  }, [])

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
      // Navigation handled automatically via the auth gate in App.tsx
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setManualError((err as { message: string }).message)
      } else {
        setManualError('Connection failed. Please check your token and try again.')
      }
    } finally {
      setManualConnecting(false)
    }
  }, [token, login])

  const toggleHelp = useCallback(() => {
    setHelpExpanded((prev) => !prev)
  }, [])

  // ── Render ────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'phone' && styles.activeTab]}
            onPress={() => setActiveTab('phone')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'phone' && styles.activeTabText,
              ]}
            >
              {'\uD83D\uDCF1'} Pair from Phone
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'manual' && styles.activeTabText,
              ]}
            >
              {'\u2328\uFE0F'} Enter Manually
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Phone Pairing Panel ── */}
        {activeTab === 'phone' && (
          <View style={styles.card}>
            {serverStarting ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#3b82f6" size="large" />
                <Text style={styles.statusText}>
                  Starting pairing server…
                </Text>
              </View>
            ) : serverError ? (
              <View style={styles.centerState}>
                <Text style={styles.errorTitle}>Server Error</Text>
                <Text style={styles.errorDetail}>{serverError}</Text>
                <Text style={styles.hintText}>
                  Try restarting the app or use the manual token entry below.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleStartPairing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : pairingStatus === 'waiting' ? (
              <>
                {/* ── QR Code ── */}
                <View style={styles.qrContainer}>
                  {serverUrl ? (
                    <QRCode
                      value={serverUrl}
                      size={200}
                      backgroundColor="white"
                      color="#030712"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Text style={styles.qrPlaceholderText}>...</Text>
                    </View>
                  )}
                </View>

                {/* ── URL Display ── */}
                <View style={styles.urlCard}>
                  <Text style={styles.urlLabel}>
                    Open this URL on your phone
                  </Text>
                  <Text style={styles.urlValue} selectable>
                    {serverUrl || '...'}
                  </Text>
                </View>

                {/* ── Instructions ── */}
                <View style={styles.instructions}>
                  <Text style={styles.instructionStep}>
                    1. Make sure your phone is on the same Wi-Fi network
                  </Text>
                  <Text style={styles.instructionStep}>
                    2. Scan the QR code or open the URL on your phone
                  </Text>
                  <Text style={styles.instructionStep}>
                    3. Paste your Nebula API token and tap Connect
                  </Text>
                </View>

                {/* ── Waiting indicator ── */}
                <View style={styles.waitingRow}>
                  <ActivityIndicator color="#9ca3af" size="small" />
                  <Text style={styles.waitingText}>
                    {'\uD83D\uDCF1'} Waiting for connection…
                  </Text>
                </View>
              </>
            ) : pairingStatus === 'connected' ? (
              <View style={styles.centerState}>
                <Text style={styles.successIcon}>{'\u2713'}</Text>
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
            ) : (
              /* ── Idle state (start button) ── */
              <View style={styles.centerState}>
                <Text style={styles.statusText}>
                  Start the pairing server to connect from your phone.
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleStartPairing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>
                    Start Pairing Server
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Manual Token Panel ── */}
        {activeTab === 'manual' && (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>API Token</Text>
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

            {/* ── Help Section ── */}
            <View style={styles.helpCard}>
              <TouchableOpacity
                style={styles.helpHeader}
                onPress={toggleHelp}
                activeOpacity={0.7}
              >
                <Text style={styles.helpTitle}>
                  How to get your token
                </Text>
                <Text style={styles.helpChevron}>
                  {helpExpanded ? '\u25B2' : '\u25BC'}
                </Text>
              </TouchableOpacity>

              {helpExpanded && (
                <View style={styles.helpBody}>
                  <Text style={styles.helpStep}>
                    1. Open{' '}
                    <Text style={styles.helpBold}>nebula.tv</Text> in a
                    desktop browser
                  </Text>
                  <Text style={styles.helpStep}>
                    2. Open Developer Tools{' '}
                    <Text style={styles.helpBold}>
                      (F12 / Cmd+Option+I)
                    </Text>
                  </Text>
                  <Text style={styles.helpStep}>
                    3. Go to the{' '}
                    <Text style={styles.helpBold}>Console</Text> tab
                  </Text>
                  <Text style={styles.helpStep}>
                    4. Type{' '}
                    <Text style={styles.helpCode}>
                      __NEBULA_DEV_TOKEN__
                    </Text>{' '}
                    and press Enter
                  </Text>
                  <Text style={styles.helpStep}>
                    5. Copy the displayed token string
                  </Text>
                  <Text style={styles.helpStep}>
                    6. Paste it above and tap{' '}
                    <Text style={styles.helpBold}>Connect</Text>
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
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

  // ── Tab Bar ──

  tabBar: {
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

  activeTab: {
    backgroundColor: '#1d4ed8',
  },

  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },

  activeTabText: {
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
    marginBottom: 20,
  },

  // ── QR Code ──

  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignSelf: 'center',
  },

  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrPlaceholderText: {
    fontSize: 24,
    color: '#6b7280',
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

  // ── Label ──

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Help Section ──

  helpCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },

  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },

  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },

  helpChevron: {
    fontSize: 12,
    color: '#6b7280',
  },

  helpBody: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  helpStep: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
    marginBottom: 8,
  },

  helpBold: {
    fontWeight: '700',
    color: '#f9fafb',
  },

  helpCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
})
