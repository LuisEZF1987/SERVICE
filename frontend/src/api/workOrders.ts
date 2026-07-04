import api from './client'

export interface WorkOrderPhoto {
  id: string
  photo: string
  photo_type: 'BEFORE' | 'DURING' | 'AFTER'
  caption: string
  created_at: string
}

export interface WorkOrderSparePartUsed {
  id: string
  spare_part: string | null
  description: string
  code: string
  quantity: number
  unit_cost: string | number
  total_cost: string | number
}

export interface ChecklistItem {
  id: string
  task_name: string
  frequency: string
  completed: boolean
  measured_value: string
  reference_value: string
  tolerance: string
  is_within_tolerance: boolean | null
  notes: string
  photo: string | null
  order: number
}

export interface WorkOrder {
  id: string
  number: string
  ot_type: string
  type_display: string
  priority: string
  priority_display: string
  status: string
  status_display: string
  equipment: string
  equipment_code: string
  equipment_description: string
  client: string
  client_name: string
  contract: string | null
  ticket: string | null
  ticket_number: string | null
  technician: string
  technician_name: string
  template_version: string | null
  opened_at: string
  arrival_at: string | null
  started_at: string | null
  finished_at: string | null
  closed_at: string | null
  total_hours: string | number | null
  reported_problem: string
  diagnosis: string
  work_performed: string
  result: string
  result_display: string
  follow_up_notes: string
  travel_cost: string | number
  is_signed_by_client: boolean
  total_spare_parts_cost: string | number
  photos: WorkOrderPhoto[]
  spare_parts_used: WorkOrderSparePartUsed[]
  checklist_items: ChecklistItem[]
  signed_at: string | null
  client_signer_name: string
  client_signer_position: string
  technician_signed_at: string | null
  pdf_document: string | null
  signature_email_sent: boolean
  created_at: string
  updated_at: string
}

export const workOrdersApi = {
  list: (params?: Record<string, string>) => api.get<{ results: WorkOrder[]; count: number }>('/work-orders/', { params }),
  get: (id: string) => api.get<WorkOrder>(`/work-orders/${id}/`),
  create: (data: Partial<WorkOrder>) => api.post<WorkOrder>('/work-orders/', data),
  update: (id: string, data: Partial<WorkOrder>) => api.patch<WorkOrder>(`/work-orders/${id}/`, data),
  delete: (id: string) => api.delete(`/work-orders/${id}/`),
  start: (id: string) => api.post<WorkOrder>(`/work-orders/${id}/start/`),
  finish: (id: string) => api.post<WorkOrder>(`/work-orders/${id}/finish/`),
  sign: (id: string, data: FormData) => api.post<WorkOrder>(`/work-orders/${id}/sign/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  technicianSign: (id: string, data: FormData) => api.post<WorkOrder>(`/work-orders/${id}/technician_sign/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  close: (id: string) => api.post<WorkOrder>(`/work-orders/${id}/close/`),

  // Nested evidence resources (photos, checklist, spare parts)
  addPhoto: (otId: string, data: FormData) =>
    api.post<WorkOrderPhoto>(`/work-orders/${otId}/photos/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto: (otId: string, photoId: string) =>
    api.delete(`/work-orders/${otId}/photos/${photoId}/`),

  addChecklistItem: (otId: string, data: Partial<ChecklistItem>) =>
    api.post<ChecklistItem>(`/work-orders/${otId}/checklist/`, data),
  updateChecklistItem: (otId: string, itemId: string, data: Partial<ChecklistItem>) =>
    api.patch<ChecklistItem>(`/work-orders/${otId}/checklist/${itemId}/`, data),
  deleteChecklistItem: (otId: string, itemId: string) =>
    api.delete(`/work-orders/${otId}/checklist/${itemId}/`),

  addSparePart: (otId: string, data: Partial<WorkOrderSparePartUsed>) =>
    api.post<WorkOrderSparePartUsed>(`/work-orders/${otId}/spare-parts/`, data),
  deleteSparePart: (otId: string, partId: string) =>
    api.delete(`/work-orders/${otId}/spare-parts/${partId}/`),
}
