import type { ModuleSchema } from '@/core/types/module.types'

export const mockSchemas: Record<string, ModuleSchema> = {
 DASHBOARD: {
  id: 'DASHBOARD',
  label: 'Inicio',
  icon: 'layout-dashboard',
  color: '#6366f1',
  navItems: [
    { id: 'overview', label: 'Resumen', icon: 'bar-chart-2', path: '/dashboard' },
  ],
  views: [],
  forms: [],
  dashboard: {
    widgets: [
      { id: 'total-sales', type: 'kpi', label: 'Ventas hoy', endpoint: '/sales/stats/today', icon: 'shopping-cart', color: '#3b82f6', span: 1 },
      { id: 'pending-orders', type: 'kpi', label: 'Pedidos pendientes', endpoint: '/sales/orders/pending', icon: 'clock', color: '#f59e0b', span: 1 },
      { id: 'total-stock', type: 'kpi', label: 'Productos en stock', endpoint: '/inventory/stats/stock', icon: 'package', color: '#10b981', span: 1 },
      { id: 'monthly-revenue', type: 'kpi', label: 'Ingresos del mes', endpoint: '/sales/stats/monthly-total', icon: 'trending-up', color: '#8b5cf6', span: 1 },
      { id: 'sales-chart', type: 'chart-line', label: 'Ventas últimos 30 días', endpoint: '/sales/stats/daily', color: '#3b82f6', span: 2 },
      { id: 'orders-by-status', type: 'chart-donut', label: 'Pedidos por estado', endpoint: '/sales/stats/by-status', color: '#6366f1', span: 1 },
      { id: 'stock-by-warehouse', type: 'chart-bar', label: 'Stock por almacén', endpoint: '/inventory/stats/by-warehouse', color: '#10b981', span: 1 },
    ]
  }
},
  SALES: {
    id: 'SALES',
    label: 'Ventas',
    icon: 'shopping-cart',
    color: '#3b82f6',
    navItems: [
      { id: 'orders', label: 'Pedidos', icon: 'shopping-cart', path: '/sales/orders', permission: 'sales.order.read', badge: 4 },
      { id: 'customers', label: 'Clientes', icon: 'users', path: '/sales/customers' },
      { id: 'quotes', label: 'Presupuestos', icon: 'file-text', path: '/sales/quotes' },
      { id: 'invoices', label: 'Facturas', icon: 'receipt', path: '/sales/invoices' },
    ],
    
    views: [
      {
        id: 'orders',
        label: 'Pedidos',
        type: 'table',
        endpoint: '/sales/orders',
        columns: [
          { field: 'id', label: 'Nº Pedido', type: 'text', sortable: true },
          { field: 'customer', label: 'Cliente', type: 'text', filterable: true },
          { field: 'total', label: 'Total', type: 'currency', sortable: true },
          { field: 'status', label: 'Estado', type: 'badge', badgeOptions: {
            PENDING: 'yellow',
            COMPLETED: 'green',
            CANCELLED: 'red',
          }},
          { field: 'date', label: 'Fecha', type: 'date', sortable: true },
        ],
        actions: [
            { type: 'create', label: 'Nuevo pedido', permission: 'sales.order.create', form: 'order-form' },
          { type: 'create', label: 'Nuevo pedido', permission: 'sales.order.create' },
          { type: 'view', label: 'Ver', icon: 'eye' },
          { type: 'edit', label: 'Editar', icon: 'pencil' },
          { type: 'delete', label: 'Eliminar', icon: 'trash', confirm: true },
        ],
      },
      {
        id: 'customers',
        label: 'Clientes',
        type: 'table',
        endpoint: '/sales/customers',
        columns: [
          { field: 'name', label: 'Nombre', type: 'text', sortable: true, filterable: true },
          { field: 'email', label: 'Email', type: 'text' },
          { field: 'phone', label: 'Teléfono', type: 'text' },
          { field: 'status', label: 'Estado', type: 'badge', badgeOptions: {
            ACTIVE: 'green',
            INACTIVE: 'gray',
          }},
        ],
        actions: [
          { type: 'create', label: 'Nuevo cliente' },
          { type: 'edit', label: 'Editar', icon: 'pencil' },
          { type: 'delete', label: 'Eliminar', icon: 'trash', confirm: true },
        ],
      },
    ],
    forms: [
  {
    id: 'order-form',
    label: 'Nuevo pedido',
    endpoint: '/sales/orders',
    method: 'POST',
    fields: [
      { name: 'customer', label: 'Cliente', type: 'text', required: true },
      { name: 'date', label: 'Fecha', type: 'date', required: true, default: 'today' },
      { name: 'status', label: 'Estado', type: 'select', required: true,
        source: undefined,  // cuando haya backend: '/api/sales/statuses'
      },
      { name: 'notes', label: 'Notas', type: 'textarea' },
      { name: 'lines', label: 'Líneas', type: 'repeater',
        fields: [
          { name: 'description', label: 'Descripción', type: 'text', required: true },
          { name: 'quantity', label: 'Cantidad', type: 'number', required: true },
          { name: 'price', label: 'Precio', type: 'currency', required: true },
        ]
      },
    ],
  }
],
  },
  INVENTORY: {
    id: 'INVENTORY',
    label: 'Inventario',
    icon: 'package',
    color: '#10b981',
    navItems: [
      { id: 'stock', label: 'Stock', icon: 'package', path: '/inventory/stock', permission: 'inventory.stock.read' },
      { id: 'movements', label: 'Movimientos', icon: 'arrow-right-left', path: '/inventory/movements' },
      { id: 'warehouses', label: 'Almacenes', icon: 'warehouse', path: '/inventory/warehouses' },
    ],
    views: [
      {
        id: 'stock',
        label: 'Stock',
        type: 'table',
        endpoint: '/inventory/stock',
        columns: [
          { field: 'sku', label: 'SKU', type: 'text', sortable: true },
          { field: 'name', label: 'Producto', type: 'text', filterable: true },
          { field: 'quantity', label: 'Cantidad', type: 'number', sortable: true },
          { field: 'warehouse', label: 'Almacén', type: 'text', filterable: true },
          { field: 'status', label: 'Estado', type: 'badge', badgeOptions: {
            OK: 'green',
            LOW: 'yellow',
            OUT: 'red',
          }},
        ],
        actions: [
          { type: 'custom', label: 'Ajustar stock', icon: 'sliders', permission: 'inventory.stock.adjust' },
          { type: 'view', label: 'Ver', icon: 'eye' },
        ],
      },
    ],
    forms: [],
  },
  PURCHASING: {
    id: 'PURCHASING',
    label: 'Compras',
    icon: 'file-text',
    color: '#f97316',
    navItems: [
      { id: 'purchase-orders', label: 'Órdenes de compra', icon: 'clipboard-list', path: '/purchasing/purchase-orders' },
      { id: 'suppliers', label: 'Proveedores', icon: 'building-2', path: '/purchasing/suppliers' },
    ],
    views: [
      {
        id: 'purchase-orders',
        label: 'Órdenes de compra',
        type: 'table',
        endpoint: '/purchasing/orders',
        columns: [
          { field: 'id', label: 'Nº Orden', type: 'text', sortable: true },
          { field: 'supplier', label: 'Proveedor', type: 'text', filterable: true },
          { field: 'total', label: 'Total', type: 'currency', sortable: true },
          { field: 'status', label: 'Estado', type: 'badge', badgeOptions: {
            DRAFT: 'gray',
            SENT: 'blue',
            RECEIVED: 'green',
            CANCELLED: 'red',
          }},
          { field: 'date', label: 'Fecha', type: 'date', sortable: true },
        ],
        actions: [
          { type: 'create', label: 'Nueva orden' },
          { type: 'edit', label: 'Editar', icon: 'pencil' },
          { type: 'delete', label: 'Eliminar', icon: 'trash', confirm: true },
        ],
      },
    ],
    forms: [],
  },
  SETTINGS: {
    id: 'SETTINGS',
    label: 'Ajustes',
    icon: 'settings',
    color: '#6b7280',
    navItems: [
      { id: 'profile', label: 'Mi perfil', icon: 'user', path: '/settings/profile' },
      { id: 'users', label: 'Usuarios', icon: 'users', path: '/settings/users', permission: 'admin.seats.read' },
      { id: 'sessions', label: 'Sesiones', icon: 'monitor', path: '/settings/sessions', permission: 'admin.sessions.read' },
    ],
    views: [],
    forms: [],
  },
}