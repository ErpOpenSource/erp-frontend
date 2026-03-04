import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import {
  Users, UserPlus, Loader2, AlertCircle,
  CheckCircle2, Ban, MoreHorizontal, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  username: string
  email: string
  roles: string[]
  departments: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  lastLoginAt: string | null
}

interface LicenseInfo {
  maxSeats: number
  activeSeats: number
  enforceMode: 'HARD' | 'SOFT'
}

export default function UsersPage() {
  const hasPermission  = useAuthStore((s) => s.hasPermission)
  const queryClient    = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)

  if (!hasPermission('admin.seats.read')) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <Shield size={24} />
        <p className="text-sm">No tienes permisos para ver esta sección</p>
      </div>
    )
  }

  const { data: users = [], isLoading, isError } = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await client.get('/auth/admin/users')
      return data.data ?? data
    },
  })

  const { data: license } = useQuery<LicenseInfo>({
    queryKey: ['license-seats'],
    queryFn: async () => {
      const { data } = await client.get('/auth/admin/license')
      return data.data ?? data
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await client.patch(`/auth/admin/users/${id}/status`, { status })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

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
        <p className="text-sm">Error al cargar los usuarios</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de accesos y licencias</p>
        </div>
        {hasPermission('admin.users.create') && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <UserPlus size={14} />
            Invitar usuario
          </button>
        )}
      </div>

      {/* Barra de licencias */}
      {license && <LicenseBar license={license} />}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Último acceso</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user.username}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.roles?.[0]} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {user.departments?.join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3">
                  {hasPermission('admin.users.edit') && (
                    <UserMenu
                      user={user}
                      onToggle={() =>
                        toggleStatusMutation.mutate({
                          id: user.id,
                          status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <InviteModal onClose={() => setInviteOpen(false)} onSuccess={() => {
          setInviteOpen(false)
          queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        }} />
      )}
    </div>
  )
}

// ── Barra de licencias ────────────────────────────────────
function LicenseBar({ license }: { license: LicenseInfo }) {
  const pct  = Math.min((license.activeSeats / license.maxSeats) * 100, 100)
  const full = license.activeSeats >= license.maxSeats

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Licencias en uso</span>
        </div>
        <span className={cn('text-xs font-semibold', full ? 'text-red-500' : 'text-gray-700')}>
          {license.activeSeats} / {license.maxSeats}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', full ? 'bg-red-400' : 'bg-gray-900')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {full && license.enforceMode === 'HARD' && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <AlertCircle size={11} />
          Límite alcanzado — no se pueden iniciar nuevas sesiones
        </p>
      )}
    </div>
  )
}

// ── Modal de invitación ───────────────────────────────────
function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [username, setUsername]   = useState('')
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState('USER')
  const [error, setError]         = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      await client.post('/auth/admin/users/invite', { username, email, role })
    },
    onSuccess,
    onError: () => setError('Error al invitar al usuario. Comprueba los datos.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invitar usuario</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Nombre de usuario</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100">
              <option value="USER">Usuario</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {error && <ErrorBanner message={error} />}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!username || !email || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Invitar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Menú de acciones por usuario ──────────────────────────
function UserMenu({ user, onToggle }: { user: UserRow; onToggle: () => void }) {
  const [open, setOpen] = useState(false)
  const isActive = user.status === 'ACTIVE'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-lg shadow-lg py-1 min-w-36">
            <button
              onClick={() => { onToggle(); setOpen(false) }}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              )}
            >
              {isActive ? <Ban size={12} /> : <CheckCircle2 size={12} />}
              {isActive ? 'Suspender acceso' : 'Reactivar acceso'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────
function StatusBadge({ status }: { status: UserRow['status'] }) {
  const map = {
    ACTIVE:    'bg-emerald-50 text-emerald-700 border-emerald-100',
    INACTIVE:  'bg-gray-50 text-gray-500 border-gray-100',
    SUSPENDED: 'bg-red-50 text-red-600 border-red-100',
  }
  const labels = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', SUSPENDED: 'Suspendido' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', map[status])}>
      {labels[status]}
    </span>
  )
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = {
    ADMIN:   'bg-purple-50 text-purple-700 border-purple-100',
    MANAGER: 'bg-blue-50 text-blue-700 border-blue-100',
    USER:    'bg-gray-50 text-gray-600 border-gray-100',
  }
  const normalizedRole = role ?? 'USER'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', map[normalizedRole] ?? map['USER'])}>
      {normalizedRole}
    </span>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  )
}
