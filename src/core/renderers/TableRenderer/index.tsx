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
import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { usePreferencesStore } from '@/store/preferences.store'
import { useSearchStore } from '@/store/search.store'
import client from '@/api/client'
import type { ViewDef, ModuleSchema, ActionDef } from '@/core/types/module.types'
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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const topbarSearch = useSearchStore((s) => s.queryByPath[pathname] ?? '')
  const setSearchQuery = useSearchStore((s) => s.setQuery)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState(topbarSearch)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { getViewPreference, setViewPreference } = usePreferencesStore()

  // Preferencias del usuario para esta vista
  const prefs = getViewPreference(schema.id, view.id)
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
const stableMockData = useMemo(() => generateMockData(view), [view.id])

  // Fetch de datos desde el backend
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['table', view.endpoint, pagination, sorting, globalFilter],
  queryFn: async () => {
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        size: String(pagination.pageSize),
        ...(sorting[0] ? {
          sort: sorting[0].id,
          dir: sorting[0].desc ? 'desc' : 'asc',
        } : {}),
        ...(globalFilter ? { search: globalFilter } : {}),
      })
      const { data } = await client.get(`${view.endpoint}?${params}`)
      return data
    } catch {
      // Backend no disponible → usa mock
      return {
        content: stableMockData,
        totalElements: stableMockData.length,
        totalPages: Math.ceil(stableMockData.length / pagination.pageSize),
      }
    }
  },
  placeholderData: () => ({
    content: stableMockData,
    totalElements: stableMockData.length,
    totalPages: Math.ceil(stableMockData.length / pagination.pageSize),
  }),
  retry: false, // ← no reintenta si falla
})

  // Construye columnas de TanStack Table desde el schema
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const schemaCols = view.columns
      ?.filter((col) => visibleColumns.includes(col.field))
      .map((col): ColumnDef<any> => ({
        id: col.field,
        accessorKey: col.field,
        header: col.label,
        enableSorting: col.sortable ?? false,
        cell: ({ getValue }) => (
          <CellRenderer
            value={getValue()}
            type={col.type}
            badgeOptions={col.badgeOptions}
          />
        ),
      })) ?? []

    // Columna de acciones si hay alguna acción permitida
    const allowedActions = view.actions?.filter((a) =>
      a.permission ? hasPermission(a.permission) : true
    ) ?? []

    if (allowedActions.length > 0) {
      schemaCols.push({
        id: '_actions',
        header: '',
        enableSorting: false,
        cell: () => (
          <ActionsCell
            actions={allowedActions}
            onRefetch={refetch}
          />
        ),
      })
    }

    return schemaCols
  }, [view.columns, view.actions, visibleColumns, hasPermission])

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
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),   // ← client-side filtering
  getPaginationRowModel: getPaginationRowModel(),
  manualPagination: true,
  manualSorting: true,
  manualFiltering: false,   // ← añade esto, filtro es client-side
})


  if (error) {
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
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">

        {/* Búsqueda global */}
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

        {/* Selector de columnas visibles */}
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
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <Loader2 className="animate-spin text-gray-200 mx-auto" size={20} />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-sm text-gray-300">
                  No hay datos
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-gray-50 hover:bg-gray-50/50 transition-colors group',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
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

        {/* Selector de página size */}
        <select
          value={pagination.pageSize}
          onChange={(e) => setPagination((p) => ({ ...p, pageSize: Number(e.target.value) }))}
          className="text-xs text-gray-500 bg-transparent border border-gray-100 rounded px-1 py-0.5 outline-none"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>{size} / pág</option>
          ))}
        </select>
      </div>

    </div>
  )
}

// Renderiza cada celda según su tipo
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
      return (
        <span className="tabular-nums">{Number(value).toLocaleString('es-ES')}</span>
      )

    case 'date':
      return (
        <span className="text-gray-500">
          {new Date(String(value)).toLocaleDateString('es-ES')}
        </span>
      )

    case 'boolean':
      return (
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          value ? 'text-emerald-600' : 'text-gray-400'
        )}>
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            value ? 'bg-emerald-500' : 'bg-gray-300'
          )} />
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
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
          colorMap[colorKey]
        )}>
          {String(value)}
        </span>
      )
    }

    default:
      return <span className="truncate max-w-48 block">{String(value)}</span>
  }
}

// Botones de acciones por fila
function ActionsCell({ actions, onRefetch }: {
  actions: ActionDef[]
  onRefetch: () => void
}) {
  const iconMap: Record<string, React.ElementType> = {
    eye: Eye,
    pencil: Pencil,
    trash: Trash2,
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
      {actions.filter((a) => a.type !== 'create').map((action) => {
        const Icon = action.icon ? (iconMap[action.icon] ?? Eye) : Eye
        const isDelete = action.type === 'delete'

        return (
          <button
            key={action.type}
            title={action.label}
            onClick={() => {
              if (isDelete && action.confirm) {
                if (confirm(`¿Eliminar este registro?`)) {
                  // TODO: llamada al backend
                  onRefetch()
                }
              }
            }}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded transition-colors',
              isDelete
                ? 'hover:bg-red-50 text-gray-300 hover:text-red-500'
                : 'hover:bg-gray-100 text-gray-300 hover:text-gray-600'
            )}
          >
            <Icon size={13} />
          </button>
        )
      })}
    </div>
  )
}

// Icono de ordenación
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={12} className="text-gray-600" />
  if (sorted === 'desc') return <ChevronDown size={12} className="text-gray-600" />
  return <ChevronsUpDown size={11} className="text-gray-300" />
}

// Selector de columnas visibles
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
              <label
                key={col.field}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
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

// Genera datos mock para cuando no hay backend
function generateMockData(view: ViewDef): any[] {
  // Seed fijo para que los datos no cambien en cada render
  return Array.from({ length: 25 }, (_, i) => {
    const row: Record<string, unknown> = {}
    view.columns?.forEach((col) => {
      switch (col.type) {
        case 'text':
          row[col.field] = `${col.label} ${i + 1}`
          break
        case 'number':
          row[col.field] = (i + 1) * 10
          break
        case 'currency':
          row[col.field] = (i + 1) * 199.99
          break
        case 'date':
          row[col.field] = new Date(2024, 0, i + 1).toISOString()
          break
        case 'boolean':
          row[col.field] = i % 2 === 0
          break
        case 'badge': {
          const opts = Object.keys(col.badgeOptions ?? {})
          row[col.field] = opts[i % opts.length] ?? 'N/A'
          break
        }
        default:
          row[col.field] = `${col.label} ${i + 1}`
      }
    })
    return row
  })
}
