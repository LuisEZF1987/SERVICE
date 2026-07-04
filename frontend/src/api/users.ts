import api from './client'
import { User } from './auth'

export interface UserCreateInput {
  username: string
  email: string
  first_name: string
  last_name: string
  password: string
  role: string
  company_type: string
  phone?: string
  position?: string
  client_organization?: string | null
}

export const usersApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ results: User[]; count: number }>('/auth/users/', { params }),
  create: (data: UserCreateInput) => api.post<User>('/auth/users/', data),
  update: (id: string, data: Partial<User>) => api.patch<User>(`/auth/users/${id}/`, data),
  toggleActive: (id: string) => api.post(`/auth/users/${id}/toggle_active/`),
}
