import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import type { NebulaVideo } from '../types'

// ── Props ─────────────────────────────────────────

interface ContentCardProps {
  video: NebulaVideo
  isFocused?: boolean
  onPress?: (video: NebulaVideo) => void
  style?: Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="%231f2937"><rect width="320" height="180"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14" font-family="sans-serif">No Thumbnail</text></svg>'

// ── Component ─────────────────────────────────────

const ContentCard: React.FC<ContentCardProps> = ({
  video,
  isFocused = false,
  onPress,
  style,
}) => {
  const thumbnailSrc = video.images.thumbnail?.src ?? FALLBACK_THUMBNAIL

  const handlePress = () => {
    onPress?.(video)
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        style,
      ]}
    >
      {/* ── Thumbnail ─────────────── */}
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: thumbnailSrc }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={(e) => {
            // If image fails, fallback is handled at the source level
            // but we can't set state in this simple component
          }}
        />
        {/* Duration badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(video.duration)}
          </Text>
        </View>
      </View>

      {/* ── Metadata ──────────────── */}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {video.title}
        </Text>
        <Text style={styles.channelName} numberOfLines={1} ellipsizeMode="tail">
          {video.channel_title}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Styles ────────────────────────────────────────

const FOCUS_RING_WIDTH = 3
const SCALE_FACTOR = 1.03

const styles = StyleSheet.create({
  container: {
    width: 288,
    backgroundColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: FOCUS_RING_WIDTH,
    borderColor: 'transparent',
    // min touch target for TV
    minHeight: 48,
  },
  containerFocused: {
    borderColor: '#3b82f6',
    transform: [{ scale: SCALE_FACTOR }],
    elevation: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    padding: 10,
    gap: 4,
  },
  title: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  channelName: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
})

export default ContentCard
