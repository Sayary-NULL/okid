import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r bg-muted/30 p-4 flex flex-col gap-4 overflow-y-auto">
        <h1
          className="flex items-center gap-2 text-2xl font-bold pb-4 border-b"
          title="Отдел кинодел и досье"
        >
          <img src="/okid-logo.ico" alt="ОКИД" className="h-8 w-8" />
          ОКИД
        </h1>
        <nav className="flex flex-col gap-2">
          <Link to="/" className="text-base hover:underline">Кино-дела</Link>
          <Link to="/collections" className="text-base hover:underline">Фонд кино‑дел</Link>
        </nav>
        <div className="mt-auto">
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login') }}>
            Выйти
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}