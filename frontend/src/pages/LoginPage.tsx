import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      toast.success('Bienvenido a DimedService')
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      {/* Background gradient effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
      </div>

      <div
        className="w-full max-w-[420px] mx-4 relative"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          padding: '48px 40px',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-2">
          <img
            src="/logo-white.png"
            alt="Dimed Healthcare"
            className="h-14 mx-auto mb-4 object-contain"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-1">
          <h1 className="text-2xl font-extrabold">
            <span className="text-white">Dimed</span>
            <span style={{ color: 'var(--accent)' }}>Service</span>
          </h1>
        </div>
        <p className="text-center text-xs font-medium tracking-wider mb-9"
          style={{ color: 'var(--muted)' }}>
          SISTEMA DE SERVICIO TÉCNICO
        </p>

        {/* Error message */}
        {error && (
          <div
            className="text-center text-sm mb-4 py-2.5 px-3.5"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
              borderRadius: '10px',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              Usuario
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su usuario"
              className="w-full outline-none transition-all duration-200"
              style={{
                background: 'rgba(30,41,59,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '0.88rem',
                padding: '12px 16px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(96,165,250,0.4)'
                e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.1)'
                e.target.style.background = 'rgba(30,41,59,0.7)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                e.target.style.boxShadow = 'none'
                e.target.style.background = 'rgba(30,41,59,0.5)'
              }}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              className="w-full outline-none transition-all duration-200"
              style={{
                background: 'rgba(30,41,59,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '0.88rem',
                padding: '12px 16px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(96,165,250,0.4)'
                e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.1)'
                e.target.style.background = 'rgba(30,41,59,0.7)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                e.target.style.boxShadow = 'none'
                e.target.style.background = 'rgba(30,41,59,0.5)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '0.88rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)'
                ;(e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
                ;(e.target as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(59,130,246,0.25)'
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #60a5fa, #3b82f6)'
              ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.target as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-7 text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#334155' }}>
          DIMED HEALTHCARE S.A.
        </div>
      </div>
    </div>
  )
}
