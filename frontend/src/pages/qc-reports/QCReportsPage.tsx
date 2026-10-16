import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { qcReportsApi, QCReportSummary } from '../../api/qcReports'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import SearchBar from '../../components/ui/SearchBar'
import { Select } from '../../components/ui/Input'
import NewQCReportModal from './NewQCReportModal'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ISSUED', label: 'Emitido — pendiente de firma' },
  { value: 'SIGNED', label: 'Firmado' },
]

const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success'> = {
  DRAFT: 'secondary',
  ISSUED: 'warning',
  SIGNED: 'success',
}

const RESULT_LABEL: Record<string, string> = {
  PASS: 'Cumple',
  PASS_WITH_OBSERVATIONS: 'Cumple con observaciones',
  FAIL: 'No cumple',
}

export default function QCReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [practice, setPractice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const status = searchParams.get('status') ?? ''
  const canCreate = user?.role === 'ADMIN' || user?.role === 'COORDINATOR' || user?.role === 'TECHNICIAN'

  const setStatus = (value: string) => setSearchParams(value ? { status: value } : {})

  const params: Record<string, string> = { ordering: '-created_at', page_size: '100' }
  if (search) params.search = search
  if (status) params.status = status
  if (practice) params.practice = practice

  const { data, isLoading } = useQuery({
    queryKey: ['qc-reports', 'list', params],
    queryFn: () => qcReportsApi.list(params).then((r) => r.data),
  })

  const { data: practices = [] } = useQuery({
    queryKey: ['qc-practices'],
    queryFn: () => qcReportsApi.practices().then((r) => r.data),
    staleTime: Infinity,
  })

  const columns = [
    {
      key: 'number',
      header: 'N.o informe',
      render: (r: QCReportSummary) => (
        <span className="font-bold" style={{ color: 'var(--accent)' }}>{r.number}</span>
      ),
    },
    {
      key: 'practice_display',
      header: 'Práctica',
      render: (r: QCReportSummary) => <span style={{ color: '#cbd5e1' }}>{r.practice_display}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: QCReportSummary) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status_display}</Badge>
      ),
    },
    {
      key: 'client_name',
      header: 'Cliente',
      render: (r: QCReportSummary) => <span style={{ color: '#cbd5e1' }}>{r.client_name || '—'}</span>,
    },
    {
      key: 'equipment_code',
      header: 'Equipo / OT',
      render: (r: QCReportSummary) => (
        <span style={{ color: '#cbd5e1' }}>
          {r.equipment_code || '—'}
          <span className="block text-[0.72rem]" style={{ color: 'var(--muted)' }}>{r.work_order_number}</span>
        </span>
      ),
    },
    {
      key: 'technician_name',
      header: 'Técnico',
      render: (r: QCReportSummary) => <span style={{ color: '#cbd5e1' }}>{r.technician_name || '—'}</span>,
    },
    {
      key: 'overall_result',
      header: 'Resultado',
      render: (r: QCReportSummary) => (
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
          {RESULT_LABEL[r.overall_result] ?? '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Creado',
      render: (r: QCReportSummary) => (
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
          {new Date(r.created_at).toLocaleDateString('es-EC')}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Informes de Control de Calidad"
        subtitle={`${data?.count ?? 0} informes`}
        actions={
          canCreate && (
            <Button
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
              onClick={() => setModalOpen(true)}
            >
              Nuevo informe
            </Button>
          )
        }
      />

      <div
        className="flex flex-wrap items-end gap-3 mb-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
          padding: '16px',
        }}
      >
        <div style={{ minWidth: '200px' }}>
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="!mb-0"
          />
        </div>
        <div style={{ minWidth: '200px' }}>
          <Select
            label="Práctica"
            options={[
              { value: '', label: 'Todas las prácticas' },
              ...practices.map((p) => ({ value: p.value, label: p.label })),
            ]}
            value={practice}
            onChange={(e) => setPractice(e.target.value)}
            className="!mb-0"
          />
        </div>
        <div className="flex-1" style={{ minWidth: '220px' }}>
          <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
            Buscar
          </label>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por número, OT o cliente..." />
        </div>
        {(status || practice || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('')
              setPractice('')
              setSearch('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          data={data?.results ?? []}
          loading={isLoading}
          onRowClick={(r) => navigate(`/qc-reports/${r.id}`)}
          emptyMessage="No hay informes de control de calidad"
        />
      </Card>

      <NewQCReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
