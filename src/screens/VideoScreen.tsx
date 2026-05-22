// ──────────────────────────────────────────────
// Nebula TV — Video Screen (TV-Optimized)
// Full-screen HLS player with larger controls,
// focus effects, overscan-safe metadata layout.
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

let VideoPlayer: React.ComponentType<any> | null = null
try {
  VideoPlayer = require('react-native-video').default
} catch {
  VideoPlayer = null
}

type VideoRouteParams = {
  Video: { slug: string }
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return dateString
  }
}

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="%231f2937"><rect width="320" height="180"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14" font-family="sans-serif">No Thumbnail</text></svg>'

const TV_PARALLAX = { enabled: true, shiftDistanceX: 3, shiftDistanceY: 3, tiltAngle: 5, magnification: 1.05 }
const TV_PARALLAX_SM = { enabled: true, shiftDistanceX: 2, shiftDistanceY: 2, tiltAngle: 3, magnification: 1.04 }

export default function VideoScreen() {
  const route = useRoute<RouteProp<VideoRouteParams, 'Video'>>()
  const navigation = useNavigation()
  const { slug } = route.params

  const [video, setVideo] = useState<NebulaVideo | null>(null)
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const [relatedVideos, setRelatedVideos] = useState<NebulaVideo[]>([])
  const [playFocused, setPlayFocused] = useState(false)
  const [backFocused, setBackFocused] = useState(false)
  const [ctrlFocused, setCtrlFocused] = useState(false)

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
          loadRelated(data.channel_slug, data.id)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Failed to load video'
          setError(message)
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const loadRelated = async (channelSlug: string, currentId: string) => {
    try {
      const channelData = await fetchChannel(channelSlug)
      setRelatedVideos(channelData.episodes.results.filter((v) => v.id !== currentId))
    } catch { /* silent */ }
  }

  const handlePlay = useCallback(async () => {
    if (streamInfo) { setIsPlaying(true); return }
    setStreamLoading(true)
    try {
      const info = await fetchVideoStream(slug)
      setStreamInfo(info)
      setIsPlaying(true)
    } catch (err: unknown) {
      console.error('Failed to load stream:', err)
    } finally { setStreamLoading(false) }
  }, [slug, streamInfo])

  const togglePlayPause = useCallback(() => setIsPlaying((p) => !p), [])

  const handlePlayerTap = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000)
  }, [])

  useEffect(() => {
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current) }
  }, [])

  const handleBack = useCallback(() => navigation.goBack(), [navigation])

  const handleVideoPress = useCallback(
    (pressedVideo: NebulaVideo) => {
      // @ts-expect-error
      navigation.push('Video', { slug: pressedVideo.slug })
    },
    [navigation],
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LoadingSpinner message="Loading video..." />
      </View>
    )
  }

  if (error || !video) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorView message={error ?? 'Video not found'} onRetry={() => {
          setLoading(true); setError(null)
          fetchVideo(slug).then(setVideo).catch((e) => setError(e?.message ?? 'Failed')).finally(() => setLoading(false))
        }} />
        <TouchableOpacity style={styles.backButtonOverlay} onPress={handleBack}
          activeOpacity={0.7} tvParallaxProperties={TV_PARALLAX_SM}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const thumbnailSrc = video.images.thumbnail?.src ?? FALLBACK_THUMBNAIL
  const hasPremium = video.attributes?.includes('premium')
  const hasLongDescription = (video.description?.length ?? 0) > 150

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ═══ PLAYER AREA ═══ */}
      <View style={styles.playerArea}>
        {streamInfo && VideoPlayer ? (
          <View style={StyleSheet.absoluteFill}>
            <VideoPlayer
              source={{ uri: streamInfo.hls_url }}
              style={styles.video}
              controls={false}
              paused={!isPlaying}
              resizeMode="contain"
              onError={(e: any) => console.log('Video error:', e)}
            />
          </View>
        ) : (
          <Image source={{ uri: thumbnailSrc }} style={styles.thumbnail} resizeMode="cover" />
        )}

        {!streamInfo && !streamLoading && (
          <TouchableOpacity style={styles.playOverlay} onPress={handlePlay}
            activeOpacity={0.7} onFocus={() => setPlayFocused(true)} onBlur={() => setPlayFocused(false)}
            tvParallaxProperties={TV_PARALLAX}>
            <View style={[styles.playButtonCircle, playFocused && styles.playButtonFocused]}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </TouchableOpacity>
        )}

        {streamLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading stream...</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.backButton, backFocused && styles.backButtonFocused]}
          onPress={handleBack} activeOpacity={0.7}
          onFocus={() => setBackFocused(true)} onBlur={() => setBackFocused(false)}
          tvParallaxProperties={TV_PARALLAX_SM}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {streamInfo && showControls && (
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handlePlayerTap}>
            <View style={styles.controlsOverlay}>
              <TouchableOpacity style={[styles.controlButton, ctrlFocused && styles.controlButtonFocused]}
                onPress={togglePlayPause} activeOpacity={0.7}
                onFocus={() => setCtrlFocused(true)} onBlur={() => setCtrlFocused(false)}
                tvParallaxProperties={TV_PARALLAX}>
                <Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ═══ METADATA ═══ */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.videoTitle}>{video.title}</Text>

        <View style={styles.channelRow}>
          {video.images.channel_avatar?.src && (
            <Image source={{ uri: video.images.channel_avatar.src }} style={styles.channelAvatar} resizeMode="cover" />
          )}
          <Text style={styles.channelName}>{video.channel_title}</Text>
        </View>

        <View style={styles.metaBar}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaValue}>{formatDuration(video.duration)}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Published</Text>
            <Text style={styles.metaValue}>{formatDate(video.published_at)}</Text>
          </View>
          {video.category_slugs?.length > 0 && (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Categories</Text>
                <Text style={styles.metaValue}>{video.category_slugs.join(', ')}</Text>
              </View>
            </>
          )}
        </View>

        {hasPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>⭐ PREMIUM</Text>
          </View>
        )}

        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionText} numberOfLines={descExpanded ? undefined : 3}
            ellipsizeMode="tail">
            {video.description || 'No description available.'}
          </Text>
          {hasLongDescription && (
            <TouchableOpacity onPress={() => setDescExpanded((p) => !p)}
              activeOpacity={0.7} style={styles.expandButton}
              tvParallaxProperties={TV_PARALLAX_SM}>
              <Text style={styles.expandButtonText}>
                {descExpanded ? 'Show less ▲' : 'Show more ▼'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {streamInfo && (
          <View style={styles.streamInfoSection}>
            <Text style={styles.streamInfoTitle}>Streaming Info</Text>
            <View style={styles.streamInfoRow}>
              <Text style={styles.streamInfoLabel}>HLS URL</Text>
              <Text style={styles.streamInfoValue} numberOfLines={1} ellipsizeMode="middle">{streamInfo.hls_url}</Text>
            </View>
            {streamInfo.download_url ? (
              <View style={styles.streamInfoRow}>
                <Text style={styles.streamInfoLabel}>Download</Text>
                <Text style={styles.streamInfoValue} numberOfLines={1} ellipsizeMode="middle">{streamInfo.download_url}</Text>
              </View>
            ) : null}
            {streamInfo.subtitles?.length > 0 && (
              <View style={styles.streamInfoRow}>
                <Text style={styles.streamInfoLabel}>Subtitles</Text>
                <Text style={styles.streamInfoValue}>
                  {streamInfo.subtitles.map((s) => `${s.language} (${s.language_code})`).join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {relatedVideos.length > 0 && (
          <ContentRow title="Related Videos" videos={relatedVideos} onVideoPress={handleVideoPress} style={styles.relatedSection} />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },

  // ── Player Area ──
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
    top: 0, left: 0, right: 0, bottom: 0,
  },
  thumbnail: {
    width: '100%', height: '100%', position: 'absolute',
  },
  playOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  playButtonCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center', alignItems: 'center',
    elevation: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playButtonFocused: {
    borderColor: '#93c5fd',
    backgroundColor: '#2563eb',
    transform: [{ scale: 1.08 }],
  },
  playIcon: {
    fontSize: 38,
    color: '#ffffff',
    marginLeft: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },

  // ── Controls ──
  controlsOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  controlButtonFocused: {
    borderColor: '#93c5fd',
    backgroundColor: '#2563eb',
  },
  controlIcon: {
    fontSize: 34,
    color: '#ffffff',
  },

  // ── Back Button ──
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 64,
    minHeight: 56,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 20,
  },
  backButtonOverlay: {
    position: 'absolute',
    bottom: 48, left: 48,
    backgroundColor: '#0f172a',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#1e293b',
    minWidth: 64, minHeight: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  backButtonFocused: {
    borderColor: '#60a5fa',
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Scroll Area ──
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingLeft: 48,
    paddingRight: 48,
    paddingTop: 28,
    paddingBottom: 48,
  },

  // ── Video Title ──
  videoTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: 16,
  },

  // ── Channel Row ──
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
  },
  channelName: {
    color: '#94a3b8',
    fontSize: 19,
    fontWeight: '600',
  },

  // ── Metadata Bar ──
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  metaItem: {
    alignItems: 'flex-start',
    minWidth: 64,
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  metaLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#1e293b',
    marginHorizontal: 18,
  },

  // ── Premium Badge ──
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  premiumText: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Description ──
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionText: {
    color: '#cbd5e1',
    fontSize: 18,
    lineHeight: 28,
  },
  expandButton: {
    marginTop: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  expandButtonText: {
    color: '#60a5fa',
    fontSize: 17,
    fontWeight: '600',
  },

  // ── Streaming Info ──
  streamInfoSection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    marginBottom: 28,
  },
  streamInfoTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  streamInfoRow: {
    marginBottom: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  streamInfoLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  streamInfoValue: {
    color: '#f8fafc',
    fontSize: 15,
    fontFamily: 'monospace',
  },

  // ── Related Videos ──
  relatedSection: {
    marginTop: 4,
    marginBottom: 20,
  },

  // ── Utility ──
  bottomSpacer: {
    height: 48,
  },
})
