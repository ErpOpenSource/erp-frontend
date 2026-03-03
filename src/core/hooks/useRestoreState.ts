import { useEffect } from 'react'
import { router } from '@/router'

export function useRestoreState() {
  useEffect(() => {
    const raw = sessionStorage.getItem('erp-update-state')
    if (!raw) return

    try {
      const state = JSON.parse(raw)
      const age = Date.now() - state.timestamp

      // Solo restaura si la actualización fue hace menos de 30 segundos
      if (age < 30000 && state.path && state.path !== '/') {
        router.navigate({ to: state.path })
      }
    } catch {
      // nada
    } finally {
      sessionStorage.removeItem('erp-update-state')
    }
  }, [])
}