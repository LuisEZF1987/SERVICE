import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder } from '../../api/workOrders'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import { Select, Textarea } from '../../components/ui/Input'
import WorkOrderFormModal from './WorkOrderFormModal'
import SignWorkOrderModal from './SignWorkOrderModal'
import WorkOrderChecklistSection from './WorkOrderChecklistSection'
import WorkOrderSparePartsSection from './WorkOrderSparePartsSection'
import WorkOrderPhotosSection from './WorkOrderPhotosSection'

const RESULT_OPTIONS = [
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'FOLLOW_UP', label: 'Seguimiento' },
  { value: 'NOT_RESOLVED', label: 'No resuelto' },
]

const TYPE_BADGE_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  PREVENTIVE: 'info',
  CORRECTIVE: 'warning',
  CALIBRATION: 'purple',
  INSTALLATION: 'success',
  WARRANTY: 'secondary',
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`
}

/** Small label + value info field */
function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div
        className="text-[0.68rem] font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </div>
      <div className="text-[0.85rem]" style={{ color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  )
}

/** Timeline row for timestamps */
function TimelineRow({ label, datetime, isActive }: { label: string; datetime: string | null; isActive: boolean }) {
  return (
    <div className="flex items-start gap-3 mb-3 last:mb-0">
      {/* Dot */}
      <div className="flex flex-col items-center mt-1">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background: datetime
              ? isActive
                ? 'var(--accent)'
                : 'rgba(16,185,129,0.8)'
              : 'rgba(100,116,139,0.3)',
            boxShadow: datetime && isActive ? '0 0 8px rgba(96,165,250,0.4)' : 'none',
          }}
        />
      </div>
      {/* Content */}
      <div className="flex-1">
        <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {label}
        </div>
        <div className="text-[0.82rem]" style={{ color: datetime ? 'var(--text)' : 'rgba(100,116,139,0.5)' }}>
          {formatDateTime(datetime)}
        </div>
      </div>
    </div>
  )
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [signMode, setSignMode] = useState<'client' | 'technician' | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [workPerformed, setWorkPerformed] = useState('')
  const [closeResult, setCloseResult] = useState('RESOLVED')
  const [diagnosisDirty, setDiagnosisDirty] = useState(false)
  const [workPerformedDirty, setWorkPerformedDirty] = useState(false)

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrdersApi.get(id!).then((r) => r.data),
    enabled: !!id,
    // Populate local state on success
    select: (data) => {
      if (!diagnosisDirty) setDiagnosis(data.diagnosis || '')
      if (!workPerformedDirty) setWorkPerformed(data.work_performed || '')
      return data
    },
  })

  // Mutations
  const startMutation = useMutation({
    mutationFn: () => workOrdersApi.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Trabajo iniciado')
    },
    onError: () => toast.error('Error al iniciar el trabajo'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WorkOrder>) => workOrdersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      toast.success('Informacion actualizada')
      setDiagnosisDirty(false)
      setWorkPerformedDirty(false)
    },
    onError: () => toast.error('Error al guardar'),
  })

  const finishMutation = useMutation({
    mutationFn: () => workOrdersApi.finish(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Trabajo finalizado')
    },
    onError: () => toast.error('Error al finalizar el trabajo'),
  })

  const closeMutation = useMutation({
    mutationFn: () => workOrdersApi.close(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('OT cerrada exitosamente')
    },
    onError: () => toast.error('Error al cerrar la OT'),
  })

  if (isLoading || !workOrder) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--muted)' }}>
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[0.85rem]">Cargando orden de trabajo...</span>
        </div>
      </div>
    )
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
  const status = workOrder.status
  // Evidence (photos/checklist/spare parts) is editable until the client signs
  const evidenceEditable = ['OPEN', 'IN_PROGRESS', 'PENDING_SIGNATURE'].includes(status)

  // Build action buttons based on status
  const actionButtons = () => {
    const buttons: React.ReactNode[] = []

    if (workOrder.pdf_document) {
      buttons.push(
        <a
          key="pdf"
          href={workOrder.pdf_document}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold px-3.5 py-2 rounded-lg transition-colors"
          style={{ background: 'rgba(96,165,250,0.1)', color: 'var(--accent)', border: '1px solid rgba(96,165,250,0.2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PDF
        </a>
      )
    }

    if (status === 'OPEN') {
      buttons.push(
        <Button
          key="start"
          variant="success"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        >
          {startMutation.isPending ? 'Iniciando...' : 'Iniciar Trabajo'}
        </Button>
      )
    }

    if (status === 'IN_PROGRESS') {
      buttons.push(
        <Button
          key="finish"
          onClick={() => finishMutation.mutate()}
          disabled={finishMutation.isPending}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        >
          {finishMutation.isPending ? 'Finalizando...' : 'Finalizar Trabajo'}
        </Button>
      )
      buttons.push(
        <Button
          key="tech-sign"
          variant="secondary"
          onClick={() => setSignMode('technician')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
        >
          Firmar (técnico)
        </Button>
      )
    }

    if (status === 'PENDING_SIGNATURE') {
      buttons.push(
        <Button
          key="client-sign"
          variant="success"
          onClick={() => setSignMode('client')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
        >
          Firmar (cliente)
        </Button>
      )
    }

    if (status === 'SIGNED' && isAdmin) {
      buttons.push(
        <Button
          key="close"
          onClick={() => {
            // First update the result, then close
            updateMutation.mutate({ result: closeResult } as Partial<WorkOrder>, {
              onSuccess: () => closeMutation.mutate(),
            })
          }}
          disabled={closeMutation.isPending || updateMutation.isPending}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          }
        >
          {closeMutation.isPending ? 'Cerrando...' : 'Cerrar OT'}
        </Button>
      )
    }

    if (isAdmin && (status === 'OPEN' || status === 'IN_PROGRESS')) {
      buttons.push(
        <Button
          key="edit"
          variant="secondary"
          onClick={() => setEditModalOpen(true)}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
        >
          Editar
        </Button>
      )
    }

    return buttons
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={`OT ${workOrder.number}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={workOrder.status} />
            <PriorityBadge priority={workOrder.priority} />
            {actionButtons()}
          </div>
        }
      />

      {/* Back button */}
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/work-orders')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          }
        >
          Volver
        </Button>
      </div>

      {/* Status-specific banners */}
      {status === 'PENDING_SIGNATURE' && (
        <div
          className="flex items-center gap-3 mb-5 px-4 py-3"
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: '12px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[0.85rem] font-medium" style={{ color: '#fb923c' }}>
            Pendiente de firma del cliente
          </span>
        </div>
      )}

      {status === 'CLOSED' && (
        <div
          className="flex items-center gap-3 mb-5 px-4 py-3"
          style={{
            background: 'rgba(100,116,139,0.08)',
            border: '1px solid rgba(100,116,139,0.2)',
            borderRadius: '12px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span className="text-[0.85rem] font-medium" style={{ color: '#94a3b8' }}>
            Esta OT esta cerrada y bloqueada
          </span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Column 1 + 2: Information Cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Informacion General */}
          <Card title="Informacion General">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
              <InfoField label="Numero de OT">{workOrder.number}</InfoField>
              <InfoField label="Tipo">
                <Badge variant={TYPE_BADGE_VARIANT[workOrder.ot_type] || 'secondary'}>
                  {workOrder.type_display}
                </Badge>
              </InfoField>
              <InfoField label="Prioridad">
                <PriorityBadge priority={workOrder.priority} />
              </InfoField>
              <InfoField label="Fecha de Apertura">{formatDateTime(workOrder.opened_at)}</InfoField>
              <InfoField label="Fecha de Cierre">{formatDateTime(workOrder.closed_at)}</InfoField>
            </div>
          </Card>

          {/* Equipo y Cliente */}
          <Card title="Equipo y Cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <InfoField label="Equipo">
                <Link
                  to={`/equipment/${workOrder.equipment}`}
                  className="transition-colors duration-200"
                  style={{ color: 'var(--accent)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                >
                  {workOrder.equipment_code}
                  {workOrder.equipment_description && ` — ${workOrder.equipment_description}`}
                </Link>
              </InfoField>
              <InfoField label="Cliente">
                <Link
                  to={`/clients/${workOrder.client}`}
                  className="transition-colors duration-200"
                  style={{ color: 'var(--accent)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                >
                  {workOrder.client_name}
                </Link>
              </InfoField>
            </div>
          </Card>

          {/* Tecnico Asignado */}
          <Card title="Tecnico Asignado">
            <InfoField label="Nombre del Tecnico">
              {workOrder.technician_name || '\u2014'}
            </InfoField>
          </Card>

          {/* Descripcion Tecnica */}
          <Card title="Descripcion Tecnica">
            <InfoField label="Problema Reportado">
              <div
                className="whitespace-pre-wrap text-[0.83rem] leading-relaxed"
                style={{ color: '#cbd5e1' }}
              >
                {workOrder.reported_problem || '\u2014'}
              </div>
            </InfoField>

            {/* Editable fields when IN_PROGRESS */}
            {status === 'IN_PROGRESS' ? (
              <>
                <Textarea
                  label="Diagnostico"
                  value={diagnosis}
                  onChange={(e) => {
                    setDiagnosis(e.target.value)
                    setDiagnosisDirty(true)
                  }}
                  placeholder="Escribe el diagnostico..."
                  rows={3}
                />
                <Textarea
                  label="Trabajo Realizado"
                  value={workPerformed}
                  onChange={(e) => {
                    setWorkPerformed(e.target.value)
                    setWorkPerformedDirty(true)
                  }}
                  placeholder="Describe el trabajo realizado..."
                  rows={3}
                />
                {(diagnosisDirty || workPerformedDirty) && (
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        updateMutation.mutate({
                          diagnosis,
                          work_performed: workPerformed,
                        } as Partial<WorkOrder>)
                      }
                      disabled={updateMutation.isPending}
                      icon={
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                      }
                    >
                      {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <InfoField label="Diagnostico">
                  <div
                    className="whitespace-pre-wrap text-[0.83rem] leading-relaxed"
                    style={{ color: '#cbd5e1' }}
                  >
                    {workOrder.diagnosis || '\u2014'}
                  </div>
                </InfoField>
                <InfoField label="Trabajo Realizado">
                  <div
                    className="whitespace-pre-wrap text-[0.83rem] leading-relaxed"
                    style={{ color: '#cbd5e1' }}
                  >
                    {workOrder.work_performed || '\u2014'}
                  </div>
                </InfoField>
              </>
            )}
          </Card>

          {/* Evidencias del servicio */}
          <WorkOrderChecklistSection workOrder={workOrder} editable={evidenceEditable} />
          <WorkOrderSparePartsSection workOrder={workOrder} editable={evidenceEditable} />
          <WorkOrderPhotosSection workOrder={workOrder} editable={evidenceEditable} />
        </div>

        {/* Column 3: Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Registro de Tiempos */}
          <Card title="Registro de Tiempos">
            <TimelineRow
              label="Apertura"
              datetime={workOrder.opened_at}
              isActive={status === 'OPEN'}
            />
            <TimelineRow
              label="Llegada"
              datetime={workOrder.arrival_at}
              isActive={false}
            />
            <TimelineRow
              label="Inicio de Trabajo"
              datetime={workOrder.started_at}
              isActive={status === 'IN_PROGRESS'}
            />
            <TimelineRow
              label="Finalizacion"
              datetime={workOrder.finished_at}
              isActive={status === 'PENDING_SIGNATURE' || status === 'SIGNED'}
            />
            <TimelineRow
              label="Cierre"
              datetime={workOrder.closed_at}
              isActive={status === 'CLOSED'}
            />

            {workOrder.total_hours !== null && Number(workOrder.total_hours) > 0 && (
              <div
                className="mt-4 pt-3"
                style={{ borderTop: '1px solid var(--card-border)' }}
              >
                <InfoField label="Horas Totales">
                  <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                    {Number(workOrder.total_hours).toFixed(1)}h
                  </span>
                </InfoField>
              </div>
            )}
          </Card>

          {/* Resultado */}
          <Card title="Resultado">
            {status === 'SIGNED' && isAdmin ? (
              <div>
                <Select
                  label="Resultado"
                  options={RESULT_OPTIONS}
                  value={closeResult}
                  onChange={(e) => setCloseResult(e.target.value)}
                />
                {workOrder.follow_up_notes && (
                  <InfoField label="Notas de Seguimiento">
                    <div className="whitespace-pre-wrap text-[0.83rem]" style={{ color: '#cbd5e1' }}>
                      {workOrder.follow_up_notes}
                    </div>
                  </InfoField>
                )}
              </div>
            ) : (
              <>
                <InfoField label="Resultado">
                  {workOrder.result ? (
                    <Badge
                      variant={
                        workOrder.result === 'RESOLVED'
                          ? 'success'
                          : workOrder.result === 'PARTIAL'
                          ? 'warning'
                          : workOrder.result === 'NOT_RESOLVED'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {workOrder.result_display || workOrder.result}
                    </Badge>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>{'\u2014'}</span>
                  )}
                </InfoField>
                <InfoField label="Notas de Seguimiento">
                  <div className="whitespace-pre-wrap text-[0.83rem]" style={{ color: '#cbd5e1' }}>
                    {workOrder.follow_up_notes || '\u2014'}
                  </div>
                </InfoField>
              </>
            )}
          </Card>

          {/* Costos */}
          <Card title="Costos">
            <InfoField label="Costo de Viaje">
              <span style={{ color: '#cbd5e1' }}>
                ${Number(workOrder.travel_cost ?? 0).toFixed(2)}
              </span>
            </InfoField>
            <InfoField label="Repuestos">
              <span style={{ color: '#cbd5e1' }}>
                ${Number(workOrder.total_spare_parts_cost ?? 0).toFixed(2)}
              </span>
            </InfoField>
            <div
              className="pt-3 mt-2"
              style={{ borderTop: '1px solid var(--card-border)' }}
            >
              <InfoField label="Firma del Cliente">
                {workOrder.is_signed_by_client ? (
                  <Badge variant="success">Firmada</Badge>
                ) : (
                  <Badge variant="secondary">Sin firma</Badge>
                )}
              </InfoField>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <WorkOrderFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        workOrder={workOrder}
      />

      {/* Signature Modal */}
      <SignWorkOrderModal
        open={signMode !== null}
        mode={signMode ?? 'client'}
        onClose={() => setSignMode(null)}
        workOrderId={workOrder.id}
      />
    </div>
  )
}
