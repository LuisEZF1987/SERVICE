import api from './client'

export type CalibrationStatus = 'NOT_REQUIRED' | 'NO_RECORD' | 'VALID' | 'DUE_SOON' | 'EXPIRED'

export interface InstrumentCalibration {
  id: string
  instrument: string
  calibration_date: string
  due_date: string
  laboratory: string
  certificate_number: string
  certificate_file: string | null
  result: 'APPROVED' | 'REJECTED'
  result_display: string
  notes: string
  created_at: string
}

export interface MeasuringInstrument {
  id: string
  name: string
  instrument_type: string
  type_display: string
  brand: string
  model_name: string
  serial_number: string
  status: string
  status_display: string
  assigned_to: string
  notes: string
  requires_calibration: boolean
  calibration_interval_months: number
  last_calibration_date: string | null
  calibration_due_date: string | null
  days_to_due: number | null
  calibration_status: CalibrationStatus
  calibration_status_display: string
  latest_calibration: InstrumentCalibration | null
}

export const INSTRUMENT_TYPES = [
  { value: 'DOSIMETER', label: 'Multímetro dosimétrico / kVp' },
  { value: 'ION_CHAMBER', label: 'Cámara de ionización' },
  { value: 'SURVEY_METER', label: 'Detector de radiación' },
  { value: 'CURRENT_PROBE', label: 'Sensor de corriente / mAs' },
  { value: 'ELECTRICAL', label: 'Instrumento eléctrico' },
  { value: 'QA_TOOL', label: 'Herramienta de control de calidad' },
  { value: 'PHANTOM', label: 'Fantoma' },
  { value: 'PERSONAL_DOSIMETER', label: 'Dosímetro personal' },
  { value: 'OTHER', label: 'Otro' },
]

export const INSTRUMENT_STATUSES = [
  { value: 'ACTIVE', label: 'En uso' },
  { value: 'AT_LAB', label: 'En calibración' },
  { value: 'IN_REPAIR', label: 'En reparación' },
  { value: 'RETIRED', label: 'Dado de baja' },
]

export const instrumentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ results: MeasuringInstrument[]; count: number }>('/instruments/', {
      params: { page_size: '100', ...params },
    }),
  create: (data: Partial<MeasuringInstrument>) => api.post<MeasuringInstrument>('/instruments/', data),
  update: (id: string, data: Partial<MeasuringInstrument>) =>
    api.patch<MeasuringInstrument>(`/instruments/${id}/`, data),
  delete: (id: string) => api.delete(`/instruments/${id}/`),
  calibrations: (id: string) =>
    api.get<{ results: InstrumentCalibration[] }>(`/instruments/${id}/calibrations/`),
  addCalibration: (id: string, data: FormData) =>
    api.post<InstrumentCalibration>(`/instruments/${id}/calibrations/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteCalibration: (id: string, calId: string) => api.delete(`/instruments/${id}/calibrations/${calId}/`),
}
