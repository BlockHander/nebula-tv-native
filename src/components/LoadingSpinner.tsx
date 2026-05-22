import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'

// ── Props ─────────────────────────────────────────

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'large'
}

// ── Component ─────────────────────────────────────

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={size}
        color="#3b82f6"
      />
      {message ? (
        <Text style={styles.message}>{message}</Text>
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
    gap: 16,
    minHeight: 200,
  },
  message: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
})

export default LoadingSpinner
