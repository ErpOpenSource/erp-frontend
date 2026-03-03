import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ColumnPreference {
  visible: string[]
  widths: Record<string, number>
  order: string[]
}

interface ViewPreference {
  columns?: ColumnPreference
  pageSize?: number
  defaultSort?: { field: string; dir: 'asc' | 'desc' }
  filters?: Record<string, unknown>
  meta?: Record<string, unknown>  // ← añade esto
}

interface ModulePreferences {
  views: Record<string, ViewPreference>
}

interface PreferencesState {
  theme: 'light' | 'dark' | 'system'
  language: 'es' | 'en'
  sidebarCollapsed: boolean
  modules: Record<string, ModulePreferences>

  setTheme: (theme: PreferencesState['theme']) => void
  toggleSidebar: () => void
  setViewPreference: (module: string, view: string, prefs: Partial<ViewPreference>) => void
  getViewPreference: (module: string, view: string) => ViewPreference
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      language: 'es',
      sidebarCollapsed: false,
      modules: {},

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setViewPreference: (module, view, prefs) =>
        set((state) => ({
          modules: {
            ...state.modules,
            [module]: {
              views: {
                ...state.modules[module]?.views,
                [view]: {
                  ...state.modules[module]?.views[view],
                  ...prefs,
                },
              },
            },
          },
        })),

      getViewPreference: (module, view) => {
        const { modules } = get()
        return modules[module]?.views[view] ?? {}
      },
    }),
    { name: 'erp-preferences' }
  )
)