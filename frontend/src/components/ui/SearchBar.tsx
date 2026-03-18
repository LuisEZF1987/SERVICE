interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Buscar...' }: SearchBarProps) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full outline-none transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          color: 'var(--text)',
          fontSize: '0.82rem',
          padding: '9px 14px 9px 36px',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)'
          e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.1)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--card-border)'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
