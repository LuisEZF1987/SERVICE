import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './Badge'

describe('StatusBadge', () => {
  it('renders the Spanish label for a known status', () => {
    render(<StatusBadge status="SIGNED" />)
    expect(screen.getByText('Firmada')).toBeTruthy()
  })

  it('falls back to the raw status for unknown values', () => {
    render(<StatusBadge status="DESCONOCIDO" />)
    expect(screen.getByText('DESCONOCIDO')).toBeTruthy()
  })
})
