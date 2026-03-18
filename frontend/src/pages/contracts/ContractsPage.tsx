import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { contractsApi, Contract } from '../../api/contracts'
import { clientsApi } from '../../api/clients'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'

// --- Types ---

interface ContractFormData {
  number: string
  contract_type: string
  client: string
  sercop_reference: string
  start_date: string
  end_date: string
  total_value: string
  payment_terms: string
  sla_response_hours: string
  preventive_visits_per_year: string
  status: string
  notes: string
}

const emptyForm: ContractFormData = {
  number: '',
  contract_type: '',
  client: '',
  sercop_reference: '',
  start_date: '',
  end_date: '',
  total_value: '',
  payment_terms: '',
  sla_response_hours: '',
  preventive_visits_per_year: '',
  status: 'DRAFT',
  notes: '',
}

const contractTypeOptions = [
  { value: 'ALL_INCLUSIVE', label: 'Todo incluido' },
  { value: 'PREVENTIVE_ONLY', label: 'Solo preventivos' },
  { value: 'FACTORY_WARRANTY', label: 'Garantia fabrica' },
  { value: 'TECHNICAL_WARRANTY', label: 'Garantia tecnica' },
  { value: 'PER_EVENT', label: 'Por evento' },
]

const contractTypeLabels: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple' }> = {
  ALL_INCLUSIVE: { label: 'Todo incluido', variant: 'success' },
  PREVENTIVE_ONLY: { label: 'Solo preventivos', variant: 'primary' },
  FACTORY_WARRANTY: { label: 'Garantia fabrica', variant: 'purple' },
  TECHNICAL_WARRANTY: { label: 'Garantia tecnica', variant: 'info' },
  PER_EVENT: { label: 'Por evento', variant: 'warning' },
}

const statusFilterOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'EXPIRED', label: 'Expirado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const statusOptions = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ACTIVE', label: 'Activo' },
]

// --- Helpers ---

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0.00'
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// --- Component ---

