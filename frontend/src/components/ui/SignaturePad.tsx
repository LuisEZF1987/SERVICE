import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface SignaturePadHandle {
  clear: () => void
  isEmpty: () => boolean
  toBlob: () => Promise<Blob | null>
}

const WIDTH = 560
const HEIGHT = 190

/**
 * Lightweight canvas signature pad (no external dependency).
 * Exposes an imperative handle to read the drawn signature as a PNG Blob.
 */
const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [])

  const posFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    last.current = posFromEvent(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !last.current) return
    const p = posFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    dirty.current = true
  }

  const handleUp = () => {
    drawing.current = false
    last.current = null
  }

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      dirty.current = false
    },
    isEmpty: () => !dirty.current,
    toBlob: () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = canvasRef.current
        if (!canvas) return resolve(null)
        canvas.toBlob((b) => resolve(b), 'image/png')
      }),
  }))

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      style={{
        width: '100%',
        height: 'auto',
        touchAction: 'none',
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'crosshair',
        display: 'block',
      }}
    />
  )
})

export default SignaturePad
