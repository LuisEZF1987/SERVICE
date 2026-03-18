import api from './client'

export interface Equipment {
  id: string
  internal_code: string
  serial_number: string
  hospital_asset_number: string
  arcsa_registration: string
  has_fda: boolean
  has_ce: boolean
  has_iso_13485: boolean
  modality: string
  modality_display: string
  brand: string
  model_name: string
  country_of_origin: string
  year_of_manufacture: number | null
  technical_specs: Record<string, unknown>
  client: string
  client_name: string
  area: string
  city: string
  province: string
  status: string
  status_display: string
  factory_warranty_start: string | null
  factory_warranty_end: string | null
  dimed_warranty_start: string | null
  dimed_warranty_end: string | null
  is_under_factory_warranty: boolean
  is_under_dimed_warranty: boolean
  contract: string | null
  maintenance_template: string | null
  photo: string | null
  created_at: string
  updated_at: string
}

export const equipmentApi = {
  list: (params?: Record<string, string>) => api.get<{ results: Equipment[]; count: number }>('/equipment/', { params }),
  get: (id: string) => api.get<Equipment>(`/equipment/${id}/`),
  create: (data: Partial<Equipment>) => api.post<Equipment>('/equipment/', data),
  update: (id: string, data: Partial<Equipment>) => api.patch<Equipment>(`/equipment/${id}/`, data),
  delete: (id: string) => api.delete(`/equipment/${id}/`),
}
