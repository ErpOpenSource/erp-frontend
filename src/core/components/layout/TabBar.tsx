import { useRef } from 'react'
import { useTabsStore } from '@/store/tabs.store'
import { moduleColorMap } from './moduleIconMap'
import { X, Plus, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TabBar() {
  const { tabs, activeTabId, closeTab, setActiveTab, openTab } = useTabsStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Si no hay tabs abiertas mostramos solo la barra vacía
  if (tabs.length === 0) {
    return (
      <div className="h-9 bg-white border-b border-gray-100 flex items-center px-3 gap-1 flex-shrink-0">
        <span className="text-xs text-gray-300 select-none">
          Abre una sección para empezar
        </span>
      </div>
    )
  }

  return (
    <div className="h-9 bg-white border-b border-gray-100 flex items-center flex-shrink-0 overflow-hidden">

      {/* Tabs con scroll horizontal */}
      <div
        ref={scrollRef}
        className="flex items-end h-full overflow-x-auto scrollbar-none flex-1"
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
                'group relative flex items-center gap-1.5 h-full px-3 cursor-pointer select-none flex-shrink-0',
                'border-r border-gray-100 transition-colors duration-100',
                isActive
                  ? 'bg-gray-50 text-gray-800'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
              )}
            >
              {/* Indicador activo en la parte superior */}
              {isActive && (
                <span
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-b"
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
                    : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 hover:bg-gray-100'
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
        className="w-9 h-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0 border-l border-gray-100"
      >
        <Plus size={14} />
      </button>

    </div>
  )
}