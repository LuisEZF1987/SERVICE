import { useState, useEffect, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  name: string
  href: string
  roles: string[]
  icon: ReactNode
  section?: string
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard', href: '/', section: 'PRINCIPAL',
    roles: ['ADMIN', 'COORDINATOR', 'MANAGEMENT', 'TECHNICIAN'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    name: 'Clientes', href: '/clients', section: 'GESTIÓN',
    roles: ['ADMIN', 'COORDINATOR'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/></svg>,
  },
  {
    name: 'Usuarios', href: '/users',
    roles: ['ADMIN'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  },
  {
    name: 'Catalogo', href: '/catalog',
    roles: ['ADMIN', 'COORDINATOR'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="13" y2="11"/></svg>,
  },
  {
    name: 'Equipos', href: '/equipment',
    roles: ['ADMIN', 'COORDINATOR', 'TECHNICIAN', 'CLIENT'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>,
  },
  {
    name: 'Tickets', href: '/tickets',
    roles: ['ADMIN', 'COORDINATOR', 'TECHNICIAN', 'CLIENT'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  },
  {
    name: 'Órdenes de Trabajo', href: '/work-orders',
    roles: ['ADMIN', 'COORDINATOR', 'TECHNICIAN', 'CLIENT'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>,
  },
  {
    name: 'Contratos', href: '/contracts', section: 'OPERACIONES',
    roles: ['ADMIN', 'COORDINATOR'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    name: 'Cronograma', href: '/scheduling',
    roles: ['ADMIN', 'COORDINATOR', 'TECHNICIAN'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    name: 'Manuales', href: '/manuals',
    roles: ['ADMIN', 'COORDINATOR', 'TECHNICIAN'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  },
  {
    name: 'Repuestos', href: '/spare-parts',
    roles: ['ADMIN', 'COORDINATOR'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  },
  {
    name: 'Reportes', href: '/reports', section: 'ANÁLISIS',
    roles: ['ADMIN', 'COORDINATOR', 'MANAGEMENT', 'CLIENT'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const visibleNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  )

  const getInitials = () => {
    if (!user) return '?'
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  // Get current page name for header
  const currentPage = visibleNav.find(item => item.href === location.pathname)

  let lastSection = ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <nav
        className={`fixed inset-y-0 left-0 z-sidebar overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: 'var(--sidebar-w)',
          background: 'var(--sidebar)',
          borderRight: '1px solid var(--card-border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 pb-4"
          style={{ borderBottom: '1px solid var(--card-border)' }}>
          <img src="/logo-white.png" alt="Dimed" className="h-9 max-w-[120px] object-contain" />
          <span className="text-[1.1rem] font-bold">
            <span className="text-white">Dimed</span>
            <span style={{ color: 'var(--accent)' }}>Service</span>
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-3">
          {visibleNav.map((item) => {
            const showSection = item.section && item.section !== lastSection
            if (item.section) lastSection = item.section

            const isActive = location.pathname === item.href

            return (
              <div key={item.href}>
                {showSection && (
                  <div
                    className="px-5 py-1.5 mt-2 text-[0.65rem] font-bold uppercase tracking-[0.15em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    {item.section}
                  </div>
                )}
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2.5 px-5 py-2.5 text-[0.85rem] font-medium transition-all duration-200"
                  style={{
                    color: isActive ? 'var(--accent)' : '#94a3b8',
                    background: isActive ? 'rgba(96,165,250,0.08)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? '#60a5fa' : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.borderLeftColor = '#60a5fa'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#94a3b8'
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderLeftColor = 'transparent'
                    }
                  }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {item.name}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 text-[0.7rem]"
          style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)' }}>
          DimedService v1.0
        </div>
      </nav>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Header */}
      <header
        className="fixed top-0 right-0 z-header flex items-center justify-between px-6"
        style={{
          left: 'var(--sidebar-w)',
          height: 'var(--header-h)',
          background: 'var(--header)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1"
            style={{ color: 'var(--text)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="text-[0.95rem] font-semibold hidden lg:inline">
            <span className="text-white">Dimed</span>
            <span style={{ color: 'var(--accent)' }}> {currentPage?.name || 'Service'}</span>
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <span className="text-[0.82rem] font-medium tabular-nums" style={{ color: 'var(--muted)' }}>
            {clock}
          </span>

          <div className="flex items-center gap-2">
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[0.75rem] font-bold"
              style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent)' }}
            >
              {getInitials()}
            </div>
            <div className="hidden md:block text-[0.82rem]" style={{ color: '#94a3b8' }}>
              {user?.full_name}
            </div>
          </div>

          <button
            onClick={logout}
            className="text-[0.75rem] font-semibold px-3.5 py-1.5 transition-all duration-200"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
            }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Responsive header for mobile */}
      <style>{`
        @media (max-width: 1023px) {
          header { left: 0 !important; }
        }
      `}</style>

      {/* Main Content */}
      <div
        className="lg:ml-sidebar"
        style={{ marginTop: 'var(--header-h)' }}
      >
        <div className="p-7 max-w-[1440px] mx-auto animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}
