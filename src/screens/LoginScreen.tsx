// ─────────────────────────────────────────────────
// Nebula TV — Login Screen (TV-First Design)
//
// Designed per Android TV Design for TV guidelines:
//   - 10-foot viewing distance: large text (min 18sp)
//   - Overscan-safe margins (48dp+ on all sides)
//   - D-pad navigation with focus rings + parallax
//   - Minimal text input (virtual character grid)
//   - High contrast, lean-back-optimized layout
//   - Single-screen (no scrolling needed)
//
// Pairing approach:
//   TV-native virtual keyboard instead of TCP server
//   — no local network dependency, works everywhere.
//   QR code links to nebula.tv as a helpful shortcut,
//   not a local pairing server.
// ─────────────────────────────────────────────────

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useAuth } from '../context/AuthContext'
import TVKeyboard from '../components/TVKeyboard'
import { PAIRING_STEPS, QR_TARGET_URL, validateToken } from '../services/PairingServer'

// ── TV-specific prop types (available at runtime on Android TV) ─────
// Standard RN types don't include these, but they work on Android TV.
const tvProps = {
  parallax: {
    enabled: true,
    shiftDistanceX: 3,
    shiftDistanceY: 3,
    tiltAngle: 5,
    magnification: 1.05,
  },
  parallaxSmall: {
    enabled: true,
    shiftDistanceX: 2,
    shiftDistanceY: 2,
    tiltAngle: 3,
    magnification: 1.03,
  },
} as const

// ── Component ─────────────────────────────────

export default function LoginScreen() {
  const { login } = useAuth()

  // ── Token Entry State ──
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Help Modal ──
  const [helpVisible, setHelpVisible] = useState(false)

  // ── QR Card ──
  const [qrExpanded, setQrExpanded] = useState(false)

  // ── Handle Token Submission ─────────────────
  const handleTokenSubmit = useCallback(
    async (token: string) => {
      // Validate
      const validation = validateToken(token)
      if (!validation.valid) {
        setError(validation.message ?? 'Invalid token')
        return
      }

      setConnecting(true)
      setError(null)

      try {
        await login(token.trim())
        // Navigation handled automatically by auth gate in App.tsx
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Connection failed. Please check your token and try again.'
        setError(msg)
      } finally {
        setConnecting(false)
      }
    },
    [login],
  )

  // ── Background: subtle gradient overlay ─────
  // (done purely with opacity layers, no external deps)

  return (
    <View style={styles.container}>
      {/* ── Content (overscan-safe) ── */}
      <View style={styles.content}>
        {/* ── Branding ── */}
        <View style={styles.brandSection}>
          <Text style={styles.brandIcon}>✦</Text>
          <Text style={styles.brandTitle}>Nebula TV</Text>
          <Text style={styles.brandSubtitle}>
            Enter your API token to sign in
          </Text>
        </View>

        {/* ── Token Entry (TV Keyboard) ── */}
        <TVKeyboard
          onTokenComplete={handleTokenSubmit}
          isConnecting={connecting}
          error={error}
        />

        {/* ── Bottom Bar: Help + QR ── */}
        <View style={styles.bottomBar}>
          {/* Help Button */}
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setHelpVisible(true)}
            activeOpacity={0.6}
            tvParallaxProperties={tvProps.parallaxSmall}
          >
            <Text style={styles.helpButtonIcon}>?</Text>
            <View style={styles.helpButtonTextWrap}>
              <Text style={styles.helpButtonTitle}>
                How to get my token
              </Text>
              <Text style={styles.helpButtonHint}>
                3 steps &middot; 30 seconds
              </Text>
            </View>
          </TouchableOpacity>

          {/* QR Code Toggle */}
          <TouchableOpacity
            style={styles.qrToggle}
            onPress={() => setQrExpanded((p) => !p)}
            activeOpacity={0.6}
            tvParallaxProperties={tvProps.parallaxSmall}
          >
            <View style={styles.qrInner}>
              <Text style={styles.qrToggleLabel}>
                {qrExpanded ? 'Hide QR' : 'Scan QR'}
              </Text>
              <Text style={styles.qrToggleSub}>
                Open nebula.tv
              </Text>
            </View>
            {qrExpanded && (
              <View style={styles.qrCodeBox}>
                <QRCode
                  value={QR_TARGET_URL}
                  size={100}
                  backgroundColor="#ffffff"
                  color="#030712"
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Error Banner (if set outside keyboard) ── */}
      </View>

      {/* ── Help Modal ── */}
      <Modal
        visible={helpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Get Your Nebula Token
            </Text>
            <Text style={styles.modalSubtitle}>
              Follow these steps on your phone or computer
            </Text>

            <View style={styles.stepsList}>
              {PAIRING_STEPS.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>
                      {step.title}
                    </Text>
                    <Text style={styles.stepDetail}>
                      {step.detail}
                    </Text>
                  </View>
                </View>
              ))}
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
              tvParallaxProperties={tvProps.parallax}
              hasTVPreferredFocus
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ── Styles ────────────────────────────────────
// TV Design Guidelines applied:
//   - 48dp+ overscan margin (padding)
//   - Min body text 18sp
//   - Min touch target 48dp
//   - High contrast (light text on dark bg)
//   - Consistent 8dp spacing grid

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    padding: 48, // Overscan-safe margin
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
    marginBottom: 28,
  },
  brandIcon: {
    fontSize: 32,
    color: '#3b82f6',
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 6,
  },

  // ── Bottom Bar ──
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },

  // ── Help Button ──
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

  // ── QR Toggle ──
  qrToggle: {
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
  qrInner: {},
  qrToggleLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  qrToggleSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 1,
  },
  qrCodeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 8,
  },

  // ── Help Modal ──
  modalOverlay: {
    flex: 1,
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

  // ── Steps ──
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

  // ── Modal Footer ──
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

  // ── Modal Close ──
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
