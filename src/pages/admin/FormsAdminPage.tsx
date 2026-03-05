import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { FileText, Plus, Loader2, AlertCircle, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleOption { id: string; label: string }
interface FormRow { id: string; label: string; endpoint: string; method: string }
interface FormForm { id: string; label: string; endpoint: string; method: string }

const DEFAULT_FORM: FormForm = { id: '', label: '', endpoint: '', method: 'POST' }
const METHODS = ['POST', 'PUT', 'PATCH']

export default function FormsAdminPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission('ROLE_ADMIN')) return null

  const queryClient = useQueryClient()
  const [moduleId, setModuleId] = useState('')
  const [modal, setModal] = useState<{ open: boolean; form?: FormRow }>({ open: false })

  const { data: modules = [] } = useQuery<ModuleOption[]>({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data } = await client.get('/layout/api/admin/modules')
      return (data.data ?? data).map((m: any) => ({ id: m.id, label: m.label }))
    },
  })

  const { data: forms = [], isLoading } = useQuery<FormRow[]>({
    queryKey: ['admin-forms', moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data } = await client.get(`/layout/api/admin/modules/${moduleId}/forms`)
      return data.data ?? data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => { await client.delete(`/layout/api/admin/modules/${moduleId}/forms/${formId}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-forms', moduleId] }),
  })

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Formularios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Formularios de creación y edición por módulo</p>
        </div>
        {moduleId && (
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Plus size={14} /> Nuevo formulario
          </button>
        )}
      </div>

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
          <FileText size={28} /><p className="text-sm mt-2">Selecciona un módulo para ver sus formularios</p>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Método</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Endpoint</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {forms.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No hay formularios para este módulo</td></tr>}
              {forms.map((f) => (
                <tr key={f.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{f.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{f.label}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      f.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
                      f.method === 'PUT' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>
                      {f.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-48">{f.endpoint}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <ActionBtn icon={Pencil} onClick={() => setModal({ open: true, form: f })} />
                      <ActionBtn icon={Trash2} danger onClick={() => {
                        if (confirm(`¿Eliminar formulario "${f.id}"?`)) deleteMutation.mutate(f.id)
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
        <FormModal
          moduleId={moduleId}
          form={modal.form}
          onClose={() => setModal({ open: false })}
          onSuccess={() => { setModal({ open: false }); queryClient.invalidateQueries({ queryKey: ['admin-forms', moduleId] }) }}
        />
      )}
    </div>
  )
}

function FormModal({ moduleId, form, onClose, onSuccess }: { moduleId: string; form?: FormRow; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!form
  const [data, setData] = useState<FormForm>(form
    ? { id: form.id, label: form.label, endpoint: form.endpoint, method: form.method }
    : DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) await client.put(`/layout/api/admin/modules/${moduleId}/forms/${form!.id}`, { label: data.label, endpoint: data.endpoint, method: data.method })
      else await client.post(`/layout/api/admin/modules/${moduleId}/forms`, data)
    },
    onSuccess,
    onError: () => setError('Error al guardar.'),
  })

  const set = (k: keyof FormForm) => (v: string) => setData(d => ({ ...d, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Editar formulario' : 'Nuevo formulario'}</h2>
        </div>
        <div className="space-y-3">
          {!isEdit && <FieldText label="ID" value={data.id} onChange={set('id')} placeholder="create-order" />}
          <FieldText label="Etiqueta" value={data.label} onChange={set('label')} placeholder="Nuevo pedido" />
          <FieldText label="Endpoint" value={data.endpoint} onChange={set('endpoint')} placeholder="/api/sales/orders" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Método HTTP</label>
            <select value={data.method} onChange={(e) => set('method')(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100">
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!data.label || !data.endpoint || mutation.isPending}
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
