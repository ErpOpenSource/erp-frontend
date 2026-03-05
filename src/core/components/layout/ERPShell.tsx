import { useState, useEffect } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import ModuleSidebar from './ModuleSidebar'
import SubNav from './SubNav'
import Topbar from './Topbar'
import TabBar from './TabBar'
import { ChevronRight } from 'lucide-react'
import { useRestoreState } from '@/core/hooks/useRestoreState'
import { useTokenRefresh } from '@/core/hooks/useTokenRefresh'
import UpdateBanner from '../UpdateBanner'
import { router } from '@/router'

function AnimatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <div key={pathname} className="page-enter min-h-full">
      <Outlet />
    </div>
  )
}

function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 768) setBreakpoint('mobile')
      else if (w < 1024) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return breakpoint
}

export default function ERPShell() {
  useRestoreState()
  useTokenRefresh()   // ✅ refresco silencioso — nunca expira en medio de la sesión

  const breakpoint = useBreakpoint()
  const [activeModule, setActiveModule] = useState<string | null>('DASHBOARD')
  const [subNavOpen, setSubNavOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (breakpoint === 'tablet') setSubNavOpen(false)
    if (breakpoint === 'desktop') setSubNavOpen(true)
  }, [breakpoint])

  const handleModuleChange = (module: string) => {
    if (module === activeModule) {
      setSubNavOpen(prev => !prev)
    } else {
      setActiveModule(module)
      setSubNavOpen(true)
    }

    if (module === 'DASHBOARD') {
      router.navigate({ to: '/dashboard' })
    }

    if (breakpoint === 'mobile') setMobileSidebarOpen(false)
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {breakpoint === 'mobile' ? (
        <Topbar
          onMenuClick={() => setMobileSidebarOpen(true)}
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
        />
      ) : (
        <div className="z-30 flex-shrink-0 border-b border-gray-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <Topbar
            onMenuClick={() => setMobileSidebarOpen(true)}
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            className="border-b border-gray-100/80 bg-transparent"
          />
          <div className="h-11 px-2 md:px-3 flex items-center">
            <TabBar className="h-9 flex-1 rounded-xl border border-gray-200/80 bg-gray-50/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
          </div>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">

        {breakpoint === 'mobile' && (
          <>
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}
            <div className={`
              fixed inset-y-0 left-0 z-50 flex
              transition-transform duration-300 ease-in-out
              ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <ModuleSidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
              {activeModule && (
                <SubNav module={activeModule} open={true} onToggle={() => setMobileSidebarOpen(false)} />
              )}
            </div>
          </>
        )}

        {breakpoint !== 'mobile' && (
          <>
            {activeModule && (
              <SubNav
                module={activeModule}
                open={subNavOpen}
                onToggle={() => setSubNavOpen(prev => !prev)}
              />
            )}

            {activeModule && !subNavOpen && (
              <button
                onClick={() => setSubNavOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-4 h-8 bg-white border border-gray-200 rounded-r-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={12} className="text-gray-400" />
              </button>
            )}
          </>
        )}

        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
          <AnimatedOutlet />
        </main>

      </div>
      <UpdateBanner />
    </div>
  )
}
