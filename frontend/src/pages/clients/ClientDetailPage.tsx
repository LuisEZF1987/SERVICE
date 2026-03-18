import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '../../api/clients'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/Badge'
import ClientFormModal from './ClientFormModal'

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div
        className="text-[0.65rem] font-bold uppercase tracking-wider mb-1"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </div>
      <div className="text-[0.85rem]" style={{ color: '#e2e8f0' }}>
        {children || <span style={{ color: 'var(--muted)' }}>--</span>}
      </div>
    </div>
  )
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editModalOpen, setEditModalOpen] = useState(false)

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id!),
    select: (res) => res.data,
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--muted)' }}>
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[0.85rem]">Cargando cliente...</span>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--muted)' }}>
        <p className="text-[0.95rem] mb-4">Cliente no encontrado</p>
        <Button variant="ghost" onClick={() => navigate('/clients')}>
          Volver a Clientes
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={`RUC: ${client.ruc} · ${client.type_display}`}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => navigate('/clients')}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              }
            >
              Volver
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditModalOpen(true)}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              }
            >
              Editar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Client Info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card title="Información General">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoField label="RUC">
                <span style={{ fontFamily: 'monospace' }}>{client.ruc}</span>
              </InfoField>
              <InfoField label="Tipo de Cliente">
                <StatusBadge status={client.client_type} />
              </InfoField>
              <InfoField label="Dirección">
                {client.address}
              </InfoField>
              <InfoField label="Ciudad">
                {client.city}
              </InfoField>
              <InfoField label="Provincia">
                {client.province}
              </InfoField>
              <InfoField label="Teléfono">
                {client.phone}
              </InfoField>
              <InfoField label="Email">
                {client.email ? (
                  <a href={`mailto:${client.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    {client.email}
                  </a>
                ) : null}
              </InfoField>
              <InfoField label="Estado">
                <StatusBadge status={client.status} />
              </InfoField>
              <InfoField label="NDA">
                {client.nda_signed ? (
                  <Badge variant="success">Firmado</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">No firmado</Badge>
                    <span style={{ color: '#f87171', fontSize: '0.78rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      NDA pendiente de firma
                    </span>
                  </div>
                )}
              </InfoField>
              {client.nda_signed_date && (
                <InfoField label="Fecha Firma NDA">
                  {new Date(client.nda_signed_date).toLocaleDateString('es-EC')}
                </InfoField>
              )}
            </div>
            {client.notes && (
              <div
                className="mt-3 pt-3"
                style={{ borderTop: '1px solid var(--card-border)' }}
              >
                <InfoField label="Notas">
                  <span style={{ color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{client.notes}</span>
                </InfoField>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Contacts & Equipment */}
        <div className="flex flex-col gap-4">
          <Card title="Contactos">
            {client.contacts && client.contacts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {client.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[0.82rem] font-semibold" style={{ color: '#f1f5f9' }}>
                        {contact.name}
                      </span>
                      {contact.is_primary && (
                        <Badge variant="primary">Principal</Badge>
                      )}
                      {contact.is_signer && (
                        <Badge variant="warning">Firmante</Badge>
                      )}
                    </div>
                    {contact.position && (
                      <p className="text-[0.75rem] mb-1" style={{ color: 'var(--muted)' }}>
                        {contact.position}
                      </p>
                    )}
                    <div className="flex flex-col gap-0.5">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-[0.75rem]"
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <span className="text-[0.75rem]" style={{ color: '#94a3b8' }}>
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6" style={{ color: 'var(--muted)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-2 opacity-40">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <p className="text-[0.78rem]">Sin contactos registrados</p>
              </div>
            )}
          </Card>

          <Card title="Equipos">
            <Link
              to={`/equipment?client=${client.id}`}
              className="flex items-center justify-between p-3 transition-all duration-200"
              style={{
                background: 'rgba(96,165,250,0.06)',
                border: '1px solid rgba(96,165,250,0.12)',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(96,165,250,0.1)'
                e.currentTarget.style.borderColor = 'rgba(96,165,250,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(96,165,250,0.06)'
                e.currentTarget.style.borderColor = 'rgba(96,165,250,0.12)'
              }}
            >
              <div>
                <div
                  className="text-[1.3rem] font-extrabold"
                  style={{
                    background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {client.equipment_count}
                </div>
                <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  Equipos registrados
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </Card>
        </div>
      </div>

      <ClientFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        client={client}
      />
    </div>
  )
}
