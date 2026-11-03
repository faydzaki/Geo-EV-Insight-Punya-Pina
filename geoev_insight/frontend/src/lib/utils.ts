export function fmtNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || isNaN(n as number)) return '—'
  return (n as number).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function cx(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}

