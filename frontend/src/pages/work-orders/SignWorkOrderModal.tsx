import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workOrdersApi } from '../../api/workOrders'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SignaturePad, { SignaturePadHandle } from '../../components/ui/SignaturePad'

interface SignWorkOrderModalProps {
  open: boolean
  onClose: () => void
  workOrderId: string
  mode: 'client' | 'technician'
}

export default function SignWorkOrderModal({ open, onClose, workOrderId, mode }: SignWorkOrderModalProps) {
  const queryClient = useQueryClient()
  const padRef = useRef<SignaturePadHandle>(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')

  const isClient = mode === 'client'

  const mutation = useMutation({
    mutationFn: async () => {
      const blob = await padRef.current?.toBlob()
      if (!blob) throw new Error('no-signature')
      const formData = new FormData()
      if (isClient) {
        formData.append('client_signature', blob, 'firma.png')
        formData.append('client_signer_name', name)
        formData.append('client_signer_position', position)
        return workOrdersApi.sign(workOrderId, formData)
      }
      formData.append('technician_signature', blob, 'firma.png')
      return workOrdersApi.technicianSign(workOrderId, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success(
        isClient
          ? 'OT firmada. El PDF se enviará por correo al cliente y a Dimed.'
          : 'Firma del técnico registrada.'
      )
      handleClose()
    },
    onError: () => toast.error('Error al registrar la firma'),
  })

  const handleClose = () => {
    setName('')
    setPosition('')
    padRef.current?.clear()
    onClose()
  }

  const handleSubmit = () => {
    if (isClient && !name.trim()) {
      toast.error('Ingresa el nombre de quien firma')
      return
    }
    if (isClient && !position.trim()) {
      toast.error('Ingresa el cargo de quien firma')
      return
    }
    if (padRef.current?.isEmpty()) {
      toast.error('Captura la firma en el recuadro')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isClient ? 'Firma del Cliente' : 'Firma del Técnico'}
      maxWidth="600px"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Confirmar Firma'}
          </Button>
        </>
      }
    >
      {isClient && (
        <>
          <Input
            label="Nombre de quien firma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
          />
          <Input
            label="Cargo"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Cargo en la institución"
          />
        </>
      )}

      <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
        Firma
      </label>
      <SignaturePad ref={padRef} />
      <div className="mt-2 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => padRef.current?.clear()}>
          Limpiar
        </Button>
      </div>
    </Modal>
  )
}
