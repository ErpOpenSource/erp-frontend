import { useState } from 'react'
import { useModuleSchema } from '@/core/hooks/useModuleSchema'
import { useAuthStore } from '@/store/auth.store'
import { Loader2, AlertCircle } from 'lucide-react'
import type { ViewDef, ModuleSchema } from '@/core/types/module.types'
import TableRenderer from '@/core/renderers/TableRenderer'
import FormRenderer from '@/core/renderers/FormRenderer'

interface Props {
  moduleId: string
  viewId: string
}

export default function ModulePage({ moduleId, viewId }: Props) {
  const { data: schema, isLoading, error } = useModuleSchema(moduleId)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    )
  }

  if (error || !schema) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
        <AlertCircle size={24} />
        <p className="text-sm">No se pudo cargar el módulo</p>
      </div>
    )
  }

  const view = schema.views.find((v) => v.id === viewId)

  if (!view) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
        <AlertCircle size={24} />
        <p className="text-sm">Vista no encontrada: {viewId}</p>
      </div>
    )
  }

  const createAction = view.actions?.find((a) => a.type === 'create')
  const canCreate = createAction?.permission
    ? hasPermission(createAction.permission)
    : !!createAction

  const createForm = createAction?.form
    ? schema.forms.find((f) => f.id === createAction.form)
    : schema.forms[0]

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{view.label}</h1>
          <p className="text-sm text-gray-400">{schema.label}</p>
        </div>

        {canCreate && createForm && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: schema.color }}
          >
            <span>+</span>
            {createAction?.label ?? 'Nuevo'}
          </button>
        )}
      </div>

      {/* Vista */}
      {view.type === 'table' && (
        <TableRenderer view={view} schema={schema} />
      )}

      {/* Formulario de creación */}
      {createForm && (
        <FormRenderer
          form={createForm}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          color={schema.color}
        />
      )}

    </div>
  )
}