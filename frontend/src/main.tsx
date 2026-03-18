import React, { lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { ThemeProvider } from './contexts/ThemeContext'
import RoleSelector from './RoleSelector'

const AdminApp = lazy(() => import('./admin/AdminApp'))
const UserApp  = lazy(() => import('./user/UserApp'))

type Role = 'admin' | 'user' | null

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Root() {
  const [role, setRole] = useState<Role>(() => {
    const saved = localStorage.getItem('fitness-library-role')
    return (saved === 'admin' || saved === 'user') ? saved : null
  })

  function handleSelect(r: 'admin' | 'user', remember: boolean) {
    if (remember) localStorage.setItem('fitness-library-role', r)
    setRole(r)
  }

  function handleClearRole() {
    localStorage.removeItem('fitness-library-role')
    setRole(null)
  }

  if (role === null) return <RoleSelector onSelect={handleSelect} />

  return (
    <Suspense fallback={<Spinner />}>
      {role === 'admin'
        ? <AdminApp onClearRole={handleClearRole} />
        : <UserApp  onClearRole={handleClearRole} />
      }
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </React.StrictMode>
)
