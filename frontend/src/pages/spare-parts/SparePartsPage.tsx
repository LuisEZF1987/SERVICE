import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { sparePartsApi, SparePart } from '../../api/spareParts'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'

// --- Types ---

interface SparePartFormData {
  modality: string
  manufacturer: string
  equipment_model: string
  equipment_series: string
  part_number: string
  description: string
  unit_cost: string
  stock_quantity: string
  minimum_stock: string
  location: string
  supplier: string
}

const emptyForm: SparePartFormData = {
  modality: '',
  manufacturer: '',
  equipment_model: '',
  equipment_series: '',
  part_number: '',
  description: '',
  unit_cost: '',
  stock_quantity: '',
  minimum_stock: '',
  location: '',
  supplier: '',
}

// --- Constants ---

const modalityOptions = [
  { value: 'XRAY_FIXED', label: 'Rayos X Fijo' },
  { value: 'XRAY_PORTABLE', label: 'Rayos X Portatil' },
  { value: 'CT', label: 'Tomografo (TAC)' },
  { value: 'MRI', label: 'Resonancia Magnetica' },
  { value: 'ULTRASOUND', label: 'Ultrasonido' },
  { value: 'MAMMOGRAPH', label: 'Mamografo' },
  { value: 'FLUOROSCOPE', label: 'Fluoroscopio' },
  { value: 'DENSITOMETER', label: 'Densitometro' },
  { value: 'OTHER', label: 'Otro' },
]

const modalityFilterOptions = [
  { value: '', label: 'Todas las modalidades' },
  ...modalityOptions,
]

// --- Helpers ---

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0.00'
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// --- Component ---

