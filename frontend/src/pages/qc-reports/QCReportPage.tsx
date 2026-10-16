import { useEffect, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { qcReportsApi, QCReport, QCResult } from '../../api/qcReports'
import { instrumentsApi, MeasuringInstrument } from '../../api/instruments'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'

type ApiError = AxiosError<{ detail?: string; signed_document?: string[] }>

const EDITABLE_FIELDS = [
  'service_type', 'institution', 'practice_info', 'equipment_data', 'tube_data', 'instruments',
  'tests', 'hvl', 'mammo_score', 'radiation_levels', 'overall_result', 'observations',
  'recommendations', 'technician_id_number', 'technician_license',
] as const

const SERVICE_TYPES = [
  { value: 'INSTALLATION', label: 'Instalación' },
  { value: 'COMMISSIONING', label: 'Puesta en marcha' },
  { value: 'PREVENTIVE', label: 'Mantenimiento preventivo' },
  { value: 'CORRECTIVE', label: 'Mantenimiento correctivo' },
]

const OVERALL_RESULTS = [
  { value: 'PASS', label: 'Cumple (aprobado)' },
  { value: 'PASS_WITH_OBSERVATIONS', label: 'Cumple con observaciones' },
  { value: 'FAIL', label: 'No cumple (no aprobado)' },
]

const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success'> = {
  DRAFT: 'secondary',
  ISSUED: 'warning',
  SIGNED: 'success',
}

const toNumber = (v: string) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const fmt = (n: number | null, digits = 3) =>
  n === null ? '' : String(Number(n.toFixed(digits)))

// ---------- small table controls ----------

const cellInput: React.CSSProperties = {
  width: '100%',
  background: 'rgba(30,41,59,0.5)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: '0.78rem',
  padding: '5px 7px',
  outline: 'none',
}

function CellInput({ value, onChange, disabled, placeholder, align = 'center' }: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder?: string
  align?: 'left' | 'center'
}) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      inputMode={align === 'center' ? 'decimal' : undefined}
      style={{ ...cellInput, textAlign: align }}
    />
  )
}

const RESULT_OPTIONS: { value: QCResult; label: string; color: string }[] = [
  { value: 'PASS', label: 'Cumple', color: '#34d399' },
  { value: 'FAIL', label: 'No cumple', color: '#f87171' },
  { value: 'NA', label: 'N/A', color: '#94a3b8' },
]

