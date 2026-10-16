import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import {
  instrumentsApi,
  CalibrationStatus,
  MeasuringInstrument,
  INSTRUMENT_STATUSES,
  INSTRUMENT_TYPES,
} from '../../api/instruments'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'

type ApiError = AxiosError<Record<string, string[] | string>>

const CAL_VARIANT: Record<CalibrationStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  VALID: 'success',
  DUE_SOON: 'warning',
  EXPIRED: 'danger',
  NO_RECORD: 'danger',
  NOT_REQUIRED: 'secondary',
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'due_soon', label: 'Por vencer (≤ 3 meses)' },
  { value: 'no_record', label: 'Sin calibración' },
  { value: 'valid', label: 'Vigentes' },
]

const fmtDate = (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '—')

const firstError = (err: ApiError, fallback: string) => {
  const data = err?.response?.data
  if (!data) return fallback
  const v = Object.values(data)[0]
  return (Array.isArray(v) ? v[0] : v) || fallback
}

function CalibrationBadge({ instrument }: { instrument: MeasuringInstrument }) {
  const days = instrument.days_to_due
  const detail =
    instrument.calibration_status === 'DUE_SOON' && days !== null
      ? ` (${days} d)`
      : instrument.calibration_status === 'EXPIRED' && days !== null
        ? ` (hace ${-days} d)`
        : ''
  return (
    <Badge variant={CAL_VARIANT[instrument.calibration_status]}>
      {instrument.calibration_status_display}
      {detail}
    </Badge>
  )
}

const emptyForm = {
  name: '', instrument_type: 'OTHER', brand: '', model_name: '', serial_number: '',
  status: 'ACTIVE', assigned_to: '', notes: '', requires_calibration: true, calibration_interval_months: 12,
}

