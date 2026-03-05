import {
  ShoppingCart, Package, Users, Truck, BarChart2,
  Wrench, Building2, FileText, DollarSign, Settings,
  LayoutDashboard, ShieldCheck,
} from 'lucide-react'

// Mapea el id del módulo a un icono de Lucide
// Cuando el backend devuelva { icon: "shopping-cart" } usaremos esto
export const moduleIconMap: Record<string, React.ElementType> = {
  SALES:      ShoppingCart,
  INVENTORY:  Package,
  RRHH:       Users,
  LOGISTICS:  Truck,
  ANALYTICS:  BarChart2,
  MAINTENANCE: Wrench,
  ACCOUNTING: DollarSign,
  CRM:        Building2,
  PURCHASING: FileText,
  ADMIN:      ShieldCheck,
  DASHBOARD:  LayoutDashboard,
  SETTINGS:   Settings,
}

// Color por defecto por módulo hasta que venga del backend
export const moduleColorMap: Record<string, string> = {
  SALES:      '#3b82f6',
  INVENTORY:  '#10b981',
  RRHH:       '#8b5cf6',
  LOGISTICS:  '#f59e0b',
  ANALYTICS:  '#06b6d4',
  MAINTENANCE: '#ef4444',
  ACCOUNTING: '#84cc16',
  CRM:        '#ec4899',
  PURCHASING: '#f97316',
  ADMIN:      '#7c3aed',
  DASHBOARD:  '#6366f1',
  SETTINGS:   '#6b7280',
}