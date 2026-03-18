import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { equipmentApi, Equipment } from '../../api/equipment'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Input'
import EquipmentFormModal from './EquipmentFormModal'

const modalityOptions = [
  { value: '', label: 'Todas las modalidades' },
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

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'OPERATIONAL', label: 'Operativo' },
  { value: 'MAINTENANCE', label: 'En mantenimiento' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera de servicio' },
  { value: 'DECOMMISSIONED', label: 'Baja' },
]

const modalityBadgeVariants: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  XRAY_FIXED: 'primary',
  XRAY_PORTABLE: 'info',
  CT: 'warning',
  MRI: 'purple',
  ULTRASOUND: 'success',
  MAMMOGRAPH: 'danger',
  FLUOROSCOPE: 'info',
  DENSITOMETER: 'secondary',
  OTHER: 'secondary',
}

export default function EquipmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientFilter = searchParams.get('client') || ''

  const [search, setSearch] = useState('')
  const [modality, setModality] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', search, modality, status, clientFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (modality) params.modality = modality
      if (status) params.status = status
      if (clientFilter) params.client = clientFilter
      return equipmentApi.list(Object.keys(params).length > 0 ? params : undefined)
    },
    select: (res) => res.data.results,
  })

  const columns = [
    {
      key: 'internal_code',
      header: 'Código',
      render: (eq: Equipment) => (
        <span style={{ color: '#f1f5f9', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>
          {eq.internal_code}
        </span>
      ),
    },
    {
      key: 'brand_model',
      header: 'Marca / Modelo',
      render: (eq: Equipment) => (
        <div>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{eq.brand}</span>
          <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: '0.78rem' }}>
            {eq.model_name}
          </span>
        </div>
      ),
    },
    {
      key: 'modality',
      header: 'Modalidad',
      render: (eq: Equipment) => (
        <Badge variant={modalityBadgeVariants[eq.modality] || 'secondary'}>
          {eq.modality_display}
        </Badge>
      ),
    },
    {
      key: 'client_name',
      header: 'Cliente',
      render: (eq: Equipment) => (
        <span style={{ color: '#94a3b8' }}>{eq.client_name}</span>
      ),
    },
    {
      key: 'city',
      header: 'Ciudad',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (eq: Equipment) => <StatusBadge status={eq.status} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Equipos"
        subtitle={data ? `${data.length} equipo${data.length !== 1 ? 's' : ''} registrado${data.length !== 1 ? 's' : ''}` : undefined}
        actions={
          <Button
            variant="primary"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            onClick={() => setModalOpen(true)}
          >
            Nuevo Equipo
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código, marca, modelo, serie..."
        />
        <div style={{ minWidth: 200 }}>
          <Select
            options={modalityOptions.slice(1)}
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="!mb-0"
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            options={statusOptions.slice(1)}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="!mb-0"
          />
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          data={data || []}
          loading={isLoading}
          emptyMessage="No se encontraron equipos"
          onRowClick={(eq) => navigate(`/equipment/${eq.id}`)}
        />
      </Card>

      <EquipmentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
