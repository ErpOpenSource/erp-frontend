import { useRef } from 'react'
import { useTabsStore } from '@/store/tabs.store'
import { moduleColorMap } from './moduleIconMap'
import { X, Plus, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function TabBar({ className }: Props) {
  const { tabs, activeTabId, closeTab, setActiveTab, openTab } = useTabsStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootClass = cn(
    'h-10 bg-white border-b border-gray-100 flex items-center overflow-hidden min-w-0',
    className
  )

  // Si no hay tabs abiertas mostramos solo la barra vacía
  if (tabs.length === 0) {
    return (
      <div className={cn(rootClass, 'px-3 gap-1')}>
        <span className="text-xs text-gray-300 select-none">
          Abre una sección para empezar
        </span>
      </div>
    )
  }

  return (
    <div className={rootClass}>

      {/* Tabs con scroll horizontal */}
      <div
        ref={scrollRef}
        className="flex items-center h-full overflow-x-auto scrollbar-none flex-1 px-1 gap-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const color = moduleColorMap[tab.moduleId] ?? '#6b7280'

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group relative flex items-center gap-1.5 h-8 px-2.5 rounded-lg cursor-pointer select-none flex-shrink-0',
                'border border-transparent transition-all duration-100',
                isActive
                  ? 'bg-white text-gray-800 border-gray-200 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/70'
              )}
            >
              {/* Indicador activo en la parte superior */}
              {isActive && (
                <span
                  className="absolute top-0 left-1.5 right-1.5 h-0.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}

              {/* Punto dirty (cambios sin guardar) */}
              {tab.isDirty && (
                <Circle
                  size={6}
                  className="fill-amber-400 text-amber-400 flex-shrink-0"
                />
              )}

              {/* Label */}
              <span className="text-xs font-medium max-w-32 truncate">
                {tab.label}
              </span>

              {/* Botón cerrar */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className={cn(
                  'w-4 h-4 flex items-center justify-center rounded transition-all duration-100 flex-shrink-0',
                  isActive
                    ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                    : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 hover:bg-white'
                )}
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Botón nueva tab */}
      <button
        onClick={() => openTab({
          label: 'Dashboard',
          path: '/dashboard',
          moduleId: 'DASHBOARD',
        })}
        className="w-8 h-8 mr-1 rounded-md flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-white transition-colors flex-shrink-0 border border-transparent hover:border-gray-200"
      >
        <Plus size={14} />
      </button>

    </div>
  )
}
