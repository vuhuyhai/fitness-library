import { lazy, Suspense } from 'react'
import { MemoryRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useTheme } from '../contexts/ThemeContext'
import { isWails } from '../lib/wailsApi'
import UserShell from './layout/UserShell'

const Router = isWails ? MemoryRouter : BrowserRouter

const HomePage      = lazy(() => import('./pages/Home'))
const LibraryPage   = lazy(() => import('./pages/Library'))
const BookmarksPage = lazy(() => import('./pages/Bookmarks'))
const ProgressPage  = lazy(() => import('./pages/Progress'))

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface Props {
  onClearRole: () => void
}

export default function UserApp({ onClearRole }: Props) {
  const { theme } = useTheme()

  return (
    <Router {...(isWails ? { initialEntries: ['/home'] } : {})}>
      <UserShell onClearRole={onClearRole}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/"          element={<Navigate to="/home" replace />} />
            <Route path="/home"      element={<HomePage />} />
            <Route path="/library"   element={<LibraryPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/progress"  element={<ProgressPage />} />
          </Routes>
        </Suspense>
      </UserShell>

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
