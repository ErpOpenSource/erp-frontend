import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { ShieldCheck, Loader2, AlertCircle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleItem { code: string; name: string }
interface PermItem { code: string; name: string }

// Agrupa permisos por prefijo (ej: "sales.read" → grupo "sales")
function groupPermissions(perms: PermItem[]): Record<string, PermItem[]> {
  const groups: Record<string, PermItem[]> = {}
  for (const p of perms) {
    const dot = p.code.indexOf('.')
    const group = dot >= 0 ? p.code.slice(0, dot) : 'general'
    if (!groups[group]) groups[group] = []
    groups[group].push(p)
  }
  return groups
}

export default function RolesAdminPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission('ROLE_ADMIN')) return null

  const [editRole, setEditRole] = useState<RoleItem | null>(null)

  const { data: roles = [], isLoading, isError } = useQuery<RoleItem[]>({
    queryKey: ['admin-roles-catalog'],
    queryFn: async () => { const { data } = await client.get('/auth/admin/roles'); return data.data ?? data },
  })

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
  if (isError)   return <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400"><AlertCircle size={20} /><p className="text-sm">Error al cargar roles</p></div>

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Roles</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configura qué permisos tiene cada rol del sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Nombre</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-gray-400">No hay roles</td></tr>}
            {roles.map((r) => (
              <tr key={r.code} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-gray-400" />
                    {r.code}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.name}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditRole(r)}
                      title="Editar permisos"
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 space-y-1">
        <p className="font-medium">¿Cómo funcionan los permisos?</p>
        <p>Los permisos siguen el patrón <code className="bg-amber-100 px-1 rounded">{'{modulo}.{accion}'}</code> (ej: <code className="bg-amber-100 px-1 rounded">sales.write</code>, <code className="bg-amber-100 px-1 rounded">sales.read</code>).</p>
        <p>Los roles que tienen un permiso de escritura ven los botones de edición/borrado en las tablas. Los que solo tienen <code className="bg-amber-100 px-1 rounded">*.read</code> solo pueden consultar.</p>
      </div>

      {editRole && (
        <PermissionsModal
          role={editRole}
          onClose={() => setEditRole(null)}
        />
      )}
    </div>
  )
}

function PermissionsModal({ role, onClose }: { role: RoleItem; onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: allPerms = [], isLoading: loadingPerms } = useQuery<PermItem[]>({
    queryKey: ['admin-perms-catalog'],
    queryFn: async () => { const { data } = await client.get('/auth/admin/permissions'); return data.data ?? data },
    staleTime: 60_000,
  })

  const { data: currentPerms, isLoading: loadingCurrent } = useQuery<string[]>({
    queryKey: ['admin-role-perms', role.code],
    queryFn: async () => { const { data } = await client.get(`/auth/admin/roles/${role.code}/permissions`); return data.data ?? data },
  })

  const ready = !loadingPerms && currentPerms !== undefined
  const [selected, setSelected] = useState<Set<string>>()
  const [error, setError] = useState<string | null>(null)

  const checked = selected ?? new Set(currentPerms ?? [])
  const toggle = (code: string) => {
    const next = new Set(checked); next.has(code) ? next.delete(code) : next.add(code); setSelected(next)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      await client.put(`/auth/admin/roles/${role.code}/permissions`, { codes: [...checked] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-perms', role.code] })
      onClose()
    },
    onError: () => setError('Error al guardar los permisos.'),
  })

  const groups = groupPermissions(allPerms)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">
            Permisos de <span className="font-mono text-gray-600">{role.code}</span>
          </h2>
        </div>

        {!ready ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : allPerms.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay permisos definidos en el sistema.<br />Crea permisos desde la API admin.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([group, perms]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(checked)
                      const allChecked = perms.every(p => next.has(p.code))
                      perms.forEach(p => allChecked ? next.delete(p.code) : next.add(p.code))
                      setSelected(next)
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {perms.every(p => checked.has(p.code)) ? 'Desmarcar todo' : 'Marcar todo'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {perms.map(p => (
                    <label key={p.code} className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors',
                      checked.has(p.code) ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
                    )}>
                      <input type="checkbox" checked={checked.has(p.code)} onChange={() => toggle(p.code)}
                        className="rounded accent-gray-900" />
                      <span className="truncate font-mono">{p.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!ready || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Guardar permisos
          </button>
        </div>
      </div>
    </div>
  )
}
