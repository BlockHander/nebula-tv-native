// ── Nebula TV — Search Screen (TV-First, No Text Input) ──
//
// Remote-friendly search using category chips and quick-access
// filters instead of a virtual keyboard. No text entry needed.
// Overscan-safe margins, large focusable elements.
//
// Search is achieved through:
//   1. Category chips (from the API)
//   2. Quick-access filter tags (duration, channel type, etc.)
//   3. Alphabetical/channel grouping for browsing
//   4. A "Manual text search" fallback button if needed

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { fetchVideos, fetchCategories } from '../services/api'
import ContentCard from '../components/ContentCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorView from '../components/ErrorView'
import type { NebulaVideo, NebulaCategory } from '../types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'

// ── Quick Filters ──────────────────────────────

type SortMode = 'trending' | 'recent' | 'originals' | 'longest'

const SORT_FILTERS: { key: SortMode; label: string; icon: string }[] = [
  { key: 'trending', label: 'Trending', icon: '🔥' },
  { key: 'recent', label: 'Latest', icon: '🆕' },
  { key: 'originals', label: 'Originals', icon: '✦' },
  { key: 'longest', label: 'Longest', icon: '⏱' },
]

const ALL_CATEGORY = '__all__'

// ── Helpers ────────────────────────────────────

function isNebulaOriginal(video: NebulaVideo): boolean {
  return Array.isArray(video.attributes) && video.attributes.includes('is_nebula_original')
}

// ── Component ──────────────────────────────────

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [allVideos, setAllVideos] = useState<NebulaVideo[]>([])
  const [categories, setCategories] = useState<NebulaCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)
  const [activeSort, setActiveSort] = useState<SortMode>('trending')

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [videoRes, catRes] = await Promise.all([
        fetchVideos(),
        fetchCategories(),
      ])
      setAllVideos(videoRes.results)
      setCategories(catRes.results)
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

  // ── Filtering & Sorting ──
  const filteredVideos = useMemo<NebulaVideo[]>(() => {
    let list = allVideos

    // Apply category filter
    if (selectedCategory !== ALL_CATEGORY) {
      list = list.filter(
        (v) =>
          Array.isArray(v.category_slugs) &&
          v.category_slugs.includes(selectedCategory),
      )
    }

    // Apply sort
    const sorted = [...list]
    switch (activeSort) {
      case 'trending':
        // Keep API order (assumed trending)
        break
      case 'recent':
        sorted.sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
        )
        break
      case 'originals':
        sorted.sort((a, b) => {
          const aOrig = isNebulaOriginal(a) ? 0 : 1
          const bOrig = isNebulaOriginal(b) ? 0 : 1
          return aOrig - bOrig
        })
        break
      case 'longest':
        sorted.sort((a, b) => b.duration - a.duration)
        break
    }

    return sorted
  }, [allVideos, selectedCategory, activeSort])

  const handleVideoPress = useCallback(
    (video: NebulaVideo) => {
      navigation.navigate('Video', { slug: video.slug })
    },
    [navigation],
  )

  const handleCategoryPress = useCallback((slug: string) => {
    setSelectedCategory(slug)
  }, [])

  const handleSortPress = useCallback((sort: SortMode) => {
    setActiveSort(sort)
  }, [])

  // ── Render ──
  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSpinner message="Loading content..." />
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

  const selectedCategoryTitle =
    selectedCategory === ALL_CATEGORY
      ? 'All Videos'
      : categories.find((c) => c.slug === selectedCategory)?.title ?? 'Videos'

  return (
    <View style={styles.screen}>
      {/* ── Quick Sort Filters ── */}
      <View style={styles.sortBar}>
        {SORT_FILTERS.map((filter) => {
          const isActive = activeSort === filter.key
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.sortChip,
                isActive && styles.sortChipActive,
              ]}
              onPress={() => handleSortPress(filter.key)}
              activeOpacity={0.7}
              tvParallaxProperties={{
                enabled: true,
                shiftDistanceX: 2,
                shiftDistanceY: 2,
                tiltAngle: 3,
                magnification: 1.05,
              }}
            >
              <Text style={styles.sortChipIcon}>{filter.icon}</Text>
              <Text
                style={[
                  styles.sortChipLabel,
                  isActive && styles.sortChipLabelActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Category Pills ── */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <CategoryPill
            title="All"
            isSelected={selectedCategory === ALL_CATEGORY}
            onPress={() => handleCategoryPress(ALL_CATEGORY)}
          />
          {categories.slice(0, 20).map((cat) => (
            <CategoryPill
              key={cat.id}
              title={cat.title}
              isSelected={selectedCategory === cat.slug}
              onPress={() => handleCategoryPress(cat.slug)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Results ── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>
          {selectedCategoryTitle}
          <Text style={styles.resultCount}>
            {' '}· {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
          </Text>
        </Text>

        {filteredVideos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No videos found</Text>
            <Text style={styles.emptyMessage}>
              Try a different category or sort filter
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredVideos.map((video) => (
              <View key={video.id} style={styles.gridItem}>
                <ContentCard video={video} onPress={handleVideoPress} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

// ── Category Pill Component ───────────────────

function CategoryPill({
  title,
  isSelected,
  onPress,
}: {
  title: string
  isSelected: boolean
  onPress: () => void
}) {
  const [focused, setFocused] = useState(false)

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.pill,
        isSelected && styles.pillSelected,
        focused && styles.pillFocused,
      ]}
      tvParallaxProperties={{
        enabled: true,
        shiftDistanceX: 2,
        shiftDistanceY: 2,
        tiltAngle: 3,
        magnification: 1.05,
      }}
    >
      <Text
        style={[
          styles.pillLabel,
          isSelected && styles.pillLabelSelected,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },

  // ── Sort Filters ──
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 48,
    backgroundColor: '#030712',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#1e293b',
    paddingHorizontal: 22,
    paddingVertical: 12,
    gap: 8,
    minHeight: 52,
  },
  sortChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#2563eb',
  },
  sortChipIcon: {
    fontSize: 16,
  },
  sortChipLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  sortChipLabelActive: {
    color: '#ffffff',
  },

  // ── Category Pills ──
  categoryBar: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#030712',
    paddingLeft: 48,
  },
  chipRow: {
    gap: 12,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#2563eb',
  },
  pillFocused: {
    borderColor: '#60a5fa',
    backgroundColor: '#334155',
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  pillLabelSelected: {
    color: '#ffffff',
  },

  // ── Results ──
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    paddingTop: 24,
    paddingLeft: 48,
    paddingRight: 48,
    paddingBottom: 48,
  },
  sectionHeader: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  resultCount: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748b',
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

  // ── Empty ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  emptyMessage: {
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

export default SearchScreen
