import api from './client'

export interface SparePart {
  id: string
  modality: string
  modality_display: string
  manufacturer: string
  equipment_model: string
  equipment_series: string
  part_number: string
  description: string
  unit_cost: number
  stock_quantity: number
  minimum_stock: number
  location: string
  supplier: string
  is_below_minimum_stock: boolean
  created_at: string
  updated_at: string
}

export const sparePartsApi = {
  list: (params?: Record<string, string>) => api.get<{ results: SparePart[]; count: number }>('/spare-parts/', { params }),
  get: (id: string) => api.get<SparePart>(`/spare-parts/${id}/`),
  create: (data: Partial<SparePart>) => api.post<SparePart>('/spare-parts/', data),
  update: (id: string, data: Partial<SparePart>) => api.patch<SparePart>(`/spare-parts/${id}/`, data),
  delete: (id: string) => api.delete(`/spare-parts/${id}/`),
}
