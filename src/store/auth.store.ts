import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  username: string
  status: string
  roles: string[]
  modules: string[]
  departments: string[]
  permissions: string[]
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: number | null   // ← timestamp Unix en ms
  sessionId: string | null
  user: User | null
  isAuthenticated: boolean

  setAuth: (response: AuthResponse) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
  hasModule: (module: string) => boolean
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresInSeconds: number
  refreshToken: string
  refreshTokenExpiresInSeconds: number
  sessionId: string
  user: User
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      sessionId: null,
      user: null,
      isAuthenticated: false,

      setAuth: (response) => set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        // ✅ Calculamos el timestamp exacto de expiración
        accessTokenExpiresAt: Date.now() + response.accessTokenExpiresInSeconds * 1000,
        sessionId: response.sessionId,
        user: response.user,
        isAuthenticated: true,
      }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        sessionId: null,
        user: null,
        isAuthenticated: false,
      }),

      hasPermission: (permission) => {
        const { user } = get()
        if (!user) return false
        if (user.roles.includes('ADMIN')) return true
        return user.permissions.includes(permission)
      },

      hasModule: (module) => {
        const { user } = get()
        if (!user) return false
        return user.modules.includes(module.toUpperCase())
      },
    }),
    {
      name: 'erp-auth',
      partialize: (state) => ({
        accessToken:          state.accessToken,
        refreshToken:         state.refreshToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,  // ← persiste el timestamp
        sessionId:            state.sessionId,
        user:                 state.user,
        isAuthenticated:      state.isAuthenticated,
      }),
    }
  )
)