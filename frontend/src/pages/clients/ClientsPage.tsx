import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clientsApi, Client } from '../../api/clients'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import ClientFormModal from './ClientFormModal'

export default function ClientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list(search ? { search } : undefined),
    select: (res) => res.data.results,
  })

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (client: Client) => (
        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{client.name}</span>
      ),
    },
    {
      key: 'ruc',
      header: 'RUC',
      render: (client: Client) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
          {client.ruc}
        </span>
      ),
    },
    {
      key: 'client_type',
      header: 'Tipo',
      render: (client: Client) => <StatusBadge status={client.client_type} />,
    },
    {
      key: 'city',
      header: 'Ciudad',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (client: Client) => <StatusBadge status={client.status} />,
    },
    {
      key: 'nda_signed',
      header: 'NDA',
      render: (client: Client) => (
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              display: 'inline-block',
              background: client.nda_signed ? '#34d399' : '#f87171',
              boxShadow: client.nda_signed
                ? '0 0 6px rgba(52,211,153,0.4)'
                : '0 0 6px rgba(248,113,113,0.4)',
            }}
          />
          <span style={{ fontSize: '0.78rem', color: client.nda_signed ? '#34d399' : '#f87171' }}>
            {client.nda_signed ? 'Firmado' : 'Pendiente'}
          </span>
        </div>
      ),
    },
    {
      key: 'equipment_count',
      header: 'Equipos',
      render: (client: Client) => (
        <span
          style={{
            fontWeight: 700,
            color: client.equipment_count > 0 ? '#60a5fa' : 'var(--muted)',
          }}
        >
          {client.equipment_count}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={data ? `${data.length} cliente${data.length !== 1 ? 's' : ''} registrado${data.length !== 1 ? 's' : ''}` : undefined}
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
            Nuevo Cliente
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, RUC, ciudad..."
        />
      </div>

      <Card>
        <Table
          columns={columns}
          data={data || []}
          loading={isLoading}
          emptyMessage="No se encontraron clientes"
          onRowClick={(client) => navigate(`/clients/${client.id}`)}
        />
      </Card>

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
