import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { WorkOrder } from '../../api/workOrders'
import { qcReportsApi } from '../../api/qcReports'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import NewQCReportModal from '../qc-reports/NewQCReportModal'

const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success'> = {
  DRAFT: 'secondary',
  ISSUED: 'warning',
  SIGNED: 'success',
}

interface Props {
  workOrder: WorkOrder
  editable: boolean
}

export default function WorkOrderQCReportsSection({ workOrder, editable }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const { data: reports = [] } = useQuery({
    queryKey: ['qc-reports', workOrder.id],
    queryFn: () => qcReportsApi.listForWorkOrder(workOrder.id).then((r) => r.data.results),
  })

  return (
    <Card
      title={`Informes de Control de Calidad (${reports.length})`}
      actions={
        editable && (
          <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
            Nuevo informe
          </Button>
        )
      }
    >
      {reports.length === 0 && (
        <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
          Sin informes de control de calidad
          {editable ? ' — cree uno por cada equipo de rayos X evaluado en esta OT.' : '.'}
        </div>
      )}

      {reports.map((r) => (
        <Link
          key={r.id}
          to={`/qc-reports/${r.id}`}
          className="flex items-center justify-between gap-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
        >
          <div className="min-w-0">
            <div className="text-[0.84rem] font-semibold" style={{ color: '#e2e8f0' }}>
              {r.number}
            </div>
            <div className="text-[0.74rem]" style={{ color: '#94a3b8' }}>
              {r.practice_display}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status_display}</Badge>
        </Link>
      ))}

      <div className="text-[0.72rem] mt-3" style={{ color: 'var(--muted)' }}>
        El informe lleva solo la firma electrónica del técnico. La conformidad del cliente se
        registra con la firma de esta OT.
      </div>

      <NewQCReportModal open={modalOpen} onClose={() => setModalOpen(false)} workOrder={workOrder} />
    </Card>
  )
}
