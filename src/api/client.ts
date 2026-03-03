import axios from 'axios'
import { useAuthStore } from '../store/auth.store'
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de REQUEST → añade el token en cada llamada
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de RESPONSE → maneja errores globalmente
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Token expirado → intenta refrescarlo una sola vez
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('erp-auth')
        ? JSON.parse(localStorage.getItem('erp-auth')!).state.refreshToken
        : null

      if (refreshToken) {
        try {
          const { data } = await client.post('/auth/refresh', { refreshToken })
          useAuthStore.getState().setAuth(data)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return client(original)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }
    }

    if (error.response?.status >= 500) {
      console.error('Error del servidor:', error.response.data)
    }

    return Promise.reject(error)
  }
)

export default client