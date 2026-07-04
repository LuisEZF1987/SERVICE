import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ticketsApi, TicketListItem, Ticket } from '../../api/tickets'
import { clientsApi } from '../../api/clients'
import { equipmentApi } from '../../api/equipment'
import { usersApi } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'

export const TICKET_STATUS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  OPEN: 'primary',
  IN_PROGRESS: 'warning',
  ESCALATED: 'danger',
  RESOLVED: 'success',
  CLOSED: 'secondary',
}

export const TICKET_PRIORITY_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  NORMAL: 'primary',
  LOW: 'secondary',
}

const CHANNEL_OPTIONS = [
  { value: 'PHONE', label: 'Teléfono' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'PORTAL', label: 'Portal cliente' },
  { value: 'IN_PERSON', label: 'Presencial' },
]

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Crítica (equipo parado)' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Baja' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En atención' },
  { value: 'ESCALATED', label: 'Escalado' },
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'CLOSED', label: 'Cerrado' },
]

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
}

const filterSelectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--card-border)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontSize: '0.82rem',
  padding: '9px 36px 9px 14px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
}

interface FormState {
  client: string
  equipment: string
  channel: string
  priority: string
  subject: string
  description: string
  reported_by_name: string
  reported_by_email: string
  assigned_to: string
}

const emptyForm: FormState = {
  client: '',
  equipment: '',
  channel: 'PHONE',
  priority: 'NORMAL',
  subject: '',
  description: '',
  reported_by_name: '',
  reported_by_email: '',
  assigned_to: '',
}

export default function TicketsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const isClientPortal = user?.role === 'CLIENT'

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      return ticketsApi.list(params).then((r) => r.data.results)
    },
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list({ page_size: '500' }).then((r) => r.data),
    enabled: modalOpen && !isClientPortal,
  })

  const effectiveClient = isClientPortal ? user?.client_organization ?? '' : form.client

  const { data: equipmentData } = useQuery({
    queryKey: ['equipment-by-client', effectiveClient],
    queryFn: () =>
      equipmentApi.list({ client: effectiveClient, page_size: '500' }).then((r) => r.data),
    enabled: modalOpen && !!effectiveClient,
  })

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.list({ is_active: 'true', page_size: '200' }).then((r) => r.data),
    enabled: modalOpen && !isClientPortal,
  })

  const clientOptions = (clientsData?.results ?? []).map((c) => ({ value: c.id, label: c.name }))
  const equipmentOptions = (equipmentData?.results ?? []).map((e) => ({
    value: e.id,
    label: `${e.internal_code} — ${e.brand} ${e.model_name}`,
  }))
  const staffOptions = (staffData?.results ?? [])
    .filter((u) => u.role !== 'CLIENT')
    .map((u) => ({ value: u.id, label: u.full_name || u.username }))

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      ticketsApi.create({
        client: effectiveClient,
        equipment: form.equipment || null,
        channel: form.channel,
        priority: form.priority,
        subject: form.subject,
        description: form.description,
        reported_by_name: form.reported_by_name,
        reported_by_email: form.reported_by_email,
        assigned_to: form.assigned_to || null,
      } as Partial<Ticket>),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(`Ticket ${res.data.number} creado`)
      closeModal()
      navigate(`/tickets/${res.data.id}`)
    },
    onError: () => toast.error('Error al crear el ticket'),
  })

  const handleSubmit = () => {
    if (!effectiveClient) {
      toast.error('Selecciona el cliente')
      return
    }
    if (!form.subject.trim()) {
      toast.error('Ingresa el asunto')
      return
    }
    if (!form.description.trim()) {
      toast.error('Describe la falla reportada')
      return
    }
    createMutation.mutate()
  }

  const updateField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const columns = [
    {
      key: 'number',
      header: 'Ticket',
      render: (t: TicketListItem) => (
        <span style={{ fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.82rem' }}>
          {t.number}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Asunto',
      render: (t: TicketListItem) => (
        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.subject}</span>
      ),
    },
    { key: 'client_name', header: 'Cliente' },
    {
      key: 'equipment_code',
      header: 'Equipo',
      render: (t: TicketListItem) => t.equipment_code || '—',
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (t: TicketListItem) => (
        <Badge variant={TICKET_PRIORITY_VARIANT[t.priority] ?? 'secondary'}>
          {t.priority_display}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (t: TicketListItem) => (
        <Badge variant={TICKET_STATUS_VARIANT[t.status] ?? 'secondary'}>
          {t.status_display}
        </Badge>
      ),
    },
    {
      key: 'sla_due_at',
      header: 'Vence SLA',
      render: (t: TicketListItem) => (
        <span style={{ color: t.is_sla_breached ? '#f87171' : '#cbd5e1', fontWeight: t.is_sla_breached ? 700 : 400 }}>
          {formatDateTime(t.sla_due_at)}
          {t.is_sla_breached && ' ⚠'}
        </span>
      ),
    },
    {
      key: 'assigned_to_name',
      header: 'Responsable',
      render: (t: TicketListItem) => t.assigned_to_name || '—',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Tickets de Soporte"
        subtitle={tickets ? `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}` : 'Casos reportados por clientes y su seguimiento'}
        actions={<Button onClick={() => setModalOpen(true)}>Nuevo Ticket</Button>}
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="outline-none transition-all duration-200 cursor-pointer appearance-none"
          style={filterSelectStyle}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <Table
          columns={columns}
          data={tickets || []}
          loading={isLoading}
          emptyMessage="Sin tickets registrados"
          onRowClick={(t: TicketListItem) => navigate(`/tickets/${t.id}`)}
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Nuevo Ticket de Soporte"
        maxWidth="640px"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Ticket'}
            </Button>
          </>
        }
      >
        {!isClientPortal && (
          <Select
            label="Cliente"
            options={clientOptions}
            value={form.client}
            onChange={(e) => updateField('client', e.target.value)}
          />
        )}
        <Select
          label="Equipo (opcional)"
          options={equipmentOptions}
          value={form.equipment}
          onChange={(e) => updateField('equipment', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-x-4">
          <Select
            label="Canal de reporte"
            options={CHANNEL_OPTIONS}
            value={form.channel}
            onChange={(e) => updateField('channel', e.target.value)}
          />
          <Select
            label="Prioridad"
            options={PRIORITY_OPTIONS}
            value={form.priority}
            onChange={(e) => updateField('priority', e.target.value)}
          />
        </div>
        <Input
          label="Asunto"
          value={form.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          placeholder="Ej: Error E-105 al iniciar fluoroscopía"
        />
        <Textarea
          label="Descripción de la falla"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={4}
          placeholder="Describe el problema, cuándo empezó, mensajes de error..."
        />
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            label="Reportado por (opcional)"
            value={form.reported_by_name}
            onChange={(e) => updateField('reported_by_name', e.target.value)}
            placeholder="Nombre de quien reporta"
          />
          <Input
            label="Email de quien reporta"
            type="email"
            value={form.reported_by_email}
            onChange={(e) => updateField('reported_by_email', e.target.value)}
            placeholder="Para notificarle por correo"
          />
        </div>
        {!isClientPortal && (
          <Select
            label="Responsable (opcional)"
            options={staffOptions}
            value={form.assigned_to}
            onChange={(e) => updateField('assigned_to', e.target.value)}
          />
        )}
      </Modal>
    </div>
  )
}
