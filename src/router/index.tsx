import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ERPShell from '@/core/components/layout/ERPShell'
import ModulePage from '@/core/renderers/ModuleLoader/ModulePage'
import ProfilePage       from '@/pages/settings/ProfilePage'
import SessionsPage      from '@/pages/settings/SessionsPage'
import LicensesPage      from '@/pages/settings/LicensesPage'
import AdminUsersPage    from '@/pages/admin/AdminUsersPage'
import DepartmentsPage   from '@/pages/admin/DepartmentsPage'
import RolesAdminPage    from '@/pages/admin/RolesAdminPage'
import ModulesAdminPage  from '@/pages/admin/ModulesAdminPage'
import ViewsAdminPage    from '@/pages/admin/ViewsAdminPage'
import FormsAdminPage    from '@/pages/admin/FormsAdminPage'

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
  component: () => <ModulePage moduleId="SETTINGS" viewId="users" />,
})

const settingsSessionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/sessions',
  component: SessionsPage,
})

const settingsLicensesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/licenses',
  component: LicensesPage,
})

// ── Rutas de Admin — solo para ROLE_ADMIN ────────────────────────────────────
const adminRoutes = [
  { path: '/admin/users',       component: AdminUsersPage },
  { path: '/admin/sessions',    component: SessionsPage },
  { path: '/admin/licenses',    component: LicensesPage },
  { path: '/admin/departments', component: DepartmentsPage },
  { path: '/admin/roles',       component: RolesAdminPage },
  { path: '/admin/modules',     component: ModulesAdminPage },
  { path: '/admin/views',       component: ViewsAdminPage },
  { path: '/admin/forms',       component: FormsAdminPage },
].map(({ path, component }) =>
  createRoute({ getParentRoute: () => shellRoute, path, component })
)

// ── Árbol de rutas ────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  shellRoute.addChildren([
    dashboardRoute,
    ...moduleRoutes,
    ...adminRoutes,
    settingsProfileRoute,
    settingsUsersRoute,
    settingsSessionsRoute,
    settingsLicensesRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
