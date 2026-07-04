import api from './client'

export interface TicketComment {
  id: string
  body: string
  is_internal: boolean
  author_name: string
  created_at: string
}

export interface TicketWorkOrder {
  id: string
  number: string
  status: string
  status_display: string
  ot_type: string
  type_display: string
}

export interface Ticket {
  id: string
  number: string
  subject: string
  description: string
  client: string
  client_name: string
  equipment: string | null
  equipment_code: string | null
  contract: string | null
  contract_number: string | null
  channel: string
  channel_display: string
  priority: string
  priority_display: string
  status: string
  status_display: string
  reported_by_name: string
  reported_by_email: string
  assigned_to: string | null
  assigned_to_name: string | null
  sla_due_at: string | null
  is_sla_breached: boolean
  resolution_notes: string
  resolved_at: string | null
  closed_at: string | null
  comments: TicketComment[]
  work_orders: TicketWorkOrder[]
  created_at: string
  updated_at: string
}

export interface TicketListItem {
  id: string
  number: string
  subject: string
  client: string
  client_name: string
  equipment: string | null
  equipment_code: string | null
  priority: string
  priority_display: string
  status: string
  status_display: string
  assigned_to: string | null
  assigned_to_name: string | null
  sla_due_at: string | null
  is_sla_breached: boolean
  created_at: string
}

export const ticketsApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ results: TicketListItem[]; count: number }>('/tickets/', { params }),
  get: (id: string) => api.get<Ticket>(`/tickets/${id}/`),
  create: (data: Partial<Ticket>) => api.post<Ticket>('/tickets/', data),
  update: (id: string, data: Partial<Ticket>) => api.patch<Ticket>(`/tickets/${id}/`, data),

  startProgress: (id: string) => api.post<Ticket>(`/tickets/${id}/start_progress/`),
  escalate: (id: string) => api.post<Ticket>(`/tickets/${id}/escalate/`),
  resolve: (id: string, resolution_notes: string) =>
    api.post<Ticket>(`/tickets/${id}/resolve/`, { resolution_notes }),
  close: (id: string) => api.post<Ticket>(`/tickets/${id}/close/`),

  addComment: (id: string, body: string, is_internal: boolean) =>
    api.post<TicketComment>(`/tickets/${id}/comments/`, { body, is_internal }),
}
