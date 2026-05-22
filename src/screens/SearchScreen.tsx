// ── Nebula TV — Search Screen (TV-Optimized) ──
// No TextInput — uses TVKeyboard modal for D-pad entry.
// Overscan-safe margins, larger result cards.

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { fetchVideos } from '../services/api'
import ContentCard from '../components/ContentCard'
import TVKeyboard from '../components/TVKeyboard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorView from '../components/ErrorView'
import type { NebulaVideo } from '../types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'

const SUGGESTIONS = [
  'Try different keywords',
  'Browse trending videos',
  'Explore a category',
  'Search for a specific creator',
]

function matchesQuery(video: NebulaVideo, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (video.title.toLowerCase().includes(q)) return true
  if (video.description?.toLowerCase().includes(q)) return true
  if (video.short_description?.toLowerCase().includes(q)) return true
  if (video.channel_title?.toLowerCase().includes(q)) return true
  if (
    Array.isArray(video.category_slugs) &&
    video.category_slugs.some((slug) => slug.toLowerCase().includes(q))
  ) return true
  return false
}

const SearchScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [allVideos, setAllVideos] = useState<NebulaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data Fetching ──
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

  // ── Keyboard Handler ──
  const handleKeyboardSubmit = useCallback((text: string) => {
    setSearchText(text)
    setKeyboardVisible(false)
    // Debounce the query
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text)
    }, 300)
  }, [])

  const handleOpenKeyboard = useCallback(() => {
    setKeyboardVisible(true)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchText('')
    setDebouncedQuery('')
  }, [])

  // ── Filtered Results ──
  const results = useMemo<NebulaVideo[]>(() => {
    if (!debouncedQuery.trim()) return []
    return allVideos.filter((v) => matchesQuery(v, debouncedQuery))
  }, [allVideos, debouncedQuery])

  const handleVideoPress = useCallback(
    (video: NebulaVideo) => {
      navigation.navigate('Video', { slug: video.slug })
    },
    [navigation],
  )

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSpinner message="Loading search..." />
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

  const isSearching = debouncedQuery.trim().length > 0
  const hasResults = results.length > 0

  return (
    <View style={styles.screen}>
      {/* ── Search Bar ── */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={handleOpenKeyboard}
          activeOpacity={0.7}
          tvParallaxProperties={{
            enabled: true,
            shiftDistanceX: 2,
            shiftDistanceY: 2,
            tiltAngle: 3,
            magnification: 1.02,
          }}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text
            style={[
              styles.searchText,
              !searchText && styles.searchPlaceholder,
            ]}
            numberOfLines={1}
          >
            {searchText || 'Search videos, creators, categories...'}
          </Text>
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSearch}
              activeOpacity={0.6}
              tvParallaxProperties={{
                enabled: true,
                shiftDistanceX: 1,
                shiftDistanceY: 1,
                tiltAngle: 2,
                magnification: 1.05,
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Results ── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isSearching ? (
          <View style={styles.idleContainer}>
            <Text style={styles.idleIcon}>🔮</Text>
            <Text style={styles.idleTitle}>Search Nebula</Text>
            <Text style={styles.idleMessage}>
              Find your next favorite video. Press the search bar above to begin.
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── TV Keyboard Modal ── */}
      <Modal
        visible={keyboardVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setKeyboardVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Search Nebula</Text>
            <TVKeyboard
              onTokenComplete={handleKeyboardSubmit}
              onCancel={() => setKeyboardVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },

  // ── Search Bar ──
  searchBarContainer: {
    paddingLeft: 48,
    paddingRight: 48,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#030712',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1e293b',
    paddingHorizontal: 20,
    minHeight: 64,
    gap: 12,
  },
  searchIcon: {
    fontSize: 22,
  },
  searchText: {
    flex: 1,
    fontSize: 19,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  searchPlaceholder: {
    color: '#64748b',
    fontWeight: '500',
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Results Area ──
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingLeft: 48,
    paddingRight: 48,
    paddingBottom: 48,
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    paddingHorizontal: 4,
    paddingTop: 24,
    paddingBottom: 20,
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

  // ── Idle State ──
  idleContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 48,
    gap: 12,
  },
  idleIcon: {
    fontSize: 72,
    marginBottom: 12,
  },
  idleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  idleMessage: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 480,
    marginBottom: 12,
  },
  suggestionsContainer: {
    marginTop: 28,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 400,
    gap: 10,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  suggestionItem: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8',
    lineHeight: 26,
  },

  // ── No Results ──
  noResultsContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 48,
    gap: 12,
  },
  noResultsIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  noResultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  noResultsMessage: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 480,
    marginBottom: 12,
  },

  // ── Keyboard Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 36,
    maxWidth: 920,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 20,
  },

  // ── Utility ──
  bottomSpacer: {
    height: 48,
  },
})

export default SearchScreen
