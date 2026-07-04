import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Catches unhandled render errors so a crash shows a recovery screen
 *  instead of a blank white page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la UI:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
          style={{ background: 'var(--bg)' }}
        >
          <img src="/logo-white.png" alt="Dimed" className="h-12 opacity-60" />
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            Algo salió mal
          </h1>
          <p className="text-sm max-w-md" style={{ color: 'var(--muted)' }}>
            Ocurrió un error inesperado en la aplicación. Puedes recargar la página para continuar.
          </p>
          <button
            onClick={this.handleReload}
            className="text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent)', border: '1px solid rgba(96,165,250,0.3)' }}
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
