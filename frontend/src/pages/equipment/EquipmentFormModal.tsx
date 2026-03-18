import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { equipmentApi, Equipment } from '../../api/equipment'
import { clientsApi } from '../../api/clients'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import Button from '../../components/ui/Button'

interface EquipmentFormModalProps {
  open: boolean
  onClose: () => void
  equipment?: Equipment | null
}

interface FormData {
  internal_code: string
  serial_number: string
  modality: string
  brand: string
  model_name: string
  client: string
  city: string
  province: string
  area: string
  hospital_asset_number: string
  arcsa_registration: string
  status: string
  year_of_manufacture: string
  country_of_origin: string
}

const emptyForm: FormData = {
  internal_code: 'DIM-',
  serial_number: '',
  modality: '',
  brand: '',
  model_name: '',
  client: '',
  city: '',
  province: '',
  area: '',
  hospital_asset_number: '',
  arcsa_registration: '',
  status: 'OPERATIONAL',
  year_of_manufacture: '',
  country_of_origin: '',
}

const modalityOptions = [
  { value: 'XRAY_FIXED', label: 'Rayos X Fijo' },
  { value: 'XRAY_PORTABLE', label: 'Rayos X Portátil' },
  { value: 'CT', label: 'Tomógrafo (TAC)' },
  { value: 'MRI', label: 'Resonancia Magnética' },
  { value: 'ULTRASOUND', label: 'Ultrasonido' },
  { value: 'MAMMOGRAPH', label: 'Mamógrafo' },
  { value: 'FLUOROSCOPE', label: 'Fluoroscopio' },
  { value: 'DENSITOMETER', label: 'Densitómetro' },
  { value: 'OTHER', label: 'Otro' },
]

