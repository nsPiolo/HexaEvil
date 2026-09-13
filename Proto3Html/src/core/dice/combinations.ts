/**
 * Barème et classement des combinaisons de dés — GDD §8 (`V1` à `V7`).
 *
 * Les valeurs viennent **toutes** de la configuration (`G3`) : le code ne
 * connaît que la façon de *reconnaître* une combinaison.
 *
 * Deux notions traversent ce fichier :
 *
 * - les **lectures** (`Reads`, `F10`) : ce qu'un dé peut valoir. Par défaut sa
 *   valeur imprimée ; une face `wild` y ajoute celle de sa face opposée, une
 *   face `wild35` la **remplace** par 3 ou 5 ;
 * - les **bonus** (`HandBonuses`, `B17` à `B24`) : ce que les récompenses du
 *   participant changent à la lecture — suite élargie, planchers en jetons, et
 *   les deux combinaisons qui se font sur **tous** les dés.
 */

import type { CombinationSpec, CombinationsConfig, CombinationValue } from '../config/schema'
import type { CombinationId, DiceHand } from '../rules/types'

/** `F10` : lectures possibles de chaque dé, `null` = sa seule valeur imprimée. */
export type Reads = readonly (readonly number[] | null)[]

/**
 * `B17` à `B24` : ce que les récompenses du participant changent à la lecture
 * d'une main. Aucune n'est portée par le dé : elles suivent le participant.
 */
export interface HandBonuses {
  /** `B17` : +1 jeton sur toute combinaison, sans toucher au classement. */
  readonly valuePlus1: boolean
  /** `B19` : une suite accepte un écart de 2 entre deux dés (2-4-6, 2-3-5). */
  readonly wideStraight: boolean
  /** `B20` : plancher en **jetons** par combinaison — le classement ne bouge pas. */
  readonly floors: Readonly<Partial<Record<CombinationId, number>>>
  /** `B23` : 4 faces identiques valent 10 jetons, +4 par dé de plus. */
  readonly quad: boolean
  /** `B24` : une suite sur **tous** ses dés (4 minimum) vaut 7 jetons. */
  readonly fullStraight: boolean
}

export const NO_BONUS: HandBonuses = {
  valuePlus1: false,
  wideStraight: false,
  floors: {},
  quad: false,
  fullStraight: false,
}

/** `B19` : un pas de suite vaut 1, ou 1 **ou 2** pour qui tient `wideStraight`. */
function step(lo: number, hi: number, wide: boolean): boolean {
  const d = hi - lo
  return d === 1 || (wide && d === 2)
}

/** Reconnaissance pure, sans barème. Ordre des tests : le plus spécifique d'abord. */
export function identify(values: readonly number[], wide = false): { id: CombinationId; x: number } {
  const s = [...values].sort((a, b) => a - b)
  const [a, b, c] = [s[0] as number, s[1] as number, s[2] as number]

  if (a === 1 && b === 2 && c === 4) return { id: '421', x: 0 }
  if (a === 1 && b === 1 && c === 1) return { id: 'triple1', x: 1 }
  if (a === b && b === c) return { id: 'triple', x: a }
  if (a === 1 && b === 1) return { id: 'pairOfOnes', x: c }
  if (step(a, b, wide) && step(b, c, wide)) return { id: 'straight', x: c }
  // `V5` : la nénette est 2-2-1, littéralement, sur tous les dés.
  if (a === 1 && b === 2 && c === 2) return { id: 'nenette', x: 0 }
  return { id: 'junk', x: c }
}

/** Nombre de dés que la combinaison exige — 3 sauf `B23` et `B24`. */
function minDiceOf(spec: CombinationSpec): number {
  return spec.minDice ?? 3
}

function baseValueOf(v: CombinationValue, x: number, faces: number, count: number, minDice: number): number {
  if (v === 'dieValue' || v === 'thirdDie') return x
  if (typeof v === 'number') return v
  if ('facesPlus' in v) return faces + v.facesPlus
  // `B23` : un plancher plat, puis un supplément par dé au-delà du minimum.
  return v.flat + v.perExtraDie * (count - minDice)
}

/**
 * `B20` : le plancher joue sur les **jetons transférés**, pas sur le
 * classement — exactement comme `valuePlus1` (`B17`, `V2`). Deux suites restent
 * donc à égalité même si l'une transfère 5 jetons et l'autre 2.
 */
