import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { Table2, Plus, Loader2, AlertCircle, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleOption { id: string; label: string }
interface ViewRow { id: string; label: string; type: string; endpoint: string; sortOrder: number }
interface ViewForm { id: string; label: string; type: string; endpoint: string; sortOrder: number }

const DEFAULT_FORM: ViewForm = { id: '', label: '', type: 'table', endpoint: '', sortOrder: 0 }
const VIEW_TYPES = ['table', 'kanban', 'calendar', 'custom']

export default function ViewsAdminPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission('ROLE_ADMIN')) return null

  const queryClient = useQueryClient()
  const [moduleId, setModuleId] = useState('')
  const [modal, setModal] = useState<{ open: boolean; view?: ViewRow }>({ open: false })

  const { data: modules = [] } = useQuery<ModuleOption[]>({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data } = await client.get('/layout/api/admin/modules')
      return (data.data ?? data).map((m: any) => ({ id: m.id, label: m.label }))
    },
  })

  const { data: views = [], isLoading } = useQuery<ViewRow[]>({
    queryKey: ['admin-views', moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data } = await client.get(`/layout/api/admin/modules/${moduleId}/views`)
      return data.data ?? data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (viewId: string) => { await client.delete(`/layout/api/admin/modules/${moduleId}/views/${viewId}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-views', moduleId] }),
  })

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Vistas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tablas y vistas asociadas a cada módulo</p>
        </div>
        {moduleId && (
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Plus size={14} /> Nueva vista
          </button>
        )}
      </div>

      {/* Selector de módulo */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Módulo:</label>
        <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}
          className="h-8 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100">
          <option value="">Selecciona un módulo...</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.label}</option>)}
        </select>
      </div>

      {!moduleId && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-300">
          <Table2 size={28} /><p className="text-sm mt-2">Selecciona un módulo para ver sus vistas</p>
        </div>
      )}

      {moduleId && isLoading && (
        <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
      )}

      {moduleId && !isLoading && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Etiqueta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Orden</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {views.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No hay vistas para este módulo</td></tr>}
              {views.map((v) => (
                <tr key={v.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{v.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{v.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-48">{v.endpoint}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{v.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <ActionBtn icon={Pencil} onClick={() => setModal({ open: true, view: v })} />
                      <ActionBtn icon={Trash2} danger onClick={() => {
                        if (confirm(`¿Eliminar vista "${v.id}"?`)) deleteMutation.mutate(v.id)
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && moduleId && (
        <ViewModal
          moduleId={moduleId}
          view={modal.view}
          onClose={() => setModal({ open: false })}
          onSuccess={() => { setModal({ open: false }); queryClient.invalidateQueries({ queryKey: ['admin-views', moduleId] }) }}
        />
      )}
    </div>
  )
}

function ViewModal({ moduleId, view, onClose, onSuccess }: { moduleId: string; view?: ViewRow; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!view
  const [form, setForm] = useState<ViewForm>(view
    ? { id: view.id, label: view.label, type: view.type, endpoint: view.endpoint, sortOrder: view.sortOrder }
    : DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) await client.put(`/layout/api/admin/modules/${moduleId}/views/${view!.id}`, { label: form.label, type: form.type, endpoint: form.endpoint, sortOrder: form.sortOrder })
      else await client.post(`/layout/api/admin/modules/${moduleId}/views`, form)
    },
    onSuccess,
    onError: () => setError('Error al guardar.'),
  })

  const set = (k: keyof ViewForm) => (v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Table2 size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Editar vista' : 'Nueva vista'}</h2>
        </div>
        <div className="space-y-3">
          {!isEdit && <FieldText label="ID" value={form.id} onChange={set('id')} placeholder="orders" />}
          <FieldText label="Etiqueta" value={form.label} onChange={set('label')} placeholder="Pedidos" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select value={form.type} onChange={(e) => set('type')(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100">
              {VIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FieldText label="Endpoint" value={form.endpoint} onChange={set('endpoint')} placeholder="/api/sales/orders" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Orden</label>
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder')(Number(e.target.value))}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100" />
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!form.label || !form.endpoint || mutation.isPending}
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
