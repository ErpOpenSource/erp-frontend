import client from './client'
import type { ModuleSchema } from '@/core/types/module.types'

export const schemaApi = {
  getModule: async (moduleId: string): Promise<ModuleSchema> => {
    const { data } = await client.get(`/layout/api/modules/${moduleId}/schema`)
    return data.data
  },

  getAllModules: async (moduleIds: string[]): Promise<ModuleSchema[]> => {
    const { data } = await client.get(`/layout/api/modules`)
    return data.data
  },
}