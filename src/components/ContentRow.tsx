import React, { useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native'
import type { NebulaVideo } from '../types'
import ContentCard from './ContentCard'

// ── Props ─────────────────────────────────────────

interface ContentRowProps {
  title: string
  videos: NebulaVideo[]
  onVideoPress?: (video: NebulaVideo) => void
  style?: Record<string, unknown>
}

// ── Constants ─────────────────────────────────────

const CARD_GAP = 16
const SCROLL_MARGIN = CARD_GAP
const SCROLL_STEP = 288 + CARD_GAP // card width + gap

// ── Component ─────────────────────────────────────

const ContentRow: React.FC<ContentRowProps> = ({
  title,
  videos,
  onVideoPress,
  style,
}) => {
  const scrollRef = useRef<ScrollView>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  const isAtStart = scrollOffset <= SCROLL_MARGIN
  const isAtEnd = contentWidth - containerWidth - scrollOffset <= SCROLL_MARGIN + 1
  const canScroll = contentWidth > containerWidth

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollOffset(e.nativeEvent.contentOffset.x)
    },
    [],
  )

  const handleContentLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width)
  }, [])

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width)
  }, [])

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollTo({
      x: Math.max(0, scrollOffset - SCROLL_STEP),
      animated: true,
    })
  }, [scrollOffset])

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollTo({
      x: Math.min(contentWidth - containerWidth + SCROLL_MARGIN, scrollOffset + SCROLL_STEP),
      animated: true,
    })
  }, [scrollOffset, contentWidth, containerWidth])

  const needsLeftIndicator = canScroll && !isAtStart
  const needsRightIndicator = canScroll && !isAtEnd

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleContainerLayout}
    >
      {/* ── Section Header ────────── */}
      <View style={styles.header}>
        <View style={styles.accentBar} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* ── Scroll Area ───────────── */}
      <View style={styles.scrollArea}>
        {/* Left scroll indicator */}
        {needsLeftIndicator && (
          <TouchableOpacity
            style={[styles.scrollArrow, styles.scrollArrowLeft]}
            onPress={scrollLeft}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SCROLL_STEP}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={(w) => setContentWidth(w)}
        >
          {videos.map((video) => (
            <View key={video.id} style={styles.cardWrapper}>
              <ContentCard
                video={video}
                onPress={onVideoPress}
              />
            </View>
          ))}

          {/* Empty spacer for scroll margin */}
          <View style={{ width: SCROLL_MARGIN }} />
        </ScrollView>

        {/* Right scroll indicator */}
        {needsRightIndicator && (
          <TouchableOpacity
            style={[styles.scrollArrow, styles.scrollArrowRight]}
            onPress={scrollRight}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  accentBar: {
    width: 4,
    height: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    marginRight: 10,
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollArea: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingLeft: 16,
    gap: CARD_GAP,
  },
  cardWrapper: {
    // paddingBottom for focus ring visibility
    paddingVertical: 4,
  },
  scrollArrow: {
    position: 'absolute',
    zIndex: 10,
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(3, 7, 18, 0.7)',
  },
  scrollArrowLeft: {
    left: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  scrollArrowRight: {
    right: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  arrowText: {
    color: '#f9fafb',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
})

export default ContentRow
