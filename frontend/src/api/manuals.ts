import api from './client'

export interface TechnicalManual {
  id: string
  title: string
  document_type: string
  document_type_display: string
  brand: string
  modality: string
  modality_display: string
  model_name: string
  language: string
  equipment_model: string | null
  equipment_model_name: string | null
  equipment_series: string | null
  equipment_series_name: string | null
  file: string
  notes: string
  created_at: string
}

export const manualsApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ results: TechnicalManual[]; count: number }>('/templates/manuals/', { params }),
  create: (data: FormData) =>
    api.post<TechnicalManual>('/templates/manuals/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/templates/manuals/${id}/`),
}
