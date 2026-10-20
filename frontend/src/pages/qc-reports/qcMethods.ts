import type { QCSection } from '../../api/qcReports'

/**
 * Calculated columns of the result tables (formats 9.1.1–9.1.6, manual Rev. 8).
 * Mirrors evaluate_section() in backend/apps/qc_reports/methods.py — keep both in step.
 */

export const toNumber = (v: unknown): number | null => {
  const m = String(v ?? '').match(/^\s*([-−+]?\d+(?:[.,]\d+)?)/)
  return m ? parseFloat(m[1].replace(',', '.').replace('−', '-')) : null
}

export const fmt = (n: number | null | undefined, digits = 3) =>
  n === null || n === undefined || !Number.isFinite(n) ? '' : String(Number(n.toFixed(digits)))

type Values = Record<string, unknown>

function arg(name: string, values: Values, params: Record<string, string>): number | null {
  if (name.startsWith('p.')) return toNumber(params[name.slice(2)])
  if (name in values) {
    const v = values[name]
    return typeof v === 'number' || v === null ? (v as number | null) : toNumber(v)
  }
  return toNumber(name)
}

function rowOp(op: string, args: string[], values: Values, params: Record<string, string>): number | null {
  const nums = args.map((a) => arg(a, values, params))
  const xs = nums.filter((x): x is number => x !== null)
  if (op === 'avg') return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null
  if (op === 'sd') {
    if (xs.length < 2) return null
    const m = xs.reduce((s, x) => s + x, 0) / xs.length
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
  }
  if (op === 'max') return xs.length ? Math.max(...xs) : null
  if (nums.some((x) => x === null)) return null
  const [a, b, c] = nums as number[]
  switch (op) {
    case 'dev_pct': return b ? ((a - b) / b) * 100 : null
    case 'diff': return a - b
    case 'div': return b ? a / b : null
    case 'mul': return a * b
    case 'pct': return b ? (a / b) * 100 : null
    case 'sum_abs': return Math.abs(a) + Math.abs(b)
    case 'rate': return c ? (a * b * 3600) / c : null
    case 'rate_t': return b ? (a * 3600) / b : null
    default: return null
  }
}

/** Calculated values of every row, keyed by column key (already formatted). */
export function evaluateSection(section: QCSection): Record<string, string>[] {
  const params = Object.fromEntries((section.params ?? []).map((p) => [p.key, p.value ?? '']))
  const rows = section.rows ?? []
  const values: Values[] = rows.map((r) => ({ ...(r.v ?? {}) }))
  for (const col of section.columns ?? []) {
    if (!col.calc) continue
    const [op, rest = ''] = col.calc.split(':')
    const args = rest ? rest.split(',') : []
    values.forEach((vals, i) => {
      if (op === 'cl_next') {
        const x = arg(args[0], vals, params)
        const next = i + 1 < values.length ? arg(args[0], values[i + 1], params) : null
        vals[col.key] = x !== null && next !== null && x + next ? Math.abs(x - next) / (x + next) : null
      } else if (op === 'diff_row') {
        const ref = values.find((_, j) => rows[j].label === args[1])
        const a = arg(args[0], vals, params)
        const b = ref ? arg(args[0], ref, params) : null
        vals[col.key] = rows[i].label !== args[1] && a !== null && b !== null ? a - b : null
      } else if (op === 'dev_pct_row') {
        const [key, matchCol, matchVal] = args
        const ref = values.find((v) => toNumber(v[matchCol]) === toNumber(matchVal))
        const a = arg(key, vals, params)
        const b = ref && ref !== vals ? arg(key, ref, params) : null
        vals[col.key] = a !== null && b ? ((a - b) / b) * 100 : null
      } else {
        vals[col.key] = rowOp(op, args, vals, params)
      }
    })
  }
  return values.map((vals) => {
    const out: Record<string, string> = {}
    for (const col of section.columns ?? []) {
      if (col.calc) out[col.key] = fmt(vals[col.key] as number | null, col.digits ?? 3)
    }
    return out
  })
}

/** HVL (mm Al) by log interpolation between the steps that bracket D0/2. */
export function hvlInterpolated(rows: { thickness: string; dose: string }[] = []): number | null {
  const pts = rows
    .map((r) => [toNumber(r.thickness), toNumber(r.dose)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null && p[1] > 0)
  if (pts.length < 2) return null
  const d0 = pts[0][1]
  const half = d0 / 2
  for (let i = 0; i + 1 < pts.length; i++) {
    const [t1, d1] = pts[i]
    const [t2, d2] = pts[i + 1]
    if (d1 >= half && half >= d2 && d1 !== d2) return t1 + ((t2 - t1) * Math.log((2 * d1) / d0)) / Math.log(d1 / d2)
  }
  return null
}
