import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi } from '../../api/users'
import { User } from '../../api/auth'
import { clientsApi } from '../../api/clients'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'COORDINATOR', label: 'Coordinador' },
  { value: 'TECHNICIAN', label: 'Técnico' },
  { value: 'MANAGEMENT', label: 'Gerencia' },
  { value: 'CLIENT', label: 'Cliente (portal)' },
]

const ROLE_BADGE: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  ADMIN: 'purple',
  COORDINATOR: 'primary',
  TECHNICIAN: 'info',
  MANAGEMENT: 'warning',
  CLIENT: 'secondary',
}

interface FormState {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
  role: string
  phone: string
  position: string
  client_organization: string
}

const emptyForm: FormState = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'TECHNICIAN',
  phone: '',
  position: '',
  client_organization: '',
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ page_size: '200' }).then((r) => r.data.results),
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list({ page_size: '500' }).then((r) => r.data),
    enabled: modalOpen && form.role === 'CLIENT',
  })

  const clientOptions = (clientsData?.results ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
      position: u.position || '',
      client_organization: u.client_organization || '',
    })
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const common = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        phone: form.phone,
        position: form.position,
        company_type: form.role === 'CLIENT' ? 'CLIENT' : 'DIMED',
        client_organization: form.role === 'CLIENT' ? form.client_organization || null : null,
      }
      if (editing) {
        return usersApi.update(editing.id, common as Partial<User>)
      }
      return usersApi.create({ ...common, username: form.username, password: form.password })
    },
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Usuario actualizado' : 'Usuario creado')
      closeModal()
    },
    onError: () => toast.error('Error al guardar el usuario'),
  })

  const toggleMutation = useMutation({
    mutationFn: (u: User) => usersApi.toggleActive(u.id),
    onSuccess: () => {
      invalidate()
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al cambiar el estado'),
  })

  const handleSubmit = () => {
    if (!editing && !form.username.trim()) {
      toast.error('Ingresa el nombre de usuario')
      return
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Ingresa nombres y apellidos')
      return
    }
    if (!editing && form.password.length < 10) {
      toast.error('La contraseña debe tener al menos 10 caracteres')
      return
    }
    if (form.role === 'CLIENT' && !form.client_organization) {
      toast.error('Selecciona la institución del usuario cliente')
      return
    }
    saveMutation.mutate()
  }

  const updateField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const columns = [
    {
      key: 'full_name',
      header: 'Nombre',
      render: (u: User) => (
        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
          {u.full_name || u.username}
        </span>
      ),
    },
    { key: 'username', header: 'Usuario' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Rol',
      render: (u: User) => (
        <Badge variant={ROLE_BADGE[u.role] ?? 'secondary'}>{u.role_display || u.role}</Badge>
      ),
    },
    { key: 'phone', header: 'Teléfono', render: (u: User) => u.phone || '—' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (u: User) => (
        <Badge variant={u.is_active ? 'success' : 'secondary'}>
          {u.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (u: User) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation()
              openEdit(u)
            }}
            className="text-[0.72rem] font-semibold"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleMutation.mutate(u)
            }}
            disabled={toggleMutation.isPending}
            className="text-[0.72rem] font-semibold"
            style={{
              color: u.is_active ? '#f87171' : '#34d399',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {u.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle={users ? `${users.length} usuario${users.length !== 1 ? 's' : ''} registrado${users.length !== 1 ? 's' : ''}` : 'Gestión de usuarios y roles del sistema'}
        actions={<Button onClick={openAdd}>Nuevo Usuario</Button>}
      />

      <Card>
        <Table
          columns={columns}
          data={users || []}
          loading={isLoading}
          emptyMessage="Sin usuarios registrados"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Editar Usuario — ${editing.username}` : 'Nuevo Usuario'}
        maxWidth="620px"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            label="Nombres"
            value={form.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
          />
          <Input
            label="Apellidos"
            value={form.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
          />
        </div>
        {!editing && (
          <div className="grid grid-cols-2 gap-x-4">
            <Input
              label="Nombre de usuario"
              value={form.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="Ej: jperez"
            />
            <Input
              label="Contraseña (mín. 10 caracteres)"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </div>
        )}
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-x-4">
          <Select
            label="Rol"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => updateField('role', e.target.value)}
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>
        <Input
          label="Cargo"
          value={form.position}
          onChange={(e) => updateField('position', e.target.value)}
          placeholder="Ej: Ingeniero Biomédico"
        />
        {form.role === 'CLIENT' && (
          <Select
            label="Institución cliente"
            options={clientOptions}
            value={form.client_organization}
            onChange={(e) => updateField('client_organization', e.target.value)}
          />
        )}
      </Modal>
    </div>
  )
}
