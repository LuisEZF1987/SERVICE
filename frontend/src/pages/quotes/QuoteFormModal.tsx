import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { quotesApi, Quote, QuoteInput, QuoteItem } from '../../api/quotes'
import { clientsApi } from '../../api/clients'
import { equipmentApi } from '../../api/equipment'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'

const KIND_OPTIONS = [
  { value: 'LABOR', label: 'Mano de obra' },
  { value: 'PART', label: 'Repuesto' },
  { value: 'TRAVEL', label: 'Traslado / viáticos' },
  { value: 'OTHER', label: 'Otro' },
]

interface ItemRow {
  kind: string
  description: string
  code: string
  quantity: string
  unit_price: string
}

const emptyItem: ItemRow = { kind: 'LABOR', description: '', code: '', quantity: '1', unit_price: '' }

export interface QuotePrefill {
  client?: string
  equipment?: string | null
  ticket?: string | null
  title?: string
}

interface Props {
  open: boolean
  onClose: () => void
  quote?: Quote | null
  prefill?: QuotePrefill
}

export default function QuoteFormModal({ open, onClose, quote, prefill }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!quote

  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [equipment, setEquipment] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState(
    '50% de anticipo para iniciar el trabajo; 50% contra entrega e instalación.'
  )
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }])

  useEffect(() => {
    if (!open) return
    if (quote) {
      setTitle(quote.title)
      setClient(quote.client)
      setEquipment(quote.equipment ?? '')
      setNotes(quote.notes)
      setPaymentTerms(quote.payment_terms)
      setItems(
        quote.items.map((i: QuoteItem) => ({
          kind: i.kind,
          description: i.description,
          code: i.code,
          quantity: String(i.quantity),
          unit_price: String(i.unit_price),
        }))
      )
    } else {
      setTitle(prefill?.title ?? '')
      setClient(prefill?.client ?? '')
      setEquipment(prefill?.equipment ?? '')
      setNotes('')
      setItems([{ ...emptyItem }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote])

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list({ page_size: '500' }).then((r) => r.data),
    enabled: open,
  })

  const { data: equipmentData } = useQuery({
    queryKey: ['equipment-by-client', client],
    queryFn: () => equipmentApi.list({ client, page_size: '500' }).then((r) => r.data),
    enabled: open && !!client,
  })

  const clientOptions = (clientsData?.results ?? []).map((c) => ({ value: c.id, label: c.name }))
  const equipmentOptions = (equipmentData?.results ?? []).map((e) => ({
    value: e.id,
    label: `${e.internal_code} — ${e.brand} ${e.model_name}`,
  }))

  const updateItem = (index: number, field: keyof ItemRow, value: string) =>
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  const subtotal = items.reduce(
    (acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  )
  const iva = subtotal * 0.15
  const total = subtotal + iva

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: QuoteInput = {
        title,
        client,
        equipment: equipment || null,
        ticket: prefill?.ticket ?? (quote?.ticket || null),
        notes,
        payment_terms: paymentTerms,
        items: items
          .filter((i) => i.description.trim())
          .map((i, index) => ({
            kind: i.kind,
            description: i.description,
            code: i.code,
            quantity: i.quantity || '1',
            unit_price: i.unit_price || '0',
            order: index,
          })),
      }
      return isEdit ? quotesApi.update(quote!.id, payload) : quotesApi.create(payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quote', res.data.id] })
      toast.success(isEdit ? 'Cotización actualizada' : `Cotización ${res.data.number} creada`)
      onClose()
      if (!isEdit) navigate(`/quotes/${res.data.id}`)
    },
    onError: () => toast.error('Error al guardar la cotización'),
  })

  const handleSubmit = () => {
    if (!title.trim()) return void toast.error('Ingresa el título / objeto de la cotización')
    if (!client) return void toast.error('Selecciona el cliente')
    if (!items.some((i) => i.description.trim())) {
      return void toast.error('Agrega al menos un ítem')
    }
    saveMutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar ${quote?.number}` : 'Nueva Cotización'}
      maxWidth="780px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Cotización'}
          </Button>
        </>
      }
    >
      <Input
        label="Título / objeto"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ej: Cambio de detector y calibración"
      />
      <div className="grid grid-cols-2 gap-x-4">
        <Select label="Cliente" options={clientOptions} value={client} onChange={(e) => { setClient(e.target.value); setEquipment('') }} />
        <Select label="Equipo (opcional)" options={equipmentOptions} value={equipment} onChange={(e) => setEquipment(e.target.value)} />
      </div>

      <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
        Ítems
      </label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2 items-start">
          <select
            value={item.kind}
            onChange={(e) => updateItem(index, 'kind', e.target.value)}
            className="outline-none"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.78rem', padding: '9px 8px', width: 120 }}
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>{o.label}</option>
            ))}
          </select>
          <input
            value={item.description}
            onChange={(e) => updateItem(index, 'description', e.target.value)}
            placeholder="Descripción"
            className="outline-none flex-1"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.82rem', padding: '9px 10px' }}
          />
          <input
            value={item.code}
            onChange={(e) => updateItem(index, 'code', e.target.value)}
            placeholder="Código"
            className="outline-none"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.82rem', padding: '9px 10px', width: 90 }}
          />
          <input
            type="number"
            min={0}
            step="0.5"
            value={item.quantity}
            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
            placeholder="Cant."
            className="outline-none"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.82rem', padding: '9px 8px', width: 70 }}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={item.unit_price}
            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
            placeholder="P. unit."
            className="outline-none"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.82rem', padding: '9px 8px', width: 95 }}
          />
          <button
            onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}
            disabled={items.length === 1}
            className="mt-1.5"
            style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: items.length === 1 ? 0.3 : 1 }}
            title="Eliminar ítem"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" variant="ghost" onClick={() => setItems((rows) => [...rows, { ...emptyItem }])}>
          + Agregar ítem
        </Button>
        <div className="text-[0.82rem]" style={{ color: '#94a3b8' }}>
          Subtotal <strong style={{ color: '#f1f5f9' }}>${subtotal.toFixed(2)}</strong>
          {' · '}IVA 15% <strong style={{ color: '#f1f5f9' }}>${iva.toFixed(2)}</strong>
          {' · '}Total <strong style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</strong>
        </div>
      </div>

      <Textarea
        label="Forma de pago"
        value={paymentTerms}
        onChange={(e) => setPaymentTerms(e.target.value)}
        rows={2}
      />
      <Textarea
        label="Observaciones (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
    </Modal>
  )
}
