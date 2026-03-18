import { lazy, Suspense, useEffect } from 'react'
import { MemoryRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useTheme } from '../contexts/ThemeContext'
import { useSettingsStore } from '../store/useSettingsStore'
import { api, isWails } from '../lib/wailsApi'
import AdminShell from './layout/AdminShell'

const Router = isWails ? MemoryRouter : BrowserRouter

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const LibraryPage   = lazy(() => import('../features/library/LibraryPage'))
const AddDocPage    = lazy(() => import('../features/add/AddDocumentPage'))
const ImportPage    = lazy(() => import('../features/import/ImportPage'))
const SettingsPage  = lazy(() => import('../features/settings/SettingsPage'))

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface Props {
  onClearRole: () => void
}

export default function AdminApp({ onClearRole }: Props) {
  const { setSettings, setAiStatus } = useSettingsStore()
  const { theme }                    = useTheme()

  // Load settings on boot
  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s)
      const hasKey = s['ai.api_key'] || s['ai.gemini_api_key'] || s['ai.openai_api_key']
      if (!hasKey) setAiStatus('unknown')
    }).catch(console.error)
  }, [])

  // Global shortcuts (search, grid/list toggle)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (!inInput && e.key === '/') {
        e.preventDefault()
        document.getElementById('lib-search')?.focus()
      }
      if (!inInput && (e.key === 'g' || e.key === 'G')) {
        window.dispatchEvent(new CustomEvent('toggle-view-mode'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Router {...(isWails ? { initialEntries: ['/dashboard'] } : {})}>
      <AdminShell onClearRole={onClearRole}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/library"   element={<LibraryPage isAdmin />} />
            <Route path="/add"       element={<AddDocPage />} />
            <Route path="/import"    element={<ImportPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </AdminShell>

      <Toaster
        theme={theme}
        richColors
        closeButton
        position="bottom-right"
        toastOptions={{ style: { fontSize: '14px' } }}
      />
    </Router>
  )
}
