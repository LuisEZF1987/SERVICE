import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { manualsApi, TechnicalManual } from '../../api/manuals'
import { catalogApi } from '../../api/catalog'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'

const DOC_TYPE_OPTIONS = [
  { value: 'SERVICE_MANUAL', label: 'Manual de servicio' },
  { value: 'USER_MANUAL', label: 'Manual de usuario' },
  { value: 'PRE_INSTALL_FORM', label: 'Formulario de pre-instalación' },
  { value: 'PRE_INSTALL_MANUAL', label: 'Manual de pre-instalación' },
  { value: 'TRAINING', label: 'Plan de capacitación' },
  { value: 'BROCHURE', label: 'Catálogo / Brochure' },
  { value: 'DATASHEET', label: 'Datasheet' },
  { value: 'OTHER', label: 'Otro' },
]

const DOC_TYPE_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  SERVICE_MANUAL: 'primary',
  USER_MANUAL: 'info',
  PRE_INSTALL_FORM: 'warning',
  PRE_INSTALL_MANUAL: 'warning',
  TRAINING: 'success',
  BROCHURE: 'purple',
  DATASHEET: 'secondary',
  OTHER: 'secondary',
}

const MODALITY_OPTIONS = [
  { value: 'XRAY_FIXED', label: 'Rayos X Fijo' },
  { value: 'XRAY_PORTABLE', label: 'Rayos X Portátil' },
  { value: 'CT', label: 'Tomógrafo (TAC)' },
  { value: 'MRI', label: 'Resonancia Magnética' },
  { value: 'ULTRASOUND', label: 'Ultrasonido' },
  { value: 'MAMMOGRAPH', label: 'Mamógrafo' },
  { value: 'FLUOROSCOPE', label: 'Fluoroscopio' },
  { value: 'DENSITOMETER', label: 'Densitómetro' },
  { value: 'OTHER', label: 'Otro' },
]

const filterSelectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--card-border)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontSize: '0.82rem',
  padding: '9px 36px 9px 14px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
}

interface FormState {
  title: string
  document_type: string
  brand: string
  model_name: string
  modality: string
  language: string
  catalog_model: string
  catalog_series: string
  notes: string
}

const emptyForm: FormState = {
  title: '',
  document_type: 'SERVICE_MANUAL',
  brand: '',
  model_name: '',
  modality: 'XRAY_FIXED',
  language: 'Español',
  catalog_model: '',
  catalog_series: '',
  notes: '',
}

