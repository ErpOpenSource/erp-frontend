import { useState, useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import ModuleSidebar from './ModuleSidebar'
import SubNav from './SubNav'
import Topbar from './Topbar'
import TabBar from './TabBar'
import { ChevronRight } from 'lucide-react'
import { useRestoreState } from '@/core/hooks/useRestoreState'
import UpdateBanner from '../UpdateBanner'

// Hook para detectar tamaño de pantalla
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
  const breakpoint = useBreakpoint()
  const [activeModule, setActiveModule] = useState<string | null>('DASHBOARD')
  const [subNavOpen, setSubNavOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // En tablet el subnav empieza cerrado
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
    // En móvil cerramos el drawer al seleccionar módulo
    if (breakpoint === 'mobile') setMobileSidebarOpen(false)
  }

  return (
 <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
      {/* TabBar — solo en tablet y desktop */}
      {breakpoint !== 'mobile' && <TabBar />}

      {/* Cuerpo principal */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── MÓVIL: overlay drawer ── */}
        {breakpoint === 'mobile' && (
          <>
            {/* Backdrop */}
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}

            {/* Drawer */}
            <div className={`
              fixed inset-y-0 left-0 z-50 flex
              transition-transform duration-300 ease-in-out
              ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <ModuleSidebar
                activeModule={activeModule}
                onModuleChange={handleModuleChange}
              />
              {activeModule && (
                <SubNav
                  module={activeModule}
                  open={true}
                  onToggle={() => setMobileSidebarOpen(false)}
                />
              )}
            </div>
          </>
        )}

        {/* ── TABLET y DESKTOP: layout fijo ── */}
        {breakpoint !== 'mobile' && (
          <>
            <ModuleSidebar
              activeModule={activeModule}
              onModuleChange={handleModuleChange}
            />

            {activeModule && (
              <SubNav
                module={activeModule}
                open={subNavOpen}
                onToggle={() => setSubNavOpen(prev => !prev)}
              />
            )}

            {/* Botón reabrir subnav */}
            {activeModule && !subNavOpen && (
              <button
                onClick={() => setSubNavOpen(true)}
                className="absolute left-16 top-1/2 -translate-y-1/2 z-20 w-4 h-8 bg-white border border-gray-200 rounded-r-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={12} className="text-gray-400" />
              </button>
            )}
          </>
        )}

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 page-enter">
          <Outlet />
        </main>

      </div>
       <UpdateBanner />
    </div>
  )
}
