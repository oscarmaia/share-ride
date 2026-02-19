import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PartnersPage } from '@/pages/PartnersPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { RidesPage } from '@/pages/RidesPage'
import { SummaryPage } from '@/pages/SummaryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="rides" element={<RidesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="summary" element={<SummaryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
