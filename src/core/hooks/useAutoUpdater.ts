// src/core/hooks/useAutoUpdater.ts
import { useEffect, useRef, useState } from 'react'
import { versionApi } from '@/api/version'

const CURRENT_VERSION = __APP_VERSION__
const CHECK_INTERVAL  = 1000 * 60 * 30  // 30 min en intranet, no 5

export function useAutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [nextVersion, setNextVersion]         = useState<string | null>(null)
  const [isUpdating, setIsUpdating]           = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = async () => {
      const latest = await versionApi.getLatest()

      // ✅ Solo muestra el banner si el backend devuelve una versión VÁLIDA y DIFERENTE
      // Si el backend devuelve 'unknown' o la misma versión → no molesta
      if (
        latest !== 'unknown' &&
        latest !== CURRENT_VERSION &&
        CURRENT_VERSION !== '0.0.0'   // ← ignora versiones de desarrollo
      ) {
        setUpdateAvailable(true)
        setNextVersion(latest)
      }
    }

    // ✅ En intranet no comprobamos al montar — esperamos 30s para no molestar al arrancar
    const initialDelay = setTimeout(check, 1000 * 30)
    intervalRef.current = setInterval(check, CHECK_INTERVAL)

    return () => {
      clearTimeout(initialDelay)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const applyUpdate = () => {
    setIsUpdating(true)
    sessionStorage.setItem('erp-update-state', JSON.stringify({
      path: window.location.pathname,
      timestamp: Date.now(),
    }))
    window.location.reload()
  }

  const dismiss = () => setUpdateAvailable(false)

  return { updateAvailable, nextVersion, isUpdating, applyUpdate, dismiss }
}