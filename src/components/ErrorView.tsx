import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

// ── Props ─────────────────────────────────────────

interface ErrorViewProps {
  message: string
  onRetry?: () => void
  style?: Record<string, unknown>
}

// ── Component ─────────────────────────────────────

const ErrorView: React.FC<ErrorViewProps> = ({
  message,
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Error Icon */}
      <Text style={styles.icon}>⚠️</Text>

      {/* Error Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Retry Button */}
      {onRetry ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

// ── Styles ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
    paddingHorizontal: 32,
    gap: 12,
    minHeight: 200,
  },
  icon: {
    fontSize: 48,
    marginBottom: 4,
  },
  message: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})

export default ErrorView
