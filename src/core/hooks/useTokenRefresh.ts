import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import axios from 'axios'

// Refresca el token 2 minutos ANTES de que expire
// Evita que el usuario note nada — nunca llega a caducar en medio de una sesión activa
const REFRESH_BUFFER_MS = 2 * 60 * 1000   // 2 min antes
const FALLBACK_TTL_MS   = 14 * 60 * 1000  // si no sabemos cuándo expira, cada 14 min

export function useTokenRefresh() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)

      const { accessToken, refreshToken, accessTokenExpiresAt } = useAuthStore.getState()

      if (!accessToken || !refreshToken) return

      // Calcula cuánto tiempo queda hasta que expire
      let msUntilExpiry = FALLBACK_TTL_MS
      if (accessTokenExpiresAt) {
        msUntilExpiry = accessTokenExpiresAt - Date.now()
      }

      // Si ya está expirado o quedan menos de 30s → refresca ahora
      const delay = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 0)

      timerRef.current = setTimeout(async () => {
        const currentRefreshToken = useAuthStore.getState().refreshToken
        if (!currentRefreshToken) return

        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refreshToken: currentRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )
          useAuthStore.getState().setAuth(data)
          // Reprograma para el siguiente ciclo
          schedule()
        } catch {
          // El refresh falló (sesión revocada, servidor caído...)
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }, delay)
    }

    schedule()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}