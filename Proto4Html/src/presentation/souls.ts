/** Couleurs des jetons, une par âme (indice = id). */
export const SOUL_COLORS = ['#e0a83c', '#6fa8d8', '#4ea86a', '#d0453c', '#b07cd8', '#e07a9c', '#5cc8c0', '#c9a27a'] as const

export function soulColor(id: number): string {
  return SOUL_COLORS[id % SOUL_COLORS.length] ?? '#ffffff'
}

export function fmtDistance(d: number): string {
  return d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0'
}
