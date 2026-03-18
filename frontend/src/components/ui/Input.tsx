import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const inputStyle = {
  background: 'rgba(30,41,59,0.5)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontSize: '0.85rem',
  padding: '10px 14px',
}

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(96,165,250,0.4)'
    e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.1)'
    e.target.style.background = 'rgba(30,41,59,0.7)'
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
    e.target.style.boxShadow = 'none'
    e.target.style.background = 'rgba(30,41,59,0.5)'
  },
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
          {label}
        </label>
      )}
      <input
        className="w-full outline-none transition-all duration-200"
        style={inputStyle}
        {...focusHandlers}
        {...props}
      />
      {error && <p className="mt-1 text-[0.75rem]" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  error?: string
}

export function Select({ label, options, error, className = '', ...props }: SelectProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
          {label}
        </label>
      )}
      <select
        className="w-full outline-none transition-all duration-200 cursor-pointer appearance-none"
        style={{
          ...inputStyle,
          paddingRight: '36px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
        {...focusHandlers}
        {...props}
      >
        <option value="" style={{ background: '#0f172a' }}>Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#0f172a' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[0.75rem]" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
          {label}
        </label>
      )}
      <textarea
        className="w-full outline-none transition-all duration-200 resize-vertical min-h-[80px]"
        style={inputStyle}
        {...(focusHandlers as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        {...props}
      />
      {error && <p className="mt-1 text-[0.75rem]" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  )
}
