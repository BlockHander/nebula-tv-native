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

// ── Constants ─────────────────────────────────────

const ALL_CATEGORY = '__all__'

// ── Component ──────────────────────────────────────

const ExploreScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [videos, setVideos] = useState<NebulaVideo[]>([])
  const [categories, setCategories] = useState<NebulaCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Data Fetching ──────────────────────────────────

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

  // ── Derived Data ───────────────────────────────────

  const filteredVideos = useCallback((): NebulaVideo[] => {
    if (selectedCategory === ALL_CATEGORY) {
      return videos
    }
    return videos.filter(
      (video) =>
        Array.isArray(video.category_slugs) &&
        video.category_slugs.includes(selectedCategory),
    )
  }, [videos, selectedCategory])

  // ── Handlers ───────────────────────────────────────

  const handleCategoryPress = useCallback((slug: string) => {
    setSelectedCategory(slug)
  }, [])

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
        <LoadingSpinner message="Discovering content..." />
      </View>
    )
  }

  // ── Render: Error ──────────────────────────────────

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorView message={error} onRetry={loadData} />
      </View>
    )
  }

  // ── Render: Empty ──────────────────────────────────

  if (videos.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>Nothing to Explore Yet</Text>
          <Text style={styles.emptyMessage}>
            No content has been published. Check back later for new videos and
            categories.
          </Text>
        </View>
      </View>
    )
  }

  // ── Render: Content ────────────────────────────────

  const displayVideos = filteredVideos()
  const hasResults = displayVideos.length > 0

  return (
    <View style={styles.screen}>
      {/* ── Category Filter Chips ──────────────────── */}
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

          {/* Right padding spacer */}
          <View style={{ width: 16 }} />
        </ScrollView>
      </View>

      {/* ── Content Grid ─────────────────────────────── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Section header */}
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

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },

  // ── Category Filter Bar ────────────────────────────
  categoryBar: {
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#030712',
  },
  chipRow: {
    paddingLeft: 16,
    gap: 10,
    alignItems: 'center',
  },

  // ── Scroll / Grid Area ────────────────────────────
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  gridItem: {
    // ContentCard is 288px wide; two cards per row with gap
    // On TV screens this will look good with 3-4 cards per row
    marginBottom: 4,
  },

  // ── Empty / No Results ─────────────────────────────
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
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  noResultsIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  noResultsText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f9fafb',
    textAlign: 'center',
  },
  noResultsHint: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
    maxWidth: 300,
  },

  // ── Utility ────────────────────────────────────────
  bottomSpacer: {
    height: 48,
  },
})

export default ExploreScreen
