import { useState, useMemo, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { usePreferencesStore } from '@/store/preferences.store'
import { useSearchStore } from '@/store/search.store'
import client from '@/api/client'
import type { ViewDef, ModuleSchema, ActionDef, FormDef } from '@/core/types/module.types'
import FormRenderer from '@/core/renderers/FormRenderer'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Loader2,
  Search, SlidersHorizontal, Trash2,
  Pencil, Eye, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  view: ViewDef
  schema: ModuleSchema
}

export default function TableRenderer({ view, schema }: Props) {
  const pathname    = useRouterState({ select: (s) => s.location.pathname })
  const topbarSearch    = useSearchStore((s) => s.queryByPath[pathname] ?? '')
  const setSearchQuery  = useSearchStore((s) => s.setQuery)
  const queryClient     = useQueryClient()

  const [sorting, setSorting]           = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState(topbarSearch)
  const [pagination, setPagination]     = useState({ pageIndex: 0, pageSize: 25 })

  // Estado para el formulario de edición
  const [editRow, setEditRow]   = useState<Record<string, unknown> | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { getViewPreference, setViewPreference } = usePreferencesStore()

  const prefs          = getViewPreference(schema.id, view.id)
  const visibleColumns = prefs?.columns?.visible ?? view.columns?.map((c) => c.field) ?? []

  useEffect(() => {
    setGlobalFilter(topbarSearch)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [topbarSearch])

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value)
    setSearchQuery(pathname, value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  // ✅ Sin try/catch — React Query gestiona el error correctamente
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['table', view.endpoint, pagination, sorting, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        size: String(pagination.pageSize),
        ...(sorting[0] ? {
          sort: sorting[0].id,
          dir:  sorting[0].desc ? 'desc' : 'asc',
        } : {}),
        ...(globalFilter ? { search: globalFilter } : {}),
      })
      const { data } = await client.get(`${view.endpoint}?${params}`)
      return data
    },
    retry: 1,
  })

  // ✅ Mutation de delete — llama al backend
  const deleteMutation = useMutation({
    mutationFn: async (id: unknown) => {
      await client.delete(`${view.endpoint}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', view.endpoint] })
    },
  })

  // Form de edición — busca el primer form del schema con método PUT/PATCH
  const editForm: FormDef | undefined = useMemo(() => {
    return schema.forms.find((f) =>
      f.method === 'PUT' || f.method === 'PATCH'
    ) ?? (schema.forms[0]
      ? { ...schema.forms[0], method: 'PUT' as const, endpoint: view.endpoint }
      : undefined
    )
  }, [schema.forms, view.endpoint])

  // Columnas TanStack Table
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const schemaCols = view.columns
      ?.filter((col) => visibleColumns.includes(col.field))
      .map((col): ColumnDef<any> => ({
        id:          col.field,
        accessorKey: col.field,
        header:      col.label,
        enableSorting: col.sortable ?? false,
        cell: ({ getValue }) => (
          <CellRenderer
            value={getValue()}
            type={col.type}
            badgeOptions={col.badgeOptions}
          />
        ),
      })) ?? []

    const allowedActions = view.actions?.filter((a) =>
      a.type !== 'create' && (a.permission ? hasPermission(a.permission) : true)
    ) ?? []

    if (allowedActions.length > 0) {
      schemaCols.push({
        id: '_actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <ActionsCell
            row={row.original}                 // ✅ pasa el row completo
            actions={allowedActions}
            endpoint={view.endpoint}
            editForm={editForm}
            onDelete={(id) => {
              if (window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) {
                deleteMutation.mutate(id)
              }
            }}
            onEdit={(rowData) => {
              setEditRow(rowData)
              setEditOpen(true)
            }}
            isDeleting={deleteMutation.isPending}
          />
        ),
      })
    }

    return schemaCols
  }, [view.columns, view.actions, visibleColumns, hasPermission, editForm, deleteMutation.isPending])

  const table = useReactTable({
    data: data?.content ?? [],
    columns,
    pageCount: data?.totalPages ?? -1,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: (updater) => {
      const next = typeof updater === 'function' ? updater(globalFilter) : updater
      handleGlobalFilterChange(String(next ?? ''))
    },
    onPaginationChange: setPagination,
    getCoreRowModel:        getCoreRowModel(),
    getSortedRowModel:      getSortedRowModel(),
    getFilteredRowModel:    getFilteredRowModel(),
    getPaginationRowModel:  getPaginationRowModel(),
    manualPagination: true,
    manualSorting:    true,
    manualFiltering:  false,
  })

  // ── Error state ──
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <AlertCircle size={20} />
        <p className="text-sm">Error al cargar los datos</p>
        <button
          onClick={() => refetch()}
          className="text-xs underline hover:text-gray-600"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">
          <div className="relative flex-1 max-w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Buscar..."
              value={globalFilter}
              onChange={(e) => handleGlobalFilterChange(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-sm bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-gray-100 transition-all"
            />
          </div>

          <ColumnToggle
            columns={view.columns ?? []}
            visibleColumns={visibleColumns}
            onToggle={(field) => {
              const updated = visibleColumns.includes(field)
                ? visibleColumns.filter((f) => f !== field)
                : [...visibleColumns, field]
              setViewPreference(schema.id, view.id, {
                columns: { ...prefs?.columns, visible: updated, widths: {}, order: updated }
              })
            }}
          />
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 whitespace-nowrap"
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-gray-600 transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={header.column.getIsSorted()} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {(view.columns ?? []).map((col) => (
                      <td key={col.field} className="px-4 py-3">
                        <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i * col.field.length * 3) % 40}%` }} />
                      </td>
                    ))}
                    <td className="px-4 py-3 w-20">
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">
                    No hay registros que mostrar
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / paginación */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 gap-3">
          <span className="text-xs text-gray-400">
            {data?.totalElements ?? 0} resultados
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="text-xs text-gray-500 px-2">
              {pagination.pageIndex + 1} / {data?.totalPages ?? 1}
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <select
            value={pagination.pageSize}
            onChange={(e) => setPagination((p) => ({ ...p, pageSize: Number(e.target.value), pageIndex: 0 }))}
            className="text-xs text-gray-500 bg-transparent border border-gray-100 rounded px-1 py-0.5 outline-none"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size} / pág</option>
            ))}
          </select>
        </div>
      </div>

      {/* ✅ Formulario de edición — se abre con los datos de la fila seleccionada */}
      {editForm && editRow && (
        <FormRenderer
          form={{
            ...editForm,
            // El endpoint de edición lleva el id del registro
            endpoint: `${view.endpoint}/${editRow.id ?? editRow._id ?? ''}`,
          }}
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditRow(null) }}
          onSuccess={() => { setEditOpen(false); setEditRow(null) }}
          defaultValues={editRow}
          color={schema.color}
        />
      )}
    </>
  )
}

