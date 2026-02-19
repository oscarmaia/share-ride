export function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

export function fmt2(v: unknown): string {
  return num(v).toFixed(2)
}

export function fmtSigned2(v: unknown): string {
  const n = num(v)
  const s = n < 0 ? '-' : '+'
  return `${s}${Math.abs(n).toFixed(2)}`
}
