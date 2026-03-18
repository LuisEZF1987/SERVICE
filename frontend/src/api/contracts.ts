import api from './client'

export interface Contract {
  id: string
  number: string
  contract_type: string
  contract_type_display: string
  client: string
  client_name: string
  sercop_reference: string
  start_date: string
  end_date: string
  total_value: number
  payment_terms: string
  sla_response_hours: number
  preventive_visits_per_year: number
  status: string
  status_display: string
  document: string | null
  notes: string
  created_at: string
  updated_at: string
}

export const contractsApi = {
  list: (params?: Record<string, string>) => api.get<{ results: Contract[]; count: number }>('/contracts/', { params }),
  get: (id: string) => api.get<Contract>(`/contracts/${id}/`),
  create: (data: Partial<Contract>) => api.post<Contract>('/contracts/', data),
  update: (id: string, data: Partial<Contract>) => api.patch<Contract>(`/contracts/${id}/`, data),
  createWithFile: (data: FormData) => api.post<Contract>('/contracts/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateWithFile: (id: string, data: FormData) => api.patch<Contract>(`/contracts/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: string) => api.delete(`/contracts/${id}/`),
}
