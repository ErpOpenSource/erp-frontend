import { useRef } from 'react'
import { usePreferencesStore } from '@/store/preferences.store'
import { useAuthStore } from '@/store/auth.store'
import { useTabsStore } from '@/store/tabs.store'
import { useModuleSchema } from '@/core/hooks/useModuleSchema'
import { moduleColorMap } from './moduleIconMap'
import type { NavItem } from '@/core/types/module.types'
import { Star, StarOff, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouterState } from '@tanstack/react-router'
import * as LucideIcons from 'lucide-react'

interface Props {
  module: string
  open: boolean
  onToggle: () => void
}

export default function SubNav({ module, open, onToggle }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { getViewPreference, setViewPreference } = usePreferencesStore()

  const { data: schema, isLoading } = useModuleSchema(module)

  // Mantener el último schema válido para evitar parpadeo al cambiar módulo
  const lastSchema = useRef(schema)
  if (schema) lastSchema.current = schema
  const displaySchema = lastSchema.current

  const color = moduleColorMap[module] ?? '#6b7280'

  const favorites: string[] = (getViewPreference('_global', 'favorites')?.meta?.list as string[]) ?? []

  const toggleFavorite = (itemId: string) => {
    const updated = favorites.includes(itemId)
      ? favorites.filter((f) => f !== itemId)
      : [...favorites, itemId]
    setViewPreference('_global', 'favorites', { meta: { list: updated } })
  }

  const visibleItems = displaySchema?.navItems.filter((item) =>
    item.permission ? hasPermission(item.permission) : true
  ) ?? []

  const favoriteItems = visibleItems.filter((item) => favorites.includes(item.id))
  const regularItems = visibleItems.filter((item) => !favorites.includes(item.id))

  if (!displaySchema) return null

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-100 flex flex-col flex-shrink-0 overflow-hidden',
        'transition-[width,opacity] duration-200 ease-in-out',
        open ? 'w-56' : 'w-0',
        isLoading ? 'opacity-60' : 'opacity-100'
      )}
    >
      <div
        key={displaySchema.id}
        className="flex flex-col h-full min-w-56 subnav-content-enter"
      >

        <div
          className="h-14 flex items-center justify-between px-4 border-b border-gray-100"
          style={{ borderBottomColor: `${color}30` }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full transition-colors duration-200" style={{ backgroundColor: color }} />
            <span className="text-sm font-semibold text-gray-800">{displaySchema.label}</span>
          </div>
          <button
            onClick={onToggle}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">

          {favoriteItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 px-2 mb-1 uppercase tracking-wider">
                Favoritos
              </p>
              {favoriteItems.map((item) => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  color={color}
                  moduleId={displaySchema.id}
                  isFavorite
                  onToggleFavorite={() => toggleFavorite(item.id)}
                />
              ))}
            </div>
          )}

          <div>
            {favoriteItems.length > 0 && (
              <p className="text-xs font-medium text-gray-400 px-2 mb-1 uppercase tracking-wider">
                {displaySchema.label}
              </p>
            )}
            {regularItems.map((item) => (
              <NavItemRow
                key={item.id}
                item={item}
                color={color}
                moduleId={displaySchema.id}
                isFavorite={false}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            ))}
          </div>

        </div>
      </div>
    </aside>
  )
}

function NavItemRow({
  item,
  color,
  isFavorite,
  onToggleFavorite,
  moduleId,
}: {
  item: NavItem
  color: string
  isFavorite: boolean
  onToggleFavorite: () => void
  moduleId: string
}) {
  const openTab = useTabsStore((s) => s.openTab)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const Icon = getIcon(item.icon)
  const isActive = pathname === item.path

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-100',
        isActive
          ? 'text-gray-900 font-medium'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
      )}
      style={isActive ? { backgroundColor: `${color}12`, color } : {}}
      onClick={() => openTab({ label: item.label, path: item.path, moduleId })}
    >
      <Icon size={15} className="flex-shrink-0" />

      <span className="flex-1 text-sm truncate">{item.label}</span>

      {item.badge && item.badge > 0 && (
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {item.badge}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
        className={cn(
          'flex-shrink-0 transition-opacity duration-100',
          isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {isFavorite
          ? <Star size={12} className="text-amber-400 fill-amber-400" />
          : <StarOff size={12} className="text-gray-300" />
        }
      </button>
    </div>
  )
}

function getIcon(name: string): React.ElementType {
  const formatted = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return (LucideIcons as any)[formatted] ?? LucideIcons.Circle
}