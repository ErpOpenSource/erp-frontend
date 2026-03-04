import { useQuery } from '@tanstack/react-query'
import client from '@/api/client'
import type { WidgetDef, DashboardSchema } from '@/core/types/module.types'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import * as LucideIcons from 'lucide-react'
import { TrendingUp, TrendingDown, Loader2, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  dashboard: DashboardSchema
}

export default function DashboardRenderer({ dashboard }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4 auto-rows-auto">
      {dashboard.widgets.map((widget) => (
        <div
          key={widget.id}
          className={cn(
            'col-span-4',
            widget.span === 1 && 'sm:col-span-2 lg:col-span-1',
            widget.span === 2 && 'sm:col-span-2 lg:col-span-2',
            widget.span === 3 && 'sm:col-span-2 lg:col-span-3',
            widget.span === 4 && 'col-span-4',
          )}
        >
          <WidgetRenderer widget={widget} />
        </div>
      ))}
    </div>
  )
}

function WidgetRenderer({ widget }: { widget: WidgetDef }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['widget', widget.id, widget.endpoint],
    queryFn: async () => {
      // Sin try/catch — React Query gestiona el estado de error correctamente
      const { data } = await client.get(widget.endpoint)
      return data
    },
    refetchInterval: 1000 * 60,
    retry: 1,
  })

  // Fallback a mock SOLO cuando hay error confirmado por React Query
  const displayData = isError ? getMockData(widget) : data
  const isMock = isError

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 h-32 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-gray-200" />
      </div>
    )
  }

  switch (widget.type) {
    case 'kpi':         return <KPIWidget widget={widget} data={displayData} isMock={isMock} />
    case 'chart-line':  return <LineChartWidget widget={widget} data={displayData} isMock={isMock} />
    case 'chart-bar':   return <BarChartWidget widget={widget} data={displayData} isMock={isMock} />
    case 'chart-donut': return <DonutChartWidget widget={widget} data={displayData} isMock={isMock} />
    default:            return null
  }
}

// ── Badge de datos de demo ─────────────────────────────────
function MockBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
      <WifiOff size={9} />
      Sin datos
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────
function KPIWidget({ widget, data, isMock }: { widget: WidgetDef; data: any; isMock: boolean }) {
  const Icon = getIcon(widget.icon ?? 'bar-chart-2')
  const value = data?.value ?? 0
  const trend = data?.trend as 'up' | 'down' | undefined
  const delta = data?.delta as string | undefined
  const prev  = data?.previousLabel as string | undefined

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${widget.color}18` }}
        >
          <Icon size={16} style={{ color: widget.color }} />
        </div>

        <div className="flex items-center gap-2">
          {isMock && <MockBadge />}
          {!isMock && trend && delta && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend === 'up' ? 'text-emerald-500' : 'text-red-400'
            )}>
              {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {delta}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{widget.label}</p>
        {prev && <p className="text-xs text-gray-300 mt-0.5">{prev}</p>}
      </div>
    </div>
  )
}

// ── Line Chart ────────────────────────────────────────────
function LineChartWidget({ widget, data, isMock }: { widget: WidgetDef; data: any; isMock: boolean }) {
  const series = data?.series ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-700">{widget.label}</p>
        {isMock && <MockBadge />}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={series} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              border: '1px solid #f3f4f6',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={widget.color ?? '#3b82f6'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────
function BarChartWidget({ widget, data, isMock }: { widget: WidgetDef; data: any; isMock: boolean }) {
  const series = data?.series ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-700">{widget.label}</p>
        {isMock && <MockBadge />}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={series} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              border: '1px solid #f3f4f6',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
            cursor={{ fill: `${widget.color}10` }}
          />
          <Bar dataKey="value" fill={widget.color ?? '#10b981'} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────
const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

function DonutChartWidget({ widget, data, isMock }: { widget: WidgetDef; data: any; isMock: boolean }) {
  const series = data?.series ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{widget.label}</p>
        {isMock && <MockBadge />}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={series}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {series.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              border: '1px solid #f3f4f6',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
function getIcon(name: string): React.ElementType {
  const formatted = name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
  return (LucideIcons as any)[formatted] ?? LucideIcons.BarChart2
}

function getMockData(widget: WidgetDef) {
  switch (widget.type) {
    case 'kpi':
      return {
        value: 0,
        trend: undefined,
        delta: undefined,
        previousLabel: 'Sin conexión con el servidor',
      }
    case 'chart-line':
    case 'chart-bar':
      return { series: [] }
    case 'chart-donut':
      return { series: [] }
    default:
      return {}
  }
}