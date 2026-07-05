import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/clients/ClientsPage'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import EquipmentPage from './pages/equipment/EquipmentPage'
import EquipmentDetailPage from './pages/equipment/EquipmentDetailPage'
import WorkOrdersPage from './pages/work-orders/WorkOrdersPage'
import WorkOrderDetailPage from './pages/work-orders/WorkOrderDetailPage'
import ContractsPage from './pages/contracts/ContractsPage'
import SchedulingPage from './pages/scheduling/SchedulingPage'
import SparePartsPage from './pages/spare-parts/SparePartsPage'
import CatalogPage from './pages/catalog/CatalogPage'
import ReportsPage from './pages/reports/ReportsPage'
import UsersPage from './pages/users/UsersPage'
import TicketsPage from './pages/tickets/TicketsPage'
import TicketDetailPage from './pages/tickets/TicketDetailPage'
import ManualsPage from './pages/manuals/ManualsPage'
import QuotesPage from './pages/quotes/QuotesPage'
import QuoteDetailPage from './pages/quotes/QuoteDetailPage'
import MainLayout from './layouts/MainLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-white.png" alt="Dimed" className="h-12 opacity-40 animate-pulse" />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/tickets/:id" element={<TicketDetailPage />} />
                <Route path="/quotes" element={<QuotesPage />} />
                <Route path="/quotes/:id" element={<QuoteDetailPage />} />
                <Route path="/work-orders" element={<WorkOrdersPage />} />
                <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/scheduling" element={<SchedulingPage />} />
                <Route path="/spare-parts" element={<SparePartsPage />} />
                <Route path="/manuals" element={<ManualsPage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
