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
      sessionId: null,
      user: null,
      isAuthenticated: false,

      setAuth: (response) => set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        sessionId: response.sessionId,
        user: response.user,
        isAuthenticated: true,
      }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        sessionId: null,
        user: null,
        isAuthenticated: false,
      }),

      // "sales.order.create" → true/false
      hasPermission: (permission) => {
        const { user } = get()
        if (!user) return false
        if (user.roles.includes('ADMIN')) return true
        return user.permissions.includes(permission)
      },

      // "SALES" → true/false
      hasModule: (module) => {
        const { user } = get()
        if (!user) return false
        return user.modules.includes(module.toUpperCase())
      },
    }),
    {
      name: 'erp-auth',
      // Solo persistimos lo necesario, nunca el accessToken en producción
      // pero de momento lo dejamos para desarrollo
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)