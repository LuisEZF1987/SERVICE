import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { equipmentApi } from '../../api/equipment'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import EquipmentFormModal from './EquipmentFormModal'

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

function CertBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 mr-2 mb-2"
      style={{
        background: active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '8px',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          display: 'inline-block',
          background: active ? '#34d399' : 'var(--muted)',
          boxShadow: active ? '0 0 6px rgba(52,211,153,0.4)' : 'none',
        }}
      />
      <span
        className="text-[0.72rem] font-semibold"
        style={{ color: active ? '#34d399' : 'var(--muted)' }}
      >
        {label}
      </span>
    </div>
  )
}

function WarrantyField({ label, start, end, isActive }: { label: string; start: string | null; end: string | null; isActive: boolean }) {
  if (!start && !end) {
    return (
      <InfoField label={label}>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No registrada</span>
      </InfoField>
    )
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-EC') : '--'

  return (
    <InfoField label={label}>
      <div className="flex items-center gap-2">
        <span>{formatDate(start)} — {formatDate(end)}</span>
        {isActive ? (
          <Badge variant="success">Vigente</Badge>
        ) : (
          <Badge variant="danger">Vencida</Badge>
        )}
      </div>
    </InfoField>
  )
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editModalOpen, setEditModalOpen] = useState(false)

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment-detail', id],
    queryFn: () => equipmentApi.get(id!),
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
          <span className="text-[0.85rem]">Cargando equipo...</span>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--muted)' }}>
        <p className="text-[0.95rem] mb-4">Equipo no encontrado</p>
        <Button variant="ghost" onClick={() => navigate('/equipment')}>
          Volver a Equipos
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={equipment.internal_code}
        subtitle={`${equipment.brand} ${equipment.model_name} · ${equipment.modality_display}`}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => navigate('/equipment')}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Identification Card */}
        <Card title="Identificación">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoField label="Código Interno">
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9' }}>
                {equipment.internal_code}
              </span>
            </InfoField>
            <InfoField label="Número de Serie">
              <span style={{ fontFamily: 'monospace' }}>{equipment.serial_number}</span>
            </InfoField>
            <InfoField label="Activo Hospitalario">
              {equipment.hospital_asset_number}
            </InfoField>
            <InfoField label="Registro ARCSA">
              {equipment.arcsa_registration}
            </InfoField>
          </div>
          <div
            className="pt-3 mt-1"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <div
              className="text-[0.65rem] font-bold uppercase tracking-wider mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Certificaciones
            </div>
            <div className="flex flex-wrap">
              <CertBadge label="FDA" active={equipment.has_fda} />
              <CertBadge label="CE" active={equipment.has_ce} />
              <CertBadge label="ISO 13485" active={equipment.has_iso_13485} />
            </div>
          </div>
        </Card>

        {/* Technical Data Card */}
        <Card title="Datos Técnicos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoField label="Modalidad">
              <StatusBadge status={equipment.modality} />
            </InfoField>
            <InfoField label="Marca">
              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{equipment.brand}</span>
            </InfoField>
            <InfoField label="Modelo">
              {equipment.model_name}
            </InfoField>
            <InfoField label="País de Origen">
              {equipment.country_of_origin}
            </InfoField>
            <InfoField label="Año de Fabricación">
              {equipment.year_of_manufacture ? (
                <span style={{ fontWeight: 600 }}>{equipment.year_of_manufacture}</span>
              ) : null}
            </InfoField>
          </div>
        </Card>

        {/* Location Card */}
        <Card title="Ubicación">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoField label="Cliente">
              {equipment.client ? (
                <Link
                  to={`/clients/${equipment.client}`}
                  style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                >
                  {equipment.client_name}
                </Link>
              ) : (
                <span style={{ color: 'var(--muted)' }}>--</span>
              )}
            </InfoField>
            <InfoField label="Área / Servicio">
              {equipment.area}
            </InfoField>
            <InfoField label="Ciudad">
              {equipment.city}
            </InfoField>
            <InfoField label="Provincia">
              {equipment.province}
            </InfoField>
          </div>
        </Card>

        {/* Status & Warranties Card */}
        <Card title="Estado y Garantías">
          <InfoField label="Estado Actual">
            <StatusBadge status={equipment.status} />
          </InfoField>
          <div
            className="pt-3 mt-1"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <WarrantyField
              label="Garantía de Fábrica"
              start={equipment.factory_warranty_start}
              end={equipment.factory_warranty_end}
              isActive={equipment.is_under_factory_warranty}
            />
            <WarrantyField
              label="Garantía Dimed"
              start={equipment.dimed_warranty_start}
              end={equipment.dimed_warranty_end}
              isActive={equipment.is_under_dimed_warranty}
            />
          </div>
        </Card>
      </div>

      <EquipmentFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        equipment={equipment}
      />
    </div>
  )
}
