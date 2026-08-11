import api from './client'

export interface Client {
  id: string
  name: string
  ruc: string
  client_type: string
  type_display: string
  address: string
  city: string
  province: string
  phone: string
  email: string
  status: string
  status_display: string
  notes: string
  nda_signed: boolean
  nda_document: string | null
  nda_signed_date: string | null
  ruc_document: string | null
  contract_document: string | null
  contacts: ClientContact[]
  equipment_count: number
  created_at: string
  updated_at: string
}

export interface ClientContact {
  id: string
  client: string
  name: string
  position: string
  email: string
  phone: string
  is_primary: boolean
  is_signer: boolean
}

export const clientsApi = {
  list: (params?: Record<string, string>) => api.get<{ results: Client[]; count: number }>('/clients/', { params }),
  get: (id: string) => api.get<Client>(`/clients/${id}/`),
  create: (data: Partial<Client>) => api.post<Client>('/clients/', data),
  update: (id: string, data: Partial<Client>) => api.patch<Client>(`/clients/${id}/`, data),
  delete: (id: string) => api.delete(`/clients/${id}/`),
  /** Re-send the NDA for signature (same email sent on registration). */
  sendNda: (id: string) => api.post<{ detail: string }>(`/clients/${id}/nda/send/`),
  /** Register the signed NDA (file + date); activates the client. */
  uploadNda: (id: string, file: File, signedDate: string) => {
    const form = new FormData()
    form.append('nda_document', file)
    form.append('nda_signed_date', signedDate)
    return api.post<Client>(`/clients/${id}/nda/`, form)
  },
  // Contacts
  listContacts: (clientId: string) => api.get<ClientContact[]>(`/clients/${clientId}/contacts/`),
  createContact: (clientId: string, data: Partial<ClientContact>) => api.post(`/clients/${clientId}/contacts/`, data),
  deleteContact: (clientId: string, contactId: string) => api.delete(`/clients/${clientId}/contacts/${contactId}/`),
}
