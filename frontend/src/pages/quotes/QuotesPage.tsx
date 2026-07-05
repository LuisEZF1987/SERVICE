import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { quotesApi, QuoteListItem } from '../../api/quotes'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import QuoteFormModal from './QuoteFormModal'

export const QUOTE_STATUS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  DRAFT: 'secondary',
  SENT: 'primary',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
}

const STATUS_FILTER = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SENT', label: 'Enviada' },
  { value: 'ACCEPTED', label: 'Aceptada' },
  { value: 'REJECTED', label: 'Rechazada' },
  { value: 'EXPIRED', label: 'Vencida' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.split('-').reverse().join('/')
}

export default function QuotesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const canManage = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes', statusFilter],
    queryFn: () => {
      const params: Record<string, string> = { page_size: '200' }
      if (statusFilter) params.status = statusFilter
      return quotesApi.list(params).then((r) => r.data.results)
    },
  })

  const columns = [
    {
      key: 'number',
      header: 'Cotización',
      render: (q: QuoteListItem) => (
        <span style={{ fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.82rem' }}>
          {q.number}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Objeto',
      render: (q: QuoteListItem) => (
        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{q.title}</span>
      ),
    },
    { key: 'client_name', header: 'Cliente' },
    {
      key: 'equipment_code',
      header: 'Equipo',
      render: (q: QuoteListItem) => q.equipment_code || '—',
    },
    {
      key: 'total',
      header: 'Total',
      render: (q: QuoteListItem) => (
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
          ${Number(q.total).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (q: QuoteListItem) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={QUOTE_STATUS_VARIANT[q.status] ?? 'secondary'}>{q.status_display}</Badge>
          {q.advance_paid && <Badge variant="success">Anticipo ✓</Badge>}
        </div>
      ),
    },
    {
      key: 'valid_until',
      header: 'Válida hasta',
      render: (q: QuoteListItem) => formatDate(q.valid_until),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        subtitle={quotes ? `${quotes.length} cotización${quotes.length !== 1 ? 'es' : ''}` : 'Cotizaciones de servicios y repuestos'}
        actions={canManage ? <Button onClick={() => setModalOpen(true)}>Nueva Cotización</Button> : undefined}
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="outline-none cursor-pointer appearance-none"
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
          {STATUS_FILTER.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <Table
          columns={columns}
          data={quotes || []}
          loading={isLoading}
          emptyMessage="Sin cotizaciones registradas"
          onRowClick={(q: QuoteListItem) => navigate(`/quotes/${q.id}`)}
        />
      </Card>

      <QuoteFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
