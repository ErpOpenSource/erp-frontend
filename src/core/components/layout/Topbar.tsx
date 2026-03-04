import { useEffect, useMemo, useRef, useState } from 'react'
import { Menu, Search, ChevronRight, LogOut, User, Settings, Moon, Sun, Monitor } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { usePreferencesStore } from '@/store/preferences.store'
import { useSearchStore } from '@/store/search.store'
import { useTabsStore } from '@/store/tabs.store'
import { useAllModuleSchemas } from '@/core/hooks/useModuleSchema'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useRouterState } from '@tanstack/react-router'

interface Props {
  onMenuClick?: () => void
}

interface SearchCandidate {
  moduleId: string
  moduleLabel: string
  label: string
  id: string
  path: string
  score: number
}

const mockKPIs = [
  { id: 'orders', label: 'Pedidos hoy', value: '24', trend: 'up', delta: '+3' },
  { id: 'revenue', label: 'Ingresos', value: '12.4kEUR', trend: 'up', delta: '+8%' },
  { id: 'incidents', label: 'Incidencias', value: '2', trend: 'down', delta: '-1' },
] as const

export default function Topbar({ onMenuClick }: Props) {
  const { user, logout, hasPermission } = useAuthStore()
  const { theme, setTheme } = usePreferencesStore()
  const openTab = useTabsStore((s) => s.openTab)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const searchValue = useSearchStore((s) => s.queryByPath[pathname] ?? '')
  const setSearchQuery = useSearchStore((s) => s.setQuery)

  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)

  const searchRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U'

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      const { data: schemas = [] } = useAllModuleSchemas()

  const allCandidates = useMemo(() => schemas.flatMap((schema) =>
        schema.navItems
          .filter((item) => (item.permission ? hasPermission(item.permission) : true))
          .map((item) => ({
            moduleId: schema.id,
            moduleLabel: schema.label,
            label: item.label,
            id: item.id,
            path: item.path,
            score: 0,
          }))
      ),
    [hasPermission]
  )

  const suggestions = useMemo<SearchCandidate[]>(() => {
    const term = normalize(searchValue)
    if (!term) return allCandidates.slice(0, 6)

    return allCandidates
      .map((item) => {
        const label = normalize(item.label)
        const id = normalize(item.id)
        const path = normalize(item.path)

        let score = 0
        if (label === term || id === term) score = 120
        else if (label.startsWith(term) || id.startsWith(term)) score = 90
        else if (label.includes(term) || id.includes(term)) score = 70
        else if (path.includes(term)) score = 50

        return { ...item, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [allCandidates, searchValue])

  const openCandidate = (candidate: SearchCandidate) => {
    if (searchValue.trim()) {
      setSearchQuery(candidate.path, searchValue)
    }

    openTab({
      label: candidate.label,
      path: candidate.path,
      moduleId: candidate.moduleId,
    })

    setSearchOpen(false)
  }

  const handleSearchSubmit = () => {
    const selected = suggestions[activeSuggestion] ?? suggestions[0]
    if (!selected) return
    openCandidate(selected)
  }

  useEffect(() => {
    if (!searchOpen) return
    inputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return

    if (suggestions.length === 0) {
      setActiveSuggestion(-1)
      return
    }

    setActiveSuggestion((prev) => {
      if (prev < 0 || prev >= suggestions.length) return 0
      return prev
    })
  }, [searchOpen, suggestions])

  useEffect(() => {
    if (!searchOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [searchOpen])

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (suggestions.length === 0) return
      setActiveSuggestion((prev) => (prev + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (suggestions.length === 0) return
      setActiveSuggestion((prev) => {
        if (prev <= 0) return suggestions.length - 1
        return prev - 1
      })
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSearchSubmit()
      return
    }

    if (event.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 md:px-4 gap-2 flex-shrink-0 z-30">

      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden">
          <img
            src="/logo-wuan.png"
            alt="Wuan logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />

      <Breadcrumbs />

      <div className="flex-1" />

      <div className="hidden lg:flex items-center gap-1 mr-2">
        {mockKPIs.map((kpi) => (
          <KPIWidget key={kpi.id} {...kpi} />
        ))}
      </div>

      <div className="hidden lg:block w-px h-5 bg-gray-200 mx-1" />

      <div ref={searchRef} className="relative">
        {searchOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchQuery(pathname, e.target.value)
              setActiveSuggestion(0)
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setSearchOpen(true)}
            placeholder="Buscar en el ERP..."
            className="w-48 md:w-64 h-8 pl-8 pr-3 text-sm bg-gray-100 rounded-lg border-0 outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Search size={16} />
          </button>
        )}

        {searchOpen && (
          <>
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />

            <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="px-3 py-2 text-[11px] text-gray-400 border-b border-gray-100 flex items-center justify-between">
                <span>Resultados de navegacion</span>
                <span>? ? Enter</span>
              </div>

              {suggestions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400">
                  No hay coincidencias para "{searchValue}"
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {suggestions.map((item, index) => (
                    <li key={item.path}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveSuggestion(index)}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          openCandidate(item)
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2.5 transition-colors',
                          index === activeSuggestion ? 'bg-gray-100' : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {highlightMatch(item.label, searchValue)}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {item.moduleLabel} � {item.path}
                            </p>
                          </div>
                          <span className="text-[10px] uppercase tracking-wide text-gray-300">
                            {item.moduleId}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors outline-none">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-gray-900 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-none">{user?.username}</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5">{user?.roles?.[0]}</p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-semibold">{user?.username}</span>
              <span className="text-xs text-gray-400 font-normal">{user?.departments?.join(', ')}</span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem>
            <User size={14} className="mr-2" />
            Mi perfil
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Settings size={14} className="mr-2" />
            Preferencias
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Monitor size={14} className="mr-2" />
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun size={14} className="mr-2" />
                <span>Claro</span>
                {theme === 'light' && <span className="ml-auto text-xs text-gray-400">?</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon size={14} className="mr-2" />
                <span>Oscuro</span>
                {theme === 'dark' && <span className="ml-auto text-xs text-gray-400">?</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor size={14} className="mr-2" />
                <span>Sistema</span>
                {theme === 'system' && <span className="ml-auto text-xs text-gray-400">?</span>}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-500 focus:text-red-500 focus:bg-red-50"
          >
            <LogOut size={14} className="mr-2" />
            Cerrar sesion
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

    </header>
  )
}

function highlightMatch(text: string, query: string) {
  const cleanQuery = query.trim()
  if (!cleanQuery) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = cleanQuery.toLowerCase()
  const matchIndex = lowerText.indexOf(lowerQuery)

  if (matchIndex === -1) return text

  const before = text.slice(0, matchIndex)
  const match = text.slice(matchIndex, matchIndex + cleanQuery.length)
  const after = text.slice(matchIndex + cleanQuery.length)

  return (
    <>
      {before}
      <mark className="bg-amber-100 text-amber-900 rounded px-0.5">{match}</mark>
      {after}
    </>
  )
}

function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((seg) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
      path: seg,
    }))

  if (segments.length === 0) return null

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm">
      {segments.map((seg, i) => (
        <div key={`${seg.path}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} className="text-gray-300" />}
          <span
            className={cn(
              i === segments.length - 1
                ? 'text-gray-800 font-medium'
                : 'text-gray-400 hover:text-gray-600 cursor-pointer transition-colors'
            )}
          >
            {seg.label}
          </span>
        </div>
      ))}
    </nav>
  )
}

function KPIWidget({ label, value, trend, delta }: {
  label: string
  value: string
  trend: 'up' | 'down'
  delta: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
      <div>
        <p className="text-xs text-gray-400 leading-none">{label}</p>
        <p className="text-sm font-semibold text-gray-800 leading-none mt-0.5">{value}</p>
      </div>
      <span className={cn(
        'text-xs font-medium',
        trend === 'up' ? 'text-emerald-500' : 'text-red-400'
      )}>
        {delta}
      </span>
    </div>
  )
}
