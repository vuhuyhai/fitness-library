import React, { lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { ThemeProvider } from './contexts/ThemeContext'
import RoleSelector from './RoleSelector'
import { isWails } from './lib/wailsApi'
import { isLoggedIn } from './lib/auth'
import LoginPage from './features/auth/LoginPage'

// Lazy-load shells để tách bundle
const AdminApp = lazy(() => import('./admin/AdminApp'))
const UserApp  = lazy(() => import('./user/UserApp'))

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

type Role = 'admin' | 'user'

function Root() {
  const [role, setRole] = useState<Role | null>(
    () => localStorage.getItem('fitness-library-role') as Role | null
  )
  // Web-only: track whether admin is authenticated
  const [authed, setAuthed] = useState(() => isWails || isLoggedIn())

  function handleSelect(r: Role, remember: boolean) {
    if (remember) localStorage.setItem('fitness-library-role', r)
    setRole(r)
  }

  function handleClearRole() {
    localStorage.removeItem('fitness-library-role')
    setRole(null)
  }

  // Web admin requires login
  if (!isWails && role === 'admin' && !authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />
  }

  if (!role) {
    return <RoleSelector onSelect={handleSelect} />
  }

  return (
    <Suspense fallback={<Spinner />}>
      {role === 'admin'
        ? <AdminApp onClearRole={handleClearRole} />
        : <UserApp  onClearRole={handleClearRole} />
      }
    </Suspense>
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
