import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { LayoutDashboard, Plus, Loader2, AlertCircle, Pencil, Trash2, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleRow {
  id: string
  label: string
  icon: string
  color: string
  enabled: boolean
  sortOrder: number
}

interface ModuleForm {
  id: string; label: string; icon: string; color: string; enabled: boolean; sortOrder: number
}

const DEFAULT_FORM: ModuleForm = { id: '', label: '', icon: 'box', color: '#6b7280', enabled: true, sortOrder: 0 }

export default function ModulesAdminPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission('ROLE_ADMIN')) {
    return <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400"><Shield size={24} /><p className="text-sm">Sin permisos</p></div>
  }

  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; module?: ModuleRow }>({ open: false })

  const { data: modules = [], isLoading, isError } = useQuery<ModuleRow[]>({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data } = await client.get('/layout/api/admin/modules')
      return data.data ?? data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await client.delete(`/layout/api/admin/modules/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-modules'] }),
  })

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
  if (isError) return <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400"><AlertCircle size={20} /><p className="text-sm">Error al cargar</p></div>

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Módulos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Definición de módulos del ERP y sus propiedades</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={14} /> Nuevo módulo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Etiqueta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Icono</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Color</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Orden</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {modules.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No hay módulos</td></tr>
            )}
            {modules.map((m) => (
              <tr key={m.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-600">{m.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{m.icon}</td>
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{m.color}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.sortOrder}</td>
                <td className="px-4 py-3">
                  {m.enabled
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={11} />Activo</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-gray-400"><XCircle size={11} />Desactivado</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <ActionBtn icon={Pencil} onClick={() => setModal({ open: true, module: m })} />
                    <ActionBtn icon={Trash2} danger onClick={() => {
                      if (confirm(`¿Eliminar módulo "${m.id}"? Esta acción borrará todas sus vistas, formularios y nav items.`))
                        deleteMutation.mutate(m.id)
                    }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <ModuleModal
          module={modal.module}
          onClose={() => setModal({ open: false })}
          onSuccess={() => { setModal({ open: false }); queryClient.invalidateQueries({ queryKey: ['admin-modules'] }) }}
        />
      )}
    </div>
  )
}

function ModuleModal({ module: mod, onClose, onSuccess }: { module?: ModuleRow; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!mod
  const [form, setForm] = useState<ModuleForm>(mod
    ? { id: mod.id, label: mod.label, icon: mod.icon, color: mod.color, enabled: mod.enabled ?? true, sortOrder: mod.sortOrder ?? 0 }
    : DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) await client.put(`/layout/api/admin/modules/${mod!.id}`, { label: form.label, icon: form.icon, color: form.color, enabled: form.enabled, sortOrder: form.sortOrder })
      else await client.post('/layout/api/admin/modules', form)
    },
    onSuccess,
    onError: () => setError('Error al guardar. Comprueba que el ID no esté duplicado.'),
  })

  const set = (k: keyof ModuleForm) => (v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <LayoutDashboard size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Editar módulo' : 'Nuevo módulo'}</h2>
        </div>
        <div className="space-y-3">
          {!isEdit && <FieldText label="ID (inmutable)" value={form.id} onChange={(v) => set('id')(v.toUpperCase())} placeholder="VENTAS" />}
          <FieldText label="Etiqueta" value={form.label} onChange={set('label')} placeholder="Ventas" />
          <FieldText label="Icono (nombre Lucide)" value={form.icon} onChange={set('icon')} placeholder="shopping-cart" />
          <div className="grid grid-cols-2 gap-3">
            <FieldText label="Color (hex)" value={form.color} onChange={set('color')} placeholder="#3b82f6" />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Orden</label>
              <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder')(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100" />
            </div>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled')(e.target.checked)} className="rounded" />
              <span className="text-xs text-gray-600">Módulo activo</span>
            </label>
          )}
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!form.label || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
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

function ActionBtn({ icon: Icon, onClick, danger }: { icon: React.ElementType; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('w-7 h-7 flex items-center justify-center rounded transition-colors',
      danger ? 'text-red-400 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-100')}>
      <Icon size={13} />
    </button>
  )
}