export default function ContractsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [form, setForm] = useState<ContractFormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof ContractFormData, string>>>({})
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', search, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      return contractsApi.list(Object.keys(params).length > 0 ? params : undefined)
    },
    select: (res) => res.data.results,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => clientsApi.list(),
    select: (res) => res.data.results,
  })

  const clientOptions = (clients || []).map((c) => ({ value: c.id, label: c.name }))

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: FormData) => contractsApi.createWithFile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrato creado exitosamente')
      closeModal()
    },
    onError: () => toast.error('Error al crear el contrato'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData | Partial<Contract>) => {
      if (data instanceof FormData) {
        return contractsApi.updateWithFile(editingContract!.id, data)
      }
      return contractsApi.update(editingContract!.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrato actualizado exitosamente')
      closeModal()
    },
    onError: () => toast.error('Error al actualizar el contrato'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Form handlers
  const openCreate = () => {
    setEditingContract(null)
    setForm(emptyForm)
    setErrors({})
    setDocumentFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setModalOpen(true)
  }

  const openEdit = (contract: Contract) => {
    setEditingContract(contract)
    setForm({
      number: contract.number || '',
      contract_type: contract.contract_type || '',
      client: contract.client || '',
      sercop_reference: contract.sercop_reference || '',
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      total_value: contract.total_value != null ? String(contract.total_value) : '',
      payment_terms: contract.payment_terms || '',
      sla_response_hours: contract.sla_response_hours != null ? String(contract.sla_response_hours) : '',
      preventive_visits_per_year: contract.preventive_visits_per_year != null ? String(contract.preventive_visits_per_year) : '',
      status: contract.status || 'DRAFT',
      notes: contract.notes || '',
    })
    setErrors({})
    setDocumentFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingContract(null)
    setForm(emptyForm)
    setErrors({})
    setDocumentFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleChange = (field: keyof ContractFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContractFormData, string>> = {}
    if (!form.number.trim()) newErrors.number = 'El numero es obligatorio'
    if (!form.contract_type) newErrors.contract_type = 'Seleccione un tipo'
    if (!form.client) newErrors.client = 'Seleccione un cliente'
    if (!form.start_date) newErrors.start_date = 'La fecha de inicio es obligatoria'
    if (!form.end_date) newErrors.end_date = 'La fecha de fin es obligatoria'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    if (editingContract && !documentFile) {
      // Update without file: use JSON PATCH to avoid FormData issues
      const payload: Partial<Contract> = {
        number: form.number.trim(),
        contract_type: form.contract_type,
        client: form.client,
        sercop_reference: form.sercop_reference.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        total_value: form.total_value ? parseFloat(form.total_value) : 0,
        payment_terms: form.payment_terms,
        sla_response_hours: form.sla_response_hours ? parseInt(form.sla_response_hours) : 0,
        preventive_visits_per_year: form.preventive_visits_per_year ? parseInt(form.preventive_visits_per_year) : 0,
        status: form.status,
        notes: form.notes,
      }
      updateMutation.mutate(payload)
    } else {
      // Create or update with file: use FormData
      const formData = new FormData()
      formData.append('number', form.number.trim())
      formData.append('contract_type', form.contract_type)
      formData.append('client', form.client)
      formData.append('sercop_reference', form.sercop_reference.trim())
      formData.append('start_date', form.start_date)
      formData.append('end_date', form.end_date)
      formData.append('total_value', form.total_value ? form.total_value : '0')
      formData.append('payment_terms', form.payment_terms)
      formData.append('sla_response_hours', form.sla_response_hours ? form.sla_response_hours : '0')
      formData.append('preventive_visits_per_year', form.preventive_visits_per_year ? form.preventive_visits_per_year : '0')
      formData.append('status', form.status)
      formData.append('notes', form.notes)

      if (documentFile) {
        formData.append('document', documentFile)
      }

      if (editingContract) {
        updateMutation.mutate(formData)
      } else {
        createMutation.mutate(formData)
      }
    }
  }

  // Table columns
  const columns = [
    {
      key: 'number',
      header: 'Numero',
      render: (c: Contract) => (
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.number}</span>
      ),
    },
    {
      key: 'client_name',
      header: 'Cliente',
    },
    {
      key: 'contract_type',
      header: 'Tipo',
      render: (c: Contract) => {
        const ct = contractTypeLabels[c.contract_type]
        return ct ? <Badge variant={ct.variant}>{ct.label}</Badge> : <span>{c.contract_type}</span>
      },
    },
    {
      key: 'start_date',
      header: 'Inicio',
    },
    {
      key: 'end_date',
      header: 'Fin',
    },
    {
      key: 'total_value',
      header: 'Valor Total',
      render: (c: Contract) => (
        <span style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(c.total_value)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c: Contract) => <StatusBadge status={c.status} />,
    },
    {
      key: 'document',
      header: 'Doc',
      render: (c: Contract) => {
        if (c.document) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.open(c.document!, '_blank')
              }}
              title="Ver documento PDF"
              className="inline-flex items-center justify-center transition-all duration-200"
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.15)',
                cursor: 'pointer',
                color: '#f87171',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            </button>
          )
        }
        return <span style={{ color: 'var(--muted)' }}>--</span>
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle={contracts ? `${contracts.length} contrato${contracts.length !== 1 ? 's' : ''} registrado${contracts.length !== 1 ? 's' : ''}` : undefined}
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
            Nuevo Contrato
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por numero, cliente..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
          {statusFilterOptions.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <Table
          columns={columns}
          data={contracts || []}
          loading={isLoading}
          emptyMessage="No se encontraron contratos"
          onRowClick={openEdit}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingContract ? 'Editar Contrato' : 'Nuevo Contrato'}
        maxWidth="680px"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingContract ? 'Actualizar' : 'Crear Contrato'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Input
            label="Numero de Contrato"
            value={form.number}
            onChange={(e) => handleChange('number', e.target.value)}
            error={errors.number}
            placeholder="CONT-2026-001"
          />
          <Select
            label="Tipo de Contrato"
            value={form.contract_type}
            onChange={(e) => handleChange('contract_type', e.target.value)}
            options={contractTypeOptions}
            error={errors.contract_type}
          />
          <Select
            label="Cliente"
            value={form.client}
            onChange={(e) => handleChange('client', e.target.value)}
            options={clientOptions}
            error={errors.client}
            className="sm:col-span-2"
          />
          <Input
            label="Referencia SERCOP"
            value={form.sercop_reference}
            onChange={(e) => handleChange('sercop_reference', e.target.value)}
            placeholder="SIE-XXX-2026"
          />
          <Select
            label="Estado"
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={statusOptions}
          />
          <Input
            label="Fecha de Inicio"
            type="date"
            value={form.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            error={errors.start_date}
          />
          <Input
            label="Fecha de Fin"
            type="date"
            value={form.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            error={errors.end_date}
          />
          <Input
            label="Valor Total ($)"
            type="number"
            value={form.total_value}
            onChange={(e) => handleChange('total_value', e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="SLA Respuesta (horas)"
            type="number"
            value={form.sla_response_hours}
            onChange={(e) => handleChange('sla_response_hours', e.target.value)}
            placeholder="24"
          />
          <Input
            label="Visitas Preventivas / Ano"
            type="number"
            value={form.preventive_visits_per_year}
            onChange={(e) => handleChange('preventive_visits_per_year', e.target.value)}
            placeholder="4"
          />

          {/* PDF Document Upload */}
          <div className="sm:col-span-2 mb-4">
            <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
              Documento del Contrato (PDF)
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
              style={{
                background: 'rgba(30,41,59,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[0.78rem] font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(96,165,250,0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(96,165,250,0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.2)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.1)'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Seleccionar archivo
              </button>
              <span className="text-[0.8rem] truncate" style={{ color: 'var(--muted)' }}>
                {documentFile
                  ? documentFile.name
                  : editingContract?.document
                    ? 'Documento actual cargado'
                    : 'Ningun archivo seleccionado'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setDocumentFile(file)
                }}
              />
            </div>
            {editingContract?.document && !documentFile && (
              <a
                href={editingContract.document}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-[0.75rem]"
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline' }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15,3 21,3 21,9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Ver documento actual
              </a>
            )}
          </div>

          <Textarea
            label="Condiciones de Pago"
            value={form.payment_terms}
            onChange={(e) => handleChange('payment_terms', e.target.value)}
            placeholder="Condiciones de pago..."
            className="sm:col-span-2"
            rows={2}
          />
          <Textarea
            label="Notas"
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Observaciones adicionales..."
            className="sm:col-span-2"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  )
}
