// ──────────────────────────────────────────────
// Nebula TV — Auth Context with AsyncStorage persistence
// ──────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { exchangeToken, setAuthToken as setApiToken } from '../services/api'
import { STORAGE_KEYS } from '../constants/api'

// ── Context Value Type ────────────────────────

export interface AuthContextValue {
  isAuthenticated: boolean
  authToken: string | null
  loading: boolean
  login: (userToken: string) => Promise<void>
  logout: () => void
}

// ── Context ───────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  authToken: null,
  loading: true,
  login: async () => {},
  logout: () => {},
})

// ── Hook ──────────────────────────────────────

export const useAuth = () => useContext(AuthContext)

// ── Provider ──────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore token from AsyncStorage on mount
  useEffect(() => {
    let mounted = true

    async function restoreToken() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
        if (mounted) {
          if (stored) {
            setAuthTokenState(stored)
            setApiToken(stored)
          }
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    restoreToken()

    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(async (userToken: string) => {
    // Exchange user-level token for a session auth token
    const authTokenResult = await exchangeToken(userToken)

    // Persist to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authTokenResult)

    // Set in API module for subsequent requests
    setApiToken(authTokenResult)

    // Update React state
    setAuthTokenState(authTokenResult)
  }, [])

  const logout = useCallback(async () => {
    // Clear persisted token
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)

    // Clear API module token
    setApiToken('')

    // Clear React state
    setAuthTokenState(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: authToken !== null,
      authToken,
      loading,
      login,
      logout,
    }),
    [authToken, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