function ResultPicker({ value, onChange, disabled, withNA = true }: {
  value: QCResult | undefined
  onChange: (v: QCResult) => void
  disabled: boolean
  withNA?: boolean
}) {
  return (
    <div className="flex gap-1 justify-center">
      {RESULT_OPTIONS.filter((o) => withNA || o.value !== 'NA').map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(active ? '' : o.value)}
            className="text-[0.68rem] font-semibold px-2 py-1"
            style={{
              borderRadius: 6,
              cursor: disabled ? 'default' : 'pointer',
              border: `1px solid ${active ? o.color : 'rgba(255,255,255,0.08)'}`,
              background: active ? `${o.color}22` : 'transparent',
              color: active ? o.color : '#64748b',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const th: React.CSSProperties = {
  fontSize: '0.66rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#94a3b8',
  padding: '6px 6px',
  textAlign: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  fontWeight: 700,
}
const td: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  fontSize: '0.78rem',
  color: '#cbd5e1',
  verticalAlign: 'middle',
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">{children}</div>
}

// ---------- page ----------

export default function QCReportPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<QCReport | null>(null)
  const [dirty, setDirty] = useState(false)
  const [signedOpen, setSignedOpen] = useState(false)

  const { data: report, isLoading } = useQuery({
    queryKey: ['qc-report', id],
    queryFn: () => qcReportsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  // Dimed's instrument inventory, to fill the instruments table and flag
  // expired calibrations (technicians have read access).
  const { data: inventory = [] } = useQuery({
    queryKey: ['instruments', 'active'],
    queryFn: () => instrumentsApi.list({ status: 'ACTIVE' }).then((r) => r.data.results),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (report && !dirty) setDraft(report)
  }, [report, dirty])

  const canEdit =
    !!report && report.status !== 'SIGNED' && ['ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(user?.role ?? '')
  const locked = !canEdit

  const update = <K extends keyof QCReport>(key: K, value: QCReport[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setDirty(true)
  }

  const afterSave = (data: QCReport) => {
    queryClient.setQueryData(['qc-report', id], data)
    queryClient.invalidateQueries({ queryKey: ['qc-reports', data.work_order] })
    setDraft(data)
    setDirty(false)
  }

  const payload = (): Partial<QCReport> => {
    const out: Record<string, unknown> = {}
    for (const f of EDITABLE_FIELDS) out[f] = draft![f]
    return out as Partial<QCReport>
  }

  const saveMutation = useMutation({
    mutationFn: () => qcReportsApi.update(id!, payload()),
    onSuccess: ({ data }) => {
      afterSave(data)
      toast.success('Informe guardado')
    },
    onError: () => toast.error('No se pudo guardar el informe'),
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (dirty) await qcReportsApi.update(id!, payload())
      return qcReportsApi.generatePdf(id!)
    },
    onSuccess: ({ data }) => {
      afterSave(data)
      toast.success('PDF generado. Descárguelo, fírmelo con FirmaEC y súbalo firmado.')
    },
    onError: (err: ApiError) => toast.error(err?.response?.data?.detail || 'No se pudo generar el PDF'),
  })

  if (isLoading || !draft || !report) {
    return (
      <div className="flex items-center justify-center py-20 text-[0.85rem]" style={{ color: 'var(--muted)' }}>
        Cargando informe...
      </div>
    )
  }

  const inst = draft.institution ?? {}
  const setInst = (k: string, v: string) => update('institution', { ...inst, [k]: v })

  const setTest = (i: number, k: string, v: string) =>
    update('tests', draft.tests.map((t, j) => (j === i ? { ...t, [k]: v } : t)))

  const hvlRows = draft.hvl?.rows ?? []
  const d0 = hvlRows.length ? toNumber(hvlRows[0].dose) : null

  const radRows = draft.radiation_levels?.rows ?? []
  const setRad = (i: number, k: string, v: string) =>
    update('radiation_levels', {
      ...draft.radiation_levels,
      rows: radRows.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
    })

  const mammo = draft.mammo_score ?? {}
  const mammoRows = mammo.rows ?? []

  return (
    <div>
      <PageHeader
        title={`Informe ${draft.number}`}
        subtitle={`Formato ${draft.format_code} — ${draft.practice_display} · OT ${draft.work_order_number} · ${draft.client_name}`}
        actions={
          <>
            <Link to={`/work-orders/${draft.work_order}`}>
              <Button variant="ghost" size="sm">Volver a la OT</Button>
            </Link>
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando...' : dirty ? 'Guardar' : 'Guardado'}
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? 'Generando...' : 'Generar PDF'}
              </Button>
            )}
          </>
        }
      />

      {/* Estado y documentos */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 text-[0.8rem]" style={{ color: '#cbd5e1' }}>
          <Badge variant={STATUS_VARIANT[report.status] ?? 'secondary'}>{report.status_display}</Badge>
          {report.status === 'DRAFT' && (
            <span style={{ color: 'var(--muted)' }}>
              Ingrese los valores leídos en el instrumento. Al terminar, genere el PDF.
            </span>
          )}
          {report.pdf_document && report.status !== 'DRAFT' && (
            <a href={report.pdf_document} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              Descargar PDF para firmar
            </a>
          )}
          {report.status === 'ISSUED' && canEdit && (
            <Button size="sm" variant="success" onClick={() => setSignedOpen(true)}>
              Subir informe firmado (FirmaEC)
            </Button>
          )}
          {report.signed_document && (
            <a href={report.signed_document} target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>
              Ver informe firmado
            </a>
          )}
          {dirty && <span style={{ color: '#fb923c' }}>Hay cambios sin guardar.</span>}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="1–3. Servicio, institución usuaria, práctica y técnica">
          <Grid>
            <Select label="Tipo de servicio" options={SERVICE_TYPES} value={draft.service_type}
              onChange={(e) => update('service_type', e.target.value)} disabled={locked} />
            <Input label="Servicio / sala del equipo" value={inst.room ?? ''} onChange={(e) => setInst('room', e.target.value)} disabled={locked} />
            <Input label="Institución (razón social)" value={inst.name ?? ''} onChange={(e) => setInst('name', e.target.value)} disabled={locked} />
            <Input label="RUC" value={inst.ruc ?? ''} onChange={(e) => setInst('ruc', e.target.value)} disabled={locked} />
            <Input label="Dirección" value={inst.address ?? ''} onChange={(e) => setInst('address', e.target.value)} disabled={locked} />
            <Input label="Teléfono" value={inst.phone ?? ''} onChange={(e) => setInst('phone', e.target.value)} disabled={locked} />
            <Input label="Nombre(s) de contacto" value={inst.contacts ?? ''} onChange={(e) => setInst('contacts', e.target.value)} disabled={locked} />
            <Input label="Licencia institucional Nro. / vigencia" value={inst.license ?? ''} onChange={(e) => setInst('license', e.target.value)} disabled={locked} />
            <Input label="Práctica (Anexo I)" value={draft.practice_info?.practice ?? ''}
              onChange={(e) => update('practice_info', { ...draft.practice_info, practice: e.target.value })} disabled={locked} />
            <Select label="Técnica / equipo a inspeccionar" value={draft.practice_info?.technique ?? ''}
              options={draft.techniques.map((t) => ({ value: t, label: t }))}
              onChange={(e) => update('practice_info', { ...draft.practice_info, technique: e.target.value })} disabled={locked} />
            <Input label="Categoría de riesgo (Anexo I)" value={draft.practice_info?.risk_category ?? ''}
              onChange={(e) => update('practice_info', { ...draft.practice_info, risk_category: e.target.value })} disabled={locked} />
          </Grid>
        </Card>

        <Card title="4–5. Datos del equipo y del tubo de rayos X">
          {(['equipment_data', 'tube_data'] as const).map((key) => {
            const dev = draft[key]
            const setDev = (k: string, v: string) => update(key, { ...dev, [k]: v })
            return (
              <div key={key} className="mb-2">
                <div className="text-[0.78rem] font-bold mb-2" style={{ color: '#93c5fd' }}>
                  {key === 'equipment_data' ? 'Equipo de rayos X' : 'Tubo de rayos X'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
                  <Input label="Marca" value={dev.brand} onChange={(e) => setDev('brand', e.target.value)} disabled={locked} />
                  <Input label="Modelo" value={dev.model} onChange={(e) => setDev('model', e.target.value)} disabled={locked} />
                  <Input label="Número de serie" value={dev.serial} onChange={(e) => setDev('serial', e.target.value)} disabled={locked} />
                  <Input label="Año de fabricación" value={dev.year} onChange={(e) => setDev('year', e.target.value)} disabled={locked} />
                </div>
                {dev.extras?.length > 0 && (
                  <Grid>
                    {dev.extras.map((x, i) => (
                      <Input key={x.label} label={x.label} value={x.value} disabled={locked}
                        onChange={(e) => update(key, { ...dev, extras: dev.extras.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)) })} />
                    ))}
                  </Grid>
                )}
              </div>
            )
          })}
        </Card>

        <Card title="6. Instrumentos de medición utilizados">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Instrumento</th><th style={th}>Marca / modelo</th><th style={th}>N.º de serie</th>
                  <th style={th}>Certificado de calibración</th><th style={th}>Vigente hasta</th>
                </tr>
              </thead>
              <tbody>
                {draft.instruments.map((ins, i) => {
                  const set = (k: string, v: string) =>
                    update('instruments', draft.instruments.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
                  const pick = (inst: MeasuringInstrument | undefined) => {
                    if (!inst) return
                    const due = inst.calibration_due_date
                    update('instruments', draft.instruments.map((x, j) => (j === i ? {
                      ...x,
                      model: `${inst.brand} ${inst.model_name}`,
                      serial: inst.serial_number,
                      certificate: inst.latest_calibration?.certificate_number ?? '',
                      valid_until: due ? due.split('-').reverse().join('/') : '',
                    } : x)))
                  }
                  const known = inventory.find((x) => x.serial_number === ins.serial)
                  const expired = known && ['EXPIRED', 'NO_RECORD'].includes(known.calibration_status)
                  return (
                    <tr key={i}>
                      <td style={{ ...td, minWidth: 220 }}>
                        <div>{ins.name}</div>
                        {!locked && inventory.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => pick(inventory.find((x) => x.id === e.target.value))}
                            style={{ ...cellInput, marginTop: 4, textAlign: 'left' }}
                          >
                            <option value="" style={{ background: '#0f172a' }}>Elegir del inventario...</option>
                            {inventory.map((x) => (
                              <option key={x.id} value={x.id} style={{ background: '#0f172a' }}>
                                {x.brand} {x.model_name} — S/N {x.serial_number}
                                {x.calibration_status === 'EXPIRED' ? ' (CALIBRACIÓN VENCIDA)' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                        {expired && (
                          <div className="text-[0.7rem] mt-1 font-semibold" style={{ color: '#f87171' }}>
                            {known.calibration_status === 'EXPIRED' ? 'Calibración vencida' : 'Sin calibración registrada'}: no use este instrumento para el informe.
                          </div>
                        )}
                      </td>
                      <td style={td}><CellInput align="left" value={ins.model} onChange={(v) => set('model', v)} disabled={locked} /></td>
                      <td style={td}><CellInput value={ins.serial} onChange={(v) => set('serial', v)} disabled={locked} /></td>
                      <td style={td}><CellInput value={ins.certificate} onChange={(v) => set('certificate', v)} disabled={locked} /></td>
                      <td style={td}><CellInput value={ins.valid_until} onChange={(v) => set('valid_until', v)} disabled={locked} placeholder="dd/mm/aaaa" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="7. Resultados de las pruebas">
          <div className="text-[0.74rem] mb-2" style={{ color: 'var(--muted)' }}>
            Anote en cada casilla el valor que muestra la pantalla del instrumento, en el momento de la lectura.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th><th style={{ ...th, textAlign: 'left' }}>Prueba</th><th style={th}>Tolerancia</th>
                  <th style={th}>Medición 1</th><th style={th}>Medición 2</th><th style={th}>Medición 3</th><th style={th}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {draft.tests.map((t, i) => (
                  <tr key={i}>
                    <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                    <td style={{ ...td, minWidth: 260 }}>{t.label}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#93c5fd', whiteSpace: 'nowrap' }}>{t.tolerance}</td>
                    {(['m1', 'm2', 'm3'] as const).map((m) => (
                      <td key={m} style={{ ...td, width: 90 }}>
                        <CellInput value={t[m]} onChange={(v) => setTest(i, m, v)} disabled={locked} />
                      </td>
                    ))}
                    <td style={td}><ResultPicker value={t.result} onChange={(v) => setTest(i, 'result', v)} disabled={locked} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {hvlRows.length > 0 && (
          <Card title={`7.1. Capa hemirreductora (HVL) a ${draft.hvl.kv}`}>
            <table className="w-full mb-3" style={{ borderCollapse: 'collapse', maxWidth: 560 }}>
              <thead>
                <tr><th style={th}>Aluminio añadido (mm Al)</th><th style={th}>Dosis medida (µGy)</th><th style={th}>% respecto a D0</th></tr>
              </thead>
              <tbody>
                {hvlRows.map((r, i) => {
                  const dose = toNumber(r.dose)
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: 'center' }}>{r.thickness}{i === 0 ? ' (D0)' : ''}</td>
                      <td style={td}>
                        <CellInput value={r.dose} disabled={locked}
                          onChange={(v) => update('hvl', { ...draft.hvl, rows: hvlRows.map((x, j) => (j === i ? { ...x, dose: v } : x)) })} />
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{dose !== null && d0 ? fmt((dose / d0) * 100, 1) : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 items-end">
              <Input label="HVL obtenido (mm Al)" value={draft.hvl.hvl_value ?? ''} disabled={locked}
                onChange={(e) => update('hvl', { ...draft.hvl, hvl_value: e.target.value })} />
              <Input label="Valor mínimo exigido (mm Al)" value={draft.hvl.hvl_min ?? ''} disabled={locked}
                onChange={(e) => update('hvl', { ...draft.hvl, hvl_min: e.target.value })} />
              <div className="mb-4">
                <ResultPicker value={draft.hvl.result} withNA={false} disabled={locked}
                  onChange={(v) => update('hvl', { ...draft.hvl, result: v })} />
              </div>
            </div>
          </Card>
        )}

        {mammoRows.length > 0 && (
          <Card title="7.2. Imagen de la prueba de fantoma y su puntaje (score)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
              <Select label="Fantoma utilizado" value={mammo.phantom_type ?? ''} disabled={locked}
                options={[{ value: 'ACR (RMI 156 o equivalente)', label: 'ACR (RMI 156 o equivalente)' }, { value: 'ACR digital (DM)', label: 'ACR digital (DM)' }]}
                onChange={(e) => update('mammo_score', { ...mammo, phantom_type: e.target.value })} />
              <Input label="Marca / modelo / S/N del fantoma" value={mammo.phantom_id ?? ''} disabled={locked}
                onChange={(e) => update('mammo_score', { ...mammo, phantom_id: e.target.value })} />
              <Input label="Técnica (kV / mAs / ánodo-filtro)" value={mammo.technique ?? ''} disabled={locked}
                onChange={(e) => update('mammo_score', { ...mammo, technique: e.target.value })} />
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Grupo de objetos</th><th style={th}>Puntaje obtenido</th>
                  <th style={th}>Mínimo ACR (RMI 156)</th><th style={th}>Mínimo ACR digital</th><th style={th}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {mammoRows.map((r, i) => {
                  const set = (k: string, v: string) =>
                    update('mammo_score', { ...mammo, rows: mammoRows.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })
                  return (
                    <tr key={i}>
                      <td style={td}>{r.object}</td>
                      <td style={{ ...td, width: 110 }}><CellInput value={r.score} onChange={(v) => set('score', v)} disabled={locked} /></td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.min_rmi}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.min_dm}</td>
                      <td style={td}><ResultPicker value={r.result} withNA={false} onChange={(v) => set('result', v)} disabled={locked} /></td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ ...td, fontWeight: 700 }} colSpan={4}>Resultado de la prueba de fantoma</td>
                  <td style={td}>
                    <ResultPicker value={mammo.overall} withNA={false} disabled={locked}
                      onChange={(v) => update('mammo_score', { ...mammo, overall: v })} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        <Card title="8. Niveles de radiación en consola de mando, puerta de acceso y áreas adyacentes">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th><th style={{ ...th, textAlign: 'left' }}>Punto de medición</th><th style={th}>Tipo de área</th>
                  <th style={th}>Fondo (µSv/h)</th><th style={th}>Medido (µSv/h)</th><th style={th}>Neto (µSv/h)</th>
                  <th style={th}>Referencia (µSv/h)</th><th style={th}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {radRows.map((r, i) => {
                  const measured = toNumber(r.measured)
                  const net = measured === null ? null : Math.max(measured - (toNumber(r.background) ?? 0), 0)
                  const ref = toNumber(r.reference)
                  const over = net !== null && ref !== null && net > ref
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ ...td, minWidth: 240 }}>
                        {r.point.endsWith(':') || !r.area_type
                          ? <CellInput align="left" value={r.point} onChange={(v) => setRad(i, 'point', v)} disabled={locked} />
                          : r.point}
                      </td>
                      <td style={{ ...td, width: 120 }}><CellInput value={r.area_type} onChange={(v) => setRad(i, 'area_type', v)} disabled={locked} /></td>
                      <td style={{ ...td, width: 90 }}><CellInput value={r.background} onChange={(v) => setRad(i, 'background', v)} disabled={locked} /></td>
                      <td style={{ ...td, width: 90 }}><CellInput value={r.measured} onChange={(v) => setRad(i, 'measured', v)} disabled={locked} /></td>
                      <td style={{ ...td, textAlign: 'center', color: over ? '#f87171' : '#cbd5e1', fontWeight: over ? 700 : 400 }}>{fmt(net)}</td>
                      <td style={{ ...td, width: 90 }}><CellInput value={r.reference} onChange={(v) => setRad(i, 'reference', v)} disabled={locked} /></td>
                      <td style={td}><ResultPicker value={r.result} onChange={(v) => setRad(i, 'result', v)} disabled={locked} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 mt-3">
            <Textarea className="sm:col-span-2" label="Condiciones de medición" rows={2} value={draft.radiation_levels?.conditions ?? ''} disabled={locked}
              onChange={(e) => update('radiation_levels', { ...draft.radiation_levels, conditions: e.target.value })} />
            <Input label="S/N de la cámara 10X6-1800" value={draft.radiation_levels?.instrument_serial ?? ''} disabled={locked}
              onChange={(e) => update('radiation_levels', { ...draft.radiation_levels, instrument_serial: e.target.value })} />
          </div>
        </Card>

        <QCPhotosCard report={report} editable={canEdit} />

        <Card title="10. Resultado general y firma del técnico">
          <Grid>
            <Select label="Resultado general" options={OVERALL_RESULTS} value={draft.overall_result} disabled={locked}
              onChange={(e) => update('overall_result', e.target.value)} />
            <div />
            <Input label="C.I. del técnico responsable" value={draft.technician_id_number} disabled={locked}
              onChange={(e) => update('technician_id_number', e.target.value)} />
            <Input label="Nro. de licencia personal" value={draft.technician_license} disabled={locked}
              onChange={(e) => update('technician_license', e.target.value)} />
          </Grid>
          <Textarea label="Observaciones" rows={3} value={draft.observations} disabled={locked}
            onChange={(e) => update('observations', e.target.value)} />
          <Textarea label="Recomendaciones" rows={3} value={draft.recommendations} disabled={locked}
            onChange={(e) => update('recommendations', e.target.value)} />
          <div className="text-[0.74rem]" style={{ color: 'var(--muted)' }}>
            Técnico responsable: <strong style={{ color: '#e2e8f0' }}>{draft.technician_name}</strong>. El informe lleva
            únicamente su firma electrónica (FirmaEC).
          </div>
        </Card>
      </div>

      <UploadSignedModal report={report} open={signedOpen} onClose={() => setSignedOpen(false)} onDone={afterSave} />
    </div>
  )
}

// ---------- photos ----------

function QCPhotosCard({ report, editable }: { report: QCReport; editable: boolean }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [slot, setSlot] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['qc-report', report.id] })

  const addMutation = useMutation({
    mutationFn: ({ s, file }: { s: string; file: File }) => {
      const fd = new FormData()
      fd.append('slot', s)
      fd.append('image', file)
      return qcReportsApi.addPhoto(report.id, fd)
    },
    onSuccess: () => {
      refresh()
      toast.success('Imagen agregada')
    },
    onError: () => toast.error('No se pudo subir la imagen'),
  })

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => qcReportsApi.deletePhoto(report.id, photoId),
    onSuccess: () => refresh(),
    onError: () => toast.error('No se pudo eliminar la imagen'),
  })

  return (
    <Card title="9. Registro fotográfico">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && slot) addMutation.mutate({ s: slot, file })
          e.target.value = ''
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {report.photo_slots.map((s) => {
          const photos = report.photos.filter((p) => p.slot === s.slot)
          return (
            <div key={s.slot} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 10 }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.76rem] font-semibold" style={{ color: '#cbd5e1' }}>{s.label}</span>
                {editable && (
                  <Button size="sm" variant="secondary" disabled={addMutation.isPending}
                    onClick={() => { setSlot(s.slot); inputRef.current?.click() }}>
                    Subir
                  </Button>
                )}
              </div>
              {photos.length === 0 && (
                <div className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>Sin imagen</div>
              )}
              <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    <a href={p.image} target="_blank" rel="noreferrer">
                      <img src={p.image} alt={s.label} style={{ height: 90, borderRadius: 8, objectFit: 'cover' }} />
                    </a>
                    {editable && (
                      <button
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="absolute top-1 right-1 text-[0.65rem] px-1.5"
                        style={{ background: 'rgba(15,23,42,0.85)', color: '#f87171', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- signed upload ----------

function UploadSignedModal({ report, open, onClose, onDone }: {
  report: QCReport
  open: boolean
  onClose: () => void
  onDone: (r: QCReport) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('signed_document', file!)
      return qcReportsApi.uploadSigned(report.id, fd)
    },
    onSuccess: ({ data }) => {
      onDone(data)
      toast.success('Informe firmado registrado')
      setFile(null)
      onClose()
    },
    onError: (err: ApiError) =>
      toast.error(err?.response?.data?.signed_document?.[0] || err?.response?.data?.detail || 'No se pudo registrar el informe'),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subir informe firmado electrónicamente"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button variant="success" onClick={() => mutation.mutate()} disabled={!file || mutation.isPending}>
            {mutation.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </>
      }
    >
      <p className="text-[0.8rem] mb-3" style={{ color: 'var(--muted)' }}>
        Suba el PDF del informe <strong style={{ color: '#e2e8f0' }}>{report.number}</strong> firmado con FirmaEC por el
        técnico responsable. Después de registrarlo, el informe queda bloqueado y es el documento oficial que se entrega
        a la institución usuaria.
      </p>
      <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-[0.8rem]" style={{ color: '#cbd5e1' }} />
    </Modal>
  )
}
