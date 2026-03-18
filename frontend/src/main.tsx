import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'
import './style.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { isLoggedIn, clearToken } from './lib/auth'
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
    // Determine initial shell from JWT validity
    setShell(isLoggedIn() ? 'admin' : 'user')
  }, [])

  function handleSwitchToUser() {
    setShell('user')
  }

  function handleLogout() {
    clearToken()
    setShell('user')
  }

  function handleRequestAdmin() {
    // JWT still valid → switch directly (no re-login needed)
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

  return (
    <>
      <AnimatePresence mode="wait">
        {shell === 'loading' ? (
          <motion.div key="splash" className="h-screen">
            <AppSplashScreen />
          </motion.div>
        ) : shell === 'admin' ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-screen"
          >
            <Suspense fallback={<AppSplashScreen />}>
              <AdminApp
                onSwitchToUser={handleSwitchToUser}
                onLogout={handleLogout}
              />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="user"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-screen"
          >
            <Suspense fallback={<AppSplashScreen />}>
              <UserApp onRequestAdmin={handleRequestAdmin} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login modal lives outside shell so it survives shell transitions */}
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
