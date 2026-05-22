import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

// ── Props ─────────────────────────────────────────

interface CategoryChipProps {
  title: string
  isSelected?: boolean
  onPress?: () => void
}

// ── Component ─────────────────────────────────────

const CategoryChip: React.FC<CategoryChipProps> = ({
  title,
  isSelected = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipUnselected,
      ]}
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

// ── Styles ────────────────────────────────────────

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999, // pill shape
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
  },
  chipUnselected: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelSelected: {
    color: '#f9fafb',
  },
  labelUnselected: {
    color: '#9ca3af',
  },
})

export default CategoryChip
