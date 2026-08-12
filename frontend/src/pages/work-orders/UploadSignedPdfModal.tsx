import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder } from '../../api/workOrders'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

interface Props {
  workOrder: WorkOrder
  open: boolean
  onClose: () => void
}

const MAX_MB = 20

export default function UploadSignedPdfModal({ workOrder, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signerPosition, setSignerPosition] = useState('')
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setFile(null)
    setSignerName('')
    setSignerPosition('')
    setError(null)
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('electronic_signature_document', file!)
      form.append('client_signer_name', signerName)
      form.append('client_signer_position', signerPosition)
      return workOrdersApi.uploadSignedPdf(workOrder.id, form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('OT firmada registrada.')
      close()
    },
    onError: (err: any) => {
      const data = err?.response?.data
      const detail =
        data?.electronic_signature_document?.[0] ||
        data?.client_signer_name?.[0] ||
        data?.detail ||
        'No se pudo registrar el documento.'
      setError(detail)
    },
  })

  const pickFile = (selected: File | null) => {
    setError(null)
    if (selected && selected.size > MAX_MB * 1024 * 1024) {
      setError(`El documento no puede superar ${MAX_MB} MB.`)
      setFile(null)
      return
    }
    setFile(selected)
  }

  const submit = () => {
    if (!file) return setError('Seleccione el PDF firmado.')
    if (!signerName.trim()) return setError('Indique quién firmó por el cliente.')
    mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Registrar OT firmada electrónicamente"
      maxWidth="560px"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={submit}
            disabled={mutation.isPending || !file}
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1">
        <p className="text-[0.8rem] mb-3" style={{ color: 'var(--muted)' }}>
          Suba el PDF de la OT <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
          {workOrder.number}</span> ya firmado por Dimed y por el cliente con sus
          certificados. Este documento pasa a ser el respaldo oficial del servicio.
        </p>

        <label
          className="block text-[0.65rem] font-bold uppercase tracking-wider mb-2"
          style={{ color: 'var(--muted)' }}
        >
          PDF firmado
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 p-4 mb-4 transition-all duration-200"
          style={{
            background: file ? 'rgba(34,197,94,0.07)' : 'rgba(96,165,250,0.05)',
            border: `1px dashed ${file ? 'rgba(34,197,94,0.35)' : 'rgba(96,165,250,0.3)'}`,
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={file ? '#22c55e' : '#60a5fa'} strokeWidth="1.8" strokeLinecap="round"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
            {file && <path d="M9 15l2 2 4-4" />}
          </svg>
          <div className="text-left">
            <div className="text-[0.82rem] font-semibold" style={{ color: '#e2e8f0' }}>
              {file ? file.name : 'Seleccionar PDF firmado'}
            </div>
            <div className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB — clic para cambiar`
                : `Debe contener las firmas electrónicas. Máximo ${MAX_MB} MB`}
            </div>
          </div>
        </button>

        <Input
          label="Firmó por el cliente"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Nombre de quien firmó"
        />
        <Input
          label="Cargo"
          value={signerPosition}
          onChange={(e) => setSignerPosition(e.target.value)}
          placeholder="Jefe de Imagen, Administrador..."
        />

        {error && (
          <div
            className="px-3 py-2 text-[0.78rem]"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: '10px',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
