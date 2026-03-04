import client from './client'
import type { PreferencesDto } from '@/core/types/module.types'

export const preferencesApi = {
  get: async (): Promise<PreferencesDto> => {
    const { data } = await client.get('/layout/api/users/me/preferences')
    return data.data
  },

  update: async (prefs: Partial<PreferencesDto>): Promise<PreferencesDto> => {
    const { data } = await client.put('/layout/api/users/me/preferences', prefs)
    return data.data
  },
}