import { createRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import ModulePage from './ModulePage'

// Genera rutas dinámicas para un módulo completo
// Se llama desde el router una vez que tenemos los schemas
export function createModuleRoutes(parentRoute: any, moduleId: string, views: { id: string }[]) {
  return views.map((view) =>
    createRoute({
      getParentRoute: () => parentRoute,
      path: `/${moduleId.toLowerCase()}/${view.id}`,
      component: () => <ModulePage moduleId={moduleId} viewId={view.id} />,
    })
  )
}

// Hook para saber si el usuario tiene acceso a un módulo
export function useModuleAccess(moduleId: string): boolean {
  const hasModule = useAuthStore((s) => s.hasModule)
  return hasModule(moduleId)
}