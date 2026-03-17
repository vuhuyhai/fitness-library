import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { useUserProgressStore } from '../stores/useUserProgressStore'
import { api } from '../../lib/wailsApi'
import { toastWarning } from '../../lib/toast'
import UserTitleBar from './UserTitleBar'
import UserSidebar from './UserSidebar'
import UserViewerPanel from '../pages/UserViewerPanel'

interface Props {
  children: ReactNode
  onClearRole: () => void
}

export default function UserShell({ children, onClearRole }: Props) {
  const { closeViewer, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { setUnlockedDocs } = useUserProgressStore()

  // Sync unlocked docs from SQLite into localStorage on startup
  useEffect(() => {
    api.getUnlockedDocuments().then(setUnlockedDocs).catch(() => {})
  }, [])

  // Keyboard: Escape → close viewer; Ctrl+S → block download
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeViewer(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        toastWarning('📵 Tài liệu này không thể tải về. Hãy đọc trực tiếp trong app.')
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [closeViewer])

  // Block file drag-out
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => { window.removeEventListener('dragover', block); window.removeEventListener('drop', block) }
  }, [])

  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-surface text-fg-primary"
      style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
    >
      {/* User-mode anti-download CSS */}
      <style>{`
        .user-shell img { -webkit-user-drag: none !important; user-drag: none; }
        .user-shell canvas { user-select: none; }
      `}</style>

      <UserTitleBar onClearRole={onClearRole} />

      <div className="flex flex-1 overflow-hidden user-shell">
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <UserSidebar onClearRole={onClearRole} />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col">
            {children}
          </div>
          <UserViewerPanel />
        </main>
      </div>
    </div>
  )
}
