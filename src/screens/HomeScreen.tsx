// ── Nebula TV — Home Screen (TV-Optimized) ────
// Overscan-safe (48dp), larger fonts, consistent TV layout.

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

const TRENDING_COUNT = 10

function isNebulaOriginal(video: NebulaVideo): boolean {
  return (
    Array.isArray(video.attributes) &&
    video.attributes.includes('is_nebula_original')
  )
}

const HomeScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [videos, setVideos] = useState<NebulaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const featuredVideos = useCallback(
    () => videos.filter((v) => isNebulaOriginal(v)),
    [videos],
  )

  const trendingVideos = useCallback(
    () => videos.slice(0, TRENDING_COUNT),
    [videos],
  )

  const allVideos = useCallback(() => videos, [videos])

  const handleVideoPress = useCallback(
    (video: NebulaVideo) => {
      navigation.navigate('Video', { slug: video.slug })
    },
    [navigation],
  )

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSpinner message="Loading your Nebula..." />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorView message={error} onRetry={loadVideos} />
      </View>
    )
  }

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Branding Header ── */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>✦</Text>
          <View>
            <Text style={styles.brandTitle}>Nebula TV</Text>
            <Text style={styles.brandSubtitle}>
              {videos.length} videos available
            </Text>
          </View>
        </View>
      </View>

      {featuredVideos().length > 0 && (
        <ContentRow
          title="Featured"
          videos={featuredVideos()}
          onVideoPress={handleVideoPress}
          hasTVPreferredFocus={true}
        />
      )}

      {trendingVideos().length > 0 && (
        <ContentRow
          title="Trending"
          videos={trendingVideos()}
          onVideoPress={handleVideoPress}
        />
      )}

      {allVideos().length > 0 && (
        <ContentRow
          title="All Videos"
          videos={allVideos()}
          onVideoPress={handleVideoPress}
        />
      )}

      {/* Overscan-safe bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingTop: 48,   // overscan-safe
    paddingBottom: 48,
    paddingLeft: 48,  // overscan-safe
    paddingRight: 48,
  },

  // ── Header / Branding ──
  header: {
    marginBottom: 36,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brandIcon: {
    fontSize: 42,
    color: '#3b82f6',
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 3,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 480,
  },

  // ── Utility ──
  bottomSpacer: {
    height: 48,
  },
})

export default HomeScreen
