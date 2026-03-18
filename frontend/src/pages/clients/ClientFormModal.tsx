import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { clientsApi, Client } from '../../api/clients'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'

interface ClientFormModalProps {
  open: boolean
  onClose: () => void
  client?: Client | null
}

interface FormData {
  name: string
  ruc: string
  client_type: string
  address: string
  city: string
  province: string
  phone: string
  email: string
  notes: string
}

const emptyForm: FormData = {
  name: '',
  ruc: '',
  client_type: '',
  address: '',
  city: '',
  province: '',
  phone: '',
  email: '',
  notes: '',
}

const clientTypeOptions = [
  { value: 'PUBLIC', label: 'Público' },
  { value: 'PRIVATE', label: 'Privado' },
]

export default function ClientFormModal({ open, onClose, client }: ClientFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = !!client

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  useEffect(() => {
    if (open) {
      if (client) {
        setForm({
          name: client.name || '',
          ruc: client.ruc || '',
          client_type: client.client_type || '',
          address: client.address || '',
          city: client.city || '',
          province: client.province || '',
          phone: client.phone || '',
          email: client.email || '',
          notes: client.notes || '',
        })
      } else {
        setForm(emptyForm)
      }
      setErrors({})
    }
  }, [open, client])

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (!form.ruc.trim()) {
      newErrors.ruc = 'El RUC es obligatorio'
    } else if (!/^\d{13}$/.test(form.ruc.trim())) {
      newErrors.ruc = 'El RUC debe tener exactamente 13 dígitos'
    }
    if (!form.client_type) newErrors.client_type = 'Seleccione un tipo de cliente'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<Client>) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente creado exitosamente')
      onClose()
    },
    onError: () => {
      toast.error('Error al crear el cliente')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Client>) => clientsApi.update(client!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', client!.id] })
      toast.success('Cliente actualizado exitosamente')
      onClose()
    },
    onError: () => {
      toast.error('Error al actualizar el cliente')
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (!validate()) return

    const data: Partial<Client> = { ...form }
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
      maxWidth="620px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Cliente'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Input
          label="Nombre / Razón Social"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          placeholder="Nombre del cliente"
          className="sm:col-span-2"
        />
        <Input
          label="RUC"
          value={form.ruc}
          onChange={(e) => handleChange('ruc', e.target.value.replace(/\D/g, '').slice(0, 13))}
          error={errors.ruc}
          placeholder="0000000000001"
          maxLength={13}
        />
        <Select
          label="Tipo de Cliente"
          value={form.client_type}
          onChange={(e) => handleChange('client_type', e.target.value)}
          options={clientTypeOptions}
          error={errors.client_type}
        />
        <Textarea
          label="Dirección"
          value={form.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Dirección completa"
          className="sm:col-span-2"
          rows={2}
        />
        <Input
          label="Ciudad"
          value={form.city}
          onChange={(e) => handleChange('city', e.target.value)}
          placeholder="Quito, Guayaquil..."
        />
        <Input
          label="Provincia"
          value={form.province}
          onChange={(e) => handleChange('province', e.target.value)}
          placeholder="Pichincha, Guayas..."
        />
        <Input
          label="Teléfono"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+593 99 999 9999"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="contacto@empresa.com"
        />
        <Textarea
          label="Notas"
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Observaciones adicionales..."
          className="sm:col-span-2"
          rows={3}
        />
      </div>
    </Modal>
  )
}
