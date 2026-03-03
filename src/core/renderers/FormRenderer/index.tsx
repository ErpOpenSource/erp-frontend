import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { FormDef, FieldDef } from '@/core/types/module.types'
import { useTabsStore } from '@/store/tabs.store'
import { useRouterState } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  form: FormDef
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultValues?: Record<string, unknown>
  color?: string
}

// Genera schema Zod dinámicamente desde el FormDef
function buildZodSchema(fields: FieldDef[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    let schema: z.ZodTypeAny

    switch (field.type) {
case 'number':
case 'currency':
  schema = z.coerce.number().refine((v) => !isNaN(v), { message: 'Debe ser un número' })
  break
      case 'boolean':
        schema = z.boolean()
        break
      case 'date':
        schema = z.string()
        break
      case 'email':
        schema = z.string().email('Email inválido')
        break
case 'repeater':
  schema = z.array(
    buildZodSchema(field.fields ?? [])  // [] sí es FieldDef[]
  )
  break
      default:
        schema = z.string()
    }

    if (field.required) {
      if (schema instanceof z.ZodString) {
        schema = schema.min(1, `${field.label} es obligatorio`)
      }
    } else {
      schema = schema.optional()
    }

    shape[field.name] = schema
  }

  return z.object(shape)
}

// Genera valores por defecto
function buildDefaultValues(fields: FieldDef[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.default !== undefined) {
      values[field.name] = field.default === 'today'
        ? new Date().toISOString().split('T')[0]
        : field.default
    } else {
      switch (field.type) {
        case 'boolean':  values[field.name] = false; break
        case 'number':
        case 'currency': values[field.name] = ''; break
        case 'repeater': values[field.name] = []; break
        default:         values[field.name] = ''
      }
    }
  }
  return values
}

export default function FormRenderer({
  form: formDef,
  open,
  onClose,
  onSuccess,
  defaultValues,
  color = '#6366f1',
}: Props) {
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const updateTab = useTabsStore((s) => s.updateTab)
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)

  const zodSchema = buildZodSchema(formDef.fields)
  const initialValues = { ...buildDefaultValues(formDef.fields), ...defaultValues }

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialValues,
  })

  // Marca la tab como dirty cuando hay cambios sin guardar
  const currentTab = tabs.find((t) => t.id === activeTabId)
  if (currentTab && isDirty !== currentTab.isDirty) {
    updateTab(currentTab.id, { isDirty })
  }

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { data: response } = await client.request({
        method: formDef.method,
        url: formDef.endpoint,
        data,
      })
      return response
    },
    onSuccess: () => {
      // Invalida la query de la tabla para que se refresque
      queryClient.invalidateQueries({ queryKey: ['table'] })
      // Limpia el dirty de la tab
      if (currentTab) updateTab(currentTab.id, { isDirty: false })
      reset()
      onSuccess?.()
      onClose()
    },
  })

  const onSubmit = (data: any) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {formDef.label}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

          {formDef.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              register={register}
              control={control}
              error={errors[field.name]?.message as string | undefined}
              color={color}
            />
          ))}

          {/* Error global */}
          {mutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">
                Error al guardar. Inténtalo de nuevo.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Guardar
            </button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}

// Renderiza cada campo según su tipo
function FieldRenderer({
  field,
  register,
  control,
  error,
  color,
}: {
  field: FieldDef
  register: any
  control: any
  error?: string
  color: string
}) {
  const baseInputClass = cn(
    'w-full h-9 px-3 text-sm bg-white border rounded-lg outline-none transition-all',
    'focus:ring-2 focus:ring-offset-0',
    error
      ? 'border-red-300 focus:ring-red-100'
      : 'border-gray-200 focus:ring-gray-100 focus:border-gray-300'
  )

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-medium text-gray-600">
        {field.label}
        {field.required && <span className="text-red-400">*</span>}
      </label>

      {/* TEXT / EMAIL / NUMBER / CURRENCY */}
      {['text', 'email', 'number', 'currency'].includes(field.type) && (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
          placeholder={field.placeholder ?? `Introduce ${field.label.toLowerCase()}`}
          className={baseInputClass}
          step={field.type === 'currency' ? '0.01' : undefined}
          {...register(field.name)}
        />
      )}

      {/* DATE */}
      {field.type === 'date' && (
        <input
          type="date"
          className={baseInputClass}
          {...register(field.name)}
        />
      )}

      {/* TEXTAREA */}
      {field.type === 'textarea' && (
        <textarea
          placeholder={field.placeholder ?? `Introduce ${field.label.toLowerCase()}`}
          rows={3}
          className={cn(baseInputClass, 'h-auto py-2 resize-none')}
          {...register(field.name)}
        />
      )}

      {/* BOOLEAN */}
      {field.type === 'boolean' && (
        <Controller
          name={field.name}
          control={control}
          render={({ field: f }) => (
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => f.onChange(!f.value)}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors relative cursor-pointer',
                  f.value ? 'bg-gray-900' : 'bg-gray-200'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  f.value ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </div>
              <span className="text-sm text-gray-600">
                {f.value ? 'Sí' : 'No'}
              </span>
            </label>
          )}
        />
      )}

      {/* SELECT con source dinámico */}
      {field.type === 'select' && (
        <Controller
          name={field.name}
          control={control}
          render={({ field: f }) => (
            <SelectField
              field={field}
              value={f.value}
              onChange={f.onChange}
              className={baseInputClass}
              error={!!error}
            />
          )}
        />
      )}

      {/* REPEATER */}
      {field.type === 'repeater' && (
        <RepeaterField
          field={field}
          control={control}
          register={register}
          color={color}
        />
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

// Select con datos del backend
function SelectField({
  field,
  value,
  onChange,
  className,
  error,
}: {
  field: FieldDef
  value: any
  onChange: (v: any) => void
  className: string
  error: boolean
}) {
  // Si tiene source, carga las opciones del backend
  const { data: options } = useQuery({
    queryKey: ['select-options', field.source],
    queryFn: async () => {
      const { data } = await client.get(field.source!)
      return data
    },
    enabled: !!field.source,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className, error && 'border-red-300')}
    >
      <option value="">Selecciona...</option>
      {(options ?? []).map((opt: any) => (
        <option key={opt.id ?? opt.value} value={opt.id ?? opt.value}>
          {opt.nombre ?? opt.name ?? opt.label ?? opt.id}
        </option>
      ))}
    </select>
  )
}

// Campo repeater (array de subfields)
function RepeaterField({
  field,
  control,
  register,
  color,
}: {
  field: FieldDef
  control: any
  register: any
  color: string
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.name,
  })

  return (
    <div className="space-y-2">
      {fields.map((item, index) => (
        <div
          key={item.id}
          className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100"
        >
          <div className="flex-1 grid grid-cols-2 gap-2">
            {field.fields?.map((subField) => (
              <div key={subField.name} className="space-y-1">
                <label className="text-xs text-gray-400">{subField.label}</label>
                <input
                  type={subField.type === 'number' || subField.type === 'currency' ? 'number' : 'text'}
                  placeholder={subField.placeholder ?? subField.label}
                  className="w-full h-8 px-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-100"
                  {...register(`${field.name}.${index}.${subField.name}`)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors mt-4"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const empty: Record<string, unknown> = {}
          field.fields?.forEach((f) => { empty[f.name] = '' })
          append(empty)
        }}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors w-full justify-center"
      >
        <Plus size={12} />
        Añadir {field.label.toLowerCase()}
      </button>
    </div>
  )
}