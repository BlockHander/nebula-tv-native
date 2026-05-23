// ── Nebula TV — Library Screen (TV-Optimized) ──
// Focusable cards with parallax, larger typography,
// overscan-safe margins, TV-friendly sign-out button.

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useAuth } from '../context/AuthContext'

// ── Helpers ──

function maskToken(token: string | null): string {
  if (!token || token.length === 0) return '••••••••'
  if (token.length <= 12) {
    const half = Math.ceil(token.length / 2)
    return token.slice(0, half) + '•'.repeat(token.length - half)
  }
  return `${token.slice(0, 8)}${'•'.repeat(token.length - 12)}${token.slice(-4)}`
}

const PLACEHOLDER_SECTIONS = [
  {
    id: 'watch-later',
    title: 'Watch Later',
    description: "Videos you've saved to watch later",
    icon: '⏰',
    count: 0,
  },
  {
    id: 'history',
    title: 'History',
    description: "Videos you've watched recently",
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

// ── Avatar Component ──

function AvatarCircle() {
  return (
    <View style={styles.avatarOuter}>
      <View style={styles.avatarRing}>
        <View style={styles.avatarInner}>
          <Text style={styles.avatarLetter}>N</Text>
        </View>
      </View>
    </View>
  )
}

// ── Section Card ──

function PlaceholderCard({
  section,
  index,
}: {
  section: typeof PLACEHOLDER_SECTIONS[number]
  index: number
}) {
  const [focused, setFocused] = useState(false)

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.placeholderCard, focused && styles.placeholderCardFocused]}
      hasTVPreferredFocus={index === 0}
      tvParallaxProperties={{
        enabled: true,
        shiftDistanceX: 2,
        shiftDistanceY: 2,
        tiltAngle: 3,
        magnification: 1.02,
      }}
    >
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
    </TouchableOpacity>
  )
}

// ── Component ──

const LibraryScreen: React.FC = () => {
  const { authToken, logout } = useAuth()
  const [signOutFocused, setSignOutFocused] = useState(false)

  const handleSignOut = useCallback(() => {
    logout()
  }, [logout])

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <Text style={styles.headerSubtitle}>
          Manage your saved content and account
        </Text>
      </View>

      {/* ── Profile Card ── */}
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

      {/* ── Library Sections ── */}
      <View style={styles.sectionsContainer}>
        <Text style={styles.sectionGroupTitle}>Your Library</Text>
        {PLACEHOLDER_SECTIONS.map((section, index) => (
          <PlaceholderCard key={section.id} section={section} index={index} />
        ))}
      </View>

      {/* ── Sign Out ── */}
      <View style={styles.signOutSection}>
        <TouchableOpacity
          style={[
            styles.signOutButton,
            signOutFocused && styles.signOutFocused,
          ]}
          onPress={handleSignOut}
          onFocus={() => setSignOutFocused(true)}
          onBlur={() => setSignOutFocused(false)}
          activeOpacity={0.7}
          tvParallaxProperties={{
            enabled: true,
            shiftDistanceX: 3,
            shiftDistanceY: 3,
            tiltAngle: 5,
            magnification: 1.05,
          }}
        >
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.signOutHint}>
          You will need your API token to sign back in
        </Text>
      </View>

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
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 48,
    paddingRight: 48,
  },

  // ── Header ──
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 6,
  },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 28,
    marginBottom: 32,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  subscriptionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscriptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
  },

  // ── Avatar ──
  avatarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Connected Account ──
  connectedSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  connectedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectedStatus: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: '700',
  },
  connectedToken: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  // ── Library Sections ──
  sectionsContainer: {
    marginBottom: 32,
  },
  sectionGroupTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  placeholderCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1e293b',
    padding: 22,
    marginBottom: 14,
  },
  placeholderCardFocused: {
    borderColor: '#60a5fa',
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  placeholderIcon: {
    fontSize: 26,
  },
  placeholderInfo: {
    flex: 1,
    marginRight: 14,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  placeholderDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    lineHeight: 22,
  },
  placeholderCountContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  placeholderCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#64748b',
  },
  placeholderCountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 14,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Sign Out ──
  signOutSection: {
    alignItems: 'center',
    paddingTop: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 18,
    minHeight: 64,
    gap: 12,
    width: '100%',
    maxWidth: 460,
  },
  signOutFocused: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutIcon: {
    fontSize: 24,
  },
  signOutText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  signOutHint: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: 380,
  },

  // ── Utility ──
  bottomSpacer: {
    height: 48,
  },
})

export default LibraryScreen
