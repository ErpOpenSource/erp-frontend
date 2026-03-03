import { useEffect, useRef, useState } from 'react'
import { versionApi } from '@/api/version'

const CURRENT_VERSION = __APP_VERSION__  // ← viene de vite.config.ts
const CHECK_INTERVAL = 1000 * 60 * 5    // cada 5 minutos

export function useAutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [nextVersion, setNextVersion] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = async () => {
      const latest = await versionApi.getLatest()
      if (latest !== 'unknown' && latest !== CURRENT_VERSION) {
        setUpdateAvailable(true)
        setNextVersion(latest)
      }
    }

    // Primera comprobación al montar
    check()

    // Polling cada 5 minutos
    intervalRef.current = setInterval(check, CHECK_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const applyUpdate = () => {
    setIsUpdating(true)

    // Guarda el estado actual antes de recargar
    sessionStorage.setItem('erp-update-state', JSON.stringify({
      path: window.location.pathname,
      timestamp: Date.now(),
    }))

    // Fuerza recarga limpia ignorando la caché
    window.location.reload()
  }

  const dismiss = () => setUpdateAvailable(false)

  return { updateAvailable, nextVersion, isUpdating, applyUpdate, dismiss }
}