type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'

const variants: Record<BadgeVariant, { bg: string; color: string }> = {
  primary: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  success: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  warning: { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  danger: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  info: { bg: 'rgba(96,165,250,0.15)', color: '#93c5fd' },
  secondary: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  purple: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

export default function Badge({ variant = 'primary', children }: BadgeProps) {
  const v = variants[variant]
  return (
    <span
      className="inline-block px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
      style={{ background: v.bg, color: v.color, borderRadius: '20px' }}
    >
      {children}
    </span>
  )
}

// Convenience mappers
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Activo' },
    INACTIVE: { variant: 'secondary', label: 'Inactivo' },
    OPERATIONAL: { variant: 'success', label: 'Operativo' },
    MAINTENANCE: { variant: 'warning', label: 'En mantenimiento' },
    OUT_OF_SERVICE: { variant: 'danger', label: 'Fuera de servicio' },
    DECOMMISSIONED: { variant: 'secondary', label: 'Baja' },
    OPEN: { variant: 'primary', label: 'Abierta' },
    IN_PROGRESS: { variant: 'warning', label: 'En ejecución' },
    PENDING_SIGNATURE: { variant: 'warning', label: 'Pendiente firma' },
    SIGNED: { variant: 'success', label: 'Firmada' },
    CLOSED: { variant: 'secondary', label: 'Cerrada' },
    DRAFT: { variant: 'secondary', label: 'Borrador' },
    EXPIRED: { variant: 'danger', label: 'Expirado' },
    CANCELLED: { variant: 'danger', label: 'Cancelado' },
    PENDING: { variant: 'warning', label: 'Pendiente' },
    COMPLETED: { variant: 'success', label: 'Completado' },
    OVERDUE: { variant: 'danger', label: 'Vencido' },
    PENDING_OT: { variant: 'secondary', label: 'Pendiente OT' },
    OT_SIGNED_WAITING_INVOICE: { variant: 'warning', label: 'Esperando factura' },
    IN_REVIEW: { variant: 'info', label: 'En revisión' },
    APPROVED: { variant: 'success', label: 'Aprobado' },
    PAID: { variant: 'success', label: 'Pagado' },
    REJECTED: { variant: 'danger', label: 'Rechazado' },
    ISSUED: { variant: 'primary', label: 'Emitida' },
    PUBLIC: { variant: 'primary', label: 'Público' },
    PRIVATE: { variant: 'purple', label: 'Privado' },
  }
  const m = map[status] || { variant: 'secondary' as BadgeVariant, label: status }
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    URGENT: { variant: 'danger', label: 'Urgente' },
    NORMAL: { variant: 'primary', label: 'Normal' },
    SCHEDULED: { variant: 'secondary', label: 'Programado' },
  }
  const m = map[priority] || { variant: 'secondary' as BadgeVariant, label: priority }
  return <Badge variant={m.variant}>{m.label}</Badge>
}
