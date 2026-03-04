import { useAuthStore } from '@/store/auth.store'
import { useAllModuleSchemas } from '@/core/hooks/useModuleSchema'
import { moduleIconMap, moduleColorMap } from './moduleIconMap'
import { LayoutDashboard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  activeModule: string | null
  onModuleChange: (module: string) => void
}

export default function ModuleSidebar({ activeModule, onModuleChange }: Props) {
  const userModules = useAuthStore((s) => s.user?.modules ?? [])
  const { data: schemas = [], isLoading } = useAllModuleSchemas()

  // ✅ Intersección: existe en BD  +  el usuario lo tiene en su JWT
  const middleModules = schemas.filter(
    (s) => s.id !== 'DASHBOARD'
       && s.id !== 'SETTINGS'
       && userModules.includes(s.id)
  )

  return (
    <aside className="w-16 bg-white border-r border-gray-100 flex flex-col items-center py-3 gap-1 flex-shrink-0 z-10 h-full">

      <ModuleButton
        id="DASHBOARD"
        label="Inicio"
        active={activeModule === 'DASHBOARD'}
        onClick={() => onModuleChange('DASHBOARD')}
      />

      <div className="w-8 h-px bg-gray-100 my-1" />

      {isLoading ? (
        <div className="flex items-center justify-center w-10 h-10">
          <Loader2 size={14} className="animate-spin text-gray-200" />
        </div>
      ) : (
        middleModules.map((schema) => (
          <ModuleButton
            key={schema.id}
            id={schema.id}
            label={schema.label}
            active={activeModule === schema.id}
            onClick={() => onModuleChange(schema.id)}
          />
        ))
      )}

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

function ModuleButton({ id, label, active, onClick }: {
  id: string
  label: string
  active: boolean
  onClick: () => void
}) {
  const Icon  = moduleIconMap[id] ?? LayoutDashboard
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

      <Icon size={18} style={active ? { color } : { color: '#9ca3af' }} />

      <span className="
        hidden md:block absolute left-full ml-3 px-2 py-1 text-xs font-medium
        bg-gray-900 text-white rounded-md whitespace-nowrap
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-150 z-50
      ">
        {label}
      </span>
    </button>
  )
}