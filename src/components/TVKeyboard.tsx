// ─────────────────────────────────────────────────
// Nebula TV — TV-Optimized Virtual Keyboard
// D-pad navigable character grid for token entry
// Designed per Android TV guidelines:
//   - Overscan-safe margins (48dp)
//   - Min touch target 48dp (we use 64dp)
//   - Focus indicators with parallax highlighting
//   - High contrast, large readable text
//   - Simple grid layout, no scrolling
// ─────────────────────────────────────────────────

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  findNodeHandle,
} from 'react-native'

// ── Props ──────────────────────────────────────

interface TVKeyboardProps {
  onTokenComplete: (token: string) => void
  onCancel?: () => void
  isConnecting?: boolean
  error?: string | null
}

// ── Keyboard Layout ────────────────────────────

const ROW_1 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const ROW_2 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
const ROW_3 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
const ROW_4 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '_']

const SPECIAL_KEYS = {
  BACKSPACE: '⌫',
  CLEAR: '✕',
  SUBMIT: 'Connect to Nebula',
} as const

const MAX_TOKEN_LENGTH = 80

// ── Component ──────────────────────────────────

const TVKeyboard: React.FC<TVKeyboardProps> = ({
  onTokenComplete,
  onCancel,
  isConnecting = false,
  error = null,
}) => {
  const [token, setToken] = useState('')
  const [focusedChar, setFocusedChar] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // Scroll to bottom when characters are entered (show latest)
  useEffect(() => {
    if (scrollRef.current && token.length > 20) {
      scrollRef.current.scrollToEnd({ animated: true })
    }
  }, [token.length])

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isConnecting) return

      switch (key) {
        case SPECIAL_KEYS.BACKSPACE:
          setToken((prev) => prev.slice(0, -1))
          break
        case SPECIAL_KEYS.CLEAR:
          setToken('')
          break
        case SPECIAL_KEYS.SUBMIT:
          if (token.trim().length > 0) {
            onTokenComplete(token.trim())
          }
          break
        default:
          if (token.length < MAX_TOKEN_LENGTH) {
            setToken((prev) => prev + key)
          }
      }
    },
    [token, isConnecting, onTokenComplete],
  )

  const renderKey = useCallback(
    (label: string, width: 'normal' | 'wide' | 'full' = 'normal') => {
      const isSpecial = label === SPECIAL_KEYS.BACKSPACE
      const isClear = label === SPECIAL_KEYS.CLEAR
      const isSubmit = label === SPECIAL_KEYS.SUBMIT
      const isLetter = label.length === 1 && label.match(/[A-Z0-9\-_]/)
      const isFocused = focusedChar === label

      return (
        <TouchableOpacity
          key={label}
          style={[
            styles.key,
            width === 'wide' && styles.keyWide,
            width === 'full' && styles.keyFull,
            isSpecial && styles.keySpecial,
            isClear && styles.keyClear,
            isSubmit && styles.keySubmit,
            isSubmit && isConnecting && styles.keyDisabled,
            isFocused && styles.keyFocused,
          ]}
          onPress={() => handleKeyPress(label)}
          onFocus={() => setFocusedChar(label)}
          onBlur={() => setFocusedChar(null)}
          activeOpacity={0.6}
          tvParallaxProperties={{
            enabled: true,
            shiftDistanceX: 3,
            shiftDistanceY: 3,
            tiltAngle: 5,
            magnification: 1.05,
          }}
          disabled={isSubmit && isConnecting}
        >
          {isSubmit ? (
            <View style={styles.submitInner}>
              {isConnecting && (
                <View style={styles.spinner} />
              )}
              <Text
                style={[
                  styles.keyText,
                  isSubmit && styles.keyTextSubmit,
                  isConnecting && styles.keyTextDisabled,
                ]}
              >
                {isConnecting ? 'Connecting…' : label}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.keyText,
                isSpecial && styles.keyTextSpecial,
                isClear && styles.keyTextClear,
                !isLetter && !isSpecial && !isClear && styles.keyTextSymbol,
              ]}
            >
              {label}
            </Text>
          )}
        </TouchableOpacity>
      )
    },
    [handleKeyPress, focusedChar, isConnecting],
  )

  const maskedToken = token
    .split('')
    .map((ch, i) => {
      // Show last 4 chars unmasked, mask the rest
      if (i < token.length - 4) return '●'
      return ch
    })
    .join('')

  return (
    <View style={styles.container}>
      {/* ── Token Display ── */}
      <View style={styles.tokenDisplay}>
        {token.length === 0 ? (
          <Text style={styles.tokenPlaceholder}>
            Characters appear here…
          </Text>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tokenScroll}
          >
            <Text style={styles.tokenText} selectable>
              {maskedToken}
            </Text>
          </ScrollView>
        )}
      </View>
      <Text style={styles.tokenCount}>
        {token.length} / {MAX_TOKEN_LENGTH}
      </Text>

      {/* ── Error Display ── */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Keyboard Grid ── */}
      <View style={styles.keyboard}>
        {/* Row 1: Numbers */}
        <View style={styles.row}>{ROW_1.map((k) => renderKey(k))}</View>

        {/* Row 2: Q-P */}
        <View style={styles.row}>{ROW_2.map((k) => renderKey(k))}</View>

        {/* Row 3: A-L + Backspace */}
        <View style={styles.row}>
          {ROW_3.map((k) => renderKey(k))}
          {renderKey(SPECIAL_KEYS.BACKSPACE)}
        </View>

        {/* Row 4: Z-_ + Clear */}
        <View style={styles.row}>
          {ROW_4.map((k) => renderKey(k))}
          {renderKey(SPECIAL_KEYS.CLEAR)}
        </View>

        {/* Row 5: Submit */}
        <View style={styles.row}>
          <View style={styles.keySpacer} />
          {renderKey(SPECIAL_KEYS.SUBMIT, 'full')}
          {onCancel ? (
            <TouchableOpacity
              style={[styles.key, styles.keyCancel]}
              onPress={onCancel}
              activeOpacity={0.6}
              tvParallaxProperties={{
                enabled: true,
                shiftDistanceX: 2,
                shiftDistanceY: 2,
                tiltAngle: 3,
                magnification: 1.05,
              }}
            >
              <Text style={styles.keyTextCancel}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keySpacer} />
          )}
        </View>
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },

  // ── Token Display ──
  tokenDisplay: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e293b',
    minHeight: 60,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 6,
    justifyContent: 'center',
  },
  tokenPlaceholder: {
    color: '#475569',
    fontSize: 18,
    textAlign: 'center',
  },
  tokenScroll: {
    alignItems: 'center',
  },
  tokenText: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
    letterSpacing: 4,
  },
  tokenCount: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 12,
    paddingRight: 4,
  },

  // ── Error ──
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── Keyboard Grid ──
  keyboard: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  // ── Keys ──
  key: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  keyWide: {
    width: 100,
  },
  keyFull: {
    flex: 1,
    height: 64,
  },
  keySpecial: {
    width: 100,
    backgroundColor: '#334155',
  },
  keyClear: {
    width: 80,
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
  },
  keySubmit: {
    backgroundColor: '#1d4ed8',
    borderColor: '#2563eb',
    height: 64,
  },
  keyCancel: {
    width: 100,
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  keyDisabled: {
    opacity: 0.5,
  },
  keyFocused: {
    borderColor: '#60a5fa',
    backgroundColor: '#334155',
    // React Native TV will apply native focus ring
    ...Platform.select({
      android: {
        elevation: 8,
      },
    }),
  },
  keySpacer: {
    width: 60,
  },

  // ── Key Text ──
  keyText: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
  },
  keyTextSpecial: {
    fontSize: 24,
    color: '#94a3b8',
  },
  keyTextClear: {
    fontSize: 18,
    color: '#fca5a5',
  },
  keyTextSubmit: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '700',
  },
  keyTextCancel: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  keyTextSymbol: {
    fontSize: 22,
  },
  keyTextDisabled: {
    color: '#94a3b8',
  },

  // ── Loading Spinner ──
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
  },

  // ── Submit Inner ──
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
})

export default TVKeyboard
