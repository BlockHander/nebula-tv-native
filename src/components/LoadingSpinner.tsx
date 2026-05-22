// ── Nebula TV — Loading Spinner (TV-Optimized) ─
// Larger spinner and message text.

import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'large'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color="#3b82f6" />
      {message ? (
        <Text style={styles.message}>{message}</Text>
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
    gap: 20,
    minHeight: 200,
  },
  message: {
    color: '#94a3b8',
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})

export default LoadingSpinner
