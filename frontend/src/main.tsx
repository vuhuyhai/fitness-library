import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { isLoggedIn, clearToken } from './lib/auth'
import { isWails } from './lib/wailsApi'
import AppSplashScreen from './shared/components/AppSplashScreen'
import AdminLoginModal from './shared/components/AdminLoginModal'

const AdminApp = lazy(() => import('./admin/AdminApp'))
const UserApp  = lazy(() => import('./user/UserApp'))

type Shell = 'admin' | 'user' | 'loading'

function Root() {
  const [shell, setShell]          = useState<Shell>('loading')
  const [loginModalOpen, setLogin] = useState(false)

  useEffect(() => {
    // Clean up old role key from previous version
    localStorage.removeItem('fitness-library-role')
    // Wails desktop always goes to user first (no JWT); web checks JWT
    setShell((!isWails && isLoggedIn()) ? 'admin' : 'user')
  }, [])

  function handleSwitchToUser() {
    setShell('user')
  }

  function handleLogout() {
    clearToken()
    setShell('user')
  }

  function handleRequestAdmin() {
    if (isWails) {
      // Desktop: switch directly, no password needed
      setShell('admin')
      return
    }
    // Web: JWT still valid → switch directly, else prompt login
    if (isLoggedIn()) {
      setShell('admin')
    } else {
      setLogin(true)
    }
  }

  function handleLoginSuccess() {
    setLogin(false)
    setShell('admin')
  }

  if (shell === 'loading') {
    return <AppSplashScreen />
  }

  return (
    <>
      <Suspense fallback={<AppSplashScreen />}>
        {shell === 'admin'
          ? <AdminApp onSwitchToUser={handleSwitchToUser} onLogout={handleLogout} />
          : <UserApp  onRequestAdmin={handleRequestAdmin} />
        }
      </Suspense>

      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLogin(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  )
}

const container = document.getElementById('root')!
createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </React.StrictMode>
)
