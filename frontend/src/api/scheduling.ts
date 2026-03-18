import api from './client'

export interface ScheduledMaintenance {
  id: string
  equipment: string
  equipment_code: string
  equipment_description: string
  client_name: string
  contract: string | null
  scheduled_date: string
  frequency: string
  frequency_display: string
  work_order: string | null
  work_order_number: string | null
  status: string
  status_display: string
  alert_sent: boolean
  created_at: string
}

export const schedulingApi = {
  list: (params?: Record<string, string>) => api.get<{ results: ScheduledMaintenance[]; count: number }>('/scheduling/', { params }),
}
