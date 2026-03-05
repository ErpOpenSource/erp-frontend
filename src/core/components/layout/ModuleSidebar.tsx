import { useAuthStore } from '@/store/auth.store'
import { useAllModuleSchemas } from '@/core/hooks/useModuleSchema'
import { moduleIconMap, moduleColorMap } from './moduleIconMap'
import { LayoutDashboard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  activeModule: string | null
  onModuleChange: (module: string) => void
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export default function ModuleSidebar({
  activeModule,
  onModuleChange,
  orientation = 'vertical',
  className,
}: Props) {
  const userModules = useAuthStore((s) => s.user?.modules ?? [])
  const { data: schemas = [], isLoading } = useAllModuleSchemas()
  const isHorizontal = orientation === 'horizontal'

  // ✅ Intersección: existe en BD  +  el usuario lo tiene en su JWT
  const middleModules = schemas.filter(
    (s) => s.id !== 'DASHBOARD'
       && s.id !== 'SETTINGS'
       && userModules.includes(s.id)
  )

  return (
    <aside
      className={cn(
        'bg-white border-gray-100 flex-shrink-0 z-10',
        isHorizontal
          ? 'h-10 border-b flex items-center gap-0.5 px-2 md:px-3 overflow-x-auto scrollbar-none'
          : 'w-16 border-r flex flex-col items-center py-3 gap-1 h-full',
        className
      )}
    >

      <ModuleButton
        id="DASHBOARD"
        label="Inicio"
        active={activeModule === 'DASHBOARD'}
        orientation={orientation}
        onClick={() => onModuleChange('DASHBOARD')}
      />

      <div className={cn(
        isHorizontal ? 'w-px h-5 bg-gray-200 mx-1' : 'w-8 h-px bg-gray-100 my-1'
      )} />

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
            orientation={orientation}
            onClick={() => onModuleChange(schema.id)}
          />
        ))
      )}

      <div className={isHorizontal ? 'w-1' : 'flex-1'} />

      <ModuleButton
        id="SETTINGS"
        label="Ajustes"
        active={activeModule === 'SETTINGS'}
        orientation={orientation}
        onClick={() => onModuleChange('SETTINGS')}
      />
    </aside>
  )
}

function ModuleButton({ id, label, active, orientation, onClick }: {
  id: string
  label: string
  active: boolean
  orientation: 'vertical' | 'horizontal'
  onClick: () => void
}) {
  const Icon  = moduleIconMap[id] ?? LayoutDashboard
  const color = moduleColorMap[id] ?? '#6b7280'

  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'group relative rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0',
        orientation === 'horizontal' ? 'w-8 h-8' : 'w-10 h-10',
        active ? 'shadow-sm' : 'hover:bg-gray-100'
      )}
      style={active ? { backgroundColor: `${color}18`, color } : {}}
    >
      {active && orientation === 'vertical' && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
          style={{ backgroundColor: color }}
        />
      )}
      {active && orientation === 'horizontal' && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}

      <Icon size={18} style={active ? { color } : { color: '#9ca3af' }} />

      <span className={cn(
        'hidden md:block absolute px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50',
        orientation === 'horizontal'
          ? 'top-full mt-2 left-1/2 -translate-x-1/2'
          : 'left-full ml-3 top-1/2 -translate-y-1/2'
      )}>
        {label}
      </span>
    </button>
  )
}
