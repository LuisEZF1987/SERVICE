import api from './client'

export const reportsApi = {
  maintenanceCertificate: (otId: string) =>
    api.get<Blob>(`/reports/maintenance-certificate/${otId}/`, { responseType: 'blob' }),
  equipmentHistory: (equipmentId: string) =>
    api.get<Blob>(`/reports/equipment-history/${equipmentId}/`, { responseType: 'blob' }),
  serviceReport: (otId: string) =>
    api.get<Blob>(`/reports/service-report/${otId}/`, { responseType: 'blob' }),
  /** Blank NDA pre-filled with the client's data, ready to print and sign. */
  nda: (clientId: string) =>
    api.get<Blob>(`/reports/nda/${clientId}/`, { responseType: 'blob' }),
  /** Cronograma de mantenimiento de un equipo. */
  maintenanceSchedule: (equipmentId: string) =>
    api.get<Blob>(`/reports/maintenance-schedule/equipment/${equipmentId}/`, { responseType: 'blob' }),
  /** Cronograma de un cliente (opcional: ids de equipos separados por coma). */
  clientMaintenanceSchedule: (clientId: string, equipmentIds?: string[]) =>
    api.get<Blob>(`/reports/maintenance-schedule/client/${clientId}/`, {
      responseType: 'blob',
      params: equipmentIds?.length ? { equipment: equipmentIds.join(',') } : undefined,
    }),
  /** Cronograma de un equipo en .ics (para importar a Google/Outlook/Apple). */
  maintenanceScheduleIcs: (equipmentId: string) =>
    api.get<Blob>(`/reports/maintenance-schedule/equipment/${equipmentId}/ics/`, { responseType: 'blob' }),
  /** Cronograma de un cliente en .ics. */
  clientMaintenanceScheduleIcs: (clientId: string, equipmentIds?: string[]) =>
    api.get<Blob>(`/reports/maintenance-schedule/client/${clientId}/ics/`, {
      responseType: 'blob',
      params: equipmentIds?.length ? { equipment: equipmentIds.join(',') } : undefined,
    }),
}

/** Trigger a browser download for a PDF blob returned by the API. */
export function downloadBlob(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
