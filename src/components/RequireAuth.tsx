import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

export function RequireAuth() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