export default function ManualsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canManage = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'

  const { data: manuals, isLoading } = useQuery({
    queryKey: ['manuals', typeFilter, search],
    queryFn: () => {
      const params: Record<string, string> = { page_size: '200' }
      if (typeFilter) params.document_type = typeFilter
      if (search.trim()) params.search = search.trim()
      return manualsApi.list(params).then((r) => r.data.results)
    },
  })

  const { data: catalogModels } = useQuery({
    queryKey: ['catalog-models-all'],
    queryFn: () => catalogApi.listModels({ page_size: '500' }).then((r) => r.data.results),
    enabled: modalOpen,
  })

  const { data: catalogSeries } = useQuery({
    queryKey: ['catalog-series', form.catalog_model],
    queryFn: () =>
      catalogApi.listSeries({ equipment_model: form.catalog_model, page_size: '200' }).then((r) => r.data.results),
    enabled: modalOpen && !!form.catalog_model,
  })

  const modelOptions = (catalogModels ?? []).map((m) => ({
    value: m.id,
    label: `${m.manufacturer_name} — ${m.name}`,
  }))
  const seriesOptions = (catalogSeries ?? []).map((s) => ({ value: s.id, label: s.name }))

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Picking a catalog model auto-fills brand / model / modality
  const handleCatalogModel = (modelId: string) => {
    const m = (catalogModels ?? []).find((x) => x.id === modelId)
    setForm((f) => ({
      ...f,
      catalog_model: modelId,
      catalog_series: '',
      brand: m ? m.manufacturer_name : f.brand,
      model_name: m ? m.name : f.model_name,
      modality: m ? m.modality : f.modality,
    }))
  }

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('document_type', form.document_type)
      fd.append('brand', form.brand)
      fd.append('model_name', form.model_name)
      fd.append('modality', form.modality)
      fd.append('language', form.language)
      fd.append('notes', form.notes)
      if (form.catalog_model) fd.append('equipment_model', form.catalog_model)
      if (form.catalog_series) fd.append('equipment_series', form.catalog_series)
      fd.append('file', file!)
      return manualsApi.create(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] })
      toast.success('Manual cargado')
      closeModal()
    },
    onError: () => toast.error('Error al cargar el manual'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => manualsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] })
      toast.success('Manual eliminado')
    },
    onError: () => toast.error('Error al eliminar el manual'),
  })

  const handleSubmit = () => {
    if (!form.brand.trim() || !form.model_name.trim()) {
      toast.error('Ingresa la marca y el modelo')
      return
    }
    if (!file) {
      toast.error('Selecciona el archivo del manual')
      return
    }
    uploadMutation.mutate()
  }

  const columns = [
    {
      key: 'title',
      header: 'Documento',
      render: (m: TechnicalManual) => (
        <div>
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{m.title || `${m.brand} ${m.model_name}`}</span>
          {m.equipment_series_name && (
            <div className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
              Serie: {m.equipment_series_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Tipo',
      render: (m: TechnicalManual) => (
        <Badge variant={DOC_TYPE_VARIANT[m.document_type] ?? 'secondary'}>
          {m.document_type_display}
        </Badge>
      ),
    },
    { key: 'brand', header: 'Marca' },
    { key: 'model_name', header: 'Modelo' },
    { key: 'modality_display', header: 'Modalidad' },
    { key: 'language', header: 'Idioma', render: (m: TechnicalManual) => m.language || '—' },
    {
      key: 'actions',
      header: '',
      render: (m: TechnicalManual) => (
        <div className="flex items-center gap-2 justify-end">
          <a
            href={m.file}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(96,165,250,0.1)', color: 'var(--accent)', border: '1px solid rgba(96,165,250,0.2)', textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            Abrir
          </a>
          {canManage && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteMutation.mutate(m.id)
              }}
              disabled={deleteMutation.isPending}
              className="text-[0.72rem] font-semibold"
              style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Eliminar
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Biblioteca de Manuales"
        subtitle={manuals ? `${manuals.length} documento${manuals.length !== 1 ? 's' : ''} técnico${manuals.length !== 1 ? 's' : ''}` : 'Manuales de servicio, usuario, pre-instalación y datasheets'}
        actions={canManage ? <Button onClick={() => setModalOpen(true)}>Cargar Manual</Button> : undefined}
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="outline-none cursor-pointer appearance-none"
          style={filterSelectStyle}
        >
          <option value="" style={{ background: '#0f172a' }}>Todos los tipos</option>
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por marca, modelo o título..."
          className="outline-none flex-1 min-w-[220px] max-w-[380px]"
          style={{ ...filterSelectStyle, backgroundImage: 'none', padding: '9px 14px' }}
        />
      </div>

      <Card>
        <Table
          columns={columns}
          data={manuals || []}
          loading={isLoading}
          emptyMessage="Sin manuales en la biblioteca"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Cargar Manual Técnico"
        maxWidth="640px"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={uploadMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Cargando...' : 'Cargar Manual'}
            </Button>
          </>
        }
      >
        <Select
          label="Modelo del catálogo (opcional — autocompleta marca y modelo)"
          options={modelOptions}
          value={form.catalog_model}
          onChange={(e) => handleCatalogModel(e.target.value)}
        />
        {form.catalog_model && (
          <Select
            label="Serie / Variante (opcional)"
            options={seriesOptions}
            value={form.catalog_series}
            onChange={(e) => setForm((f) => ({ ...f, catalog_series: e.target.value }))}
          />
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            label="Marca"
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            placeholder="Ej: Allengers"
          />
          <Input
            label="Modelo"
            value={form.model_name}
            onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
            placeholder="Ej: HF 59R"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Select
            label="Tipo de documento"
            options={DOC_TYPE_OPTIONS}
            value={form.document_type}
            onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}
          />
          <Select
            label="Modalidad"
            options={MODALITY_OPTIONS}
            value={form.modality}
            onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            label="Título (opcional)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Se genera de marca + modelo si se omite"
          />
          <Input
            label="Idioma"
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          />
        </div>
        <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
          Archivo (HTML autocontenido o PDF)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-[0.85rem] mb-4"
          style={{ color: 'var(--text)' }}
        />
      </Modal>
    </div>
  )
}
