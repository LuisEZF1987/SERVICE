import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export default function Modal({ open, onClose, title, children, footer, maxWidth = '560px' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center pt-[60px] pb-5 px-5 overflow-y-auto"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full animate-fade-in"
        style={{
          maxWidth,
          background: '#0f172a',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <h3 className="text-[0.95rem] font-bold" style={{ color: '#f1f5f9' }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-1 transition-colors duration-200 hover:opacity-80"
            style={{ color: 'var(--muted)', fontSize: '1.2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2.5 px-5 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