// ── Celda de acciones ─────────────────────────────────────────────────────────

function ActionsCell({
  row,
  actions,
  endpoint,
  editForm,
  onDelete,
  onEdit,
  isDeleting,
}: {
  row: Record<string, unknown>
  actions: ActionDef[]
  endpoint: string
  editForm?: FormDef
  onDelete: (id: unknown) => void
  onEdit: (row: Record<string, unknown>) => void
  isDeleting: boolean
}) {
  const iconMap: Record<string, React.ElementType> = {
    eye:    Eye,
    pencil: Pencil,
    trash:  Trash2,
  }

  const rowId = row.id ?? row._id

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
      {actions.map((action) => {
        const Icon     = action.icon ? (iconMap[action.icon] ?? Eye) : Eye
        const isDelete = action.type === 'delete'
        const isEdit   = action.type === 'edit'

        return (
          <button
            key={action.type + (action.label ?? '')}
            title={action.label}
            disabled={isDelete && isDeleting}
            onClick={() => {
              if (isDelete) {
                onDelete(rowId)
              } else if (isEdit) {
                onEdit(row)
              }
              // view → navegación a detalle (implementar si hace falta)
            }}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded transition-colors',
              isDelete
                ? 'hover:bg-red-50 text-gray-300 hover:text-red-500 disabled:opacity-40'
                : 'hover:bg-gray-100 text-gray-300 hover:text-gray-600'
            )}
          >
            {isDelete && isDeleting
              ? <Loader2 size={12} className="animate-spin" />
              : <Icon size={13} />
            }
          </button>
        )
      })}
    </div>
  )
}

// ── Renderizado de celdas ─────────────────────────────────────────────────────

function CellRenderer({ value, type, badgeOptions }: {
  value: unknown
  type: string
  badgeOptions?: Record<string, string>
}) {
  if (value === null || value === undefined) {
    return <span className="text-gray-300">—</span>
  }

  switch (type) {
    case 'currency':
      return (
        <span className="font-medium tabular-nums">
          {Number(value).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </span>
      )

    case 'number':
      return <span className="tabular-nums">{Number(value).toLocaleString('es-ES')}</span>

    case 'date':
      return (
        <span className="text-gray-500">
          {new Date(String(value)).toLocaleDateString('es-ES')}
        </span>
      )

    case 'boolean':
      return (
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', value ? 'text-emerald-600' : 'text-gray-400')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', value ? 'bg-emerald-500' : 'bg-gray-300')} />
          {value ? 'Sí' : 'No'}
        </span>
      )

    case 'badge': {
      const colorMap: Record<string, string> = {
        green:  'bg-emerald-50 text-emerald-700 border-emerald-100',
        red:    'bg-red-50 text-red-700 border-red-100',
        yellow: 'bg-amber-50 text-amber-700 border-amber-100',
        blue:   'bg-blue-50 text-blue-700 border-blue-100',
        gray:   'bg-gray-50 text-gray-600 border-gray-100',
      }
      const colorKey = badgeOptions?.[String(value)] ?? 'gray'
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', colorMap[colorKey])}>
          {String(value)}
        </span>
      )
    }

    default:
      return <span className="truncate max-w-48 block">{String(value)}</span>
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc')  return <ChevronUp size={12} className="text-gray-600" />
  if (sorted === 'desc') return <ChevronDown size={12} className="text-gray-600" />
  return <ChevronsUpDown size={11} className="text-gray-300" />
}

function ColumnToggle({ columns, visibleColumns, onToggle }: {
  columns: { field: string; label: string }[]
  visibleColumns: string[]
  onToggle: (field: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-2.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <SlidersHorizontal size={12} />
        Columnas
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg p-2 min-w-40">
            {columns.map((col) => (
              <label key={col.field} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.field)}
                  onChange={() => onToggle(col.field)}
                  className="rounded"
                />
                <span className="text-xs text-gray-600">{col.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}