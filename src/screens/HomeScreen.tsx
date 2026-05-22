import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { fetchVideos } from '../services/api'
import ContentRow from '../components/ContentRow'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorView from '../components/ErrorView'
import type { NebulaVideo } from '../types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'

// ── Constants ─────────────────────────────────────

const TRENDING_COUNT = 10

// ── Helpers ────────────────────────────────────────

function isNebulaOriginal(video: NebulaVideo): boolean {
  return (
    Array.isArray(video.attributes) &&
    video.attributes.includes('is_nebula_original')
  )
}

// ── Component ──────────────────────────────────────

const HomeScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [videos, setVideos] = useState<NebulaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Data Fetching ──────────────────────────────────

  const loadVideos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchVideos()
      setVideos(response.results)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load videos. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  // ── Derived Data ───────────────────────────────────

  const featuredVideos = useCallback(
    () => videos.filter((v) => isNebulaOriginal(v)),
    [videos],
  )

  const trendingVideos = useCallback(
    () => videos.slice(0, TRENDING_COUNT),
    [videos],
  )

  const allVideos = useCallback(() => videos, [videos])

  // ── Handlers ───────────────────────────────────────

  const handleVideoPress = useCallback(
    (video: NebulaVideo) => {
      navigation.navigate('Video', { slug: video.slug })
    },
    [navigation],
  )

  // ── Render: Loading ────────────────────────────────

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSpinner message="Loading your Nebula..." />
      </View>
    )
  }

  // ── Render: Error ──────────────────────────────────

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorView message={error} onRetry={loadVideos} />
      </View>
    )
  }

  // ── Render: Empty ──────────────────────────────────

  if (videos.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📺</Text>
          <Text style={styles.emptyTitle}>Welcome to Nebula</Text>
          <Text style={styles.emptyMessage}>
            No videos available yet. Check back soon for new content from your
            favorite creators.
          </Text>
        </View>
      </View>
    )
  }

  // ── Render: Content ────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Branding Header ────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🔮</Text>
          <View>
            <Text style={styles.brandTitle}>Nebula TV</Text>
            <Text style={styles.brandSubtitle}>
              {videos.length} videos available
            </Text>
          </View>
        </View>
      </View>

      {/* ── Featured Section ───────────────────────────── */}
      {featuredVideos().length > 0 && (
        <ContentRow
          title="Featured"
          videos={featuredVideos()}
          onVideoPress={handleVideoPress}
        />
      )}

      {/* ── Trending Section ───────────────────────────── */}
      {trendingVideos().length > 0 && (
        <ContentRow
          title="Trending"
          videos={trendingVideos()}
          onVideoPress={handleVideoPress}
        />
      )}

      {/* ── All Videos Section ─────────────────────────── */}
      {allVideos().length > 0 && (
        <ContentRow
          title="All Videos"
          videos={allVideos()}
          onVideoPress={handleVideoPress}
        />
      )}

      {/* Bottom spacing for safe area */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 32,
  },

  // ── Header / Branding ───────────────────────────────
  header: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandIcon: {
    fontSize: 40,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 2,
  },

  // ── Empty State ─────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
  },

  // ── Utility ─────────────────────────────────────────
  bottomSpacer: {
    height: 48,
  },
})

export default HomeScreen
