import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-2 text-base transition-colors hover:bg-accent hover:text-accent-foreground',
      isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground',
    )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r bg-muted/30 px-4 pb-4 flex flex-col gap-4 overflow-y-auto">
        <h1
          className="-mx-4 flex h-[72px] items-center gap-2 px-4 text-2xl font-bold border-b"
          title="Отдел кинодел и досье"
        >
          <img src="/okid-logo.ico" alt="ОКИД" className="h-8 w-8" />
          ОКИД
        </h1>
        <nav className="flex flex-col gap-2">
          <NavLink to="/" end className={linkClass}>Кино-дела</NavLink>
          <NavLink to="/collections" className={linkClass}>Фонд кино‑дел</NavLink>
          <NavLink to="/franchises" className={linkClass}>Франшизы</NavLink>
        </nav>
        <div className="mt-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            asChild
            title="Настройки"
            aria-label="Настройки"
          >
            <a href="/admin/"><Settings /></a>
          </Button>
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