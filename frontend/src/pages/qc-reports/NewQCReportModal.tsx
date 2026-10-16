import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WorkOrder, workOrdersApi } from '../../api/workOrders'
import { qcReportsApi } from '../../api/qcReports'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Select } from '../../components/ui/Input'

type ApiError = AxiosError<{ detail?: string }>

/** Equipment modality → practice preselected in the dialog. */
const MODALITY_TO_PRACTICE: Record<string, string> = {
  'Rayos X Fijo': 'RX',
  'Rayos X Portátil': 'RX',
  'Mamógrafo': 'MAMMO',
  'Tomógrafo (TAC)': 'CT',
  'Fluoroscopio': 'FLUORO',
}

interface Props {
  open: boolean
  onClose: () => void
  /** When given the report is created in this OT; otherwise the user picks an open OT. */
  workOrder?: WorkOrder
}

export default function NewQCReportModal({ open, onClose, workOrder }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [workOrderId, setWorkOrderId] = useState('')
  const [practice, setPractice] = useState('')

  useEffect(() => {
    if (!open) return
    setWorkOrderId(workOrder?.id ?? '')
    const modality = workOrder?.equipment_description?.split(' — ').pop() ?? ''
    setPractice(MODALITY_TO_PRACTICE[modality] ?? '')
  }, [open, workOrder])

  const { data: practices = [] } = useQuery({
    queryKey: ['qc-practices'],
    queryFn: () => qcReportsApi.practices().then((r) => r.data),
    enabled: open,
    staleTime: Infinity,
  })

  const { data: openOrders = [] } = useQuery({
    queryKey: ['work-orders', 'qc-picker'],
    queryFn: () =>
      workOrdersApi
        .list({ page_size: '100', ordering: '-opened_at' })
        .then((r) => r.data.results.filter((wo) => wo.status !== 'CLOSED')),
    enabled: open && !workOrder,
  })

  const createMutation = useMutation({
    mutationFn: () => qcReportsApi.create(workOrderId, practice),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['qc-reports'] })
      toast.success(`Informe ${data.number} creado`)
      onClose()
      navigate(`/qc-reports/${data.id}`)
    },
    onError: (err: ApiError) => toast.error(err?.response?.data?.detail || 'No se pudo crear el informe'),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo informe de control de calidad"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!workOrderId || !practice || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear informe'}
          </Button>
        </>
      }
    >
      <p className="text-[0.8rem] mb-3" style={{ color: 'var(--muted)' }}>
        El informe se crea con las pruebas y tolerancias del formato correspondiente del Manual de
        Seguridad Radiológica, y con los datos del equipo y del cliente de la OT.
      </p>
      {!workOrder && (
        <div className="mb-3">
          <Select
            label="Orden de trabajo"
            value={workOrderId}
            onChange={(e) => setWorkOrderId(e.target.value)}
            options={[
              { value: '', label: openOrders.length ? 'Seleccione la OT…' : 'No hay OT abiertas' },
              ...openOrders.map((wo) => ({
                value: wo.id,
                label: `${wo.number} — ${wo.client_name} — ${wo.equipment_code}`,
              })),
            ]}
          />
        </div>
      )}
      <Select
        label="Práctica"
        value={practice}
        onChange={(e) => setPractice(e.target.value)}
        options={[
          { value: '', label: 'Seleccione la práctica…' },
          ...practices.map((p) => ({ value: p.value, label: `${p.format} — ${p.label}` })),
        ]}
      />
    </Modal>
  )
}
