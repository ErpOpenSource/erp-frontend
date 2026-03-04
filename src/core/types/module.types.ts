export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  permission?: string
  badge?: number
}

export interface ColumnDef {
  field: string
  label: string
  type: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'boolean'
  sortable?: boolean
  filterable?: boolean
  width?: number
  badgeOptions?: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'gray'>
}

export interface ActionDef {
  type: 'create' | 'edit' | 'delete' | 'view' | 'custom'
  label: string
  icon?: string
  permission?: string
  confirm?: boolean
  form?: string
}

export interface ViewDef {
  id: string
  label: string
  type: 'table' | 'kanban' | 'calendar' | 'custom'
  endpoint: string
  columns?: ColumnDef[]
  actions?: ActionDef[]
}

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'boolean' | 'currency' | 'repeater'
  required?: boolean
  placeholder?: string
  default?: unknown
  source?: string        // endpoint para selects dinámicos
  fields?: FieldDef[]    // para repeater
}

export interface FormDef {
  id: string
  label: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH'
  fields: FieldDef[]
}

export interface ModuleSchema {
  id: string
  label: string
  icon: string
  color: string
  navItems: NavItem[]
  views: ViewDef[]
  forms: FormDef[]
  dashboard?: DashboardSchema  
}

export type WidgetType = 'kpi' | 'chart-line' | 'chart-bar' | 'chart-donut'

export interface WidgetDef {
  id: string
  type: WidgetType
  label: string
  endpoint: string
  icon?: string
  color?: string
  span?: 1 | 2 | 3 | 4  // cuántas columnas ocupa en el grid
}

export interface DashboardSchema {
  widgets: WidgetDef[]
}

export interface PreferencesDto {
  theme: 'light' | 'dark' | 'system'
  language: string
  sidebarCollapsed: boolean
  modulePrefs: Record<string, unknown>
}