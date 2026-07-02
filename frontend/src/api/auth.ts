import api from './client'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'ADMIN' | 'COORDINATOR' | 'TECHNICIAN' | 'MANAGEMENT' | 'CLIENT'
  role_display: string
  company_type: 'DIMED' | 'CLIENT'
  phone: string
  position: string
  is_2fa_enabled: boolean
  privacy_policy_accepted_at: string | null
  client_organization: string | null
  is_active: boolean
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { username, password }),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  me: () =>
    api.get<User>('/auth/me/'),

  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/me/change-password/', { old_password, new_password }),

  acceptPrivacyPolicy: () =>
    api.post('/auth/me/accept-privacy-policy/', { accepted: true }),
}
