import api from './client'

/** '' = pending, PASS = cumple, FAIL = no cumple, NA = no aplica. */
export type QCResult = '' | 'PASS' | 'FAIL' | 'NA'

export interface QCLabeledValue {
  label: string
  value: string
}

export interface QCDeviceData {
  brand: string
  model: string
  serial: string
  year: string
  extras: QCLabeledValue[]
}

export interface QCInstrument {
  name: string
  model: string
  serial: string
  certificate: string
  valid_until: string
}

export interface QCTestRow {
  label: string
  tolerance: string
  m1: string
  m2: string
  m3: string
  result: QCResult
}

export interface QCHvl {
  kv?: string
  rows?: { thickness: string; dose: string }[]
  hvl_value?: string
  hvl_min?: string
  result?: QCResult
}

export interface QCMammoScore {
  phantom_type?: string
  phantom_id?: string
  technique?: string
  rows?: { object: string; score: string; min_rmi: string; min_dm: string; result: QCResult }[]
  overall?: QCResult
}

export interface QCRadiationRow {
  point: string
  area_type: string
  background: string
  measured: string
  reference: string
  result: QCResult
}

export interface QCRadiationLevels {
  conditions: string
  instrument_serial: string
  rows: QCRadiationRow[]
}

export interface QCPhoto {
  id: string
  slot: string
  image: string
  caption: string
  created_at: string
}

export interface QCReportSummary {
  id: string
  number: string
  work_order: string
  work_order_number: string
  practice: string
  practice_display: string
  status: 'DRAFT' | 'ISSUED' | 'SIGNED'
  status_display: string
  overall_result: string
  issued_at: string | null
  signed_at: string | null
  created_at: string
}

export interface QCReport extends QCReportSummary {
  equipment_code: string
  client_name: string
  technician_name: string
  format_code: string
  techniques: string[]
  photo_slots: { slot: string; label: string }[]
  service_type: string
  institution: Record<string, string>
  practice_info: { practice: string; technique: string; risk_category: string }
  equipment_data: QCDeviceData
  tube_data: QCDeviceData
  instruments: QCInstrument[]
  tests: QCTestRow[]
  hvl: QCHvl
  mammo_score: QCMammoScore
  radiation_levels: QCRadiationLevels
  observations: string
  recommendations: string
  technician_id_number: string
  technician_license: string
  photos: QCPhoto[]
  pdf_document: string | null
  signed_document: string | null
  updated_at: string
}

export interface QCPractice {
  value: string
  label: string
  format: string
  techniques: string[]
}

export const qcReportsApi = {
  practices: () => api.get<QCPractice[]>('/qc-reports/practices/'),
  listForWorkOrder: (workOrderId: string) =>
    api.get<{ results: QCReportSummary[]; count: number }>('/qc-reports/', {
      params: { work_order: workOrderId },
    }),
  get: (id: string) => api.get<QCReport>(`/qc-reports/${id}/`),
  create: (workOrderId: string, practice: string) =>
    api.post<QCReport>('/qc-reports/', { work_order: workOrderId, practice }),
  update: (id: string, data: Partial<QCReport>) => api.patch<QCReport>(`/qc-reports/${id}/`, data),
  delete: (id: string) => api.delete(`/qc-reports/${id}/`),
  /** Render the PDF; afterwards it is signed with FirmaEC outside the system. */
  generatePdf: (id: string) => api.post<QCReport>(`/qc-reports/${id}/generate-pdf/`),
  /** Register the PDF signed electronically by the technician (locks the report). */
  uploadSigned: (id: string, data: FormData) =>
    api.post<QCReport>(`/qc-reports/${id}/upload-signed/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addPhoto: (id: string, data: FormData) =>
    api.post<QCPhoto>(`/qc-reports/${id}/photos/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (id: string, photoId: string) => api.delete(`/qc-reports/${id}/photos/${photoId}/`),
}
