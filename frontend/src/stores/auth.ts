import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  setAuth: (access: string, refresh: string) => void
  logout: () => void
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  setAuth: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ isAuthenticated: false })
  },
  checkAuth: () => {
    const token = localStorage.getItem('access_token')
    if (!token) return false
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('access_token')
        set({ isAuthenticated: false })
        return false
      }
      return true
    } catch {
      return false
    }
  },
}))