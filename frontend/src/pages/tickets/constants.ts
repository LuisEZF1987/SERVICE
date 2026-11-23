export const TICKET_STATUS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  OPEN: 'primary',
  IN_PROGRESS: 'warning',
  ESCALATED: 'danger',
  RESOLVED: 'success',
  CLOSED: 'secondary',
}

export const TICKET_PRIORITY_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'purple'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  NORMAL: 'primary',
  LOW: 'secondary',
}
