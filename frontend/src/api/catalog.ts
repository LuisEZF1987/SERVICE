import api from './client'

export interface Manufacturer {
  id: string
  name: string
  country: string
  is_active: boolean
  models_count: number
}

export interface EquipmentCatalogModel {
  id: string
  manufacturer: string
  manufacturer_name: string
  modality: string
  modality_display: string
  name: string
  is_active: boolean
  series_count: number
}

export interface EquipmentSeries {
  id: string
  equipment_model: string
  model_name: string
  manufacturer_name: string
  modality: string
  name: string
  description: string
  is_active: boolean
}

export const catalogApi = {
  // Manufacturers
  listManufacturers: (params?: Record<string, string>) => api.get<{ results: Manufacturer[]; count: number }>('/catalog/manufacturers/', { params }),
  createManufacturer: (data: Partial<Manufacturer>) => api.post<Manufacturer>('/catalog/manufacturers/', data),
  updateManufacturer: (id: string, data: Partial<Manufacturer>) => api.patch<Manufacturer>(`/catalog/manufacturers/${id}/`, data),
  deleteManufacturer: (id: string) => api.delete(`/catalog/manufacturers/${id}/`),

  // Models
  listModels: (params?: Record<string, string>) => api.get<{ results: EquipmentCatalogModel[]; count: number }>('/catalog/models/', { params }),
  createModel: (data: Partial<EquipmentCatalogModel>) => api.post<EquipmentCatalogModel>('/catalog/models/', data),
  updateModel: (id: string, data: Partial<EquipmentCatalogModel>) => api.patch<EquipmentCatalogModel>(`/catalog/models/${id}/`, data),
  deleteModel: (id: string) => api.delete(`/catalog/models/${id}/`),

  // Series
  listSeries: (params?: Record<string, string>) => api.get<{ results: EquipmentSeries[]; count: number }>('/catalog/series/', { params }),
  createSeries: (data: Partial<EquipmentSeries>) => api.post<EquipmentSeries>('/catalog/series/', data),
  updateSeries: (id: string, data: Partial<EquipmentSeries>) => api.patch<EquipmentSeries>(`/catalog/series/${id}/`, data),
  deleteSeries: (id: string) => api.delete(`/catalog/series/${id}/`),

  // Import
  importCatalog: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ created: { manufacturers: number; models: number; series: number }; errors: string[]; detail: string }>('/catalog/import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}
