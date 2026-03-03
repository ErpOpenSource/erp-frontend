import { useModuleSchema } from '@/core/hooks/useModuleSchema'
import DashboardRenderer from '@/core/renderers/DashboardRenderer'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: schema, isLoading } = useModuleSchema('DASHBOARD')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greeting}, {user?.username} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Widgets desde el schema */}
      {schema?.dashboard && (
        <DashboardRenderer dashboard={schema.dashboard} />
      )}

    </div>
  )
}