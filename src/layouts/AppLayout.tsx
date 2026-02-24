import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import {
  LayoutDashboard,
  Leaf,
  Sprout,
  CalendarDays,
  BookOpen,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/gardens', icon: Leaf, label: 'Gardens' },
  { to: '/plants', icon: Sprout, label: 'Plants' },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const initials = user ? getInitials(user.name) : '?'

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Wordmark */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary">
            <Sprout className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
            loam
          </span>
          <button
            className="ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 pt-0">
          <Separator className="mb-3" />
          <p className="px-3 text-[11px] tracking-wide text-muted-foreground/50">
            garden.willms.co
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          {/* Mobile hamburger */}
          <button
            className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile wordmark */}
          <span className="font-serif text-xl font-semibold tracking-tight text-foreground lg:hidden">
            loam
          </span>

          <div className="flex-1" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate sm:block">
                  {user?.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">{user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
