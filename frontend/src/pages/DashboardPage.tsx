import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats/').then(r => r.data),
  })

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
            Bienvenido, {user?.first_name}
          </h1>
          <p className="text-[0.8rem] mt-1" style={{ color: 'var(--muted)' }}>
            Panel de control — DimedService
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={user?.role || ''} label={user?.role_display || ''} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="OT ABIERTAS" value={stats?.ot_open ?? '\u2014'} color="#60a5fa" />
        <StatCard label="PENDIENTES FIRMA" value={stats?.ot_pending_signature ?? '\u2014'} color="#f97316" />
        <StatCard label="EQUIPOS ACTIVOS" value={stats?.equipment_active ?? '\u2014'} color="#10b981" />
        <StatCard label="CONTRATOS VIGENTES" value={stats?.contracts_active ?? '\u2014'} color="#a855f7" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
        {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
          <Card title="Acciones Rápidas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ActionButton label="Nueva OT" href="/work-orders" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              } />
              <ActionButton label="Registrar Cliente" href="/clients" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              } />
              <ActionButton label="Agregar Equipo" href="/equipment" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/></svg>
              } />
              <ActionButton label="Ver Cronograma" href="/scheduling" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              } />
            </div>
          </Card>
        )}

        {user?.role === 'TECHNICIAN' && (
          <Card title="Mis Tareas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ActionButton label="Mis OT del día" href="/work-orders" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              } />
              <ActionButton label="Ver Cronograma" href="/scheduling" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
              } />
            </div>
          </Card>
        )}

        <Card title="Actividad Reciente">
          <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--muted)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-3 opacity-40">
              <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
            </svg>
            <p className="text-[0.82rem]">Sin actividad reciente</p>
          </div>
        </Card>
      </div>

      {/* Upcoming / Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <Card title="Mantenimientos Próximos" className="lg:col-span-2">
          <EmptyState message="No hay mantenimientos programados esta semana" />
        </Card>
        <Card title="Alertas">
          <EmptyState message="Sin alertas pendientes" />
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      className="text-center p-[18px] transition-all duration-300 cursor-default"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}33`
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--card-border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        className="text-[1.6rem] font-extrabold"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {value}
      </div>
      <div className="text-[0.7rem] mt-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`transition-all duration-300 ${className}`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[1rem] font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function ActionButton({ label, href, icon }: { label: string; href: string; icon: React.ReactNode }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-2.5 px-4 py-3 text-[0.82rem] font-medium transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--card-border)',
        borderRadius: '10px',
        color: '#94a3b8',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(96,165,250,0.08)'
        e.currentTarget.style.borderColor = 'rgba(96,165,250,0.2)'
        e.currentTarget.style.color = '#60a5fa'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = 'var(--card-border)'
        e.currentTarget.style.color = '#94a3b8'
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </Link>
  )
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: 'rgba(239,68,68,0.12)', text: '#f87171' },
    COORDINATOR: { bg: 'rgba(168,85,247,0.12)', text: '#a855f7' },
    TECHNICIAN: { bg: 'rgba(249,115,22,0.12)', text: '#fb923c' },
    MANAGEMENT: { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' },
    CLIENT: { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  }
  const c = colors[role] || colors.CLIENT
  return (
    <span
      className="inline-block px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider"
      style={{ background: c.bg, color: c.text, borderRadius: '20px' }}
    >
      {label}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--muted)' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-2 opacity-40">
        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/>
      </svg>
      <p className="text-[0.82rem]">{message}</p>
    </div>
  )
}
