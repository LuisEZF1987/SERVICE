import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder, ChecklistItem } from '../../api/workOrders'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const TOLERANCE_OPTIONS = [
  { value: 'YES', label: 'Dentro de tolerancia' },
  { value: 'NO', label: 'Fuera de tolerancia' },
]

interface Props {
  workOrder: WorkOrder
  editable: boolean
}

interface ItemForm {
  task_name: string
  measured_value: string
  reference_value: string
  tolerance: string
  within: string // '' | 'YES' | 'NO'
  notes: string
  completed: boolean
}

const emptyForm: ItemForm = {
  task_name: '',
  measured_value: '',
  reference_value: '',
  tolerance: '',
  within: '',
  notes: '',
  completed: true,
}

export default function WorkOrderChecklistSection({ workOrder, editable }: Props) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChecklistItem | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm)

  const items = [...(workOrder.checklist_items ?? [])].sort((a, b) => a.order - b.order)
  const doneCount = items.filter((i) => i.completed).length

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] })

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: ChecklistItem) => {
    setEditing(item)
    setForm({
      task_name: item.task_name,
      measured_value: item.measured_value,
      reference_value: item.reference_value,
      tolerance: item.tolerance,
      within: item.is_within_tolerance === null ? '' : item.is_within_tolerance ? 'YES' : 'NO',
      notes: item.notes,
      completed: item.completed,
    })
    setModalOpen(true)
  }

  const payloadFromForm = (): Partial<ChecklistItem> => ({
    task_name: form.task_name,
    measured_value: form.measured_value,
    reference_value: form.reference_value,
    tolerance: form.tolerance,
    is_within_tolerance: form.within === '' ? null : form.within === 'YES',
    notes: form.notes,
    completed: form.completed,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? workOrdersApi.updateChecklistItem(workOrder.id, editing.id, payloadFromForm())
        : workOrdersApi.addChecklistItem(workOrder.id, {
            ...payloadFromForm(),
            order: items.length + 1,
          }),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Tarea actualizada' : 'Tarea agregada')
      closeModal()
    },
    onError: () => toast.error('Error al guardar la tarea'),
  })

  const toggleMutation = useMutation({
    mutationFn: (item: ChecklistItem) =>
      workOrdersApi.updateChecklistItem(workOrder.id, item.id, { completed: !item.completed }),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Error al actualizar la tarea'),
  })

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => workOrdersApi.deleteChecklistItem(workOrder.id, itemId),
    onSuccess: () => {
      invalidate()
      toast.success('Tarea eliminada')
    },
    onError: () => toast.error('Error al eliminar la tarea'),
  })

  const handleSubmit = () => {
    if (!form.task_name.trim()) {
      toast.error('Ingresa el nombre de la tarea')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Card title={`Checklist de Mantenimiento (${doneCount}/${items.length})`}>
      {items.length === 0 && (
        <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
          Sin tareas de checklist
          {editable ? ' — agrega las tareas ejecutadas durante el servicio.' : '.'}
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <input
            type="checkbox"
            checked={item.completed}
            disabled={!editable || toggleMutation.isPending}
            onChange={() => toggleMutation.mutate(item)}
            className="mt-1 cursor-pointer"
            style={{ accentColor: '#60a5fa', width: 15, height: 15 }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-[0.84rem] font-medium"
              style={{
                color: item.completed ? '#cbd5e1' : 'var(--text)',
                textDecoration: item.completed ? 'none' : 'none',
              }}
            >
              {item.task_name}
            </div>
            {(item.measured_value || item.reference_value || item.tolerance) && (
              <div className="text-[0.74rem] mt-0.5" style={{ color: '#94a3b8' }}>
                {item.measured_value && <>Medido: <strong>{item.measured_value}</strong></>}
                {item.reference_value && <> · Ref: {item.reference_value}</>}
                {item.tolerance && <> · Tol: {item.tolerance}</>}
              </div>
            )}
            {item.notes && (
              <div className="text-[0.74rem] mt-0.5" style={{ color: '#94a3b8' }}>
                {item.notes}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.is_within_tolerance === true && <Badge variant="success">OK</Badge>}
            {item.is_within_tolerance === false && <Badge variant="danger">Fuera</Badge>}
            {editable && (
              <>
                <button
                  onClick={() => openEdit(item)}
                  className="text-[0.7rem] font-semibold"
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                  className="text-[0.7rem] font-semibold"
                  style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {editable && (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={openAdd}>
            Agregar Tarea
          </Button>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Tarea del Checklist' : 'Agregar Tarea al Checklist'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : editing ? 'Actualizar' : 'Agregar'}
            </Button>
          </>
        }
      >
        <Input
          label="Tarea"
          value={form.task_name}
          onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
          placeholder="Ej: Calibración de kV del generador"
        />
        <div className="grid grid-cols-3 gap-x-3">
          <Input
            label="Valor medido"
            value={form.measured_value}
            onChange={(e) => setForm((f) => ({ ...f, measured_value: e.target.value }))}
            placeholder="Ej: 80.2 kV"
          />
          <Input
            label="Referencia"
            value={form.reference_value}
            onChange={(e) => setForm((f) => ({ ...f, reference_value: e.target.value }))}
            placeholder="Ej: 80 kV"
          />
          <Input
            label="Tolerancia"
            value={form.tolerance}
            onChange={(e) => setForm((f) => ({ ...f, tolerance: e.target.value }))}
            placeholder="Ej: ±5%"
          />
        </div>
        <Select
          label="Resultado (opcional)"
          options={TOLERANCE_OPTIONS}
          value={form.within}
          onChange={(e) => setForm((f) => ({ ...f, within: e.target.value }))}
        />
        <Textarea
          label="Observaciones (opcional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
        <label className="flex items-center gap-2 text-[0.85rem] cursor-pointer" style={{ color: '#cbd5e1' }}>
          <input
            type="checkbox"
            checked={form.completed}
            onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
            style={{ accentColor: '#60a5fa', width: 15, height: 15 }}
          />
          Tarea completada
        </label>
      </Modal>
    </Card>
  )
}
