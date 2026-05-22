// ── Nebula TV — Content Card (TV-Optimized) ────
// Larger thumbnail, wider card, focus ring with parallax,
// big readable metadata for 10-foot viewing.

import React, { useState, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import type { NebulaVideo } from '../types'

interface ContentCardProps {
  video: NebulaVideo
  onPress?: (video: NebulaVideo) => void
  style?: Record<string, unknown>
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(minutes).padStart(2, '0')}`
}

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="%231f2937"><rect width="320" height="180"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14" font-family="sans-serif">No Thumbnail</text></svg>'

const TV_PARALLAX = {
  enabled: true,
  shiftDistanceX: 3,
  shiftDistanceY: 3,
  tiltAngle: 5,
  magnification: 1.04,
}

const ContentCard: React.FC<ContentCardProps> = ({ video, onPress, style }) => {
  const [focused, setFocused] = useState(false)
  const thumbnailSrc = video.images.thumbnail?.src ?? FALLBACK_THUMBNAIL

  const handlePress = useCallback(() => {
    onPress?.(video)
  }, [onPress, video])

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.container, focused && styles.containerFocused, style]}
      tvParallaxProperties={TV_PARALLAX}
    >
      {/* ── Thumbnail ── */}
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: thumbnailSrc }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(video.duration)}
          </Text>
        </View>
      </View>

      {/* ── Metadata ── */}
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

const styles = StyleSheet.create({
  container: {
    width: 320,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  containerFocused: {
    borderColor: '#3b82f6',
    // elevation handled by tvParallaxProperties
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
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    padding: 14,
    gap: 6,
  },
  title: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  channelName: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
})

export default ContentCard
