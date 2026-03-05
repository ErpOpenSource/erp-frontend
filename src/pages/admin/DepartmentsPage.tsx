import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { Building2, Plus, Loader2, AlertCircle, Pencil, Trash2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Department {
  id: string
  code: string
  name: string
  createdAt: string
}

interface DeptForm { code: string; name: string }

export default function DepartmentsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission('ROLE_ADMIN')) {
    return <NoAccess />
  }

  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; dept?: Department }>({ open: false })

  const { data: departments = [], isLoading, isError } = useQuery<Department[]>({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const { data } = await client.get('/auth/admin/departments')
      return data.data ?? data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await client.delete(`/auth/admin/departments/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-departments'] }),
  })

  if (isLoading) return <Loading />
  if (isError) return <ErrorState />

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Departamentos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de departamentos organizativos</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} /> Nuevo departamento
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Creado</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400">No hay departamentos</td></tr>
            )}
            {departments.map((dept) => (
              <tr key={dept.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-700">
                    {dept.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{dept.name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(dept.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <ActionBtn icon={Pencil} onClick={() => setModal({ open: true, dept })} />
                    <ActionBtn icon={Trash2} danger onClick={() => {
                      if (confirm(`¿Eliminar "${dept.name}"?`)) deleteMutation.mutate(dept.id)
                    }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <DeptModal
          dept={modal.dept}
          onClose={() => setModal({ open: false })}
          onSuccess={() => {
            setModal({ open: false })
            queryClient.invalidateQueries({ queryKey: ['admin-departments'] })
          }}
        />
      )}
    </div>
  )
}

function DeptModal({ dept, onClose, onSuccess }: { dept?: Department; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<DeptForm>({ code: dept?.code ?? '', name: dept?.name ?? '' })
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!dept

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) await client.put(`/auth/admin/departments/${dept!.id}`, form)
      else await client.post('/auth/admin/departments', form)
    },
    onSuccess,
    onError: () => setError('Error al guardar. Comprueba que el código no esté duplicado.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Editar departamento' : 'Nuevo departamento'}</h2>
        </div>
        <div className="space-y-3">
          <Field label="Código" value={form.code} onChange={(v) => setForm(f => ({ ...f, code: v.toUpperCase() }))} placeholder="VENTAS" />
          <Field label="Nombre" value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Departamento de ventas" />
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.code || !form.name || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
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

function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
      <Shield size={24} /><p className="text-sm">No tienes permisos para ver esta sección</p>
    </div>
  )
}
function Loading() {
  return <div className="flex items-center justify-center h-48"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
}
function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
      <AlertCircle size={20} /><p className="text-sm">Error al cargar los departamentos</p>
    </div>
  )
}
