import { useAuthStore } from '@/store/auth.store'
import { moduleIconMap, moduleColorMap } from './moduleIconMap'
import { LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  activeModule: string | null
  onModuleChange: (module: string) => void
}

export default function ModuleSidebar({ activeModule, onModuleChange }: Props) {
  const user = useAuthStore((s) => s.user)
  const modules = user?.modules ?? []

  return (
    <aside className="w-16 bg-white border-r border-gray-100 flex flex-col items-center py-3 gap-1 flex-shrink-0 z-10 h-full">

      <ModuleButton
        id="DASHBOARD"
        label="Inicio"
        active={activeModule === 'DASHBOARD'}
        onClick={() => onModuleChange('DASHBOARD')}
      />

      <div className="w-8 h-px bg-gray-100 my-1" />

      {modules.map((moduleId) => (
        <ModuleButton
          key={moduleId}
          id={moduleId}
          label={formatLabel(moduleId)}
          active={activeModule === moduleId}
          onClick={() => onModuleChange(moduleId)}
        />
      ))}

      <div className="flex-1" />

      <ModuleButton
        id="SETTINGS"
        label="Ajustes"
        active={activeModule === 'SETTINGS'}
        onClick={() => onModuleChange('SETTINGS')}
      />
    </aside>
  )
}

function ModuleButton({
  id, label, active, onClick,
}: {
  id: string
  label: string
  active: boolean
  onClick: () => void
}) {
  const Icon = moduleIconMap[id] ?? LayoutDashboard
  const color = moduleColorMap[id] ?? '#6b7280'

  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150',
        active ? 'shadow-sm' : 'hover:bg-gray-100'
      )}
      style={active ? { backgroundColor: `${color}18`, color } : {}}
    >
      {active && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
          style={{ backgroundColor: color }}
        />
      )}

      <Icon
        size={18}
        style={active ? { color } : { color: '#9ca3af' }}
      />

      {/* Tooltip — oculto en móvil */}
      <span className="
        hidden md:block
        absolute left-full ml-3 px-2 py-1 text-xs font-medium
        bg-gray-900 text-white rounded-md whitespace-nowrap
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-150 z-50
      ">
        {label}
      </span>
    </button>
  )
}

function formatLabel(moduleId: string): string {
  const labels: Record<string, string> = {
    SALES: 'Ventas',
    INVENTORY: 'Inventario',
    PURCHASING: 'Compras',
    RRHH: 'RRHH',
    LOGISTICS: 'Logística',
    ANALYTICS: 'Analítica',
    ACCOUNTING: 'Contabilidad',
    ADMIN: 'Administración',
  }
  return labels[moduleId] ?? moduleId.charAt(0) + moduleId.slice(1).toLowerCase()
}