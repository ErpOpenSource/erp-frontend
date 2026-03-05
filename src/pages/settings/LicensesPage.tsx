import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import {
  Key, Loader2, AlertCircle, CheckCircle2,
  Shield, Settings2, Users, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SeatsInfo {
  maxSeats: number
  activeSeats: number
  enforceMode: 'HARD' | 'SOFT'
}

export default function LicensesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!hasPermission('admin.seats.read')) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <Shield size={24} />
        <p className="text-sm">No tienes permisos para ver esta sección</p>
      </div>
    )
  }

  const { data, isLoading, isError } = useQuery<SeatsInfo>({
    queryKey: ['license-seats'],
    queryFn: async () => {
      const { data } = await client.get('/auth/admin/licenses/seats')
      return data.data ?? data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <AlertCircle size={20} />
        <p className="text-sm">Error al cargar la información de licencias</p>
      </div>
    )
  }

  const available = Math.max(0, data.maxSeats - data.activeSeats)
  const pct       = data.maxSeats > 0 ? Math.min((data.activeSeats / data.maxSeats) * 100, 100) : 0
  const isFull    = data.activeSeats >= data.maxSeats
  const isWarning = pct >= 80

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Cabecera */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Licencias</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Consumo de sesiones concurrentes y configuración del límite operativo
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total licencias"
          value={data.maxSeats}
          icon={Key}
          color="text-gray-700"
          bg="bg-gray-50"
        />
        <StatCard
          label="En uso ahora"
          value={data.activeSeats}
          icon={Users}
          color={isFull ? 'text-red-600' : 'text-gray-700'}
          bg={isFull ? 'bg-red-50' : 'bg-gray-50'}
        />
        <StatCard
          label="Disponibles"
          value={available}
          icon={TrendingUp}
          color={available === 0 ? 'text-red-600' : 'text-emerald-700'}
          bg={available === 0 ? 'bg-red-50' : 'bg-emerald-50'}
        />
      </div>

      {/* Barra de uso */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Uso de sesiones concurrentes</span>
          <span className={cn(
            'text-xs font-semibold',
            isFull ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-700'
          )}>
            {data.activeSeats} / {data.maxSeats}
          </span>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isFull    ? 'bg-red-400'   :
              isWarning ? 'bg-amber-400' :
                          'bg-gray-900'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Modo de aplicación */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-gray-400">Modo de aplicación:</span>
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
            data.enforceMode === 'HARD'
              ? 'bg-red-50 text-red-600 border-red-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          )}>
            {data.enforceMode === 'HARD' ? (
              <><AlertCircle size={10} /> HARD — bloquea nuevos accesos al alcanzar el límite</>
            ) : (
              <><CheckCircle2 size={10} /> SOFT — advierte pero permite el acceso</>
            )}
          </span>
        </div>

        {isFull && data.enforceMode === 'HARD' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">
              Límite alcanzado — los nuevos inicios de sesión están bloqueados
            </p>
          </div>
        )}
      </div>

      {/* Configuración (solo admin con permiso) */}
      {hasPermission('admin.seats.write') && (
        <ConfigSection current={data} />
      )}
    </div>
  )
}

// ── Tarjeta de estadística ──────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, bg,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
        <Icon size={15} className={color} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Sección de configuración ────────────────────────────────────────────────
function ConfigSection({ current }: { current: SeatsInfo }) {
  const queryClient     = useQueryClient()
  const [maxSeats, setMaxSeats]         = useState(current.maxSeats)
  const [enforceMode, setEnforceMode]   = useState<'HARD' | 'SOFT'>(current.enforceMode)
  const [success, setSuccess]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      await client.put('/auth/admin/licenses/seats', { maxSeats, enforceMode })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-seats'] })
      setSuccess(true)
      setError(null)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: () => {
      setError('No se pudo actualizar la configuración. Inténtalo de nuevo.')
    },
  })

  const isDirty = maxSeats !== current.maxSeats || enforceMode !== current.enforceMode

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-gray-400" />
        <h2 className="text-sm font-medium text-gray-700">Configuración</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Límite de sesiones */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            Límite de sesiones concurrentes
          </label>
          <input
            type="number"
            min={1}
            value={maxSeats}
            onChange={(e) => setMaxSeats(Number(e.target.value))}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100 transition"
          />
        </div>

        {/* Modo de aplicación */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            Modo de aplicación
          </label>
          <select
            value={enforceMode}
            onChange={(e) => setEnforceMode(e.target.value as 'HARD' | 'SOFT')}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100 transition"
          >
            <option value="HARD">HARD — bloqueo estricto</option>
            <option value="SOFT">SOFT — solo advertencia</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
          <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-600">Configuración actualizada correctamente</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => mutation.mutate()}
          disabled={!isDirty || mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