export default function InstrumentsPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<MeasuringInstrument | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [calFor, setCalFor] = useState<MeasuringInstrument | null>(null)

  const { data: instruments = [], isLoading } = useQuery({
    queryKey: ['instruments', filter, search],
    queryFn: () =>
      instrumentsApi
        .list({ ...(filter ? { calibration: filter } : {}), ...(search ? { search } : {}) })
        .then((r) => r.data.results),
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['instruments', 'alerts'],
    queryFn: async () => {
      const [expired, soon] = await Promise.all([
        instrumentsApi.list({ calibration: 'expired' }),
        instrumentsApi.list({ calibration: 'due_soon' }),
      ])
      return [...expired.data.results, ...soon.data.results].filter((i) => i.status !== 'RETIRED')
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['instruments'] })

  const saveMutation = useMutation({
    mutationFn: () => (editing ? instrumentsApi.update(editing.id, form) : instrumentsApi.create(form)),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Instrumento actualizado' : 'Instrumento registrado')
      setFormOpen(false)
    },
    onError: (err: ApiError) => toast.error(firstError(err, 'No se pudo guardar el instrumento')),
  })

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (i: MeasuringInstrument) => {
    setEditing(i)
    setForm({
      name: i.name, instrument_type: i.instrument_type, brand: i.brand, model_name: i.model_name,
      serial_number: i.serial_number, status: i.status, assigned_to: i.assigned_to, notes: i.notes,
      requires_calibration: i.requires_calibration, calibration_interval_months: i.calibration_interval_months,
    })
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Instrumentos de medición"
        subtitle="Inventario de equipos de medición y control de calidad, y vigencia de sus calibraciones"
        actions={canEdit && <Button onClick={openNew}>Registrar instrumento</Button>}
      />

      {alerts.length > 0 && (
        <Card className="mb-4">
          <div className="text-[0.85rem] font-semibold mb-2" style={{ color: '#fb923c' }}>
            {alerts.length} instrumento(s) con calibración vencida o por vencer en los próximos 3 meses
          </div>
          {alerts.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-1.5 text-[0.8rem]" style={{ color: '#cbd5e1' }}>
              <span>{i.name} — {i.brand} {i.model_name} (S/N {i.serial_number}) · vence {fmtDate(i.calibration_due_date)}</span>
              <CalibrationBadge instrument={i} />
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {FILTERS.map((f) => (
            <Button key={f.value} size="sm" variant={filter === f.value ? 'primary' : 'secondary'} onClick={() => setFilter(f.value)}>
              {f.label}
            </Button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, marca, modelo o S/N"
            className="ml-auto outline-none text-[0.8rem]"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text)', padding: '7px 12px', minWidth: 260 }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[0.8rem]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#94a3b8', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {['Instrumento', 'Marca / modelo', 'S/N', 'Estado', 'Última calibración', 'Vence', 'Calibración', ''].map((h) => (
                  <th key={h} className="text-left py-2 px-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="py-6 text-center" style={{ color: 'var(--muted)' }}>Cargando...</td></tr>
              )}
              {!isLoading && instruments.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center" style={{ color: 'var(--muted)' }}>Sin instrumentos registrados.</td></tr>
              )}
              {instruments.map((i) => (
                <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}>
                  <td className="py-2 px-2">
                    <div className="font-semibold" style={{ color: '#e2e8f0' }}>{i.name}</div>
                    <div className="text-[0.7rem]" style={{ color: '#94a3b8' }}>{i.type_display}{i.assigned_to ? ` · ${i.assigned_to}` : ''}</div>
                  </td>
                  <td className="py-2 px-2">{i.brand} {i.model_name}</td>
                  <td className="py-2 px-2">{i.serial_number}</td>
                  <td className="py-2 px-2">{i.status_display}</td>
                  <td className="py-2 px-2">{fmtDate(i.last_calibration_date)}</td>
                  <td className="py-2 px-2">{fmtDate(i.calibration_due_date)}</td>
                  <td className="py-2 px-2"><CalibrationBadge instrument={i} /></td>
                  <td className="py-2 px-2 whitespace-nowrap text-right">
                    {i.latest_calibration?.certificate_file && (
                      <a href={i.latest_calibration.certificate_file} target="_blank" rel="noreferrer" className="text-[0.72rem] font-semibold mr-3" style={{ color: 'var(--accent)' }}>
                        Certificado
                      </a>
                    )}
                    {canEdit && i.requires_calibration && (
                      <button onClick={() => setCalFor(i)} className="text-[0.72rem] font-semibold mr-3" style={{ color: '#34d399', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Registrar calibración
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => openEdit(i)} className="text-[0.72rem] font-semibold" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[0.72rem] mt-3" style={{ color: 'var(--muted)' }}>
          El sistema envía un correo a administradores y coordinadores 90, 30 y 7 días antes de que venza cada
          calibración, y otro cuando ya está vencida.
        </div>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar instrumento' : 'Registrar instrumento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.serial_number}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <Input label="Instrumento" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Cámara de ionización para fuga y áreas" />
        <div className="grid grid-cols-2 gap-x-3">
          <Select label="Tipo" options={INSTRUMENT_TYPES} value={form.instrument_type} onChange={(e) => setForm({ ...form, instrument_type: e.target.value })} />
          <Select label="Estado" options={INSTRUMENT_STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          <Input label="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <Input label="Modelo" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} />
          <Input label="Número de serie" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
          <Input label="Ubicación / asignado a" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-[0.85rem] mb-3 cursor-pointer" style={{ color: '#cbd5e1' }}>
          <input type="checkbox" checked={form.requires_calibration} onChange={(e) => setForm({ ...form, requires_calibration: e.target.checked })}
            style={{ accentColor: '#60a5fa', width: 15, height: 15 }} />
          Requiere calibración periódica
        </label>
        {form.requires_calibration && (
          <Input label="Intervalo de calibración (meses)" type="number" min={1} value={form.calibration_interval_months}
            onChange={(e) => setForm({ ...form, calibration_interval_months: Number(e.target.value) || 12 })} />
        )}
        <Textarea label="Observaciones" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Modal>

      {calFor && <CalibrationModal instrument={calFor} onClose={() => setCalFor(null)} onSaved={invalidate} />}
    </div>
  )
}

function CalibrationModal({ instrument, onClose, onSaved }: {
  instrument: MeasuringInstrument
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [due, setDue] = useState('')
  const [lab, setLab] = useState('')
  const [cert, setCert] = useState('')
  const [result, setResult] = useState('APPROVED')
  const [file, setFile] = useState<File | null>(null)

  const defaultDue = dayjs(date).add(instrument.calibration_interval_months, 'month').format('YYYY-MM-DD')

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('calibration_date', date)
      fd.append('due_date', due || defaultDue)
      fd.append('laboratory', lab)
      fd.append('certificate_number', cert)
      fd.append('result', result)
      if (file) fd.append('certificate_file', file)
      return instrumentsApi.addCalibration(instrument.id, fd)
    },
    onSuccess: () => {
      onSaved()
      toast.success('Calibración registrada')
      onClose()
    },
    onError: (err: ApiError) => toast.error(firstError(err, 'No se pudo registrar la calibración')),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar calibración"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button variant="success" onClick={() => mutation.mutate()} disabled={mutation.isPending || !date}>
            {mutation.isPending ? 'Guardando...' : 'Registrar'}
          </Button>
        </>
      }
    >
      <p className="text-[0.8rem] mb-3" style={{ color: 'var(--muted)' }}>
        {instrument.name} — {instrument.brand} {instrument.model_name} (S/N {instrument.serial_number})
      </p>
      <div className="grid grid-cols-2 gap-x-3">
        <Input label="Fecha de calibración" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Próxima calibración" type="date" value={due || defaultDue} onChange={(e) => setDue(e.target.value)} />
        <Input label="Laboratorio calibrador" value={lab} onChange={(e) => setLab(e.target.value)} />
        <Input label="Nro. de certificado" value={cert} onChange={(e) => setCert(e.target.value)} />
      </div>
      <Select label="Resultado" value={result} onChange={(e) => setResult(e.target.value)}
        options={[{ value: 'APPROVED', label: 'Aprobado' }, { value: 'REJECTED', label: 'Rechazado' }]} />
      <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
        Certificado (PDF)
      </label>
      <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-[0.8rem] mb-2" style={{ color: '#cbd5e1' }} />
      <div className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
        Al registrar una calibración aprobada, la fecha de vencimiento del instrumento se actualiza y se reinician las alertas.
      </div>
    </Modal>
  )
}
