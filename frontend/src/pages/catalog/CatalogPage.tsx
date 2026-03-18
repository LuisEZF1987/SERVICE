import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  catalogApi,
  Manufacturer,
  EquipmentCatalogModel,
  EquipmentSeries,
} from '../../api/catalog'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

type Tab = 'fabricantes' | 'modelos' | 'series'

const MODALITY_OPTIONS = [
  { value: 'CT', label: 'Tomografía (CT)' },
  { value: 'MRI', label: 'Resonancia (MRI)' },
  { value: 'US', label: 'Ultrasonido (US)' },
  { value: 'XR', label: 'Rayos X (XR)' },
  { value: 'MG', label: 'Mamografía (MG)' },
  { value: 'NM', label: 'Medicina Nuclear (NM)' },
  { value: 'ENDO', label: 'Endoscopia (ENDO)' },
  { value: 'MON', label: 'Monitoreo (MON)' },
  { value: 'OTHER', label: 'Otro (OTHER)' },
]

const modalityBadgeVariant: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  CT: 'primary',
  MRI: 'purple',
  US: 'info',
  XR: 'warning',
  MG: 'success',
  NM: 'danger',
  ENDO: 'success',
  MON: 'info',
  OTHER: 'secondary',
}

// ─── Active Dot ──────────────────────────────────────────────────

function ActiveDot({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          display: 'inline-block',
          background: active ? '#34d399' : '#f87171',
          boxShadow: active
            ? '0 0 6px rgba(52,211,153,0.4)'
            : '0 0 6px rgba(248,113,113,0.4)',
        }}
      />
      <span style={{ fontSize: '0.78rem', color: active ? '#34d399' : '#f87171' }}>
        {active ? 'Activo' : 'Inactivo'}
      </span>
    </div>
  )
}

// ─── Plus icon ───────────────────────────────────────────────────

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const UploadIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

// ─── Manufacturer Form Modal ─────────────────────────────────────

function ManufacturerFormModal({
  open,
  onClose,
  manufacturer,
}: {
  open: boolean
  onClose: () => void
  manufacturer?: Manufacturer | null
}) {
  const queryClient = useQueryClient()
  const isEditing = !!manufacturer

  const [form, setForm] = useState({ name: '', country: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (manufacturer) {
        setForm({ name: manufacturer.name || '', country: manufacturer.country || '' })
      } else {
        setForm({ name: '', country: '' })
      }
      setErrors({})
    }
  }, [open, manufacturer])

  const createMutation = useMutation({
    mutationFn: (data: Partial<Manufacturer>) => catalogApi.createManufacturer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-manufacturers'] })
      toast.success('Fabricante creado exitosamente')
      onClose()
    },
    onError: () => toast.error('Error al crear el fabricante'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Manufacturer>) => catalogApi.updateManufacturer(manufacturer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-manufacturers'] })
      toast.success('Fabricante actualizado exitosamente')
      onClose()
    },
    onError: () => toast.error('Error al actualizar el fabricante'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    if (isEditing) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Fabricante' : 'Nuevo Fabricante'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Fabricante'}
          </Button>
        </>
      }
    >
      <Input
        label="Nombre"
        value={form.name}
        onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder="Ej: Siemens, GE Healthcare..."
      />
      <Input
        label="País"
        value={form.country}
        onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
        placeholder="Ej: Alemania, Estados Unidos..."
      />
    </Modal>
  )
}

// ─── Model Form Modal ────────────────────────────────────────────

