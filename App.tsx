// ── Nebula TV — App Entry (TV-Optimized) ───────
// Custom TV-friendly tab bar with large focusable tabs,
// overscan-safe layout, consistent dark theme.

import React, { useState, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import ExploreScreen from './src/screens/ExploreScreen'
import SearchScreen from './src/screens/SearchScreen'
import LibraryScreen from './src/screens/LibraryScreen'
import VideoScreen from './src/screens/VideoScreen'

// ── Theme ──

const NebulaDarkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3b82f6',
    background: '#030712',
    card: '#0f172a',
    text: '#f8fafc',
    border: '#1e293b',
    notification: '#3b82f6',
  },
}

// ── Navigation Types ──

export type RootStackParamList = {
  Login: undefined
  MainTabs: undefined
  Video: { slug: string; title?: string }
}

export type TabParamList = {
  Home: undefined
  Explore: undefined
  Search: undefined
  Library: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

// ── TV-Friendly Tab Items ──

interface TabConfig {
  key: keyof TabParamList
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { key: 'Home', label: 'Home', icon: '✦' },
  { key: 'Explore', label: 'Explore', icon: '🗺️' },
  { key: 'Search', label: 'Search', icon: '🔍' },
  { key: 'Library', label: 'Library', icon: '📚' },
]

// ── Custom TV Tab Bar ──

function TVTabBar({
  activeTab,
  onTabPress,
}: {
  activeTab: keyof TabParamList
  onTabPress: (tab: keyof TabParamList) => void
}) {
  const [focusedTab, setFocusedTab] = useState<keyof TabParamList | null>(null)

  return (
    <View style={tabStyles.bar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key
        const isFocused = focusedTab === tab.key
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              tabStyles.tab,
              isActive && tabStyles.tabActive,
              isFocused && tabStyles.tabFocused,
            ]}
            onPress={() => onTabPress(tab.key)}
            onFocus={() => setFocusedTab(tab.key)}
            onBlur={() => setFocusedTab(null)}
            activeOpacity={0.7}
            tvParallaxProperties={{
              enabled: true,
              shiftDistanceX: 2,
              shiftDistanceY: 2,
              tiltAngle: 3,
              magnification: 1.04,
            }}
          >
            <Text style={[tabStyles.tabIcon, isActive && tabStyles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[tabStyles.tabLabel, isActive && tabStyles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={tabStyles.activeIndicator} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 48,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    minHeight: 60,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tabFocused: {
    borderColor: '#60a5fa',
    backgroundColor: '#1e293b',
  },
  tabIcon: {
    fontSize: 20,
    color: '#64748b',
  },
  tabIconActive: {
    color: '#60a5fa',
  },
  tabLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#f1f5f9',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },
})

// ── Main Tabs Container ──

function MainTabs() {
  const [activeTab, setActiveTab] = useState<keyof TabParamList>('Home')

  const handleTabPress = useCallback((tab: keyof TabParamList) => {
    setActiveTab(tab)
  }, [])

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />
      case 'Explore':
        return <ExploreScreen />
      case 'Search':
        return <SearchScreen />
      case 'Library':
        return <LibraryScreen />
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#030712' }}>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
      <TVTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  )
}

// ── Root Navigator ──

function RootNavigator() {
  const { isAuthenticated } = useAuth()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#030712' },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Video"
            component={VideoScreen}
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animationTypeForReplace: 'pop' }}
        />
      )}
    </Stack.Navigator>
  )
}

// ── App Entry ──

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={NebulaDarkTheme}>
        <StatusBar style="light" hidden />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}
