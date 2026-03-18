import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children: ReactNode
}

const styles: Record<Variant, { bg: string; bgHover: string; color: string; border: string; borderHover: string }> = {
  primary: {
    bg: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    bgHover: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    border: 'none',
    borderHover: 'none',
  },
  secondary: {
    bg: 'rgba(255,255,255,0.04)',
    bgHover: 'rgba(255,255,255,0.08)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.06)',
    borderHover: '1px solid rgba(255,255,255,0.12)',
  },
  danger: {
    bg: 'rgba(239,68,68,0.1)',
    bgHover: 'rgba(239,68,68,0.2)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderHover: '1px solid rgba(239,68,68,0.4)',
  },
  success: {
    bg: 'rgba(16,185,129,0.12)',
    bgHover: 'rgba(16,185,129,0.2)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
    borderHover: '1px solid rgba(16,185,129,0.4)',
  },
  ghost: {
    bg: 'transparent',
    bgHover: 'rgba(255,255,255,0.04)',
    color: '#94a3b8',
    border: 'none',
    borderHover: 'none',
  },
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[0.72rem]',
  md: 'px-4 py-2 text-[0.8rem]',
  lg: 'px-5 py-2.5 text-[0.85rem]',
}

export default function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...props }: ButtonProps) {
  const s = styles[variant]

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      style={{
        background: s.bg,
        color: s.color,
        border: s.border,
        borderRadius: size === 'sm' ? '8px' : '10px',
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.background = s.bgHover
          if (s.borderHover !== 'none') e.currentTarget.style.border = s.borderHover
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = s.bg
        e.currentTarget.style.border = s.border
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
