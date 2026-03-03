import { useAutoUpdater } from '@/core/hooks/useAutoUpdater'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UpdateBanner() {
  const { updateAvailable, nextVersion, isUpdating, applyUpdate, dismiss } = useAutoUpdater()

  if (!updateAvailable) return null

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50',
      'flex items-center gap-3 px-4 py-3',
      'bg-gray-900 text-white rounded-xl shadow-xl',
      'border border-gray-700',
      'animate-in slide-in-from-bottom-4 duration-300',
      'max-w-sm'
    )}>

      {/* Icono */}
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Sparkles size={15} className="text-white" />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">
          Nueva versión disponible
        </p>
        {nextVersion && (
          <p className="text-xs text-gray-400 mt-0.5">v{nextVersion}</p>
        )}
      </div>

      {/* Botón actualizar */}
      <button
        onClick={applyUpdate}
        disabled={isUpdating}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 disabled:opacity-50"
      >
        <RefreshCw size={11} className={cn(isUpdating && 'animate-spin')} />
        {isUpdating ? 'Actualizando...' : 'Actualizar'}
      </button>

      {/* Botón cerrar */}
      <button
        onClick={dismiss}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
      >
        <X size={12} />
      </button>

    </div>
  )
}