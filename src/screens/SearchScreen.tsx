import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { fetchVideos } from '../services/api'
import ContentCard from '../components/ContentCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorView from '../components/ErrorView'
import type { NebulaVideo } from '../types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'

// ── Constants ─────────────────────────────────────

const DEBOUNCE_MS = 300
const SUGGESTIONS = [
  'Try different keywords',
  'Browse trending videos',
  'Explore a category',
  'Search for a specific creator',
]

// ── Helpers ────────────────────────────────────────

function matchesQuery(video: NebulaVideo, query: string): boolean {
  const q = query.toLowerCase().trim()

  // Title match
  if (video.title.toLowerCase().includes(q)) return true

  // Description match
  if (video.description.toLowerCase().includes(q)) return true

  // Short description match
  if (video.short_description?.toLowerCase().includes(q)) return true

  // Channel match
  if (video.channel_title?.toLowerCase().includes(q)) return true

  // Category match
  if (
    Array.isArray(video.category_slugs) &&
    video.category_slugs.some((slug) => slug.toLowerCase().includes(q))
  )
    return true

  return false
}

// ── Component ──────────────────────────────────────

const SearchScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [allVideos, setAllVideos] = useState<NebulaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data Fetching ──────────────────────────────────

  const loadVideos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchVideos()
      setAllVideos(response.results)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load search index. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  // ── Debounce ───────────────────────────────────────

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text)

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text)
    }, DEBOUNCE_MS)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  // ── Filtered Results ──────────────────────────────

  const results = useMemo<NebulaVideo[]>(() => {
    if (!debouncedQuery.trim()) return []
    return allVideos.filter((v) => matchesQuery(v, debouncedQuery))
  }, [allVideos, debouncedQuery])

  // ── Handlers ───────────────────────────────────────

  const handleVideoPress = useCallback(
    (video: NebulaVideo) => {
      navigation.navigate('Video', { slug: video.slug })
    },
    [navigation],
  )

  const handleClearSearch = useCallback(() => {
    setSearchText('')
    setDebouncedQuery('')
  }, [])

  // ── Render: Loading ────────────────────────────────

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSpinner message="Loading search..." />
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

  // ── Render: Content ────────────────────────────────

  const isSearching = debouncedQuery.trim().length > 0
  const hasResults = results.length > 0

  return (
    <View style={styles.screen}>
      {/* ── Search Bar ────────────────────────────────── */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          {/* Search icon */}
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, creators, categories..."
            placeholderTextColor="#6b7280"
            value={searchText}
            onChangeText={handleSearchTextChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />

          {/* Clear button */}
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSearch}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Results Area ──────────────────────────────── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isSearching ? (
          // ── Idle / Suggestions State ───────────────
          <View style={styles.idleContainer}>
            <Text style={styles.idleIcon}>🔮</Text>
            <Text style={styles.idleTitle}>Search Nebula</Text>
            <Text style={styles.idleMessage}>
              Find your next favorite video. Search by title, creator, or
              category.
            </Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              {SUGGESTIONS.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionItem}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          </View>
        ) : hasResults ? (
          // ── Results ─────────────────────────────────
          <>
            <Text style={styles.resultsHeader}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "
              {debouncedQuery}"
            </Text>

            <View style={styles.grid}>
              {results.map((video) => (
                <View key={video.id} style={styles.gridItem}>
                  <ContentCard video={video} onPress={handleVideoPress} />
                </View>
              ))}
            </View>
          </>
        ) : (
          // ── No Results ───────────────────────────────
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsIcon}>😕</Text>
            <Text style={styles.noResultsTitle}>
              No results for "{debouncedQuery}"
            </Text>
            <Text style={styles.noResultsMessage}>
              Try a different search term or browse categories to discover new
              content.
            </Text>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              {SUGGESTIONS.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionItem}>
                  • {suggestion}
                </Text>
              ))}
            </View>
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

  // ── Search Bar ─────────────────────────────────────
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#030712',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 14,
    minHeight: 52,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#f9fafb',
    paddingVertical: 12,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Scroll / Results Area ─────────────────────────
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // ── Idle / Suggestions State ──────────────────────
  idleContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 32,
    gap: 8,
  },
  idleIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  idleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  idleMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: 8,
  },
  suggestionsContainer: {
    marginTop: 24,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  suggestionItem: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9ca3af',
    lineHeight: 22,
  },

  // ── Results ────────────────────────────────────────
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  gridItem: {
    marginBottom: 4,
  },

  // ── No Results ─────────────────────────────────────
  noResultsContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  noResultsIcon: {
    fontSize: 56,
    marginBottom: 4,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
  },
  noResultsMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: 8,
  },

  // ── Utility ────────────────────────────────────────
  bottomSpacer: {
    height: 48,
  },
})

export default SearchScreen
