import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { workOrdersApi, WorkOrder } from '../../api/workOrders'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import SearchBar from '../../components/ui/SearchBar'
import { Select } from '../../components/ui/Input'
import WorkOrderFormModal from './WorkOrderFormModal'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'OPEN', label: 'Abierta' },
  { value: 'IN_PROGRESS', label: 'En ejecucion' },
  { value: 'PENDING_SIGNATURE', label: 'Pendiente firma' },
  { value: 'SIGNED', label: 'Firmada' },
  { value: 'CLOSED', label: 'Cerrada' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'CALIBRATION', label: 'Calibracion' },
  { value: 'INSTALLATION', label: 'Instalacion' },
  { value: 'WARRANTY', label: 'Garantia' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SCHEDULED', label: 'Programado' },
]

const TYPE_BADGE_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  PREVENTIVE: 'info',
  CORRECTIVE: 'warning',
  CALIBRATION: 'purple',
  INSTALLATION: 'success',
  WARRANTY: 'secondary',
}

export default function WorkOrdersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.ot_type = typeFilter
  if (priorityFilter) params.priority = priorityFilter

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', params],
    queryFn: () => workOrdersApi.list(params).then((r) => r.data),
  })

  const workOrders = data?.results ?? []

  const columns = [
    {
      key: 'number',
      header: 'N.o OT',
      render: (wo: WorkOrder) => (
        <span className="font-bold" style={{ color: 'var(--accent)' }}>
          {wo.number}
        </span>
      ),
    },
    {
      key: 'type_display',
      header: 'Tipo',
      render: (wo: WorkOrder) => (
        <Badge variant={TYPE_BADGE_VARIANT[wo.ot_type] || 'secondary'}>
          {wo.type_display}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (wo: WorkOrder) => <PriorityBadge priority={wo.priority} />,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (wo: WorkOrder) => <StatusBadge status={wo.status} />,
    },
    {
      key: 'equipment_code',
      header: 'Equipo',
      render: (wo: WorkOrder) => (
        <span style={{ color: '#cbd5e1' }}>{wo.equipment_code || '\u2014'}</span>
      ),
    },
    {
      key: 'client_name',
      header: 'Cliente',
      render: (wo: WorkOrder) => (
        <span style={{ color: '#cbd5e1' }}>{wo.client_name || '\u2014'}</span>
      ),
    },
    {
      key: 'technician_name',
      header: 'Tecnico',
      render: (wo: WorkOrder) => (
        <span style={{ color: '#cbd5e1' }}>{wo.technician_name || '\u2014'}</span>
      ),
    },
    {
      key: 'opened_at',
      header: 'Apertura',
      render: (wo: WorkOrder) => (
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
          {wo.opened_at
            ? new Date(wo.opened_at).toLocaleDateString('es-EC')
            : '\u2014'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Ordenes de Trabajo"
        subtitle={`${data?.count ?? 0} ordenes registradas`}
        actions={
          <Button
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            onClick={() => setModalOpen(true)}
          >
            Nueva OT
          </Button>
        }
      />

      {/* Filters Row */}
      <div
        className="flex flex-wrap items-end gap-3 mb-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
          padding: '16px',
        }}
      >
        <div style={{ minWidth: '160px' }}>
          <Select
            label="Estado"
            options={STATUS_OPTIONS.slice(1)}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="!mb-0"
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <Select
            label="Tipo"
            options={TYPE_OPTIONS.slice(1)}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="!mb-0"
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <Select
            label="Prioridad"
            options={PRIORITY_OPTIONS.slice(1)}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="!mb-0"
          />
        </div>
        <div className="flex-1" style={{ minWidth: '220px' }}>
          <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
            Buscar
          </label>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por numero, equipo, cliente..."
          />
        </div>
        {(statusFilter || typeFilter || priorityFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('')
              setTypeFilter('')
              setPriorityFilter('')
              setSearch('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Table Card */}
      <Card>
        <Table
          columns={columns}
          data={workOrders}
          loading={isLoading}
          onRowClick={(wo) => navigate(`/work-orders/${wo.id}`)}
          emptyMessage="No se encontraron ordenes de trabajo"
        />
      </Card>

      {/* Create Modal */}
      <WorkOrderFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