function ModelFormModal({
  open,
  onClose,
  model,
}: {
  open: boolean
  onClose: () => void
  model?: EquipmentCatalogModel | null
}) {
  const queryClient = useQueryClient()
  const isEditing = !!model

  const [form, setForm] = useState({ manufacturer: '', modality: '', name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: manufacturers } = useQuery({
    queryKey: ['catalog-manufacturers-select'],
    queryFn: () => catalogApi.listManufacturers(),
    select: (res) => res.data.results,
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      if (model) {
        setForm({ manufacturer: model.manufacturer || '', modality: model.modality || '', name: model.name || '' })
      } else {
        setForm({ manufacturer: '', modality: '', name: '' })
      }
      setErrors({})
    }
  }, [open, model])

  const createMutation = useMutation({
    mutationFn: (data: Partial<EquipmentCatalogModel>) => catalogApi.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-models'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-manufacturers'] })
      toast.success('Modelo creado exitosamente')
      onClose()
    },
    onError: () => toast.error('Error al crear el modelo'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EquipmentCatalogModel>) => catalogApi.updateModel(model!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-models'] })
      toast.success('Modelo actualizado exitosamente')
      onClose()
    },
    onError: () => toast.error('Error al actualizar el modelo'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (!form.manufacturer) newErrors.manufacturer = 'Seleccione un fabricante'
    if (!form.modality) newErrors.modality = 'Seleccione una modalidad'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    if (isEditing) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  const manufacturerOptions = (manufacturers || []).map((m) => ({ value: m.id, label: m.name }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Modelo' : 'Nuevo Modelo'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Modelo'}
          </Button>
        </>
      }
    >
      <Select
        label="Fabricante"
        value={form.manufacturer}
        onChange={(e) => { setForm((p) => ({ ...p, manufacturer: e.target.value })); setErrors((p) => ({ ...p, manufacturer: '' })) }}
        options={manufacturerOptions}
        error={errors.manufacturer}
      />
      <Select
        label="Modalidad"
        value={form.modality}
        onChange={(e) => { setForm((p) => ({ ...p, modality: e.target.value })); setErrors((p) => ({ ...p, modality: '' })) }}
        options={MODALITY_OPTIONS}
        error={errors.modality}
      />
      <Input
        label="Nombre del Modelo"
        value={form.name}
        onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder="Ej: SOMATOM go.Top, Optima CT660..."
      />
    </Modal>
  )
}

// ─── Series Form Modal ───────────────────────────────────────────

function SeriesFormModal({
  open,
  onClose,
  series,
}: {
  open: boolean
  onClose: () => void
  series?: EquipmentSeries | null
}) {
  const queryClient = useQueryClient()
  const isEditing = !!series

  const [form, setForm] = useState({ equipment_model: '', name: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: models } = useQuery({
    queryKey: ['catalog-models-select'],
    queryFn: () => catalogApi.listModels(),
    select: (res) => res.data.results,
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      if (series) {
        setForm({
          equipment_model: series.equipment_model || '',
          name: series.name || '',
          description: series.description || '',
        })
      } else {
        setForm({ equipment_model: '', name: '', description: '' })
      }
      setErrors({})
    }
  }, [open, series])

  const createMutation = useMutation({
    mutationFn: (data: Partial<EquipmentSeries>) => catalogApi.createSeries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-series'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-models'] })
      toast.success('Serie creada exitosamente')
      onClose()
    },
    onError: () => toast.error('Error al crear la serie'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EquipmentSeries>) => catalogApi.updateSeries(series!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-series'] })
      toast.success('Serie actualizada exitosamente')
      onClose()
    },
    onError: () => toast.error('Error al actualizar la serie'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (!form.equipment_model) newErrors.equipment_model = 'Seleccione un modelo'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    if (isEditing) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  const modelOptions = (models || []).map((m) => ({
    value: m.id,
    label: `${m.manufacturer_name} - ${m.name}`,
  }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Serie' : 'Nueva Serie'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Serie'}
          </Button>
        </>
      }
    >
      <Select
        label="Modelo de Equipo"
        value={form.equipment_model}
        onChange={(e) => { setForm((p) => ({ ...p, equipment_model: e.target.value })); setErrors((p) => ({ ...p, equipment_model: '' })) }}
        options={modelOptions}
        error={errors.equipment_model}
      />
      <Input
        label="Nombre de la Serie"
        value={form.name}
        onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })) }}
        error={errors.name}
        placeholder="Ej: Edge, Force, Definition..."
      />
      <Textarea
        label="Descripcion"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        placeholder="Descripcion opcional de la serie..."
        rows={3}
      />
    </Modal>
  )
}

