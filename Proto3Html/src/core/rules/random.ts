/**
 * Aléatoire germé (règle G4) : même `seed` → même run, au jet près.
 * mulberry32 — court, sans dépendance, suffisant pour un proto.
 */

export interface Rng {
  /** Flottant dans [0, 1[. */
  next(): number
  /** Entier dans [0, max[. */
  int(max: number): number
  /** Mélange en place, algorithme de Fisher-Yates. */
  shuffle<T>(items: T[]): T[]
  pick<T>(items: readonly T[]): T
  /** État interne, pour sauver un run en cours et le reprendre à l'identique. */
  getState(): number
  setState(state: number): void
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (max: number): number => (max <= 0 ? 0 : Math.floor(next() * max))
  return {
    next,
    int,
    getState: () => state,
    setState(value: number): void {
      state = value >>> 0
    },
    shuffle<T>(items: T[]): T[] {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1)
        const a = items[i] as T
        const b = items[j] as T
        items[i] = b
        items[j] = a
      }
      return items
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick sur une liste vide')
      return items[int(items.length)] as T
    },
  }
}
