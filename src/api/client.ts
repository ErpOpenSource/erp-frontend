import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── REQUEST: lee el token directamente de Zustand, nunca de localStorage ──
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken   // ✅ correcto
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── RESPONSE: refresca el token si expira, una sola vez por request ──
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

const processQueue = (token: string) => {
  refreshQueue.forEach((resolve) => resolve(token))
  refreshQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // ✅ Lee el refreshToken directamente de Zustand
    const refreshToken = useAuthStore.getState().refreshToken

    if (!refreshToken) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Si ya hay un refresh en curso, encola esta request
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken: string) => {
          original.headers.Authorization = `Bearer ${newToken}`
          resolve(client(original))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      // ✅ Usa el endpoint correcto del auth-service
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      )

      useAuthStore.getState().setAuth(data)
      processQueue(data.accessToken)
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return client(original)

    } catch (refreshError) {
      // El refresh también falló → sesión muerta, logout limpio
      refreshQueue = []
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(refreshError)

    } finally {
      isRefreshing = false
    }
  }
)

export default client