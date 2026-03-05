import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import {
  Users, Loader2, AlertCircle, KeyRound, CheckCircle2, XCircle, Lock,
  Shield, Plus, UserPlus, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRow { id: string; username: string; email: string | null; status: string; createdAt: string }
interface CodeName { code: string; name: string }
interface DeptItem { id: string; code: string; name: string }
interface UserAccess { userId: string; roles: string[]; modules: string[]; departments: string[]; permissions: string[] }

const STATUS_BADGE: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  ACTIVE:    { label: 'Activo',      icon: CheckCircle2, cls: 'text-emerald-600' },
  LOCKED:    { label: 'Bloqueado',   icon: Lock,         cls: 'text-amber-500'  },
  SUSPENDED: { label: 'Suspendido',  icon: XCircle,      cls: 'text-orange-500' },
  DISABLED:  { label: 'Desactivado', icon: XCircle,      cls: 'text-gray-400'   },
}

// ── Catálogos compartidos ──────────────────────────────────────────────────────
function useCatalogs() {
  const roles = useQuery<CodeName[]>({
    queryKey: ['admin-roles-catalog'],
    queryFn: async () => { const { data } = await client.get('/auth/admin/roles'); return data.data ?? data },
    staleTime: 60_000,
  })
  const modules = useQuery<CodeName[]>({
    queryKey: ['admin-modules-catalog'],
    queryFn: async () => { const { data } = await client.get('/auth/admin/modules'); return data.data ?? data },
    staleTime: 60_000,
  })
  const depts = useQuery<DeptItem[]>({
    queryKey: ['admin-depts-catalog'],
    queryFn: async () => { const { data } = await client.get('/auth/admin/departments'); return data.data ?? data },
    staleTime: 60_000,
  })
  return { roles: roles.data ?? [], modules: modules.data ?? [], depts: depts.data ?? [] }
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission('ROLE_ADMIN')) return null

  const queryClient = useQueryClient()
  const [accessModal, setAccessModal] = useState<UserRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: users = [], isLoading, isError } = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await client.get('/auth/admin/users'); return data.data ?? data },
  })

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
  if (isError)   return <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400"><AlertCircle size={20} /><p className="text-sm">Error al cargar usuarios</p></div>

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de accesos, roles y módulos por usuario</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Creado</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No hay usuarios</td></tr>}
            {users.map((u) => {
              const badge = STATUS_BADGE[u.status] ?? STATUS_BADGE['DISABLED']
              const BadgeIcon = badge.icon
              return (
                <tr key={u.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 text-xs', badge.cls)}>
                      <BadgeIcon size={11} />{badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('es-ES')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <ActionBtn icon={KeyRound} title="Editar acceso" color="indigo" onClick={() => setAccessModal(u)} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {accessModal && (
        <AccessModal
          user={accessModal}
          onClose={() => setAccessModal(null)}
          onSuccess={() => { setAccessModal(null); queryClient.invalidateQueries({ queryKey: ['admin-users'] }) }}
        />
      )}

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-users'] }) }}
        />
      )}
    </div>
  )
}

// ── Modal: Crear usuario ──────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { roles, modules, depts } = useCatalogs()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(['USER']))
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      await client.post('/auth/admin/users', {
        username: form.username.trim(),
        email: form.email.trim() || null,
        password: form.password,
        roles: [...selectedRoles],
        modules: [...selectedModules],
        departments: [...selectedDepts],
      })
    },
    onSuccess,
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'Error al crear el usuario.'
      setError(msg)
    },
  })

  const setF = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, code: string) => {
    const next = new Set(set); next.has(code) ? next.delete(code) : next.add(code); setter(next)
  }

  const valid = form.username.trim().length >= 3 && form.password.length >= 6

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Nuevo usuario</h2>
        </div>

        <div className="space-y-4">
          {/* Datos básicos */}
          <div className="space-y-3">
            <FieldText label="Usuario *" value={form.username} onChange={setF('username')} placeholder="john.doe" />
            <FieldText label="Email" value={form.email} onChange={setF('email')} placeholder="john@empresa.com" />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setF('password')(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-9 px-3 pr-9 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>

          <hr className="border-gray-50" />

          {/* Roles */}
          <Section title="Roles" icon={<Shield size={12} />}>
            {roles.map(r => (
              <CheckItem key={r.code} label={`${r.code} — ${r.name}`}
                checked={selectedRoles.has(r.code)}
                onChange={() => toggle(selectedRoles, setSelectedRoles, r.code)} />
            ))}
          </Section>

          {/* Módulos */}
          <Section title="Módulos" icon={<Users size={12} />}>
            {modules.map(m => (
              <CheckItem key={m.code} label={`${m.code} — ${m.name}`}
                checked={selectedModules.has(m.code)}
                onChange={() => toggle(selectedModules, setSelectedModules, m.code)} />
            ))}
          </Section>

          {/* Departamentos */}
          {depts.length > 0 && (
            <Section title="Departamentos" icon={<Users size={12} />}>
              {depts.map(d => (
                <CheckItem key={d.code} label={`${d.code} — ${d.name}`}
                  checked={selectedDepts.has(d.code)}
                  onChange={() => toggle(selectedDepts, setSelectedDepts, d.code)} />
              ))}
            </Section>
          )}

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!valid || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Editar acceso ──────────────────────────────────────────────────────
function AccessModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const { roles: allRoles, modules: allModules, depts: allDepts } = useCatalogs()

  const { data: access, isLoading: loadingAccess } = useQuery<UserAccess>({
    queryKey: ['admin-user-access', user.id],
    queryFn: async () => { const { data } = await client.get(`/auth/admin/users/${user.id}/access`); return data.data ?? data },
  })

  const ready = !!access && !loadingAccess
  const [selectedRoles,   setSelectedRoles]   = useState<Set<string>>()
  const [selectedModules, setSelectedModules] = useState<Set<string>>()
  const [selectedDepts,   setSelectedDepts]   = useState<Set<string>>()
  const [error, setError] = useState<string | null>(null)

  const roles   = selectedRoles   ?? new Set(access?.roles ?? [])
  const modules = selectedModules ?? new Set(access?.modules ?? [])
  const depts   = selectedDepts   ?? new Set(access?.departments ?? [])

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, code: string) => {
    const next = new Set(set); next.has(code) ? next.delete(code) : next.add(code); setter(next)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        client.put(`/auth/admin/users/${user.id}/roles`,       { codes: [...roles] }),
        client.put(`/auth/admin/users/${user.id}/modules`,     { codes: [...modules] }),
        client.put(`/auth/admin/users/${user.id}/departments`, { codes: [...depts] }),
      ])
    },
    onSuccess,
    onError: () => setError('Error al guardar los cambios.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">Acceso de <span className="text-indigo-600">{user.username}</span></h2>
        </div>

        {!ready ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : (
          <div className="space-y-5">
            <Section title="Roles" icon={<Shield size={12} />}>
              {allRoles.map(r => (
                <CheckItem key={r.code} label={`${r.code} — ${r.name}`}
                  checked={roles.has(r.code)}
                  onChange={() => toggle(roles, setSelectedRoles, r.code)} />
              ))}
            </Section>
            <Section title="Módulos" icon={<Users size={12} />}>
              {allModules.map(m => (
                <CheckItem key={m.code} label={`${m.code} — ${m.name}`}
                  checked={modules.has(m.code)}
                  onChange={() => toggle(modules, setSelectedModules, m.code)} />
              ))}
            </Section>
            <Section title="Departamentos" icon={<Users size={12} />}>
              {allDepts.length === 0
                ? <p className="text-xs text-gray-400">Sin departamentos definidos</p>
                : allDepts.map(d => (
                  <CheckItem key={d.code} label={`${d.code} — ${d.name}`}
                    checked={depts.has(d.code)}
                    onChange={() => toggle(depts, setSelectedDepts, d.code)} />
                ))
              }
            </Section>
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!ready || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Guardar acceso
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn(
      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors',
      checked ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
    )}>
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded accent-indigo-600" />
      <span className="truncate">{label}</span>
    </label>
  )
}

function FieldText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100 transition" />
    </div>
  )
}

function ActionBtn({ icon: Icon, title, color = 'gray', onClick }: { icon: React.ElementType; title: string; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className={cn(
      'w-7 h-7 flex items-center justify-center rounded transition-colors text-gray-400',
      color === 'indigo' ? 'hover:bg-indigo-50 hover:text-indigo-600' : 'hover:bg-gray-100'
    )}>
      <Icon size={13} />
    </button>
  )
}
