import api from './client'

export const reportsApi = {
  maintenanceCertificate: (otId: string) =>
    api.get<Blob>(`/reports/maintenance-certificate/${otId}/`, { responseType: 'blob' }),
  equipmentHistory: (equipmentId: string) =>
    api.get<Blob>(`/reports/equipment-history/${equipmentId}/`, { responseType: 'blob' }),
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
