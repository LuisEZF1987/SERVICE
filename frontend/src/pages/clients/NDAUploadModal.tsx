import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { clientsApi, Client } from '../../api/clients'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

interface Props {
  client: Client
  open: boolean
  onClose: () => void
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png'
const MAX_MB = 20

export default function NDAUploadModal({ client, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [signedDate, setSignedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setError(null)
    setSignedDate(new Date().toISOString().slice(0, 10))
  }

  const close = () => {
    reset()
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => clientsApi.uploadNda(client.id, file!, signedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', client.id] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('NDA registrado. El cliente quedó activo.')
      close()
    },
    onError: (err: any) => {
      const data = err?.response?.data
      const detail =
        data?.nda_document?.[0] ||
        data?.nda_signed_date?.[0] ||
        data?.detail ||
        'No se pudo registrar el NDA.'
      setError(detail)
      toast.error(detail)
    },
  })

  const pickFile = (selected: File | null) => {
    setError(null)
    if (!selected) {
      setFile(null)
      return
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`El documento no puede superar ${MAX_MB} MB.`)
      setFile(null)
      return
    }
    setFile(selected)
  }

  const submit = () => {
    if (!file) {
      setError('Seleccione el documento firmado.')
      return
    }
    if (signedDate > new Date().toISOString().slice(0, 10)) {
      setError('La fecha de firma no puede ser futura.')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Subir NDA firmado"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="success" onClick={submit} disabled={mutation.isPending || !file}>
            {mutation.isPending ? 'Subiendo...' : 'Registrar NDA'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[0.8rem]" style={{ color: 'var(--muted)' }}>
          Suba el acuerdo de confidencialidad firmado por{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{client.name}</span>. Al
          registrarlo, el cliente quedará activo y podrá tener equipos y órdenes de trabajo.
        </p>

        <div>
          <label
            className="block text-[0.65rem] font-bold uppercase tracking-wider mb-2"
            style={{ color: 'var(--muted)' }}
          >
            Documento firmado
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-4 transition-all duration-200"
            style={{
              background: file ? 'rgba(34,197,94,0.07)' : 'rgba(96,165,250,0.05)',
              border: `1px dashed ${file ? 'rgba(34,197,94,0.35)' : 'rgba(96,165,250,0.3)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={file ? '#22c55e' : '#60a5fa'}
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {file ? (
                <>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 15l2 2 4-4" />
                </>
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </>
              )}
            </svg>
            <div className="text-left">
              <div className="text-[0.82rem] font-semibold" style={{ color: '#e2e8f0' }}>
                {file ? file.name : 'Seleccionar archivo'}
              </div>
              <div className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB — clic para cambiar`
                  : `PDF o imagen (JPG/PNG), máximo ${MAX_MB} MB`}
              </div>
            </div>
          </button>
        </div>

        <div>
          <label
            className="block text-[0.65rem] font-bold uppercase tracking-wider mb-2"
            style={{ color: 'var(--muted)' }}
          >
            Fecha de firma
          </label>
          <input
            type="date"
            value={signedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSignedDate(e.target.value)}
            className="w-full px-3 py-2 text-[0.85rem]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              color: '#e2e8f0',
              colorScheme: 'dark',
            }}
          />
        </div>

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
