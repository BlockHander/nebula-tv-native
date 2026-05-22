// ──────────────────────────────────────────────
// Nebula TV — Video Screen (TV-optimized)
// Full-screen HLS player with metadata, related
// videos, streaming info, and TV-friendly controls
// ──────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import type { NebulaVideo, StreamInfo } from '../types'
import { fetchVideo, fetchVideoStream, fetchChannel } from '../services/api'
import ContentRow from '../components/ContentRow'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorView from '../components/ErrorView'

// ── Dynamic react-native-video import ────────────
// Graceful fallback if the native module is not linked
let VideoPlayer: React.ComponentType<any> | null = null
try {
  VideoPlayer = require('react-native-video').default
} catch {
  VideoPlayer = null
}

// ── Navigation Route Type ─────────────────────────

type VideoRouteParams = {
  Video: { slug: string }
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="%231f2937"><rect width="320" height="180"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14" font-family="sans-serif">No Thumbnail</text></svg>'

// ── Component ─────────────────────────────────────

export default function VideoScreen() {
  const route = useRoute<RouteProp<VideoRouteParams, 'Video'>>()
  const navigation = useNavigation()
  const { slug } = route.params

  // ── Core State ──
  const [video, setVideo] = useState<NebulaVideo | null>(null)
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Player State ──
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── UI State ──
  const [descExpanded, setDescExpanded] = useState(false)
  const [relatedVideos, setRelatedVideos] = useState<NebulaVideo[]>([])

  // ────────────────────────────────────────────────
  // Data Fetching
  // ────────────────────────────────────────────────

  // Fetch video detail on mount
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchVideo(slug)
        if (!cancelled) {
          setVideo(data)
          setLoading(false)
          // Kick off related videos fetch
          loadRelated(data.channel_slug, data.id)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? (err as { message: string }).message
              : 'Failed to load video'
          setError(message)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Fetch related videos from the same channel
  const loadRelated = async (channelSlug: string, currentId: string) => {
    try {
      const channelData = await fetchChannel(channelSlug)
      const others = channelData.episodes.results.filter(
        (v) => v.id !== currentId,
      )
      setRelatedVideos(others)
    } catch {
      // Related videos are optional — silently fail
    }
  }

  // Fetch stream on play button tap
  const handlePlay = useCallback(async () => {
    if (streamInfo) {
      // Stream already loaded — just resume
      setIsPlaying(true)
      return
    }

    setStreamLoading(true)
    try {
      const info = await fetchVideoStream(slug)
      setStreamInfo(info)
      // Start playing immediately once stream is available
      setIsPlaying(true)
    } catch (err: unknown) {
      console.error('Failed to load stream:', err)
    } finally {
      setStreamLoading(false)
    }
  }, [slug, streamInfo])

  // ────────────────────────────────────────────────
  // Player Controls
  // ────────────────────────────────────────────────

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  // Show controls on player tap, auto-hide after 4s
  const handlePlayerTap = useCallback(() => {
    setShowControls(true)

    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current)
    }

    controlsTimer.current = setTimeout(() => {
      setShowControls(false)
    }, 4000)
  }, [])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current)
      }
    }
  }, [])

  // ────────────────────────────────────────────────
  // Navigation
  // ────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleVideoPress = useCallback(
    (pressedVideo: NebulaVideo) => {
      // Push same screen with the new video slug
      // @ts-expect-error — navigate to self with different params
      navigation.push('Video', { slug: pressedVideo.slug })
    },
    [navigation],
  )

  // ────────────────────────────────────────────────
  // Render: Loading State
  // ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LoadingSpinner message="Loading video…" />
      </View>
    )
  }

  // ────────────────────────────────────────────────
  // Render: Error State
  // ────────────────────────────────────────────────

  if (error || !video) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorView
          message={error ?? 'Video not found'}
          onRetry={() => {
            setLoading(true)
            setError(null)
            fetchVideo(slug)
              .then((data) => setVideo(data))
              .catch((e) =>
                setError(e?.message ?? 'Failed to load video'),
              )
              .finally(() => setLoading(false))
          }}
        />
        <TouchableOpacity
          style={styles.backButtonOverlay}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ────────────────────────────────────────────────
  // Derived Values
  // ────────────────────────────────────────────────

  const thumbnailSrc = video.images.thumbnail?.src ?? FALLBACK_THUMBNAIL
  const hasPremium = video.attributes?.includes('premium')
  const hasLongDescription =
    (video.description?.length ?? 0) > 150

  // ────────────────────────────────────────────────
  // Render: Main Screen
  // ────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ══════════════════════════════════════════
          PLAYER AREA
          ══════════════════════════════════════════ */}
      <View style={styles.playerArea}>
        {/* ── Active Video Player ── */}
        {streamInfo && VideoPlayer ? (
          <View style={StyleSheet.absoluteFill}>
            <VideoPlayer
              source={{ uri: streamInfo.hls_url }}
              style={styles.video}
              controls={true}
              paused={!isPlaying}
              resizeMode="contain"
              onError={(e: any) => console.log('Video error:', e)}
              onLoad={() => {
                // Auto-play once loaded
              }}
            />
          </View>
        ) : (
          /* ── Thumbnail Placeholder ── */
          <Image
            source={{ uri: thumbnailSrc }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}

        {/* ── Play Button (no stream yet) ── */}
        {!streamInfo && !streamLoading && (
          <TouchableOpacity
            style={styles.playOverlay}
            onPress={handlePlay}
            activeOpacity={0.7}
          >
            <View style={styles.playButtonCircle}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Stream Loading Indicator ── */}
        {streamLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading stream…</Text>
          </View>
        )}

        {/* ── Back Button (always visible over player) ── */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Play/Pause Controls Overlay (when stream is active) ── */}
        {streamInfo && showControls && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handlePlayerTap}
          >
            <View style={styles.controlsOverlay}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={togglePlayPause}
                activeOpacity={0.7}
              >
                <Text style={styles.controlIcon}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ══════════════════════════════════════════
          METADATA SCROLL AREA
          ══════════════════════════════════════════ */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Video Title ── */}
        <Text style={styles.videoTitle}>{video.title}</Text>

        {/* ── Channel Row ── */}
        <View style={styles.channelRow}>
          {video.images.channel_avatar?.src && (
            <Image
              source={{ uri: video.images.channel_avatar.src }}
              style={styles.channelAvatar}
              resizeMode="cover"
            />
          )}
          <Text style={styles.channelName}>
            {video.channel_title}
          </Text>
        </View>

        {/* ── Metadata Bar ── */}
        <View style={styles.metaBar}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaValue}>
              {formatDuration(video.duration)}
            </Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Published</Text>
            <Text style={styles.metaValue}>
              {formatDate(video.published_at)}
            </Text>
          </View>

          {video.category_slugs?.length > 0 && (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Categories</Text>
                <Text style={styles.metaValue}>
                  {video.category_slugs.join(', ')}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── Premium Badge ── */}
        {hasPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>⭐ PREMIUM</Text>
          </View>
        )}

        {/* ── Description ── */}
        <View style={styles.descriptionSection}>
          <Text
            style={styles.descriptionText}
            numberOfLines={descExpanded ? undefined : 3}
            ellipsizeMode="tail"
          >
            {video.description || 'No description available.'}
          </Text>
          {hasLongDescription && (
            <TouchableOpacity
              onPress={() => setDescExpanded((prev) => !prev)}
              activeOpacity={0.7}
              style={styles.expandButton}
            >
              <Text style={styles.expandButtonText}>
                {descExpanded ? 'Show less ▲' : 'Show more ▼'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Streaming Info ── */}
        {streamInfo && (
          <View style={styles.streamInfoSection}>
            <Text style={styles.streamInfoTitle}>
              Streaming Info
            </Text>

            <View style={styles.streamInfoRow}>
              <Text style={styles.streamInfoLabel}>HLS URL</Text>
              <Text
                style={styles.streamInfoValue}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {streamInfo.hls_url}
              </Text>
            </View>

            {streamInfo.download_url ? (
              <View style={styles.streamInfoRow}>
                <Text style={styles.streamInfoLabel}>Download</Text>
                <Text
                  style={styles.streamInfoValue}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {streamInfo.download_url}
                </Text>
              </View>
            ) : null}

            {streamInfo.subtitles?.length > 0 && (
              <View style={styles.streamInfoRow}>
                <Text style={styles.streamInfoLabel}>Subtitles</Text>
                <Text style={styles.streamInfoValue}>
                  {streamInfo.subtitles
                    .map((s) => `${s.language} (${s.language_code})`)
                    .join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Related Videos ── */}
        {relatedVideos.length > 0 && (
          <ContentRow
            title="Related Videos"
            videos={relatedVideos}
            onVideoPress={handleVideoPress}
            style={styles.relatedSection}
          />
        )}

        {/* Bottom safe-area spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

// ──────────────────────────────────────────────────
// Styles — Dark Theme
// ──────────────────────────────────────────────────
// Background:  #030712
// Cards:       #111827
// Borders:     #1f2937
// Primary:     #3b82f6
// Text:        #f9fafb
// Muted:       #9ca3af
// ──────────────────────────────────────────────────

const CONTROLS_SHOW_DURATION = 4000

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: '#030712',
  },

  // ── Player Area ───────────────────────────────

  playerArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  thumbnail: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  // ── Play Button Overlay ───────────────────────

  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  playButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    // TV-friendly large touch target
    minWidth: 48,
    minHeight: 48,
    // Subtle shadow for depth
    elevation: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },

  playIcon: {
    fontSize: 32,
    color: '#f9fafb',
    marginLeft: 4, // visual centering for ▶
  },

  // ── Stream Loading ────────────────────────────

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    gap: 12,
  },

  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Player Controls ──────────────────────────

  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
    minHeight: 48,
    elevation: 6,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  controlIcon: {
    fontSize: 28,
    color: '#f9fafb',
  },

  // ── Back Button ───────────────────────────────

  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  backButtonOverlay: {
    position: 'absolute',
    bottom: 48,
    left: 32,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButtonText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Scroll Area ───────────────────────────────

  scrollArea: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // ── Video Title ───────────────────────────────

  videoTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 12,
  },

  // ── Channel Row ───────────────────────────────

  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },

  channelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1f2937',
  },

  channelName: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Metadata Bar ──────────────────────────────

  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },

  metaItem: {
    alignItems: 'flex-start',
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 4,
  },

  metaLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  metaValue: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },

  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1f2937',
    marginHorizontal: 14,
  },

  // ── Premium Badge ─────────────────────────────

  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    minHeight: 36,
    justifyContent: 'center',
  },

  premiumText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Description ───────────────────────────────

  descriptionSection: {
    marginBottom: 20,
  },

  descriptionText: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 22,
  },

  expandButton: {
    marginTop: 8,
    minHeight: 36,
    justifyContent: 'center',
  },

  expandButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Streaming Info ───────────────────────────

  streamInfoSection: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    marginBottom: 24,
  },

  streamInfoTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  streamInfoRow: {
    marginBottom: 10,
    minHeight: 36,
    justifyContent: 'center',
  },

  streamInfoLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },

  streamInfoValue: {
    color: '#f9fafb',
    fontSize: 13,
    fontFamily: 'monospace',
  },

  // ── Related Videos ────────────────────────────

  relatedSection: {
    marginTop: 4,
    marginBottom: 16,
  },

  // ── Bottom Spacer ─────────────────────────────

  bottomSpacer: {
    height: 32,
  },
})
