import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Settings,
  Clapperboard,
  Library,
  Boxes,
  ChartBar,
  Ellipsis,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  end?: boolean
  label: string
  short: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/', end: true, label: 'Кино-дела', short: 'Кино-дела', icon: Clapperboard },
  { to: '/collections', label: 'Фонд кино-дел', short: 'Фонд', icon: Library },
  { to: '/franchises', label: 'Франшизы', short: 'Франшизы', icon: Boxes },
  { to: '/statistics', label: 'Статистика', short: 'Статистика', icon: ChartBar },
]

export function AppLayout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [moreOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-base transition-colors hover:bg-accent hover:text-accent-foreground',
      isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground',
    )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-muted/30 px-4 pb-4 md:flex">
        <h1
          className="-mx-4 flex h-[72px] items-center gap-2 border-b px-4 text-2xl font-bold"
          title="Отдел кинодел и досье"
        >
          <img src="/okid-logo.ico" alt="ОКИД" className="h-8 w-8" />
          ОКИД
        </h1>
        <nav className="flex flex-col gap-2">
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
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

      <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map(({ to, end, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] leading-tight transition-colors',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center">{short}</span>
          </NavLink>
        ))}
        <div ref={moreRef} className="relative flex flex-1">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            title="Ещё"
            aria-label="Ещё"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            className={cn(
              'flex w-full flex-col items-center gap-1 px-1 py-2 text-[10px] leading-tight transition-colors',
              moreOpen ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Ellipsis className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center">Ещё</span>
          </button>
          {moreOpen && (
            <div
              role="menu"
              className="absolute bottom-full right-2 mb-2 w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <a
                href="/admin/"
                role="menuitem"
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                Настройки
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMoreOpen(false); logout(); navigate('/login') }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
