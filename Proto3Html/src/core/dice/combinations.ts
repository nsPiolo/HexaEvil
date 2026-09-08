/**
 * Barème et classement des combinaisons de dés — GDD §8 (`V1` à `V7`).
 *
 * Les valeurs viennent **toutes** de la configuration (`G3`) : le code ne
 * connaît que la façon de *reconnaître* une combinaison.
 */

import type { CombinationsConfig } from '../config/schema'
import type { CombinationId, DiceHand } from '../rules/types'

/** Reconnaissance pure, sans barème. Ordre des tests : le plus spécifique d'abord. */
export function identify(values: readonly number[]): { id: CombinationId; x: number } {
  const s = [...values].sort((a, b) => a - b)
  const [a, b, c] = [s[0] as number, s[1] as number, s[2] as number]

  if (a === 1 && b === 2 && c === 4) return { id: '421', x: 0 }
  if (a === 1 && b === 1 && c === 1) return { id: 'triple1', x: 1 }
  if (a === b && b === c) return { id: 'triple', x: a }
  if (a === 1 && b === 1) return { id: 'pairOfOnes', x: c }
  if (b === a + 1 && c === b + 1) return { id: 'straight', x: c }
  // `V5` : la nénette est 2-2-1, littéralement, sur tous les dés.
  if (a === 1 && b === 2 && c === 2) return { id: 'nenette', x: 0 }
  return { id: 'junk', x: c }
}

export function evaluateDice(
  values: readonly number[],
  faces: number,
  combos: CombinationsConfig,
  valuePlus1: boolean,
): DiceHand {
  if (values.length !== 3) throw new Error(`evaluateDice attend 3 dés, reçu ${values.length}`)
  const { id, x } = identify(values)
  const spec = combos[id]
  const v = spec.value
  const baseValue = v === 'dieValue' || v === 'thirdDie' ? x : typeof v === 'number' ? v : faces + v.facesPlus
  return {
    values: [...values],
    id,
    rank: spec.rank,
    tieBreak: spec.tieBreak,
    baseValue,
    chipValue: baseValue + (valuePlus1 ? 1 : 0),
  }
}

export interface BestHand {
  readonly hand: DiceHand
  /** Indices des dés retenus, pour que l'affichage montre lesquels comptent. */
  readonly indices: readonly number[]
}

/**
 * `D3b` : on lance N dés, le jeu retient **automatiquement la meilleure
 * combinaison de trois**. À N = 3 c'est l'identité ; au-delà, on énumère les
 * C(N,3) sous-ensembles — 4 pour quatre dés, 10 pour cinq.
 */
export function bestOfThree(
  values: readonly number[],
  faces: number,
  combos: CombinationsConfig,
  valuePlus1: boolean,
): BestHand {
  if (values.length < 3) throw new Error(`bestOfThree attend au moins 3 dés, reçu ${values.length}`)
  let best: BestHand | null = null
  for (let a = 0; a < values.length; a++) {
    for (let b = a + 1; b < values.length; b++) {
      for (let c = b + 1; c < values.length; c++) {
        const indices = [a, b, c]
        const hand = evaluateDice(
          indices.map((i) => values[i] as number),
          faces,
          combos,
          valuePlus1,
        )
        if (!best || compareDice(hand, best.hand) < 0) best = { hand, indices }
      }
    }
  }
  return best as BestHand
}

/**
 * Force scalaire d'une main de 3 dés, **sans rien allouer**. Même ordre que
 * `compareDice`, mais utilisable dans les boucles chaudes de l'IA, qui en font
 * des dizaines de milliers par décision.
 */
export function strengthOf(a: number, b: number, c: number, faces: number, combos: CombinationsConfig): number {
  let lo = a
  let mid = b
  let hi = c
  if (lo > mid) [lo, mid] = [mid, lo]
  if (mid > hi) [mid, hi] = [hi, mid]
  if (lo > mid) [lo, mid] = [mid, lo]

  let id: CombinationId
  let x = 0
  if (lo === 1 && mid === 2 && hi === 4) id = '421'
  else if (lo === 1 && mid === 1 && hi === 1) id = 'triple1'
  else if (lo === mid && mid === hi) {
    id = 'triple'
    x = lo
  } else if (lo === 1 && mid === 1) {
    id = 'pairOfOnes'
    x = hi
  } else if (mid === lo + 1 && hi === mid + 1) id = 'straight'
  else if (lo === 1 && mid === 2 && hi === 2) id = 'nenette'
  else {
    id = 'junk'
    x = hi
  }

  const spec = combos[id]
  const v = spec.value
  const value = v === 'dieValue' || v === 'thirdDie' ? x : typeof v === 'number' ? v : faces + v.facesPlus
  return (10 - spec.rank) * 100_000 + value * 10 + spec.tieBreak
}

/** `D3b` côté IA : la force de la meilleure main de 3, sans allocation. */
export function bestStrength(
  values: readonly number[],
  faces: number,
  combos: CombinationsConfig,
): number {
  const n = values.length
  if (n === 3) return strengthOf(values[0] as number, values[1] as number, values[2] as number, faces, combos)
  let best = -Infinity
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        const s = strengthOf(values[a] as number, values[b] as number, values[c] as number, faces, combos)
        if (s > best) best = s
      }
    }
  }
  return best
}

/**
 * `V4` : rang, puis **valeur nue**, puis `x-x-x` avant `1-1-x` (`V1b`), puis
 * valeurs de dés décroissantes. Retourne < 0 si `a` est meilleure.
 */
export function compareDice(a: DiceHand, b: DiceHand): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  if (a.baseValue !== b.baseValue) return b.baseValue - a.baseValue
  if (a.tieBreak !== b.tieBreak) return b.tieBreak - a.tieBreak
  const sa = [...a.values].sort((x, y) => y - x)
  const sb = [...b.values].sort((x, y) => y - x)
  for (let i = 0; i < 3; i++) {
    const d = (sb[i] as number) - (sa[i] as number)
    if (d !== 0) return d
  }
  return 0
}