function chipsOf(baseValue: number, id: CombinationId, bonuses: HandBonuses): number {
  const floor = bonuses.floors[id] ?? 0
  return Math.max(baseValue, floor) + (bonuses.valuePlus1 ? 1 : 0)
}

function handOf(
  id: CombinationId,
  values: readonly number[],
  x: number,
  faces: number,
  combos: CombinationsConfig,
  bonuses: HandBonuses,
): DiceHand {
  const spec = combos[id]
  const baseValue = baseValueOf(spec.value, x, faces, values.length, minDiceOf(spec))
  return {
    values: [...values],
    id,
    rank: spec.rank,
    tieBreak: spec.tieBreak,
    baseValue,
    chipValue: chipsOf(baseValue, id, bonuses),
  }
}

export function evaluateDice(
  values: readonly number[],
  faces: number,
  combos: CombinationsConfig,
  bonuses: HandBonuses = NO_BONUS,
): DiceHand {
  if (values.length !== 3) throw new Error(`evaluateDice attend 3 dés, reçu ${values.length}`)
  const { id, x } = identify(values, bonuses.wideStraight)
  return handOf(id, values, x, faces, combos, bonuses)
}

export interface BestHand {
  readonly hand: DiceHand
  /** Indices des dés retenus, pour que l'affichage montre lesquels comptent. */
  readonly indices: readonly number[]
  /** Valeurs effectivement retenues — une face `wild` peut jouer l'autre (`F10`). */
  readonly chosen: readonly number[]
}

/** `F10` : lectures d'un dé — sa valeur, ou ce que sa face gravée impose. */
export function optionsOf(value: number, reads?: readonly number[] | null): readonly number[] {
  return reads === null || reads === undefined || reads.length === 0 ? [value] : reads
}

/** Toutes les façons de lire l'ensemble des dés. Borné : au plus 3 lectures par dé. */
function assignments(values: readonly number[], reads?: Reads): number[][] {
  let out: number[][] = [[]]
  for (let i = 0; i < values.length; i++) {
    const opts = optionsOf(values[i] as number, reads?.[i])
    const next: number[][] = []
    for (const partial of out) for (const o of opts) next.push([...partial, o])
    out = next
  }
  return out
}

/** `B23` : le plus gros paquet de dés qui peuvent afficher la même valeur. */
function biggestGroup(
  values: readonly number[],
  reads: Reads | undefined,
): { value: number; indices: number[] } | null {
  const candidates = new Set<number>()
  for (let i = 0; i < values.length; i++) for (const o of optionsOf(values[i] as number, reads?.[i])) candidates.add(o)
  let best: { value: number; indices: number[] } | null = null
  for (const v of candidates) {
    const indices: number[] = []
    for (let i = 0; i < values.length; i++) {
      if (optionsOf(values[i] as number, reads?.[i]).includes(v)) indices.push(i)
    }
    if (!best || indices.length > best.indices.length) best = { value: v, indices }
  }
  return best
}

/** `B24` : les dés, **tous**, forment-ils une suite ? Renvoie la lecture qui marche. */
function asFullStraight(
  values: readonly number[],
  reads: Reads | undefined,
  wide: boolean,
): number[] | null {
  for (const assign of assignments(values, reads)) {
    const s = [...assign].sort((a, b) => a - b)
    let ok = true
    for (let i = 1; i < s.length; i++) if (!step(s[i - 1] as number, s[i] as number, wide)) ok = false
    if (ok) return assign
  }
  return null
}

/**
 * `D3b` : on lance N dés, le jeu retient **automatiquement la meilleure
 * combinaison de trois**. À N = 3 c'est l'identité ; au-delà, on énumère les
 * C(N,3) sous-ensembles, en essayant toutes les lectures de chaque dé (`F10`).
 *
 * `B23`/`B24` : quand le participant les détient, deux combinaisons se jouent
 * sur **tous** les dés et peuvent battre la meilleure main de trois.
 */
