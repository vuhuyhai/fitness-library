import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import ViewerPanel from './features/viewer/ViewerPanel'
import { useUIStore } from './store/useUIStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useTheme } from './contexts/ThemeContext'
import { api } from './lib/wailsApi'

const DashboardPage  = lazy(() => import('./features/dashboard/DashboardPage'))
const LibraryPage    = lazy(() => import('./features/library/LibraryPage'))
const AddDocPage     = lazy(() => import('./features/add/AddDocumentPage'))
const ImportPage     = lazy(() => import('./features/import/ImportPage'))
const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'))

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.12 } },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={PAGE_VARIANTS}
        initial="initial"
        animate="enter"
        exit="exit"
        className="flex-1 overflow-hidden flex flex-col"
      >
        <Suspense fallback={<Spinner />}>
          <Routes location={location}>
            <Route path="/"         element={<DashboardPage />} />
            <Route path="/library"  element={<LibraryPage />}   />
            <Route path="/add"      element={<AddDocPage />}     />
            <Route path="/import"   element={<ImportPage />}    />
            <Route path="/settings" element={<SettingsPage />}  />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

function AppContent() {
  const { closeViewer, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { setSettings, setAiStatus } = useSettingsStore()
  const { theme } = useTheme()

  // Load settings on boot
  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s)
      // Determine AI status
      if (!s['ai.api_key']) setAiStatus('unknown')
    }).catch(console.error)
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === 'Escape') { closeViewer(); return }
      if (!inInput) {
        if (e.key === '/') {
          e.preventDefault()
          document.getElementById('lib-search')?.focus()
        }
        if (e.key === 'g' || e.key === 'G') {
          // toggle grid/list handled via custom event
          window.dispatchEvent(new CustomEvent('toggle-view-mode'))
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeViewer])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface text-fg-primary">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay — closes sidebar when tapping outside */}
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar />
        <main className="flex-1 overflow-hidden relative flex flex-col">
          <AnimatedRoutes />
          <ViewerPanel />
        </main>
      </div>

      {/* Sonner toast portal */}
      <Toaster
        theme={theme}
        richColors
        closeButton
        position="bottom-right"
        toastOptions={{
          style: { fontSize: '14px' },
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
