import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder, WorkOrderDraft } from '../../api/workOrders'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Input'

interface Props {
  workOrder: WorkOrder
  open: boolean
  onClose: () => void
  /** Applies the draft to the form fields — it is not saved until the technician saves. */
  onApply: (draft: WorkOrderDraft) => void
}

const RESULT_LABELS: Record<string, string> = {
  RESOLVED: 'Resuelto',
  PARTIAL: 'Parcial',
  FOLLOW_UP: 'Seguimiento',
  NOT_RESOLVED: 'No resuelto',
}

const MIN_NOTES = 20

function DraftField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <div
        className="text-[0.65rem] font-bold uppercase tracking-wider mb-1"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </div>
      {value ? (
        <div
          className="text-[0.83rem] whitespace-pre-wrap leading-relaxed p-3"
          style={{
            color: '#e2e8f0',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
          }}
        >
          {value}
        </div>
      ) : (
        <div className="text-[0.78rem] italic" style={{ color: 'var(--muted)' }}>
          Sin información en las notas — complételo a mano
        </div>
      )}
    </div>
  )
}

export default function WritingAssistantModal({ workOrder, open, onClose, onApply }: Props) {
  const [notes, setNotes] = useState('')
  const [draft, setDraft] = useState<WorkOrderDraft | null>(null)

  const close = () => {
    setNotes('')
    setDraft(null)
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => workOrdersApi.assistWriting(workOrder.id, notes),
    onSuccess: (res) => setDraft(res.data),
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'No se pudo redactar el texto.')
    },
  })

  const apply = () => {
    if (!draft) return
    onApply(draft)
    toast.success('Texto aplicado. Revíselo y guarde la OT.')
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Asistente de redacción"
      maxWidth="680px"
      footer={
        draft ? (
          <div className="flex justify-between items-center w-full gap-3">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Volver a mis notas
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={close}>
                Descartar
              </Button>
              <Button variant="success" onClick={apply}>
                Usar este texto
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || notes.trim().length < MIN_NOTES}
            >
              {mutation.isPending ? 'Redactando...' : 'Redactar'}
            </Button>
          </div>
        )
      }
    >
      {!draft ? (
        <div>
          <p className="text-[0.8rem] mb-3" style={{ color: 'var(--muted)' }}>
            Escriba lo que hizo tal como lo recuerda, sin preocuparse por la redacción.
            El asistente lo ordena en los campos de la OT y usted revisa antes de guardar.
          </p>
          <Textarea
            label="Sus notas de campo"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              'llegue y el equipo no prendia, revise la fuente y estaba quemado el ' +
              'fusible, lo cambie y ya prendio, hay que revisar la instalacion electrica'
            }
            rows={7}
          />
          <p className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
            Solo se reescribe lo que usted escriba. El asistente no agrega
            procedimientos, mediciones ni repuestos que no haya mencionado.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-[0.8rem] mb-4" style={{ color: 'var(--muted)' }}>
            Propuesta a partir de sus notas. Al usarla se llenan los campos del
            formulario; nada se guarda hasta que usted guarde la OT.
          </p>

          <DraftField label="Diagnóstico" value={draft.diagnosis} />
          <DraftField label="Trabajo realizado" value={draft.work_performed} />
          <DraftField label="Notas de seguimiento" value={draft.follow_up_notes} />

          <div className="mb-3">
            <div
              className="text-[0.65rem] font-bold uppercase tracking-wider mb-1"
              style={{ color: 'var(--muted)' }}
            >
              Resultado
            </div>
            <div className="text-[0.83rem]" style={{ color: '#e2e8f0' }}>
              {draft.result ? (
                RESULT_LABELS[draft.result] || draft.result
              ) : (
                <span className="italic" style={{ color: 'var(--muted)' }}>
                  No se deduce de las notas — selecciónelo al cerrar la OT
                </span>
              )}
            </div>
          </div>

          {draft.omitted.length > 0 && (
            <div
              className="p-3 mt-4"
              style={{
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '10px',
              }}
            >
              <div
                className="text-[0.72rem] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: '#fbbf24' }}
              >
                Falta por completar
              </div>
              <ul className="text-[0.78rem]" style={{ color: '#fde68a' }}>
                {draft.omitted.map((item, i) => (
                  <li key={i} className="mb-0.5">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
