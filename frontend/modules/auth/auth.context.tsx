"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"

import { authService } from "./auth.service"
import type { AuthUser, LoginPayload, RegisterPayload } from "./auth.types"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getMe()
      setUser(currentUser)
      return currentUser
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadUser = async () => {
      try {
        const currentUser = await authService.getMe()

        if (isActive) {
          setUser(currentUser)
        }
      } catch {
        if (isActive) {
          setUser(null)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const loggedInUser = await authService.login(payload)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const register = useCallback((payload: RegisterPayload) => {
    return authService.register(payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
