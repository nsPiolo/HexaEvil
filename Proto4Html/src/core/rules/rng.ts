/** Générateur déterministe (mulberry32) : les tests rejouent une course, l'UI tire une graine au hasard. */
export interface Rng {
  /** Flottant dans [0, 1). */
  next(): number
  /** Entier dans [0, n). */
  int(n: number): number
}

export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { next, int: (n) => Math.floor(next() * n) }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
