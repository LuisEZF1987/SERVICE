import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi, WorkOrder, WorkOrderPhoto } from '../../api/workOrders'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const PHOTO_TYPE_OPTIONS = [
  { value: 'BEFORE', label: 'Antes' },
  { value: 'DURING', label: 'Durante' },
  { value: 'AFTER', label: 'Después' },
]

const PHOTO_TYPE_LABEL: Record<string, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Después',
}

interface Props {
  workOrder: WorkOrder
  editable: boolean
}

export default function WorkOrderPhotosSection({ workOrder, editable }: Props) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [photoType, setPhotoType] = useState('DURING')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] })

  const closeModal = () => {
    setModalOpen(false)
    setCaption('')
    setFile(null)
    setPhotoType('DURING')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('photo', file!)
      fd.append('photo_type', photoType)
      fd.append('caption', caption)
      return workOrdersApi.addPhoto(workOrder.id, fd)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Foto agregada')
      closeModal()
    },
    onError: () => toast.error('Error al subir la foto'),
  })

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => workOrdersApi.deletePhoto(workOrder.id, photoId),
    onSuccess: () => {
      invalidate()
      toast.success('Foto eliminada')
    },
    onError: () => toast.error('Error al eliminar la foto'),
  })

  const handleSubmit = () => {
    if (!file) {
      toast.error('Selecciona una imagen')
      return
    }
    addMutation.mutate()
  }

  const photos = workOrder.photos ?? []

  return (
    <Card title={`Registro Fotográfico (${photos.length})`}>
      {photos.length === 0 && (
        <div className="text-[0.82rem] py-1" style={{ color: 'var(--muted)' }}>
          Sin fotos de evidencia
          {editable ? ' — registra el antes, durante y después del trabajo.' : '.'}
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p: WorkOrderPhoto) => (
            <div key={p.id}>
              <a href={p.photo} target="_blank" rel="noopener noreferrer">
                <img
                  src={p.photo}
                  alt={p.caption || 'Evidencia'}
                  className="w-full h-28 object-cover rounded-lg"
                  style={{ border: '1px solid var(--card-border)' }}
                />
              </a>
              <div className="flex items-center justify-between mt-1">
                <Badge
                  variant={
                    p.photo_type === 'BEFORE'
                      ? 'info'
                      : p.photo_type === 'AFTER'
                      ? 'success'
                      : 'warning'
                  }
                >
                  {PHOTO_TYPE_LABEL[p.photo_type] ?? p.photo_type}
                </Badge>
                {editable && (
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                    className="text-[0.7rem] font-semibold"
                    style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              {p.caption && (
                <div className="text-[0.72rem] mt-0.5" style={{ color: '#94a3b8' }}>
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
            Agregar Foto
          </Button>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Agregar Foto de Evidencia"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={addMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Subiendo...' : 'Subir Foto'}
            </Button>
          </>
        }
      >
        <Select
          label="Momento"
          options={PHOTO_TYPE_OPTIONS}
          value={photoType}
          onChange={(e) => setPhotoType(e.target.value)}
        />
        <Input
          label="Descripción (opcional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Ej: Detector antes de la limpieza"
        />
        <label
          className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: '#94a3b8' }}
        >
          Imagen
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-[0.85rem]"
          style={{ color: 'var(--text)' }}
        />
      </Modal>
    </Card>
  )
}
