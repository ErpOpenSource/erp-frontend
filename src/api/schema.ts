import client from './client'
import type { ModuleSchema } from '@/core/types/module.types'
import { mockSchemas } from '@/core/components/layout/mockSchemas'

export const schemaApi = {
  getModule: async (moduleId: string): Promise<ModuleSchema> => {
    try {
      const { data } = await client.get(`/layout/api/modules/${moduleId}/schema`)
      return data.data  // ← ApiResponse wrapper: { success, data, message }
    } catch {
      const mock = mockSchemas[moduleId]
      if (mock) return mock
      throw new Error(`Schema not found for module: ${moduleId}`)
    }
  },

  getAllModules: async (moduleIds: string[]): Promise<ModuleSchema[]> => {
    try {
      const { data } = await client.get(`/layout/api/modules`)
      return data.data  // ← devuelve array directo
    } catch {
      return Object.values(mockSchemas)
    }
  },
}