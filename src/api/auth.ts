import client from './client'
import type { AuthResponse } from '@/store/auth.store'

export interface LoginPayload {
  username: string
  password: string
  deviceId: string
  rememberMe: boolean
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await client.post<AuthResponse>('/auth/login', payload)
    return data
  },

  logout: async () => {
    await client.post('/auth/logout')
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await client.post<AuthResponse>('/auth/refresh', { refreshToken })
    return data
  },
}