import { useState } from 'react'
import type { AxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WorkOrder } from '../../api/workOrders'
import { qcReportsApi } from '../../api/qcReports'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

type ApiError = AxiosError<{ detail?: string; signed_document?: string[] }>

/** Equipment modality → practice preselected in the dialog. */
const MODALITY_TO_PRACTICE: Record<string, string> = {
  'Rayos X Fijo': 'RX',
  'Rayos X Portátil': 'RX',
  'Mamógrafo': 'MAMMO',
  'Tomógrafo (TAC)': 'CT',
  'Fluoroscopio': 'FLUORO',
}

const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success'> = {
  DRAFT: 'secondary',
  ISSUED: 'warning',
  SIGNED: 'success',
}

interface Props {
  workOrder: WorkOrder
  editable: boolean
}

export default function WorkOrderQCReportsSection({ workOrder, editable }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [practice, setPractice] = useState('')

  const { data: reports = [] } = useQuery({
    queryKey: ['qc-reports', workOrder.id],
    queryFn: () => qcReportsApi.listForWorkOrder(workOrder.id).then((r) => r.data.results),
  })

  const { data: practices = [] } = useQuery({
    queryKey: ['qc-practices'],
    queryFn: () => qcReportsApi.practices().then((r) => r.data),
    enabled: modalOpen,
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: () => qcReportsApi.create(workOrder.id, practice),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['qc-reports', workOrder.id] })
      toast.success(`Informe ${data.number} creado`)
      navigate(`/qc-reports/${data.id}`)
    },
    onError: (err: ApiError) => toast.error(err?.response?.data?.detail || 'No se pudo crear el informe'),
  })

  const openModal = () => {
    const modality = workOrder.equipment_description?.split(' — ').pop() ?? ''
    setPractice(MODALITY_TO_PRACTICE[modality] ?? '')
    setModalOpen(true)
  }

  return (
    <Card
      title={`Informes de Control de Calidad (${reports.length})`}
      actions={
        editable && (
          <Button size="sm" variant="secondary" onClick={openModal}>
            Nuevo informe
          </Button>
        )
      }
    >
      {reports.length === 0 && (
        <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
          Sin informes de control de calidad
          {editable ? ' — cree uno por cada equipo de rayos X evaluado en esta OT.' : '.'}
        </div>
      )}

      {reports.map((r) => (
        <Link
          key={r.id}
          to={`/qc-reports/${r.id}`}
          className="flex items-center justify-between gap-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
        >
          <div className="min-w-0">
            <div className="text-[0.84rem] font-semibold" style={{ color: '#e2e8f0' }}>
              {r.number}
            </div>
            <div className="text-[0.74rem]" style={{ color: '#94a3b8' }}>
              {r.practice_display}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status_display}</Badge>
        </Link>
      ))}

      <div className="text-[0.72rem] mt-3" style={{ color: 'var(--muted)' }}>
        El informe lleva solo la firma electrónica del técnico. La conformidad del cliente se
        registra con la firma de esta OT.
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo informe de control de calidad"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={!practice || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear informe'}
            </Button>
          </>
        }
      >
        <p className="text-[0.8rem] mb-3" style={{ color: 'var(--muted)' }}>
          Elija la práctica del equipo. El informe se crea con las pruebas y tolerancias del formato
          correspondiente del Manual de Seguridad Radiológica, y con los datos del equipo y del cliente.
        </p>
        <Select
          label="Práctica"
          value={practice}
          onChange={(e) => setPractice(e.target.value)}
          options={practices.map((p) => ({ value: p.value, label: `${p.format} — ${p.label}` }))}
        />
      </Modal>
    </Card>
  )
}
