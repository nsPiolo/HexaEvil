/**
 * Dés : jet, gravure et montée de dé — GDD §11 (`F1` à `F9`).
 */

import type { Rng } from '../rules/random'
import type { Die, DieThrow } from '../rules/types'

export function createDie(faces: readonly number[]): Die {
  return { faces: [...faces] }
}

/** `F3` : une face tirée uniformément, dont on lit la valeur gravée. */
export function throwDie(die: Die, rng: Rng): DieThrow {
  const faceIndex = rng.int(die.faces.length)
  return { faceIndex, value: die.faces[faceIndex] as number }
}

/** `F2` : la face `i` est opposée à la face `n − 1 − i`. */
export function oppositeIndex(die: Die, faceIndex: number): number {
  return die.faces.length - 1 - faceIndex
}

/** `B10` : le retournement lit la face opposée **telle qu'elle est gravée**. */
export function flip(die: Die, faceIndex: number): DieThrow {
  const i = oppositeIndex(die, faceIndex)
  return { faceIndex: i, value: die.faces[i] as number }
}

export function countValue(die: Die, value: number): number {
  return die.faces.reduce((n, f) => (f === value ? n + 1 : n), 0)
}

export interface EngraveCheck {
  readonly ok: boolean
  readonly reason?: string
}

/** `A6` + `A7` : valeur dans 1…faces, et pas plus de `maxSameFace` exemplaires. */
export function canEngrave(die: Die, faceIndex: number, value: number, maxSameFace: number): EngraveCheck {
  const n = die.faces.length
  if (faceIndex < 0 || faceIndex >= n) return { ok: false, reason: `face ${faceIndex} hors du dé` }
  if (!Number.isInteger(value) || value < 1 || value > n) {
    return { ok: false, reason: `la valeur doit être un entier de 1 à ${n}` }
  }
  if (die.faces[faceIndex] === value) return { ok: false, reason: 'cette face porte déjà cette valeur' }
  if (maxSameFace > 0) {
    const after = countValue(die, value) + 1
    if (after > maxSameFace) {
      return { ok: false, reason: `déjà ${maxSameFace} faces à ${value} sur ce dé (A7)` }
    }
  }
  return { ok: true }
}

export function engrave(die: Die, faceIndex: number, value: number): Die {
  const faces = [...die.faces]
  faces[faceIndex] = value
  return { faces }
}

/**
 * `F6` / `F8` : montée de dé. Les nouvelles valeurs entrent **par paires, aux
 * extrémités** — ce qui préserve tous les appariements existants (`i` ↔ `n−1−i`)
 * et donc les gravures déjà faites, qui sont conservées telles quelles.
 */
export function upgradeDie(die: Die, targetFaces: number): Die {
  const current = die.faces.length
  if (targetFaces <= current) return die
  if ((targetFaces - current) % 2 !== 0) {
    throw new Error(`montée de dé impaire : ${current} → ${targetFaces}`)
  }
  let faces = [...die.faces]
  let low = current + 1
  let high = targetFaces
  while (low < high) {
    faces = [low, ...faces, high]
    low++
    high--
  }
  return { faces }
}

/**
 * Le dé « naturel » d'une taille donnée. Il faut suivre **la même échelle de
 * montées** que le dé réel (`ladder`, les tailles successives des Cercles) :
 * monter 6 → 100 d'un coup ne range pas les faces comme 6 → 8 → 12 → 20 → 100.
 */
export function naturalDie(startingFaces: readonly number[], ladder: readonly number[], size: number): Die {
  let die = createDie(startingFaces)
  for (const step of ladder) {
    if (step <= die.faces.length) continue
    if (step > size) break
    die = upgradeDie(die, step)
  }
  return upgradeDie(die, size)
}

/** Indices des faces gravées, pour l'inspecteur (`U9`) et `M8`. */
export function engravedFaces(die: Die, startingFaces: readonly number[], ladder: readonly number[]): number[] {
  const natural = naturalDie(startingFaces, ladder, die.faces.length).faces
  const out: number[] = []
  for (let i = 0; i < die.faces.length; i++) if (die.faces[i] !== natural[i]) out.push(i)
  return out
}