export default function SparePartsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<SparePart | null>(null)
  const [form, setForm] = useState<SparePartFormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof SparePartFormData, string>>>({})

  // Query
  const { data: parts, isLoading } = useQuery({
    queryKey: ['spare-parts', search, modalityFilter, manufacturerFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (modalityFilter) params.modality = modalityFilter
      if (manufacturerFilter) params.manufacturer = manufacturerFilter
      return sparePartsApi.list(Object.keys(params).length > 0 ? params : undefined)
    },
    select: (res) => res.data.results,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<SparePart>) => sparePartsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Repuesto creado exitosamente')
      closeModal()
    },
    onError: () => toast.error('Error al crear el repuesto'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SparePart>) => sparePartsApi.update(editingPart!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] })
      toast.success('Repuesto actualizado exitosamente')
      closeModal()
    },
    onError: () => toast.error('Error al actualizar el repuesto'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Form handlers
  const openCreate = () => {
    setEditingPart(null)
    setForm(emptyForm)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (part: SparePart) => {
    setEditingPart(part)
    setForm({
      modality: part.modality || '',
      manufacturer: part.manufacturer || '',
      equipment_model: part.equipment_model || '',
      equipment_series: part.equipment_series || '',
      part_number: part.part_number || '',
      description: part.description || '',
      unit_cost: part.unit_cost != null ? String(part.unit_cost) : '',
      stock_quantity: part.stock_quantity != null ? String(part.stock_quantity) : '',
      minimum_stock: part.minimum_stock != null ? String(part.minimum_stock) : '',
      location: part.location || '',
      supplier: part.supplier || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingPart(null)
    setForm(emptyForm)
    setErrors({})
  }

  const handleChange = (field: keyof SparePartFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SparePartFormData, string>> = {}
    if (!form.part_number.trim()) newErrors.part_number = 'El numero de parte es obligatorio'
    if (!form.description.trim()) newErrors.description = 'La descripcion es obligatoria'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const payload: Partial<SparePart> = {
      modality: form.modality,
      manufacturer: form.manufacturer.trim(),
      equipment_model: form.equipment_model.trim(),
      equipment_series: form.equipment_series.trim(),
      part_number: form.part_number.trim(),
      description: form.description.trim(),
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : 0,
      stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : 0,
      minimum_stock: form.minimum_stock ? parseInt(form.minimum_stock) : 0,
      location: form.location.trim(),
      supplier: form.supplier.trim(),
    }
    if (editingPart) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  // Table columns
  const columns = [
    {
      key: 'part_number',
      header: 'No. Parte',
      render: (p: SparePart) => (
        <span style={{ fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.82rem' }}>
          {p.part_number}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descripcion',
    },
    {
      key: 'manufacturer',
      header: 'Fabricante',
    },
    {
      key: 'equipment_model',
      header: 'Modelo',
    },
    {
      key: 'modality_display',
      header: 'Modalidad',
      render: (p: SparePart) =>
        p.modality_display ? <Badge variant="info">{p.modality_display}</Badge> : <span style={{ color: 'var(--muted)' }}>--</span>,
    },
    {
      key: 'unit_cost',
      header: 'Costo Unit.',
      render: (p: SparePart) => (
        <span style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.unit_cost)}</span>
      ),
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (p: SparePart) => (
        <div className="flex items-center gap-2">
          <span style={{ fontWeight: 600, color: p.is_below_minimum_stock ? '#f87171' : '#cbd5e1' }}>
            {p.stock_quantity}
          </span>
          {p.is_below_minimum_stock && <Badge variant="danger">BAJO</Badge>}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Ubicacion',
    },
  ]

  // Section label helper
  const SectionLabel = ({ children }: { children: string }) => (
    <div
      className="sm:col-span-2 mb-1 mt-2 pb-1"
      style={{ borderBottom: '1px solid var(--card-border)' }}
    >
      <span className="text-[0.7rem] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
        {children}
      </span>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Inventario de Repuestos"
        subtitle={parts ? `${parts.length} repuesto${parts.length !== 1 ? 's' : ''} registrado${parts.length !== 1 ? 's' : ''}` : undefined}
        actions={
          <Button
            variant="primary"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            onClick={openCreate}
          >
            Nuevo Repuesto
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por numero de parte, descripcion..."
        />
        <select
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
          className="outline-none transition-all duration-200 cursor-pointer appearance-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            color: 'var(--text)',
            fontSize: '0.82rem',
            padding: '9px 36px 9px 14px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          {modalityFilterOptions.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={manufacturerFilter}
          onChange={(e) => setManufacturerFilter(e.target.value)}
          placeholder="Filtrar fabricante..."
          className="outline-none transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            color: 'var(--text)',
            fontSize: '0.82rem',
            padding: '9px 14px',
            minWidth: '160px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent)'
            e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--card-border)'
            e.target.style.boxShadow = 'none'
          }}
        />
      </div>

      <Card>
        <Table
          columns={columns}
          data={parts || []}
          loading={isLoading}
          emptyMessage="No se encontraron repuestos"
          onRowClick={openEdit}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingPart ? 'Editar Repuesto' : 'Nuevo Repuesto'}
        maxWidth="680px"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingPart ? 'Actualizar' : 'Crear Repuesto'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {/* Section: Equipo */}
          <SectionLabel>Equipo</SectionLabel>
          <Select
            label="Modalidad"
            value={form.modality}
            onChange={(e) => handleChange('modality', e.target.value)}
            options={modalityOptions}
            className="sm:col-span-2"
          />
          <Input
            label="Fabricante"
            value={form.manufacturer}
            onChange={(e) => handleChange('manufacturer', e.target.value)}
            placeholder="Siemens, GE, Philips..."
          />
          <Input
            label="Modelo de Equipo"
            value={form.equipment_model}
            onChange={(e) => handleChange('equipment_model', e.target.value)}
            placeholder="MOBILETT Mira Max"
          />
          <Input
            label="Serie"
            value={form.equipment_series}
            onChange={(e) => handleChange('equipment_series', e.target.value)}
            placeholder="Ej: Digiscan V-30"
            className="sm:col-span-2"
          />

          {/* Section: Repuesto */}
          <SectionLabel>Repuesto</SectionLabel>
          <Input
            label="Numero de Parte"
            value={form.part_number}
            onChange={(e) => handleChange('part_number', e.target.value)}
            error={errors.part_number}
            placeholder="10425483"
          />
          <div className="sm:col-span-1" />
          <Textarea
            label="Descripcion"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={errors.description}
            placeholder="Descripcion del repuesto..."
            className="sm:col-span-2"
            rows={2}
          />

          {/* Section: Inventario */}
          <SectionLabel>Inventario</SectionLabel>
          <Input
            label="Costo Unitario ($)"
            type="number"
            value={form.unit_cost}
            onChange={(e) => handleChange('unit_cost', e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Cantidad en Stock"
            type="number"
            value={form.stock_quantity}
            onChange={(e) => handleChange('stock_quantity', e.target.value)}
            placeholder="0"
          />
          <Input
            label="Stock Minimo"
            type="number"
            value={form.minimum_stock}
            onChange={(e) => handleChange('minimum_stock', e.target.value)}
            placeholder="5"
          />
          <Input
            label="Ubicacion"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Bodega A, Estante 3..."
          />
          <Input
            label="Proveedor"
            value={form.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            placeholder="Nombre del proveedor"
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </div>
  )
}
