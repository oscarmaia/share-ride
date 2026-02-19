import { addMonths, format, startOfMonth } from 'date-fns'

export function monthKey(d: Date): string {
  return format(d, 'yyyy-MM')
}

export function monthRange(d: Date): { start: string; endExclusive: string } {
  const start = startOfMonth(d)
  const end = addMonths(start, 1)
  return {
    start: format(start, 'yyyy-MM-dd'),
    endExclusive: format(end, 'yyyy-MM-dd'),
  }
}
