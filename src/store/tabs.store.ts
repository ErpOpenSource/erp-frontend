import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { router } from '@/router'

export interface Tab {
  id: string
  label: string
  path: string
  moduleId: string
  icon?: string
  isDirty?: boolean
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null

  openTab: (tab: Omit<Tab, 'id'>) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, changes: Partial<Tab>) => void
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (tab) => {
        const { tabs } = get()
        const existing = tabs.find((t) => t.path === tab.path)
        if (existing) {
          set({ activeTabId: existing.id })
          router.navigate({ to: existing.path })
          return
        }
        const id = crypto.randomUUID()
        set({ tabs: [...tabs, { ...tab, id }], activeTabId: id })
        router.navigate({ to: tab.path })
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get()
        const index = tabs.findIndex((t) => t.id === id)
        const newTabs = tabs.filter((t) => t.id !== id)
        let newActiveId = activeTabId

        if (activeTabId === id) {
          const newActive = newTabs[index - 1] ?? newTabs[index] ?? null
          newActiveId = newActive?.id ?? null
          if (newActive) router.navigate({ to: newActive.path })
          else router.navigate({ to: '/dashboard' })
        }

        set({ tabs: newTabs, activeTabId: newActiveId })
      },

      setActiveTab: (id) => {
        const { tabs } = get()
        const tab = tabs.find((t) => t.id === id)
        if (tab) {
          set({ activeTabId: id })
          router.navigate({ to: tab.path })
        }
      },

      updateTab: (id, changes) => {
        set((state) => ({
          tabs: state.tabs.map((t) => t.id === id ? { ...t, ...changes } : t),
        }))
      },
    }),
    { name: 'erp-tabs' }
  )
)