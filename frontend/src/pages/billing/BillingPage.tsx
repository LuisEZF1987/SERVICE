import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'

type Tab = 'cobros' | 'pagos'

const cobrosColumns = [
  { key: 'factura', header: 'Factura' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'concepto', header: 'Concepto' },
  { key: 'total', header: 'Total' },
  { key: 'estado', header: 'Estado' },
  { key: 'fecha', header: 'Fecha' },
]

const pagosColumns = [
  { key: 'ot_vinculada', header: 'OT Vinculada' },
  { key: 'factura_viat', header: 'Factura Viat' },
  { key: 'valor', header: 'Valor' },
  { key: 'estado', header: 'Estado' },
  { key: 'fecha_aprobacion', header: 'Fecha Aprobacion' },
]

const emptyData: { id: string }[] = []

// --- Pipeline Steps ---

interface PipelineStep {
  icon: string
  label: string
  color: string
}

const pipelineSteps: PipelineStep[] = [
  { icon: '\u23F3', label: 'Pendiente OT', color: '#94a3b8' },
  { icon: '\uD83D\uDCCB', label: 'OT Firmada', color: '#fb923c' },
  { icon: '\uD83D\uDD0D', label: 'En Revision', color: '#60a5fa' },
  { icon: '\u2705', label: 'Aprobado', color: '#34d399' },
  { icon: '\uD83D\uDCB0', label: 'Pagado', color: '#a855f7' },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cobros')

  return (
    <div>
      <PageHeader
        title="Facturacion y Pagos"
        subtitle="Gestion de cobros a clientes y pagos a proveedores"
      />

      {/* Tab Buttons */}
      <div className="flex items-center gap-2 mb-5">
        <Button
          variant={activeTab === 'cobros' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('cobros')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          }
        >
          Cobros a Clientes
        </Button>
        <Button
          variant={activeTab === 'pagos' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('pagos')}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        >
          Pagos a Viat
        </Button>
      </div>

      {/* Tab Content: Cobros a Clientes */}
      {activeTab === 'cobros' && (
        <div>
          <Card className="mb-4">
            <div className="flex items-start gap-4 py-2">
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: 'rgba(96,165,250,0.1)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <h3 className="text-[0.9rem] font-bold mb-1" style={{ color: '#f1f5f9' }}>
                  Modulo de facturacion a clientes
                </h3>
                <p className="text-[0.82rem] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Integracion con Datil pendiente. Este modulo permitira emitir facturas electronicas
                  directamente desde el sistema.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <Table
              columns={cobrosColumns}
              data={emptyData}
              emptyMessage="No hay facturas registradas"
            />
          </Card>
        </div>
      )}

      {/* Tab Content: Pagos a Viat */}
      {activeTab === 'pagos' && (
        <div>
          {/* Pipeline visual */}
          <Card className="mb-4">
            <h3 className="text-[0.85rem] font-bold mb-4" style={{ color: '#f1f5f9' }}>
              Flujo de Pago a Viat
            </h3>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {pipelineSteps.map((step, idx) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center text-center min-w-[100px]">
                    <div
                      className="flex items-center justify-center mb-2"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '14px',
                        background: `${step.color}18`,
                        border: `1px solid ${step.color}30`,
                        fontSize: '1.4rem',
                      }}
                    >
                      {step.icon}
                    </div>
                    <span
                      className="text-[0.72rem] font-semibold"
                      style={{ color: step.color }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div
                      className="flex-shrink-0 mx-2"
                      style={{
                        width: 32,
                        height: 2,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.06))',
                        marginBottom: 20,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="mb-4">
            <Table
              columns={pagosColumns}
              data={emptyData}
              emptyMessage="No hay pagos registrados"
            />
          </Card>

          {/* Payment note */}
          <Card>
            <div className="flex items-start gap-4 py-2">
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: 'rgba(249,115,22,0.1)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 className="text-[0.9rem] font-bold mb-1" style={{ color: '#f1f5f9' }}>
                  Regla de Pago
                </h3>
                <p className="text-[0.82rem] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Dimed paga a Viat UNICAMENTE cuando la OT esta firmada por el cliente.
                  El flujo de aprobacion requiere validacion del coordinador antes de procesar el pago.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
