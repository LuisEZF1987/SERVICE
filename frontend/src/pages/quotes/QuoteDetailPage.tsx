import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { quotesApi } from '../../api/quotes'
import { usersApi } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import QuoteFormModal from './QuoteFormModal'
import { QUOTE_STATUS_VARIANT } from './QuotesPage'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="text-[0.85rem]" style={{ color: 'var(--text)' }}>{children}</div>
    </div>
  )
}

const money = (v: string | number) => `$${Number(v).toFixed(2)}`

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [editOpen, setEditOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [acceptedBy, setAcceptedBy] = useState('')
  const [otOpen, setOtOpen] = useState(false)
  const [technician, setTechnician] = useState('')

  const canManage = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quotesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  const { data: techniciansData } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: () => usersApi.list({ role: 'TECHNICIAN', is_active: 'true' }).then((r) => r.data),
    enabled: otOpen,
  })
  const technicianOptions = (techniciansData?.results ?? []).map((t) => ({
    value: t.id,
    label: t.full_name || t.username,
  }))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quote', id] })
    queryClient.invalidateQueries({ queryKey: ['quotes'] })
  }

  const actionMutation = useMutation({
    mutationFn: (action: 'send' | 'accept' | 'reject' | 'advance') => {
      if (action === 'send') return quotesApi.send(id!)
      if (action === 'accept') return quotesApi.accept(id!, acceptedBy)
      if (action === 'reject') return quotesApi.reject(id!)
      return quotesApi.markAdvancePaid(id!)
    },
    onSuccess: (_res, action) => {
      invalidate()
      setAcceptOpen(false)
      setAcceptedBy('')
      toast.success(
        action === 'send'
          ? 'Cotización enviada al cliente (PDF por correo)'
          : action === 'accept'
          ? 'Aceptación registrada — anticipo enviado a CAJA'
          : action === 'reject'
          ? 'Cotización rechazada'
          : 'Anticipo registrado — ya puedes generar la OT'
      )
    },
    onError: () => toast.error('Error al actualizar la cotización'),
  })

  const otMutation = useMutation({
    mutationFn: () => quotesApi.generateOt(id!, technician),
    onSuccess: (res) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      const data = res.data as { id: string; number: string }
      toast.success(`OT ${data.number} generada`)
      setOtOpen(false)
      navigate(`/work-orders/${data.id}`)
    },
    onError: () => toast.error('Error al generar la OT'),
  })

  if (isLoading || !quote) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--muted)' }}>
        <span className="text-[0.85rem]">Cargando cotización...</span>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={quote.number}
        subtitle={quote.title}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={QUOTE_STATUS_VARIANT[quote.status] ?? 'secondary'}>
              {quote.status_display}
            </Badge>
            {quote.advance_paid && <Badge variant="success">Anticipo ✓</Badge>}
            {quote.pdf_document && (
              <a
                href={quote.pdf_document}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.8rem] font-semibold px-3.5 py-2 rounded-lg"
                style={{ background: 'rgba(96,165,250,0.1)', color: 'var(--accent)', border: '1px solid rgba(96,165,250,0.2)', textDecoration: 'none' }}
              >
                PDF
              </a>
            )}
            {canManage && quote.status === 'DRAFT' && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  Editar
                </Button>
                <Button size="sm" onClick={() => actionMutation.mutate('send')} disabled={actionMutation.isPending}>
                  Enviar al Cliente
                </Button>
              </>
            )}
            {canManage && quote.status === 'SENT' && (
              <>
                <Button size="sm" variant="success" onClick={() => setAcceptOpen(true)}>
                  Registrar Aceptación
                </Button>
                <Button size="sm" variant="danger" onClick={() => actionMutation.mutate('reject')} disabled={actionMutation.isPending}>
                  Rechazada
                </Button>
              </>
            )}
            {canManage && quote.status === 'ACCEPTED' && !quote.advance_paid && (
              <Button size="sm" variant="success" onClick={() => actionMutation.mutate('advance')} disabled={actionMutation.isPending}>
                Anticipo Recibido
              </Button>
            )}
            {canManage && quote.status === 'ACCEPTED' && quote.advance_paid && !quote.work_order && (
              <Button size="sm" onClick={() => setOtOpen(true)}>
                Generar OT
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quotes')}>
          ← Volver
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card title={`Ítems (${quote.items.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Descripción', 'Tipo', 'Código', 'Cant.', 'P. Unit.', 'Total'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--card-border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-2.5 text-[0.84rem]" style={{ color: '#f1f5f9' }}>{item.description}</td>
                      <td className="px-3 py-2.5"><Badge variant="info">{item.kind_display}</Badge></td>
                      <td className="px-3 py-2.5 text-[0.8rem]" style={{ color: '#cbd5e1' }}>{item.code || '—'}</td>
                      <td className="px-3 py-2.5 text-[0.84rem]" style={{ color: '#cbd5e1' }}>{Number(item.quantity)}</td>
                      <td className="px-3 py-2.5 text-[0.84rem]" style={{ color: '#cbd5e1' }}>{money(item.unit_price)}</td>
                      <td className="px-3 py-2.5 text-[0.84rem] font-semibold" style={{ color: '#f1f5f9' }}>{money(item.total ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-end gap-1 mt-4 pt-3 text-[0.86rem]" style={{ borderTop: '1px solid var(--card-border)' }}>
              <div style={{ color: '#94a3b8' }}>Subtotal: <strong style={{ color: '#f1f5f9' }}>{money(quote.subtotal)}</strong></div>
              <div style={{ color: '#94a3b8' }}>IVA {Number(quote.iva_rate)}%: <strong style={{ color: '#f1f5f9' }}>{money(quote.iva_amount)}</strong></div>
              <div className="text-[1rem]" style={{ color: 'var(--accent)', fontWeight: 800 }}>TOTAL: {money(quote.total)}</div>
              <div style={{ color: '#94a3b8' }}>
                Anticipo {Number(quote.advance_percent)}%: <strong style={{ color: '#34d399' }}>{money(quote.advance_amount)}</strong>
                {' · '}Saldo: <strong style={{ color: '#fb923c' }}>{money(quote.balance_amount)}</strong>
              </div>
            </div>
          </Card>

          <Card title="Condiciones Comerciales">
            <InfoField label="Forma de pago">{quote.payment_terms}</InfoField>
            {quote.delivery_terms && <InfoField label="Plazo de entrega">{quote.delivery_terms}</InfoField>}
            {quote.warranty_terms && <InfoField label="Garantía">{quote.warranty_terms}</InfoField>}
            {quote.notes && <InfoField label="Observaciones">{quote.notes}</InfoField>}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Información">
            <InfoField label="Cliente">
              <Link to={`/clients/${quote.client}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {quote.client_name}
              </Link>
              <div className="text-[0.75rem]" style={{ color: 'var(--muted)' }}>RUC {quote.client_ruc}</div>
            </InfoField>
            {quote.equipment && (
              <InfoField label="Equipo">
                <Link to={`/equipment/${quote.equipment}`} style={{ color: 'var(--accent)' }}>
                  {quote.equipment_code}
                </Link>
              </InfoField>
            )}
            {quote.ticket && quote.ticket_number && (
              <InfoField label="Ticket de origen">
                <Link to={`/tickets/${quote.ticket}`} style={{ color: 'var(--accent)' }}>
                  {quote.ticket_number}
                </Link>
              </InfoField>
            )}
            {quote.work_order && quote.work_order_number && (
              <InfoField label="OT generada">
                <Link to={`/work-orders/${quote.work_order}`} style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {quote.work_order_number}
                </Link>
              </InfoField>
            )}
            <InfoField label="Válida hasta">{quote.valid_until ? quote.valid_until.split('-').reverse().join('/') : '—'}</InfoField>
          </Card>

          <Card title="Ciclo de Vida">
            <InfoField label="Creada">{formatDateTime(quote.created_at)}</InfoField>
            <InfoField label="Enviada">{formatDateTime(quote.sent_at)}</InfoField>
            <InfoField label="Aceptada">
              {formatDateTime(quote.accepted_at)}
              {quote.accepted_by_name && (
                <div className="text-[0.75rem]" style={{ color: 'var(--muted)' }}>por {quote.accepted_by_name}</div>
              )}
            </InfoField>
            <InfoField label="Anticipo recibido">{formatDateTime(quote.advance_paid_at)}</InfoField>
          </Card>
        </div>
      </div>

      {/* Edit (DRAFT only) */}
      <QuoteFormModal open={editOpen} onClose={() => setEditOpen(false)} quote={quote} />

      {/* Accept modal */}
      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title={`Registrar aceptación — ${quote.number}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAcceptOpen(false)} disabled={actionMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!acceptedBy.trim()) return void toast.error('Ingresa quién acepta la cotización')
                actionMutation.mutate('accept')
              }}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? 'Guardando...' : 'Confirmar Aceptación'}
            </Button>
          </>
        }
      >
        <p className="text-[0.84rem] mb-4" style={{ color: '#94a3b8' }}>
          Al registrar la aceptación se enviará el cargo del <strong style={{ color: '#f1f5f9' }}>anticipo
          del {Number(quote.advance_percent)}% ({money(quote.advance_amount)})</strong> a CAJA (si la
          integración está activa).
        </p>
        <Input
          label="Aceptada por (nombre y cargo)"
          value={acceptedBy}
          onChange={(e) => setAcceptedBy(e.target.value)}
          placeholder="Ej: Dr. Juan Pérez — Director Médico"
        />
      </Modal>

      {/* Generate OT modal */}
      <Modal
        open={otOpen}
        onClose={() => setOtOpen(false)}
        title={`Generar OT desde ${quote.number}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOtOpen(false)} disabled={otMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!technician) return void toast.error('Selecciona el técnico')
                otMutation.mutate()
              }}
              disabled={otMutation.isPending}
            >
              {otMutation.isPending ? 'Generando...' : 'Generar OT'}
            </Button>
          </>
        }
      >
        <p className="text-[0.84rem] mb-4" style={{ color: '#94a3b8' }}>
          Anticipo recibido ✓ — se creará la OT autorizada para{' '}
          <strong style={{ color: '#f1f5f9' }}>{quote.equipment_code ?? 'el equipo de la cotización'}</strong>.
          El saldo ({money(quote.balance_amount)}) se cobrará al cerrar la OT.
        </p>
        <Select
          label="Técnico asignado"
          options={technicianOptions}
          value={technician}
          onChange={(e) => setTechnician(e.target.value)}
        />
      </Modal>
    </div>
  )
}
