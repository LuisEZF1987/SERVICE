import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ticketsApi } from '../../api/tickets'
import { workOrdersApi } from '../../api/workOrders'
import { usersApi } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Select, Textarea } from '../../components/ui/Input'
import { TICKET_PRIORITY_VARIANT, TICKET_STATUS_VARIANT } from './TicketsPage'
import QuoteFormModal from '../quotes/QuoteFormModal'

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
      <div className="text-[0.85rem]" style={{ color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [otModalOpen, setOtModalOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [technician, setTechnician] = useState('')

  const isStaff = user?.role !== 'CLIENT'
  const canManage = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  const { data: techniciansData } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: () => usersApi.list({ role: 'TECHNICIAN', is_active: 'true' }).then((r) => r.data),
    enabled: otModalOpen,
  })

  const technicianOptions = (techniciansData?.results ?? []).map((t) => ({
    value: t.id,
    label: t.full_name || t.username,
  }))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }

  const commentMutation = useMutation({
    mutationFn: () => ticketsApi.addComment(id!, commentBody, isInternal),
    onSuccess: () => {
      invalidate()
      setCommentBody('')
      setIsInternal(false)
      toast.success('Comentario agregado')
    },
    onError: () => toast.error('Error al agregar el comentario'),
  })

  const actionMutation = useMutation({
    mutationFn: (action: 'start' | 'escalate' | 'resolve' | 'close') => {
      if (action === 'start') return ticketsApi.startProgress(id!)
      if (action === 'escalate') return ticketsApi.escalate(id!)
      if (action === 'resolve') return ticketsApi.resolve(id!, resolutionNotes)
      return ticketsApi.close(id!)
    },
    onSuccess: () => {
      invalidate()
      setResolveOpen(false)
      setResolutionNotes('')
      toast.success('Ticket actualizado')
    },
    onError: () => toast.error('Error al actualizar el ticket'),
  })

  const generateOtMutation = useMutation({
    mutationFn: async () => {
      const t = ticket!
      const res = await workOrdersApi.create({
        ot_type: 'CORRECTIVE',
        priority: t.priority === 'CRITICAL' || t.priority === 'HIGH' ? 'URGENT' : 'NORMAL',
        equipment: t.equipment!,
        technician,
        ticket: t.id,
        reported_problem: `[${t.number}] ${t.subject}\n\n${t.description}`,
      } as Parameters<typeof workOrdersApi.create>[0])
      return res.data
    },
    onSuccess: (ot) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success(`OT ${ot.number} generada desde el ticket`)
      setOtModalOpen(false)
      setTechnician('')
      navigate(`/work-orders/${ot.id}`)
    },
    onError: () => toast.error('Error al generar la OT'),
  })

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--muted)' }}>
        <span className="text-[0.85rem]">Cargando ticket...</span>
      </div>
    )
  }

  const isFinal = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'

  return (
    <div>
      <PageHeader
        title={`${ticket.number}`}
        subtitle={ticket.subject}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={TICKET_PRIORITY_VARIANT[ticket.priority] ?? 'secondary'}>
              {ticket.priority_display}
            </Badge>
            <Badge variant={TICKET_STATUS_VARIANT[ticket.status] ?? 'secondary'}>
              {ticket.status_display}
            </Badge>
            {isStaff && (ticket.status === 'OPEN' || ticket.status === 'ESCALATED') && (
              <Button size="sm" variant="success" onClick={() => actionMutation.mutate('start')} disabled={actionMutation.isPending}>
                Atender
              </Button>
            )}
            {isStaff && !isFinal && ticket.status !== 'ESCALATED' && (
              <Button size="sm" variant="danger" onClick={() => actionMutation.mutate('escalate')} disabled={actionMutation.isPending}>
                Escalar
              </Button>
            )}
            {isStaff && !isFinal && (
              <Button size="sm" onClick={() => setResolveOpen(true)} disabled={actionMutation.isPending}>
                Resolver
              </Button>
            )}
            {canManage && ticket.status === 'RESOLVED' && (
              <Button size="sm" variant="secondary" onClick={() => actionMutation.mutate('close')} disabled={actionMutation.isPending}>
                Cerrar
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
          ← Volver
        </Button>
      </div>

      {ticket.is_sla_breached && (
        <div
          className="flex items-center gap-3 mb-5 px-4 py-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px' }}
        >
          <span className="text-[0.85rem] font-semibold" style={{ color: '#f87171' }}>
            ⚠ SLA vencido — comprometido hasta {formatDateTime(ticket.sla_due_at)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna principal: descripción + hilo */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card title="Descripción del Caso">
            <div className="whitespace-pre-wrap text-[0.85rem] leading-relaxed" style={{ color: '#cbd5e1' }}>
              {ticket.description}
            </div>
            {ticket.resolution_notes && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                <InfoField label="Resolución">
                  <div className="whitespace-pre-wrap" style={{ color: '#34d399' }}>
                    {ticket.resolution_notes}
                  </div>
                </InfoField>
              </div>
            )}
          </Card>

          <Card title={`Historial del Caso (${ticket.comments.length})`}>
            {ticket.comments.length === 0 && (
              <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
                Sin comentarios todavía.
              </div>
            )}
            {ticket.comments.map((c) => (
              <div
                key={c.id}
                className="py-3 px-3.5 mb-2 rounded-lg"
                style={{
                  background: c.is_internal ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${c.is_internal ? 'rgba(249,115,22,0.2)' : 'var(--card-border)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.78rem] font-bold" style={{ color: '#f1f5f9' }}>
                    {c.author_name}
                    {c.is_internal && (
                      <span className="ml-2 text-[0.65rem] font-bold uppercase" style={{ color: '#fb923c' }}>
                        Nota interna
                      </span>
                    )}
                  </span>
                  <span className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
                    {formatDateTime(c.created_at)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-[0.83rem]" style={{ color: '#cbd5e1' }}>
                  {c.body}
                </div>
              </div>
            ))}

            {ticket.status !== 'CLOSED' && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                <Textarea
                  label="Agregar comentario"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={3}
                  placeholder="Escribe una actualización del caso... (se enviará por correo)"
                />
                <div className="flex items-center justify-between">
                  {isStaff ? (
                    <label className="flex items-center gap-2 text-[0.8rem] cursor-pointer" style={{ color: '#94a3b8' }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        style={{ accentColor: '#fb923c', width: 14, height: 14 }}
                      />
                      Nota interna (no se envía al cliente)
                    </label>
                  ) : (
                    <span />
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!commentBody.trim()) {
                        toast.error('Escribe el comentario')
                        return
                      }
                      commentMutation.mutate()
                    }}
                    disabled={commentMutation.isPending}
                  >
                    {commentMutation.isPending ? 'Enviando...' : 'Comentar'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="flex flex-col gap-4">
          <Card title="Información">
            <InfoField label="Cliente">
              {isStaff ? (
                <Link to={`/clients/${ticket.client}`} style={{ color: 'var(--accent)' }}>
                  {ticket.client_name}
                </Link>
              ) : (
                ticket.client_name
              )}
            </InfoField>
            {ticket.equipment && (
              <InfoField label="Equipo">
                <Link to={`/equipment/${ticket.equipment}`} style={{ color: 'var(--accent)' }}>
                  {ticket.equipment_code}
                </Link>
              </InfoField>
            )}
            <InfoField label="Canal">{ticket.channel_display}</InfoField>
            <InfoField label="Reportado por">
              {ticket.reported_by_name || '—'}
              {ticket.reported_by_email && (
                <div className="text-[0.75rem]" style={{ color: 'var(--muted)' }}>
                  {ticket.reported_by_email}
                </div>
              )}
            </InfoField>
            <InfoField label="Responsable">{ticket.assigned_to_name || 'Sin asignar'}</InfoField>
            {ticket.contract_number && (
              <InfoField label="Contrato (SLA)">{ticket.contract_number}</InfoField>
            )}
            <InfoField label="Vencimiento SLA">
              <span style={{ color: ticket.is_sla_breached ? '#f87171' : undefined }}>
                {formatDateTime(ticket.sla_due_at)}
              </span>
            </InfoField>
            <InfoField label="Creado">{formatDateTime(ticket.created_at)}</InfoField>
            {ticket.resolved_at && (
              <InfoField label="Resuelto">{formatDateTime(ticket.resolved_at)}</InfoField>
            )}
          </Card>

          <Card title={`Órdenes de Trabajo (${ticket.work_orders.length})`}>
            {ticket.work_orders.length === 0 && (
              <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
                Sin OTs vinculadas.
              </div>
            )}
            {ticket.work_orders.map((ot) => (
              <div key={ot.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Link to={`/work-orders/${ot.id}`} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.83rem' }}>
                  {ot.number}
                </Link>
                <div className="flex items-center gap-1.5">
                  <Badge variant="info">{ot.type_display}</Badge>
                  <Badge variant={ot.status === 'CLOSED' ? 'secondary' : ot.status === 'SIGNED' ? 'success' : 'warning'}>
                    {ot.status_display}
                  </Badge>
                </div>
              </div>
            ))}
            {canManage && !isFinal && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {ticket.equipment ? (
                  <Button size="sm" variant="secondary" onClick={() => setOtModalOpen(true)}>
                    Generar OT
                  </Button>
                ) : (
                  <div className="text-[0.75rem]" style={{ color: 'var(--muted)' }}>
                    Asocia un equipo al ticket para generar una OT.
                  </div>
                )}
                <Button size="sm" variant="ghost" onClick={() => setQuoteModalOpen(true)}>
                  Generar Cotización
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal resolver */}
      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title={`Resolver ${ticket.number}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveOpen(false)} disabled={actionMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => actionMutation.mutate('resolve')} disabled={actionMutation.isPending}>
              {actionMutation.isPending ? 'Guardando...' : 'Marcar como Resuelto'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Notas de resolución"
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          rows={4}
          placeholder="Describe cómo se resolvió el caso (se enviará por correo)..."
        />
      </Modal>

      {/* Modal generar OT */}
      <Modal
        open={otModalOpen}
        onClose={() => setOtModalOpen(false)}
        title={`Generar OT desde ${ticket.number}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOtModalOpen(false)} disabled={generateOtMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!technician) {
                  toast.error('Selecciona el técnico asignado')
                  return
                }
                generateOtMutation.mutate()
              }}
              disabled={generateOtMutation.isPending}
            >
              {generateOtMutation.isPending ? 'Generando...' : 'Generar OT'}
            </Button>
          </>
        }
      >
        <p className="text-[0.84rem] mb-4" style={{ color: '#94a3b8' }}>
          Se creará una OT correctiva para{' '}
          <strong style={{ color: '#f1f5f9' }}>{ticket.equipment_code}</strong> vinculada a este
          ticket, con el problema reportado como descripción.
        </p>
        <Select
          label="Técnico asignado"
          options={technicianOptions}
          value={technician}
          onChange={(e) => setTechnician(e.target.value)}
        />
      </Modal>

      {/* Quote from ticket (no-contract flow) */}
      <QuoteFormModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        prefill={{
          client: ticket.client,
          equipment: ticket.equipment,
          ticket: ticket.id,
          title: ticket.subject,
        }}
      />
    </div>
  )
}
