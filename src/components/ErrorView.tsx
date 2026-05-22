// ── Nebula TV — Error View (TV-Optimized) ─────
// Larger text, focusable retry button with parallax.

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface ErrorViewProps {
  message: string
  onRetry?: () => void
  style?: Record<string, unknown>
}

const ErrorView: React.FC<ErrorViewProps> = ({ message, onRetry, style }) => {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRetry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.retryButton, focused && styles.retryFocused]}
          tvParallaxProperties={{
            enabled: true,
            shiftDistanceX: 3,
            shiftDistanceY: 3,
            tiltAngle: 5,
            magnification: 1.05,
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
    paddingHorizontal: 48,
    gap: 16,
    minHeight: 200,
  },
  icon: {
    fontSize: 56,
    marginBottom: 8,
  },
  message: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 500,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 64,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  retryFocused: {
    borderColor: '#93c5fd',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})

export default ErrorView