const statusOptions = [
  { value: 'OPERATIONAL', label: 'Operativo' },
  { value: 'MAINTENANCE', label: 'En mantenimiento' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera de servicio' },
  { value: 'DECOMMISSIONED', label: 'Baja' },
]

export default function EquipmentFormModal({ open, onClose, equipment }: EquipmentFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = !!equipment

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  // Load clients for the select dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => clientsApi.list(),
    select: (res) => res.data.results,
    enabled: open,
  })

  const clientOptions = (clientsData || []).map((c) => ({
    value: c.id,
    label: `${c.name} (${c.ruc})`,
  }))

  useEffect(() => {
    if (open) {
      if (equipment) {
        setForm({
          internal_code: equipment.internal_code || '',
          serial_number: equipment.serial_number || '',
          modality: equipment.modality || '',
          brand: equipment.brand || '',
          model_name: equipment.model_name || '',
          client: equipment.client || '',
          city: equipment.city || '',
          province: equipment.province || '',
          area: equipment.area || '',
          hospital_asset_number: equipment.hospital_asset_number || '',
          arcsa_registration: equipment.arcsa_registration || '',
          status: equipment.status || 'OPERATIONAL',
          year_of_manufacture: equipment.year_of_manufacture?.toString() || '',
          country_of_origin: equipment.country_of_origin || '',
        })
      } else {
        setForm(emptyForm)
      }
      setErrors({})
    }
  }, [open, equipment])

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!form.internal_code.trim()) newErrors.internal_code = 'El código interno es obligatorio'
    if (!form.serial_number.trim()) newErrors.serial_number = 'El número de serie es obligatorio'
    if (!form.modality) newErrors.modality = 'Seleccione una modalidad'
    if (!form.brand.trim()) newErrors.brand = 'La marca es obligatoria'
    if (!form.model_name.trim()) newErrors.model_name = 'El modelo es obligatorio'
    if (!form.client) newErrors.client = 'Seleccione un cliente'
    if (form.year_of_manufacture && (isNaN(Number(form.year_of_manufacture)) || Number(form.year_of_manufacture) < 1950 || Number(form.year_of_manufacture) > new Date().getFullYear() + 1)) {
      newErrors.year_of_manufacture = 'Ingrese un año válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<Equipment>) => equipmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipo creado exitosamente')
      onClose()
    },
    onError: () => {
      toast.error('Error al crear el equipo')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Equipment>) => equipmentApi.update(equipment!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      queryClient.invalidateQueries({ queryKey: ['equipment-detail', equipment!.id] })
      toast.success('Equipo actualizado exitosamente')
      onClose()
    },
    onError: () => {
      toast.error('Error al actualizar el equipo')
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (!validate()) return

    const data: Partial<Equipment> = {
      ...form,
      year_of_manufacture: form.year_of_manufacture ? Number(form.year_of_manufacture) : null,
    }

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
      title={isEditing ? 'Editar Equipo' : 'Nuevo Equipo'}
      maxWidth="680px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Equipo'}
          </Button>
        </>
      }
    >
      {/* Identification */}
      <div className="mb-5">
        <h4
          className="text-[0.72rem] font-bold uppercase tracking-wider mb-3 pb-2"
          style={{ color: 'var(--accent)', borderBottom: '1px solid var(--card-border)' }}
        >
          Identificación
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Input
            label="Código Interno"
            value={form.internal_code}
            onChange={(e) => handleChange('internal_code', e.target.value)}
            error={errors.internal_code}
            placeholder="DIM-001"
          />
          <Input
            label="Número de Serie"
            value={form.serial_number}
            onChange={(e) => handleChange('serial_number', e.target.value)}
            error={errors.serial_number}
            placeholder="SN-XXXXXXXXX"
          />
          <Input
            label="Activo Hospitalario"
            value={form.hospital_asset_number}
            onChange={(e) => handleChange('hospital_asset_number', e.target.value)}
            placeholder="Código del hospital"
          />
          <Input
            label="Registro ARCSA"
            value={form.arcsa_registration}
            onChange={(e) => handleChange('arcsa_registration', e.target.value)}
            placeholder="Número de registro"
          />
        </div>
      </div>

      {/* Technical Data */}
      <div className="mb-5">
        <h4
          className="text-[0.72rem] font-bold uppercase tracking-wider mb-3 pb-2"
          style={{ color: 'var(--accent)', borderBottom: '1px solid var(--card-border)' }}
        >
          Datos Técnicos
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Select
            label="Modalidad"
            value={form.modality}
            onChange={(e) => handleChange('modality', e.target.value)}
            options={modalityOptions}
            error={errors.modality}
          />
          <Select
            label="Estado"
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={statusOptions}
          />
          <Input
            label="Marca"
            value={form.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            error={errors.brand}
            placeholder="Siemens, GE, Philips..."
          />
          <Input
            label="Modelo"
            value={form.model_name}
            onChange={(e) => handleChange('model_name', e.target.value)}
            error={errors.model_name}
            placeholder="Nombre del modelo"
          />
          <Input
            label="País de Origen"
            value={form.country_of_origin}
            onChange={(e) => handleChange('country_of_origin', e.target.value)}
            placeholder="Alemania, EE.UU...."
          />
          <Input
            label="Año de Fabricación"
            type="number"
            value={form.year_of_manufacture}
            onChange={(e) => handleChange('year_of_manufacture', e.target.value)}
            error={errors.year_of_manufacture}
            placeholder="2023"
            min={1950}
            max={new Date().getFullYear() + 1}
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <h4
          className="text-[0.72rem] font-bold uppercase tracking-wider mb-3 pb-2"
          style={{ color: 'var(--accent)', borderBottom: '1px solid var(--card-border)' }}
        >
          Ubicación
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div className="sm:col-span-2">
            <Select
              label="Cliente"
              value={form.client}
              onChange={(e) => handleChange('client', e.target.value)}
              options={clientOptions}
              error={errors.client}
            />
          </div>
          <Input
            label="Área / Servicio"
            value={form.area}
            onChange={(e) => handleChange('area', e.target.value)}
            placeholder="Radiología, Emergencias..."
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
        </div>
      </div>
    </Modal>
  )
}
