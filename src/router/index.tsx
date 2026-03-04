import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ERPShell from '@/core/components/layout/ERPShell'
import ModulePage from '@/core/renderers/ModuleLoader/ModulePage'
import ProfilePage  from '@/pages/settings/ProfilePage'
import UsersPage    from '@/pages/settings/UsersPage'
import SessionsPage from '@/pages/settings/SessionsPage'

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

// ── Rutas de módulos genéricos (TableRenderer / FormRenderer) ─────────────────
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
].map(({ moduleId, viewId, path }) =>
  createRoute({
    getParentRoute: () => shellRoute,
    path,
    component: () => <ModulePage moduleId={moduleId} viewId={viewId} />,
  })
)

// ── Rutas de Settings — páginas custom, no genéricas ──────────────────────────
const settingsProfileRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/profile',
  component: ProfilePage,
})

const settingsUsersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/users',
  component: UsersPage,
})

const settingsSessionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/sessions',
  component: SessionsPage,
})

// ── Árbol de rutas ────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  shellRoute.addChildren([
    dashboardRoute,
    ...moduleRoutes,
    settingsProfileRoute,
    settingsUsersRoute,
    settingsSessionsRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}