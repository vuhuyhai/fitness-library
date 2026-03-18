import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useUIStore } from '../../store/useUIStore'
import AdminTitleBar from './AdminTitleBar'
import AdminSidebar from './AdminSidebar'
import ViewerPanel from '../../features/viewer/ViewerPanel'

interface Props {
  children: ReactNode
  onClearRole: () => void
}

export default function AdminShell({ children, onClearRole }: Props) {
  const { closeViewer, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  // Escape closes viewer
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeViewer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeViewer])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface text-fg-primary">
      <AdminTitleBar onClearRole={onClearRole} />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <AdminSidebar onClearRole={onClearRole} />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col">
            {children}
          </div>
          <ViewerPanel />
        </main>
      </div>
    </div>
  )
}
