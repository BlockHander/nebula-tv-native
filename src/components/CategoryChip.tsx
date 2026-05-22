// ── Nebula TV — Category Chip (TV-Optimized) ──
// Larger pill for D-pad navigation with focus ring.

import React, { useState, useCallback } from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

interface CategoryChipProps {
  title: string
  isSelected?: boolean
  onPress?: () => void
}

const CategoryChip: React.FC<CategoryChipProps> = ({
  title,
  isSelected = false,
  onPress,
}) => {
  const [focused, setFocused] = useState(false)

  const handlePress = useCallback(() => {
    onPress?.()
  }, [onPress])

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipUnselected,
        focused && styles.chipFocused,
      ]}
      tvParallaxProperties={{
        enabled: true,
        shiftDistanceX: 2,
        shiftDistanceY: 2,
        tiltAngle: 3,
        magnification: 1.05,
      }}
    >
      <Text
        style={[
          styles.label,
          isSelected ? styles.labelSelected : styles.labelUnselected,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 9999,
    minWidth: 64,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#1d4ed8',
  },
  chipUnselected: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  chipFocused: {
    borderColor: '#60a5fa',
    backgroundColor: '#334155',
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelSelected: {
    color: '#ffffff',
  },
  labelUnselected: {
    color: '#cbd5e1',
  },
})

export default CategoryChip
