import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { schedulingApi, ScheduledMaintenance } from '../../api/scheduling'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/Badge'

// --- Constants ---

const statusFilterOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'OVERDUE', label: 'Vencido' },
]

// --- Helpers ---

function formatDate(iso: string): string {
  if (!iso) return '--'
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

// --- Component ---

export default function SchedulingPage() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['scheduling', statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      return schedulingApi.list(Object.keys(params).length > 0 ? params : undefined)
    },
    select: (res) => res.data.results,
  })

  // Table columns
  const columns = [
    {
      key: 'scheduled_date',
      header: 'Fecha Programada',
      render: (m: ScheduledMaintenance) => (
        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{formatDate(m.scheduled_date)}</span>
      ),
    },
    {
      key: 'equipment_code',
      header: 'Codigo Equipo',
      render: (m: ScheduledMaintenance) => (
        <span style={{ fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.82rem' }}>
          {m.equipment_code}
        </span>
      ),
    },
    {
      key: 'equipment_description',
      header: 'Equipo',
    },
    {
      key: 'client_name',
      header: 'Cliente',
    },
    {
      key: 'frequency_display',
      header: 'Frecuencia',
      render: (m: ScheduledMaintenance) =>
        m.frequency_display ? <Badge variant="info">{m.frequency_display}</Badge> : <span style={{ color: 'var(--muted)' }}>--</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (m: ScheduledMaintenance) => <StatusBadge status={m.status} />,
    },
    {
      key: 'work_order_number',
      header: 'Orden de Trabajo',
      render: (m: ScheduledMaintenance) => {
        if (m.work_order && m.work_order_number) {
          return (
            <a
              href={`/work-orders/${m.work_order}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none' }}
            >
              {m.work_order_number}
            </a>
          )
        }
        return <span style={{ color: 'var(--muted)' }}>--</span>
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Cronograma de Mantenimientos"
        subtitle={maintenances ? `${maintenances.length} mantenimiento${maintenances.length !== 1 ? 's' : ''} programado${maintenances.length !== 1 ? 's' : ''}` : 'Planificacion y seguimiento de mantenimientos preventivos'}
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="outline-none transition-all duration-200 cursor-pointer appearance-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            color: 'var(--text)',
            fontSize: '0.82rem',
            padding: '9px 36px 9px 14px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          {statusFilterOptions.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="mb-4">
        <Table
          columns={columns}
          data={maintenances || []}
          loading={isLoading}
          emptyMessage="Sin mantenimientos programados"
        />
      </Card>

      {/* Alerts info */}
      <Card>
        <div className="flex items-start gap-4 py-2">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: 'rgba(249,115,22,0.1)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div>
            <h3 className="text-[0.9rem] font-bold mb-1" style={{ color: '#f1f5f9' }}>
              Sistema de Alertas
            </h3>
            <p className="text-[0.82rem] leading-relaxed" style={{ color: 'var(--muted)' }}>
              Las alertas se envian automaticamente por email a 30, 15, 7 y 1 dia antes del vencimiento
              de cada mantenimiento programado. Se notifica a los contactos del cliente marcados como
              principales y al administrador de Dimed. Las direcciones de correo provienen de los
              contactos registrados en la ficha de cada cliente.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[30, 15, 7, 1].map((days) => (
                <span
                  key={days}
                  className="inline-flex items-center px-3 py-1 text-[0.72rem] font-bold"
                  style={{
                    background: 'rgba(249,115,22,0.1)',
                    color: '#fb923c',
                    borderRadius: '20px',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }}
                >
                  {days} dia{days > 1 ? 's' : ''} antes
                </span>
              ))}
            </div>
            <div className="flex gap-3 mt-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.72rem] font-semibold"
                style={{
                  background: 'rgba(96,165,250,0.08)',
                  color: '#93c5fd',
                  borderRadius: '20px',
                  border: '1px solid rgba(96,165,250,0.15)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
