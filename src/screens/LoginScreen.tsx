// ──────────────────────────────────────────────
// Nebula TV — Login Screen (TV-optimized)
// ──────────────────────────────────────────────

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen() {
  const { login } = useAuth()

  const [token, setToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpExpanded, setHelpExpanded] = useState(false)

  const handleConnect = useCallback(async () => {
    const trimmed = token.trim()
    if (!trimmed) {
      setError('Please enter your API token.')
      return
    }

    setConnecting(true)
    setError(null)

    try {
      await login(trimmed)
      // Navigation is handled automatically via the auth gate in App.tsx
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message)
      } else {
        setError('Connection failed. Please check your token and try again.')
      }
    } finally {
      setConnecting(false)
    }
  }, [token, login])

  const toggleHelp = useCallback(() => {
    setHelpExpanded((prev) => !prev)
  }, [])

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
            Sign in with your Nebula developer token
          </Text>
        </View>

        {/* ── Token Input ── */}
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
            editable={!connecting}
            returnKeyType="go"
            onSubmitEditing={handleConnect}
          />

          {/* ── Error ── */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Connect Button ── */}
          <TouchableOpacity
            style={[styles.button, connecting && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={connecting}
            activeOpacity={0.7}
          >
            {connecting ? (
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
            <Text style={styles.helpTitle}>How to get your token</Text>
            <Text style={styles.helpChevron}>
              {helpExpanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {helpExpanded && (
            <View style={styles.helpBody}>
              <Text style={styles.helpStep}>
                1. Open{' '}
                <Text style={styles.helpBold}>nebula.tv</Text> in a desktop
                browser
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
    marginBottom: 40,
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

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

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
