import client from './client'
import type { ModuleSchema } from '@/core/types/module.types'
import { mockSchemas } from '@/core/components/layout/mockSchemas'

export const schemaApi = {
  getModule: async (moduleId: string): Promise<ModuleSchema> => {
    try {
      const { data } = await client.get<ModuleSchema>(`/modules/${moduleId}/schema`)
      return data
    } catch {
      // Fallback al mock mientras el backend no esté listo
      const mock = mockSchemas[moduleId]
if (mock) return mock
      throw new Error(`Schema not found for module: ${moduleId}`)
    }
  },

  getAllModules: async (moduleIds: string[]): Promise<ModuleSchema[]> => {
    const results = await Promise.allSettled(
      moduleIds.map((id) => schemaApi.getModule(id))
    )
    return results
      .filter((r): r is PromiseFulfilledResult<ModuleSchema> => r.status === 'fulfilled')
      .map((r) => r.value)
  },
}