import api from './client'

export interface QuoteItem {
  id?: string
  kind: string
  kind_display?: string
  spare_part?: string | null
  description: string
  code: string
  quantity: string | number
  unit_price: string | number
  total?: string | number
  order?: number
}

export interface Quote {
  id: string
  number: string
  title: string
  status: string
  status_display: string
  client: string
  client_name: string
  client_ruc: string
  equipment: string | null
  equipment_code: string | null
  ticket: string | null
  ticket_number: string | null
  valid_until: string | null
  iva_rate: string | number
  advance_percent: string | number
  payment_terms: string
  delivery_terms: string
  warranty_terms: string
  notes: string
  sent_at: string | null
  accepted_at: string | null
  accepted_by_name: string
  rejected_at: string | null
  advance_paid: boolean
  advance_paid_at: string | null
  work_order: string | null
  work_order_number: string | null
  pdf_document: string | null
  subtotal: string | number
  iva_amount: string | number
  total: string | number
  advance_amount: string | number
  balance_amount: string | number
  items: QuoteItem[]
  created_at: string
  updated_at: string
}

export interface QuoteListItem {
  id: string
  number: string
  title: string
  client: string
  client_name: string
  equipment: string | null
  equipment_code: string | null
  status: string
  status_display: string
  total: string | number
  advance_paid: boolean
  valid_until: string | null
  created_at: string
}

export interface QuoteInput {
  title: string
  client: string
  equipment?: string | null
  ticket?: string | null
  valid_until?: string | null
  iva_rate?: string
  advance_percent?: string
  payment_terms?: string
  delivery_terms?: string
  warranty_terms?: string
  notes?: string
  items: QuoteItem[]
}

export const quotesApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ results: QuoteListItem[]; count: number }>('/quotes/', { params }),
  get: (id: string) => api.get<Quote>(`/quotes/${id}/`),
  create: (data: QuoteInput) => api.post<Quote>('/quotes/', data),
  update: (id: string, data: QuoteInput) => api.patch<Quote>(`/quotes/${id}/`, data),

  send: (id: string) => api.post<Quote>(`/quotes/${id}/send/`),
  accept: (id: string, accepted_by_name: string) =>
    api.post<Quote>(`/quotes/${id}/accept/`, { accepted_by_name }),
  reject: (id: string) => api.post<Quote>(`/quotes/${id}/reject/`),
  markAdvancePaid: (id: string) => api.post<Quote>(`/quotes/${id}/mark_advance_paid/`),
  generateOt: (id: string, technician: string) =>
    api.post(`/quotes/${id}/generate_ot/`, { technician }),
}
