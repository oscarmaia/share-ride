import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'text-sm px-3 py-2 rounded-md transition-colors',
          isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  )
}

export function AppShell() {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="font-semibold tracking-tight">
            RideLedger
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/partners" label="Partners" />
            <NavItem to="/rides" label="Rides" />
            <NavItem to="/payments" label="Payments" />
            <NavItem to="/summary" label="Summary" />
          </nav>
          <div className="ml-auto">
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
