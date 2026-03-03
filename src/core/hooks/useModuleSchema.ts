import { useQuery } from '@tanstack/react-query'
import { schemaApi } from '@/api/schema'
import { useAuthStore } from '@/store/auth.store'

export function useModuleSchema(moduleId: string) {
  return useQuery({
    queryKey: ['schema', moduleId],
    queryFn: () => schemaApi.getModule(moduleId),
    staleTime: 1000 * 60 * 5, // 5 min en caché
    enabled: !!moduleId,
  })
}

export function useAllModuleSchemas() {
  const modules = useAuthStore((s) => s.user?.modules ?? [])

  return useQuery({
    queryKey: ['schemas', modules],
    queryFn: () => schemaApi.getAllModules(modules),
    staleTime: 1000 * 60 * 5,
    enabled: modules.length > 0,
  })
}