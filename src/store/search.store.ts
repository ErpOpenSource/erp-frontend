import { create } from 'zustand'

interface SearchState {
  queryByPath: Record<string, string>
  setQuery: (path: string, query: string) => void
  clearQuery: (path: string) => void
}

export const useSearchStore = create<SearchState>()((set) => ({
  queryByPath: {},

  setQuery: (path, query) =>
    set((state) => ({
      queryByPath: {
        ...state.queryByPath,
        [path]: query,
      },
    })),

  clearQuery: (path) =>
    set((state) => {
      if (!(path in state.queryByPath)) return state
      const next = { ...state.queryByPath }
      delete next[path]
      return { queryByPath: next }
    }),
}))
