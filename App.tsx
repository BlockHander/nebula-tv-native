import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import ExploreScreen from './src/screens/ExploreScreen'
import SearchScreen from './src/screens/SearchScreen'
import LibraryScreen from './src/screens/LibraryScreen'
import VideoScreen from './src/screens/VideoScreen'

// ---------------------------------------------------------------------------
// Dark theme
// ---------------------------------------------------------------------------

const NebulaDarkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3b82f6',
    background: '#030712',
    card: '#111827',
    text: '#f9fafb',
    border: '#1f2937',
    notification: '#3b82f6',
  },
}

// ---------------------------------------------------------------------------
// Navigation param lists
// ---------------------------------------------------------------------------

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
const Tab = createBottomTabNavigator<TabParamList>()

// ---------------------------------------------------------------------------
// Tab navigator
// ---------------------------------------------------------------------------

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
          borderTopWidth: 1,
          height: 60,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  )
}

// ---------------------------------------------------------------------------
// Root navigator – auth-gated
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
})
