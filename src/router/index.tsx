import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ERPShell from '@/core/components/layout/ERPShell'
import ModulePage from '@/core/renderers/ModuleLoader/ModulePage'

const rootRoute = createRootRoute()

const requireAuth = () => {
  const { isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated) throw redirect({ to: '/login' })
}

const requireGuest = () => {
  const { isAuthenticated } = useAuthStore.getState()
  if (isAuthenticated) throw redirect({ to: '/dashboard' })
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    throw redirect({ to: isAuthenticated ? '/dashboard' : '/login' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: requireGuest,
  component: Login,
})

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  beforeLoad: requireAuth,
  component: ERPShell,
})

const dashboardRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/dashboard',
  component: Dashboard,
})

// ← Ahora DESPUÉS de shellRoute
const moduleRoutes = [
  { moduleId: 'SALES',      viewId: 'orders',          path: '/sales/orders' },
  { moduleId: 'SALES',      viewId: 'customers',       path: '/sales/customers' },
  { moduleId: 'SALES',      viewId: 'quotes',          path: '/sales/quotes' },
  { moduleId: 'SALES',      viewId: 'invoices',        path: '/sales/invoices' },
  { moduleId: 'INVENTORY',  viewId: 'stock',           path: '/inventory/stock' },
  { moduleId: 'INVENTORY',  viewId: 'movements',       path: '/inventory/movements' },
  { moduleId: 'INVENTORY',  viewId: 'warehouses',      path: '/inventory/warehouses' },
  { moduleId: 'PURCHASING', viewId: 'purchase-orders', path: '/purchasing/purchase-orders' },
  { moduleId: 'PURCHASING', viewId: 'suppliers',       path: '/purchasing/suppliers' },
  { moduleId: 'SETTINGS',   viewId: 'profile',         path: '/settings/profile' },
  { moduleId: 'SETTINGS',   viewId: 'users',           path: '/settings/users' },
  { moduleId: 'SETTINGS',   viewId: 'sessions',        path: '/settings/sessions' },
].map(({ moduleId, viewId, path }) =>
  createRoute({
    getParentRoute: () => shellRoute,
    path,
    component: () => <ModulePage moduleId={moduleId} viewId={viewId} />,
  })
)

// ← moduleRoutes incluido en el árbol
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  shellRoute.addChildren([
    dashboardRoute,
    ...moduleRoutes,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}