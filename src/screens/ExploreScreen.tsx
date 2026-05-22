// ── Nebula TV — Explore Screen (TV-Optimized) ──
// Larger category chips, TV-friendly content grid,
// overscan-safe 48dp margins, D-pad navigation.

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { fetchVideos, fetchCategories } from '../services/api'
import ContentCard from '../components/ContentCard'
import CategoryChip from '../components/CategoryChip'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorView from '../components/ErrorView'
import type { NebulaVideo, NebulaCategory } from '../types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'

const ALL_CATEGORY = '__all__'

const ExploreScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [videos, setVideos] = useState<NebulaVideo[]>([])
  const [categories, setCategories] = useState<NebulaCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [videoResponse, categoryResponse] = await Promise.all([
        fetchVideos(),
        fetchCategories(),
      ])
      setVideos(videoResponse.results)
      setCategories(categoryResponse.results)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load content. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredVideos = useCallback((): NebulaVideo[] => {
    if (selectedCategory === ALL_CATEGORY) return videos
    return videos.filter(
      (video) =>
        Array.isArray(video.category_slugs) &&
        video.category_slugs.includes(selectedCategory),
    )
  }, [videos, selectedCategory])

  const handleCategoryPress = useCallback((slug: string) => {
    setSelectedCategory(slug)
  }, [])

  const handleVideoPress = useCallback(
    (video: NebulaVideo) => {
      navigation.navigate('Video', { slug: video.slug })
    },
    [navigation],
  )

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSpinner message="Discovering content..." />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorView message={error} onRetry={loadData} />
      </View>
    )
  }

  if (videos.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>Nothing to Explore Yet</Text>
          <Text style={styles.emptyMessage}>
            No content has been published. Check back later.
          </Text>
        </View>
      </View>
    )
  }

  const displayVideos = filteredVideos()
  const hasResults = displayVideos.length > 0

  return (
    <View style={styles.screen}>
      {/* ── Category Filter Bar ── */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <CategoryChip
            title="All"
            isSelected={selectedCategory === ALL_CATEGORY}
            onPress={() => handleCategoryPress(ALL_CATEGORY)}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              title={cat.title}
              isSelected={selectedCategory === cat.slug}
              onPress={() => handleCategoryPress(cat.slug)}
            />
          ))}
          <View style={{ width: 24 }} />
        </ScrollView>
      </View>

      {/* ── Content Grid ── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>
          {selectedCategory === ALL_CATEGORY
            ? 'All Videos'
            : categories.find((c) => c.slug === selectedCategory)?.title ??
              'Videos'}
        </Text>

        {!hasResults ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsIcon}>🔍</Text>
            <Text style={styles.noResultsText}>
              No videos in this category yet.
            </Text>
            <Text style={styles.noResultsHint}>
              Try selecting a different category.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayVideos.map((video) => (
              <View key={video.id} style={styles.gridItem}>
                <ContentCard
                  video={video}
                  onPress={handleVideoPress}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },

  // ── Category Filter Bar ──
  categoryBar: {
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#030712',
    paddingLeft: 48,
  },
  chipRow: {
    gap: 14,
    alignItems: 'center',
  },

  // ── Content Grid ──
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    paddingTop: 28,
    paddingLeft: 48,
    paddingRight: 48,
    paddingBottom: 48,
  },
  sectionHeader: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'flex-start',
  },
  gridItem: {
    marginBottom: 8,
  },

  // ── Empty / No Results ──
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
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
  },
  noResultsHint: {
    fontSize: 17,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 400,
  },

  // ── Utility ──
  bottomSpacer: {
    height: 48,
  },
})

export default ExploreScreen
