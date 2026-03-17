import { create } from 'zustand'

type Role = 'admin' | 'user'

interface RoleStore {
  currentRole: Role | null
  setRole: (role: Role, remember?: boolean) => void
  clearRole: () => void
}

export const useRoleStore = create<RoleStore>((set) => ({
  currentRole: (localStorage.getItem('fitness-library-role') as Role | null) ?? null,

  setRole: (role, remember = false) => {
    if (remember) localStorage.setItem('fitness-library-role', role)
    set({ currentRole: role })
  },

  clearRole: () => {
    localStorage.removeItem('fitness-library-role')
    set({ currentRole: null })
  },
}))
