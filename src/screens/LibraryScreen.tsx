// ──────────────────────────────────────────────
// Nebula TV — Library Screen (TV-optimized)
// ──────────────────────────────────────────────

import React, { useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { useAuth } from '../context/AuthContext'

// ── Helpers ────────────────────────────────────

/**
 * Mask an auth token for display: show first 8 + last 4 characters.
 * Returns '••••••••' for empty/null tokens.
 */
function maskToken(token: string | null): string {
  if (!token || token.length === 0) return '••••••••'
  if (token.length <= 12) {
    // Short token — show first half + last half masked
    const half = Math.ceil(token.length / 2)
    return token.slice(0, half) + '•'.repeat(token.length - half)
  }
  return `${token.slice(0, 8)}${'•'.repeat(token.length - 12)}${token.slice(-4)}`
}

// ── Placeholder Sections ───────────────────────

interface LibraryPlaceholder {
  id: string
  title: string
  description: string
  icon: string
  count: number
}

const PLACEHOLDER_SECTIONS: LibraryPlaceholder[] = [
  {
    id: 'watch-later',
    title: 'Watch Later',
    description: 'Videos you\'ve saved to watch later',
    icon: '⏰',
    count: 0,
  },
  {
    id: 'history',
    title: 'History',
    description: 'Videos you\'ve watched recently',
    icon: '🕐',
    count: 0,
  },
  {
    id: 'playlists',
    title: 'Playlists',
    description: 'Your curated collections',
    icon: '📋',
    count: 0,
  },
]

// ── Avatar Component ───────────────────────────

function AvatarCircle() {
  return (
    <View style={styles.avatarOuter}>
      {/* Inner glow ring */}
      <View style={styles.avatarRing}>
        <View style={styles.avatarInner}>
          <Text style={styles.avatarLetter}>N</Text>
        </View>
      </View>
    </View>
  )
}

// ── Component ──────────────────────────────────

const LibraryScreen: React.FC = () => {
  const { authToken, logout, isAuthenticated } = useAuth()

  const handleSignOut = useCallback(() => {
    logout()
  }, [logout])

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <Text style={styles.headerSubtitle}>
          Manage your saved content and account
        </Text>
      </View>

      {/* ── Profile Card ────────────────────────── */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <AvatarCircle />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Nebula Subscriber</Text>
            <View style={styles.badgeRow}>
              <View style={styles.subscriptionBadge}>
                <Text style={styles.subscriptionBadgeText}>Active</Text>
              </View>
              <Text style={styles.subscriptionLabel}>Subscription</Text>
            </View>
          </View>
        </View>

        {/* Connected Account Info */}
        <View style={styles.connectedSection}>
          <View style={styles.connectedRow}>
            <Text style={styles.connectedLabel}>Connected via API</Text>
            <Text style={styles.connectedStatus}>✓</Text>
          </View>
          <Text style={styles.connectedToken}>
            {maskToken(authToken)}
          </Text>
        </View>
      </View>

      {/* ── Library Sections ──────────────────────── */}
      <View style={styles.sectionsContainer}>
        <Text style={styles.sectionGroupTitle}>Your Library</Text>

        {PLACEHOLDER_SECTIONS.map((section) => (
          <View key={section.id} style={styles.placeholderCard}>
            <View style={styles.placeholderRow}>
              <View style={styles.placeholderIconContainer}>
                <Text style={styles.placeholderIcon}>{section.icon}</Text>
              </View>
              <View style={styles.placeholderInfo}>
                <Text style={styles.placeholderTitle}>{section.title}</Text>
                <Text style={styles.placeholderDescription}>
                  {section.description}
                </Text>
              </View>
              <View style={styles.placeholderCountContainer}>
                <Text style={styles.placeholderCount}>{section.count}</Text>
                <Text style={styles.placeholderCountLabel}>items</Text>
              </View>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Sign Out ────────────────────────────── */}
      <View style={styles.signOutSection}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
          {...(Platform.OS === 'android' ? { hasTVPreferredFocus: false } : {})}
        >
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.signOutHint}>
          You will need your API token to sign back in
        </Text>
      </View>

      {/* Bottom spacing for safe area */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },

  // ── Header ──────────────────────────────────────
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 6,
  },

  // ── Profile Card ────────────────────────────────
  profileCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
    marginBottom: 28,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 18,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subscriptionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },

  // ── Avatar ─────────────────────────────────────
  avatarOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  avatarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Connected Account ──────────────────────────
  connectedSection: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  connectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectedStatus: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '700',
  },
  connectedToken: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },

  // ── Library Sections ────────────────────────────
  sectionsContainer: {
    marginBottom: 28,
  },
  sectionGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  placeholderCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 18,
    marginBottom: 12,
    opacity: 0.7,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  placeholderIcon: {
    fontSize: 22,
  },
  placeholderInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeholderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  placeholderDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
    lineHeight: 18,
  },
  placeholderCountContainer: {
    alignItems: 'center',
    minWidth: 52,
  },
  placeholderCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6b7280',
  },
  placeholderCountLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Sign Out ────────────────────────────────────
  signOutSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
    gap: 10,
    width: '100%',
    maxWidth: 400,
  },
  signOutIcon: {
    fontSize: 20,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  signOutHint: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    maxWidth: 320,
  },

  // ── Utility ─────────────────────────────────────
  bottomSpacer: {
    height: 48,
  },
})

export default LibraryScreen
