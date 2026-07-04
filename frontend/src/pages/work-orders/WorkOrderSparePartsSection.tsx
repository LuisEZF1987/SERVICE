import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder } from '../../api/workOrders'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

interface Props {
  workOrder: WorkOrder
  editable: boolean
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--card-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '7px 8px',
  fontSize: '0.82rem',
  color: '#cbd5e1',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
}

export default function WorkOrderSparePartsSection({ workOrder, editable }: Props) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] })

  const closeModal = () => {
    setModalOpen(false)
    setDescription('')
    setCode('')
    setQuantity('1')
    setUnitCost('')
  }

  const addMutation = useMutation({
    mutationFn: () =>
      workOrdersApi.addSparePart(workOrder.id, {
        description,
        code,
        quantity: Number(quantity),
        unit_cost: unitCost || '0',
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Repuesto registrado')
      closeModal()
    },
    onError: () => toast.error('Error al registrar el repuesto'),
  })

  const deleteMutation = useMutation({
    mutationFn: (partId: string) => workOrdersApi.deleteSparePart(workOrder.id, partId),
    onSuccess: () => {
      invalidate()
      toast.success('Repuesto eliminado')
    },
    onError: () => toast.error('Error al eliminar el repuesto'),
  })

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error('Ingresa la descripción del repuesto')
      return
    }
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('La cantidad debe ser un entero mayor a 0')
      return
    }
    if (unitCost && Number.isNaN(Number(unitCost))) {
      toast.error('El costo unitario no es válido')
      return
    }
    addMutation.mutate()
  }

  const parts = workOrder.spare_parts_used ?? []
  const total = parts.reduce((acc, sp) => acc + Number(sp.total_cost ?? 0), 0)

  return (
    <Card title={`Repuestos Utilizados (${parts.length})`}>
      {parts.length === 0 && (
        <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
          Sin repuestos registrados{editable ? ' — agrega los repuestos usados en el servicio.' : '.'}
        </div>
      )}

      {parts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Código</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Cant.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Costo unit.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                {editable && <th style={thStyle} />}
              </tr>
            </thead>
            <tbody>
              {parts.map((sp) => (
                <tr key={sp.id}>
                  <td style={tdStyle}>{sp.description}</td>
                  <td style={tdStyle}>{sp.code || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{sp.quantity}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    ${Number(sp.unit_cost).toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    ${Number(sp.total_cost).toFixed(2)}
                  </td>
                  {editable && (
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => deleteMutation.mutate(sp.id)}
                        disabled={deleteMutation.isPending}
                        className="text-[0.7rem] font-semibold"
                        style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr>
                <td colSpan={editable ? 4 : 3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                  Total repuestos
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                  ${total.toFixed(2)}
                </td>
                {editable && <td style={tdStyle} />}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {editable && (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
            Agregar Repuesto
          </Button>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Registrar Repuesto Utilizado"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={addMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Guardando...' : 'Registrar'}
            </Button>
          </>
        }
      >
        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Filtro de aire del generador"
        />
        <Input
          label="Código / Part # (opcional)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ej: FA-2043"
        />
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            label="Cantidad"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Costo unitario (USD)"
            type="number"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </Modal>
    </Card>
  )
}
