import { useEffect, useMemo, useRef, useState } from 'react'

export interface SearchSelectOption {
  value: string
  label: string
  /** Second line, for details that help tell options apart */
  hint?: string
}

interface SearchSelectProps {
  label?: string
  options: SearchSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  error?: string
  className?: string
}

const fieldStyle = {
  background: 'rgba(30,41,59,0.5)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontSize: '0.85rem',
  padding: '10px 14px',
}

/** Type-to-filter picker. Falls back to the full list when the query is empty. */
export default function SearchSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Escriba para buscar...',
  emptyMessage = 'Sin resultados',
  disabled = false,
  error,
  className = '',
}: SearchSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  // Close when clicking outside
  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q)
    )
  }, [options, query])

  const pick = (option: SearchSelectOption) => {
    onChange(option.value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={`mb-4 ${className}`} ref={containerRef}>
      {label && (
        <label
          className="block text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: '#94a3b8' }}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          className="w-full outline-none transition-all duration-200"
          style={{
            ...fieldStyle,
            paddingRight: '36px',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          disabled={disabled}
          value={open ? query : selected?.label ?? ''}
          placeholder={selected ? selected.label : placeholder}
          onFocus={(e) => {
            setOpen(true)
            e.target.style.borderColor = 'rgba(96,165,250,0.4)'
            e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.1)'
            e.target.style.boxShadow = 'none'
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setQuery('')
            }}
            className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center"
            style={{ color: '#64748b' }}
            aria-label="Limpiar selección"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {open && !disabled && (
          <div
            className="absolute z-50 w-full mt-1 overflow-y-auto"
            style={{
              maxHeight: '240px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
            }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[0.8rem]" style={{ color: 'var(--muted)' }}>
                {emptyMessage}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                  className="w-full text-left px-3 py-2 transition-colors duration-150"
                  style={{
                    background:
                      option.value === value ? 'rgba(96,165,250,0.12)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(96,165,250,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      option.value === value ? 'rgba(96,165,250,0.12)' : 'transparent'
                  }}
                >
                  <div className="text-[0.83rem]" style={{ color: '#e2e8f0' }}>
                    {option.label}
                  </div>
                  {option.hint && (
                    <div className="text-[0.72rem]" style={{ color: 'var(--muted)' }}>
                      {option.hint}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[0.75rem]" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
    </div>
  )
}
