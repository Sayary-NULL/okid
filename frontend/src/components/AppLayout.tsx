import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-4">
        <h1 className="text-xl font-bold">ОКИД</h1>
        <nav className="flex flex-col gap-2">
          <Link to="/" className="text-sm hover:underline">Реестр дел</Link>
          <Link to="/collections" className="text-sm hover:underline">Коллекции</Link>
        </nav>
        <div className="mt-auto">
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login') }}>
            Выйти
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}