// ─── Import Modal ────────────────────────────────────────────────

function ImportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setFile(null)
      setImportErrors([])
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [open])

  const importMutation = useMutation({
    mutationFn: (f: File) => catalogApi.importCatalog(f),
    onSuccess: (res) => {
      const d = res.data
      queryClient.invalidateQueries({ queryKey: ['catalog-manufacturers'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-models'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-series'] })
      toast.success(
        `Importado: ${d.created.manufacturers} fabricantes, ${d.created.models} modelos, ${d.created.series} series`
      )
      if (d.errors && d.errors.length > 0) {
        setImportErrors(d.errors)
      } else {
        onClose()
      }
    },
    onError: () => toast.error('Error al importar el archivo'),
  })

  const handleImport = () => {
    if (!file) {
      toast.error('Seleccione un archivo CSV')
      return
    }
    setImportErrors([])
    importMutation.mutate(file)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar Catalogo desde CSV"
      maxWidth="620px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={importMutation.isPending}>Cancelar</Button>
          <Button variant="primary" onClick={handleImport} disabled={importMutation.isPending || !file}>
            {importMutation.isPending ? 'Importando...' : 'Importar'}
          </Button>
        </>
      }
    >
      <p className="text-[0.82rem] mb-4" style={{ color: 'var(--muted)' }}>
        El archivo CSV debe tener las columnas: <strong style={{ color: '#f1f5f9' }}>modalidad, fabricante, modelo, serie</strong>
      </p>

      {/* Example table */}
      <div className="overflow-x-auto mb-5" style={{ borderRadius: '10px', border: '1px solid var(--card-border)' }}>
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr>
              {['modalidad', 'fabricante', 'modelo', 'serie'].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['CT', 'Siemens', 'SOMATOM go.Top', 'Force'],
              ['MRI', 'GE Healthcare', 'Optima MR360', 'Advance'],
              ['US', 'Philips', 'EPIQ 7', 'Elite'],
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2" style={{ color: '#cbd5e1' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* File input */}
      <div className="mb-2">
        <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
          Archivo CSV
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-[0.82rem] cursor-pointer"
          style={{
            background: 'rgba(30,41,59,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'var(--text)',
            padding: '10px 14px',
          }}
        />
      </div>

      {file && (
        <p className="text-[0.75rem] mt-1 mb-3" style={{ color: 'var(--accent)' }}>
          Archivo seleccionado: {file.name}
        </p>
      )}

      {/* Import errors */}
      {importErrors.length > 0 && (
        <div className="mt-4 p-3" style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-[0.78rem] font-semibold mb-2" style={{ color: '#f87171' }}>
            Errores durante la importacion ({importErrors.length}):
          </p>
          <ul className="list-disc list-inside space-y-1">
            {importErrors.map((err, i) => (
              <li key={i} className="text-[0.75rem]" style={{ color: '#fca5a5' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

// ─── Delete Confirm Modal ────────────────────────────────────────

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  itemName,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  isPending: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar Eliminacion"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </>
      }
    >
      <p className="text-[0.85rem]" style={{ color: 'var(--text)' }}>
        Esta seguro de que desea eliminar <strong style={{ color: '#f1f5f9' }}>{itemName}</strong>?
        Esta accion no se puede deshacer.
      </p>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════
// ─── MAIN PAGE ───────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════

export default function CatalogPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('fabricantes')
  const [search, setSearch] = useState('')

  // Filters for models tab
  const [filterManufacturer, setFilterManufacturer] = useState('')
  const [filterModality, setFilterModality] = useState('')

  // Filters for series tab
  const [filterSeriesManufacturer, setFilterSeriesManufacturer] = useState('')
  const [filterSeriesModel, setFilterSeriesModel] = useState('')

  // Modals
  const [mfgModalOpen, setMfgModalOpen] = useState(false)
  const [editMfg, setEditMfg] = useState<Manufacturer | null>(null)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [editModel, setEditModel] = useState<EquipmentCatalogModel | null>(null)
  const [seriesModalOpen, setSeriesModalOpen] = useState(false)
  const [editSeries, setEditSeries] = useState<EquipmentSeries | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'manufacturer' | 'model' | 'series'; id: string; name: string } | null>(null)

  // Reset search and filters on tab change
  useEffect(() => {
    setSearch('')
    setFilterManufacturer('')
    setFilterModality('')
    setFilterSeriesManufacturer('')
    setFilterSeriesModel('')
  }, [activeTab])

  // ─── Queries ─────────────────────────────────────────────────

  const mfgParams: Record<string, string> = {}
  if (search) mfgParams.search = search

  const { data: manufacturers, isLoading: mfgLoading } = useQuery({
    queryKey: ['catalog-manufacturers', search],
    queryFn: () => catalogApi.listManufacturers(Object.keys(mfgParams).length > 0 ? mfgParams : undefined),
    select: (res) => res.data.results,
  })

  const modelParams: Record<string, string> = {}
  if (search) modelParams.search = search
  if (filterManufacturer) modelParams.manufacturer = filterManufacturer
  if (filterModality) modelParams.modality = filterModality

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['catalog-models', search, filterManufacturer, filterModality],
    queryFn: () => catalogApi.listModels(Object.keys(modelParams).length > 0 ? modelParams : undefined),
    select: (res) => res.data.results,
  })

  const seriesParams: Record<string, string> = {}
  if (search) seriesParams.search = search
  if (filterSeriesModel) seriesParams.equipment_model = filterSeriesModel
  if (filterSeriesManufacturer) seriesParams.manufacturer = filterSeriesManufacturer

  const { data: seriesList, isLoading: seriesLoading } = useQuery({
    queryKey: ['catalog-series', search, filterSeriesManufacturer, filterSeriesModel],
    queryFn: () => catalogApi.listSeries(Object.keys(seriesParams).length > 0 ? seriesParams : undefined),
    select: (res) => res.data.results,
  })

  // Manufacturers list for filter selects
  const { data: allManufacturers } = useQuery({
    queryKey: ['catalog-manufacturers-all'],
    queryFn: () => catalogApi.listManufacturers(),
    select: (res) => res.data.results,
  })

  // Models list for series filter (filtered by manufacturer if selected)
  const modelsFilterParams: Record<string, string> = {}
  if (filterSeriesManufacturer) modelsFilterParams.manufacturer = filterSeriesManufacturer

  const { data: allModels } = useQuery({
    queryKey: ['catalog-models-for-filter', filterSeriesManufacturer],
    queryFn: () => catalogApi.listModels(Object.keys(modelsFilterParams).length > 0 ? modelsFilterParams : undefined),
    select: (res) => res.data.results,
  })

  // ─── Delete mutations ────────────────────────────────────────

  const deleteMfg = useMutation({
    mutationFn: (id: string) => catalogApi.deleteManufacturer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-manufacturers'] })
      toast.success('Fabricante eliminado')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Error al eliminar el fabricante'),
  })

  const deleteModel = useMutation({
    mutationFn: (id: string) => catalogApi.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-models'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-manufacturers'] })
      toast.success('Modelo eliminado')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Error al eliminar el modelo'),
  })

  const deleteSeriesMut = useMutation({
    mutationFn: (id: string) => catalogApi.deleteSeries(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-series'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-models'] })
      toast.success('Serie eliminada')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Error al eliminar la serie'),
  })

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'manufacturer') deleteMfg.mutate(deleteTarget.id)
    else if (deleteTarget.type === 'model') deleteModel.mutate(deleteTarget.id)
    else if (deleteTarget.type === 'series') deleteSeriesMut.mutate(deleteTarget.id)
  }

  // ─── Tab add button labels ───────────────────────────────────

  const addButtonLabel: Record<Tab, string> = {
    fabricantes: 'Nuevo Fabricante',
    modelos: 'Nuevo Modelo',
    series: 'Nueva Serie',
  }

  const handleAddClick = () => {
    if (activeTab === 'fabricantes') { setEditMfg(null); setMfgModalOpen(true) }
    else if (activeTab === 'modelos') { setEditModel(null); setModelModalOpen(true) }
    else { setEditSeries(null); setSeriesModalOpen(true) }
  }

  // ─── Column definitions ──────────────────────────────────────

  const manufacturerColumns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (m: Manufacturer) => <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{m.name}</span>,
    },
    { key: 'country', header: 'Pais' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (m: Manufacturer) => <ActiveDot active={m.is_active} />,
    },
    {
      key: 'models_count',
      header: 'Modelos',
      render: (m: Manufacturer) => (
        <span style={{ fontWeight: 700, color: m.models_count > 0 ? '#60a5fa' : 'var(--muted)' }}>
          {m.models_count}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      render: (m: Manufacturer) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 transition-colors duration-200"
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
            title="Editar"
            onClick={(e) => { e.stopPropagation(); setEditMfg(m); setMfgModalOpen(true) }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="p-1.5 transition-colors duration-200"
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
            title="Eliminar"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'manufacturer', id: m.id, name: m.name }) }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  const modelColumns = [
    {
      key: 'name',
      header: 'Modelo',
      render: (m: EquipmentCatalogModel) => <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{m.name}</span>,
    },
    { key: 'manufacturer_name', header: 'Fabricante' },
    {
      key: 'modality_display',
      header: 'Modalidad',
      render: (m: EquipmentCatalogModel) => (
        <Badge variant={modalityBadgeVariant[m.modality] || 'secondary'}>{m.modality_display || m.modality}</Badge>
      ),
    },
    {
      key: 'series_count',
      header: 'Series',
      render: (m: EquipmentCatalogModel) => (
        <span style={{ fontWeight: 700, color: m.series_count > 0 ? '#60a5fa' : 'var(--muted)' }}>
          {m.series_count}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (m: EquipmentCatalogModel) => <ActiveDot active={m.is_active} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      render: (m: EquipmentCatalogModel) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 transition-colors duration-200"
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
            title="Editar"
            onClick={(e) => { e.stopPropagation(); setEditModel(m); setModelModalOpen(true) }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="p-1.5 transition-colors duration-200"
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
            title="Eliminar"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'model', id: m.id, name: m.name }) }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  const seriesColumns = [
    {
      key: 'name',
      header: 'Serie',
      render: (s: EquipmentSeries) => <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{s.name}</span>,
    },
    { key: 'model_name', header: 'Modelo' },
    { key: 'manufacturer_name', header: 'Fabricante' },
    {
      key: 'modality',
      header: 'Modalidad',
      render: (s: EquipmentSeries) => (
        <Badge variant={modalityBadgeVariant[s.modality] || 'secondary'}>{s.modality}</Badge>
      ),
    },
    {
      key: 'description',
      header: 'Descripcion',
      render: (s: EquipmentSeries) => (
        <span className="max-w-[200px] truncate inline-block" style={{ color: 'var(--muted)' }}>
          {s.description || '\u2014'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (s: EquipmentSeries) => <ActiveDot active={s.is_active} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      render: (s: EquipmentSeries) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 transition-colors duration-200"
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
            title="Editar"
            onClick={(e) => { e.stopPropagation(); setEditSeries(s); setSeriesModalOpen(true) }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="p-1.5 transition-colors duration-200"
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
            title="Eliminar"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'series', id: s.id, name: s.name }) }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  // ─── Manufacturer options for filter selects ─────────────────

  const mfgFilterOptions = (allManufacturers || []).map((m) => ({ value: m.id, label: m.name }))
  const modelFilterOptions = (allModels || []).map((m) => ({ value: m.id, label: `${m.manufacturer_name} - ${m.name}` }))

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Catalogo de Equipos"
        subtitle="Gestion de fabricantes, modelos y series del catalogo"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={UploadIcon} onClick={() => setImportModalOpen(true)}>
              Importar CSV
            </Button>
            <Button variant="primary" icon={PlusIcon} onClick={handleAddClick}>
              {addButtonLabel[activeTab]}
            </Button>
          </div>
        }
      />

      {/* Tab Buttons */}
      <div className="flex items-center gap-2 mb-5">
        <Button
          variant={activeTab === 'fabricantes' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('fabricantes')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        >
          Fabricantes
        </Button>
        <Button
          variant={activeTab === 'modelos' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('modelos')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" />
            </svg>
          }
        >
          Modelos
        </Button>
        <Button
          variant={activeTab === 'series' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('series')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          }
        >
          Series
        </Button>
      </div>

      {/* ── Tab: Fabricantes ──────────────────────────────────── */}
      {activeTab === 'fabricantes' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar fabricante..." />
          </div>
          <Card>
            <Table
              columns={manufacturerColumns}
              data={manufacturers || []}
              loading={mfgLoading}
              emptyMessage="No se encontraron fabricantes"
            />
          </Card>
        </>
      )}

      {/* ── Tab: Modelos ─────────────────────────────────────── */}
      {activeTab === 'modelos' && (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="w-[200px]">
              <Select
                label="Fabricante"
                value={filterManufacturer}
                onChange={(e) => setFilterManufacturer(e.target.value)}
                options={mfgFilterOptions}
                className="!mb-0"
              />
            </div>
            <div className="w-[200px]">
              <Select
                label="Modalidad"
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                options={MODALITY_OPTIONS}
                className="!mb-0"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchBar value={search} onChange={setSearch} placeholder="Buscar modelo..." />
            </div>
          </div>
          <Card>
            <Table
              columns={modelColumns}
              data={models || []}
              loading={modelsLoading}
              emptyMessage="No se encontraron modelos"
            />
          </Card>
        </>
      )}

      {/* ── Tab: Series ──────────────────────────────────────── */}
      {activeTab === 'series' && (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="w-[200px]">
              <Select
                label="Fabricante"
                value={filterSeriesManufacturer}
                onChange={(e) => { setFilterSeriesManufacturer(e.target.value); setFilterSeriesModel('') }}
                options={mfgFilterOptions}
                className="!mb-0"
              />
            </div>
            <div className="w-[240px]">
              <Select
                label="Modelo"
                value={filterSeriesModel}
                onChange={(e) => setFilterSeriesModel(e.target.value)}
                options={modelFilterOptions}
                className="!mb-0"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchBar value={search} onChange={setSearch} placeholder="Buscar serie..." />
            </div>
          </div>
          <Card>
            <Table
              columns={seriesColumns}
              data={seriesList || []}
              loading={seriesLoading}
              emptyMessage="No se encontraron series"
            />
          </Card>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      <ManufacturerFormModal
        open={mfgModalOpen}
        onClose={() => setMfgModalOpen(false)}
        manufacturer={editMfg}
      />
      <ModelFormModal
        open={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        model={editModel}
      />
      <SeriesFormModal
        open={seriesModalOpen}
        onClose={() => setSeriesModalOpen(false)}
        series={editSeries}
      />
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name || ''}
        isPending={deleteMfg.isPending || deleteModel.isPending || deleteSeriesMut.isPending}
      />
    </div>
  )
}