export function bestHand(
  values: readonly number[],
  faces: number,
  combos: CombinationsConfig,
  bonuses: HandBonuses = NO_BONUS,
  reads?: Reads,
): BestHand {
  if (values.length < 3) throw new Error(`bestHand attend au moins 3 dés, reçu ${values.length}`)
  // Passer par un objet : l'appel de `keep` invalide la déduction de flux de TS
  // sur une variable simple, qui la croirait restée `null`.
  const found: { best: BestHand | null } = { best: null }
  const keep = (candidate: BestHand): void => {
    if (!found.best || compareDice(candidate.hand, found.best.hand) < 0) found.best = candidate
  }

  for (let a = 0; a < values.length; a++) {
    for (let b = a + 1; b < values.length; b++) {
      for (let c = b + 1; c < values.length; c++) {
        const idx = [a, b, c]
        const opts = idx.map((i) => optionsOf(values[i] as number, reads?.[i]))
        for (const x of opts[0] as readonly number[]) {
          for (const y of opts[1] as readonly number[]) {
            for (const z of opts[2] as readonly number[]) {
              const hand = evaluateDice([x, y, z], faces, combos, bonuses)
              keep({ hand, indices: idx, chosen: [x, y, z] })
            }
          }
        }
      }
    }
  }

  if (bonuses.quad) {
    const group = biggestGroup(values, reads)
    if (group && group.indices.length >= minDiceOf(combos.quad)) {
      const chosen = group.indices.map(() => group.value)
      keep({ hand: handOf('quad', chosen, group.value, faces, combos, bonuses), indices: group.indices, chosen })
    }
  }

  if (bonuses.fullStraight && values.length >= minDiceOf(combos.fullStraight)) {
    const chosen = asFullStraight(values, reads, bonuses.wideStraight)
    if (chosen) {
      const indices = values.map((_, i) => i)
      keep({ hand: handOf('fullStraight', chosen, 0, faces, combos, bonuses), indices, chosen })
    }
  }

  return found.best as BestHand
}

/**
 * Force scalaire d'une main de 3 dés, **sans rien allouer**. Même ordre que
 * `compareDice`, mais utilisable dans les boucles chaudes de l'IA, qui en font
 * des dizaines de milliers par décision.
 */
export function strengthOf(
  a: number,
  b: number,
  c: number,
  faces: number,
  combos: CombinationsConfig,
  wide = false,
): number {
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
  } else if (step(lo, mid, wide) && step(mid, hi, wide)) id = 'straight'
  else if (lo === 1 && mid === 2 && hi === 2) id = 'nenette'
  else {
    id = 'junk'
    x = hi
  }

  const spec = combos[id]
  return scoreOf(spec, baseValueOf(spec.value, x, faces, 3, 3))
}

/** Même échelle que `strengthOf`, pour les combinaisons sur tous les dés. */
function scoreOf(spec: CombinationSpec, value: number): number {
  return (10 - spec.rank) * 100_000 + value * 10 + spec.tieBreak
}

/** `D3b` côté IA : la force de la meilleure main, allocation minimale. */
export function bestStrength(
  values: readonly number[],
  faces: number,
  combos: CombinationsConfig,
  bonuses: HandBonuses = NO_BONUS,
  reads?: Reads,
): number {
  const n = values.length
  const wide = bonuses.wideStraight
  let best = -Infinity

  if (n === 3 && !reads) {
    best = strengthOf(values[0] as number, values[1] as number, values[2] as number, faces, combos, wide)
  } else {
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        for (let c = b + 1; c < n; c++) {
          for (const x of optionsOf(values[a] as number, reads?.[a])) {
            for (const y of optionsOf(values[b] as number, reads?.[b])) {
              for (const z of optionsOf(values[c] as number, reads?.[c])) {
                const s = strengthOf(x, y, z, faces, combos, wide)
                if (s > best) best = s
              }
            }
          }
        }
      }
    }
  }

  if (bonuses.quad) {
    const group = biggestGroup(values, reads)
    const spec = combos.quad
    const min = minDiceOf(spec)
    if (group && group.indices.length >= min) {
      const s = scoreOf(spec, baseValueOf(spec.value, group.value, faces, group.indices.length, min))
      if (s > best) best = s
    }
  }

  if (bonuses.fullStraight && n >= minDiceOf(combos.fullStraight)) {
    const spec = combos.fullStraight
    if (asFullStraight(values, reads, wide)) {
      const s = scoreOf(spec, baseValueOf(spec.value, 0, faces, n, minDiceOf(spec)))
      if (s > best) best = s
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
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const d = (sb[i] as number) - (sa[i] as number)
    if (d !== 0) return d
  }
  return 0
}
