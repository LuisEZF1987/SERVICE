import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

// --- Report definitions ---

interface ReportDef {
  title: string
  description: string
  icon: React.ReactNode
}

const reports: ReportDef[] = [
  {
    title: 'Certificado de Mantenimiento',
    description: 'Genera certificado por OT cerrada',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Informe Tecnico Mensual',
    description: 'Resumen de actividades del mes',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    title: 'Estado del Parque de Equipos',
    description: 'Listado de todos los equipos y su estado actual',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M12 12h.01" />
        <line x1="6" y1="6" x2="6" y2="2" />
        <line x1="18" y1="6" x2="18" y2="2" />
      </svg>
    ),
  },
  {
    title: 'Historial de Equipo',
    description: 'Historial completo de mantenimientos por equipo',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
    ),
  },
  {
    title: 'Cumplimiento SLA',
    description: 'Indicadores de cumplimiento por contrato',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    title: 'Rentabilidad por Contrato',
    description: 'Margen Dimed por contrato (Admin)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
]

// --- Component ---

export default function ReportsPage() {
  const handleGenerate = (title: string) => {
    toast(`Reporte "${title}" en desarrollo`, {
      icon: '\uD83D\uDEE0\uFE0F',
      style: {
        background: '#1e293b',
        color: '#f1f5f9',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        fontSize: '0.85rem',
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Reportes y Documentos"
        subtitle="Generacion de reportes e indicadores del sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <Card key={report.title}>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {report.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[0.9rem] font-bold mb-1" style={{ color: '#f1f5f9' }}>
                  {report.title}
                </h3>
                <p className="text-[0.8rem] mb-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {report.description}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleGenerate(report.title)}
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  }
                >
                  Generar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
