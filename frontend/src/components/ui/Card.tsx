import { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

export default function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <div
      className={`transition-all duration-300 ${className}`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[1rem] font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
