import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder } from '../../api/workOrders'
import { equipmentApi, Equipment } from '../../api/equipment'
import { clientsApi, Client } from '../../api/clients'
import api from '../../api/client'
import { User } from '../../api/auth'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Select, Textarea } from '../../components/ui/Input'

const OT_TYPE_OPTIONS = [
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'CALIBRATION', label: 'Calibracion' },
  { value: 'INSTALLATION', label: 'Instalacion' },
  { value: 'WARRANTY', label: 'Garantia' },
]

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'SCHEDULED', label: 'Programado' },
]

const COMPANY_OPTIONS = [
  { value: 'VIAT', label: 'Viat' },
  { value: 'DIMED', label: 'Dimed Healthcare' },
]

interface WorkOrderFormModalProps {
  open: boolean
  onClose: () => void
  workOrder?: WorkOrder | null
}

interface FormData {
  ot_type: string
  priority: string
  equipment: string
  client: string
  technician: string
  executing_company: string
  reported_problem: string
}

const defaultForm: FormData = {
  ot_type: 'CORRECTIVE',
  priority: 'NORMAL',
  equipment: '',
  client: '',
  technician: '',
  executing_company: 'DIMED',
  reported_problem: '',
}

export default function WorkOrderFormModal({ open, onClose, workOrder }: WorkOrderFormModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!workOrder

  const [form, setForm] = useState<FormData>(defaultForm)

  // Load equipment list
  const { data: equipmentData } = useQuery({
    queryKey: ['equipment-list'],
    queryFn: () => equipmentApi.list({ page_size: '500' }).then((r) => r.data),
    enabled: open,
  })

  // Load clients list
  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list({ page_size: '500' }).then((r) => r.data),
    enabled: open,
  })

  // Load technicians list
  const { data: techniciansData } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: () => api.get<{ results: User[] }>('/auth/users/', { params: { role: 'TECHNICIAN' } }).then((r) => r.data),
    enabled: open,
  })

  const equipmentList = equipmentData?.results ?? []
  const clientsList = clientsData?.results ?? []
  const techniciansList = techniciansData?.results ?? []

  // Equipment options
  const equipmentOptions = equipmentList.map((eq: Equipment) => ({
    value: eq.id,
    label: `${eq.internal_code} - ${eq.brand} ${eq.model_name}`,
  }))

  // Client options
  const clientOptions = clientsList.map((c: Client) => ({
    value: c.id,
    label: c.name,
  }))

  // Technician options
  const technicianOptions = techniciansList.map((u: User) => ({
    value: u.id,
    label: u.full_name,
  }))

  // Populate form when editing
  useEffect(() => {
    if (workOrder) {
      setForm({
        ot_type: workOrder.ot_type,
        priority: workOrder.priority,
        equipment: workOrder.equipment,
        client: workOrder.client,
        technician: workOrder.technician,
        executing_company: workOrder.executing_company,
        reported_problem: workOrder.reported_problem,
      })
    } else {
      setForm(defaultForm)
    }
  }, [workOrder, open])

  // Auto-fill client when equipment is selected
  useEffect(() => {
    if (form.equipment && equipmentList.length > 0) {
      const selectedEquipment = equipmentList.find((eq: Equipment) => eq.id === form.equipment)
      if (selectedEquipment && selectedEquipment.client) {
        setForm((prev) => ({ ...prev, client: selectedEquipment.client }))
      }
    }
  }, [form.equipment, equipmentList])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<WorkOrder>) => workOrdersApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('OT creada exitosamente')
      onClose()
      navigate(`/work-orders/${response.data.id}`)
    },
    onError: () => {
      toast.error('Error al crear la OT')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<WorkOrder>) => workOrdersApi.update(workOrder!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrder!.id] })
      toast.success('OT actualizada exitosamente')
      onClose()
    },
    onError: () => {
      toast.error('Error al actualizar la OT')
    },
  })

  const handleSubmit = () => {
    if (!form.equipment) {
      toast.error('Selecciona un equipo')
      return
    }
    if (!form.technician) {
      toast.error('Selecciona un tecnico')
      return
    }
    if (!form.reported_problem.trim()) {
      toast.error('Describe el problema reportado')
      return
    }

    const payload: Partial<WorkOrder> = {
      ot_type: form.ot_type,
      priority: form.priority,
      equipment: form.equipment,
      client: form.client,
      technician: form.technician,
      executing_company: form.executing_company,
      reported_problem: form.reported_problem,
    }

    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar OT ${workOrder?.number}` : 'Nueva Orden de Trabajo'}
      maxWidth="620px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar OT' : 'Crear OT'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Select
          label="Tipo de OT"
          options={OT_TYPE_OPTIONS}
          value={form.ot_type}
          onChange={(e) => updateField('ot_type', e.target.value)}
        />
        <Select
          label="Prioridad"
          options={PRIORITY_OPTIONS}
          value={form.priority}
          onChange={(e) => updateField('priority', e.target.value)}
        />
      </div>

      <Select
        label="Equipo"
        options={equipmentOptions}
        value={form.equipment}
        onChange={(e) => updateField('equipment', e.target.value)}
      />

      <Select
        label="Cliente"
        options={clientOptions}
        value={form.client}
        onChange={(e) => updateField('client', e.target.value)}
      />

      <Select
        label="Tecnico Asignado"
        options={technicianOptions}
        value={form.technician}
        onChange={(e) => updateField('technician', e.target.value)}
      />

      <Select
        label="Empresa Ejecutora"
        options={COMPANY_OPTIONS}
        value={form.executing_company}
        onChange={(e) => updateField('executing_company', e.target.value)}
      />

      <Textarea
        label="Problema Reportado"
        value={form.reported_problem}
        onChange={(e) => updateField('reported_problem', e.target.value)}
        placeholder="Describe el problema o motivo de la orden de trabajo..."
        rows={4}
      />
    </Modal>
  )
}
