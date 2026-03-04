import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import client from '@/api/client'
import { Monitor, Smartphone, Laptop, Loader2, AlertCircle, LogOut, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionRow {
  id: string
  userId: string
  username: string
  deviceId: string
  ip: string | null
  userAgent: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  current: boolean  // el backend marca la sesión actual del usuario
}

export default function SessionsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const sessionId     = useAuthStore((s) => s.sessionId)
  const queryClient   = useQueryClient()

  if (!hasPermission('admin.sessions.read')) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <Shield size={24} />
        <p className="text-sm">No tienes permisos para ver esta sección</p>
      </div>
    )
  }

  const { data: sessions = [], isLoading, isError, refetch } = useQuery<SessionRow[]>({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      const { data } = await client.get('/auth/admin/sessions')
      return data.data ?? data
    },
    refetchInterval: 30_000,  // refresca cada 30s — las sesiones cambian
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/auth/admin/sessions/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }),
  })

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      await client.delete('/auth/admin/sessions')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }),
  })

  const activeSessions  = sessions.filter((s) => new Date(s.expiresAt) > new Date())
  const expiredSessions = sessions.filter((s) => new Date(s.expiresAt) <= new Date())

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={20} className="animate-spin text-gray-200" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <AlertCircle size={20} />
        <p className="text-sm">Error al cargar las sesiones</p>
        <button onClick={() => refetch()} className="text-xs underline hover:text-gray-600">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Sesiones activas</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeSessions.length} {activeSessions.length === 1 ? 'sesión activa' : 'sesiones activas'}
          </p>
        </div>
        {activeSessions.length > 1 && hasPermission('admin.sessions.revoke') && (
          <button
            onClick={() => {
              if (window.confirm('¿Cerrar todas las sesiones excepto la actual?')) {
                revokeAllMutation.mutate()
              }
            }}
            disabled={revokeAllMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
          >
            {revokeAllMutation.isPending
              ? <Loader2 size={12} className="animate-spin" />
              : <LogOut size={12} />
            }
            Cerrar todas las demás
          </button>
        )}
      </div>

      {/* Sesiones activas */}
      {activeSessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
          No hay sesiones activas
        </div>
      ) : (
        <div className="space-y-2">
          {activeSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isCurrent={session.id === sessionId}
              onRevoke={() => revokeMutation.mutate(session.id)}
              isRevoking={revokeMutation.isPending && revokeMutation.variables === session.id}
              canRevoke={hasPermission('admin.sessions.revoke')}
            />
          ))}
        </div>
      )}

      {/* Sesiones expiradas — colapsadas */}
      {expiredSessions.length > 0 && (
        <details className="group">
          <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            {expiredSessions.length} sesiones expiradas
          </summary>
          <div className="mt-2 space-y-2">
            {expiredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isCurrent={false}
                onRevoke={() => {}}
                isRevoking={false}
                canRevoke={false}
                expired
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Tarjeta de sesión ─────────────────────────────────────
function SessionCard({
  session, isCurrent, onRevoke, isRevoking, canRevoke, expired = false,
}: {
  session: SessionRow
  isCurrent: boolean
  onRevoke: () => void
  isRevoking: boolean
  canRevoke: boolean
  expired?: boolean
}) {
  const DeviceIcon = getDeviceIcon(session.userAgent)
  const deviceLabel = getDeviceLabel(session.userAgent)
  const lastSeen = formatRelative(session.lastSeenAt)

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors',
      isCurrent  ? 'border-gray-900/20 bg-gray-50/50' : 'border-gray-100',
      expired    && 'opacity-50',
    )}>
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
        isCurrent ? 'bg-gray-900' : 'bg-gray-100',
      )}>
        <DeviceIcon size={16} className={isCurrent ? 'text-white' : 'text-gray-400'} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800 truncate">{deviceLabel}</p>
          {isCurrent && (
            <span className="text-[10px] font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded-full">
              Esta sesión
            </span>
          )}
          <span className="text-xs font-medium text-gray-400">{session.username}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {session.ip && (
            <p className="text-xs text-gray-400 font-mono">{session.ip}</p>
          )}
          <p className="text-xs text-gray-300">
            Último acceso: {lastSeen}
          </p>
          {!expired && (
            <p className="text-xs text-gray-300">
              Expira: {new Date(session.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </p>
          )}
        </div>
      </div>

      {!isCurrent && !expired && canRevoke && (
        <button
          onClick={onRevoke}
          disabled={isRevoking}
          title="Cerrar sesión"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {isRevoking
            ? <Loader2 size={13} className="animate-spin" />
            : <LogOut size={13} />
          }
        </button>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
function getDeviceIcon(userAgent: string | null): React.ElementType {
  if (!userAgent) return Monitor
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone
  if (ua.includes('tablet') || ua.includes('ipad')) return Laptop
  return Monitor
}

function getDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconocido'
  const ua = userAgent.toLowerCase()
  if (ua.includes('chrome'))  return ua.includes('mobile') ? 'Chrome Mobile' : 'Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return ua.includes('mobile') ? 'Safari Mobile' : 'Safari'
  if (ua.includes('edge'))    return 'Edge'
  return 'Navegador desconocido'
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 2)   return 'ahora mismo'
  if (mins < 60)  return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  return `hace ${days} días`
}