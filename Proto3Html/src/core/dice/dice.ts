/**
 * Dés : jet, gravure, effets de face et montée de dé — GDD §11 (`F1` à `F10`).
 */

import type { Rng } from '../rules/random'
import type { Die, DieThrow, Face, FaceEffectId } from '../rules/types'

export function face(value: number, effect: FaceEffectId | null = null): Face {
  return { value, effect }
}

export function createDie(values: readonly number[]): Die {
  return { faces: values.map((v) => face(v)) }
}

export function values(die: Die): number[] {
  return die.faces.map((f) => f.value)
}

/** `F3` : une face tirée uniformément, dont on lit la valeur **et l'effet**. */
export function throwDie(die: Die, rng: Rng): DieThrow {
  const faceIndex = rng.int(die.faces.length)
  const f = die.faces[faceIndex] as Face
  return { faceIndex, value: f.value, effect: f.effect }
}

/** `F2` : la face `i` est opposée à la face `n − 1 − i`. */
export function oppositeIndex(die: Die, faceIndex: number): number {
  return die.faces.length - 1 - faceIndex
}

/** `B10` : le retournement lit la face opposée **telle qu'elle est gravée**. */
export function flip(die: Die, faceIndex: number): DieThrow {
  const i = oppositeIndex(die, faceIndex)
  const f = die.faces[i] as Face
  return { faceIndex: i, value: f.value, effect: f.effect }
}

/** `F10` (`wild`) : la valeur de la face opposée, sans changer de face. */
export function oppositeValue(die: Die, faceIndex: number): number {
  return (die.faces[oppositeIndex(die, faceIndex)] as Face).value
}

export function countValue(die: Die, value: number): number {
  return die.faces.reduce((n, f) => (f.value === value ? n + 1 : n), 0)
}

export function countEffect(die: Die, effect: FaceEffectId): number {
  return die.faces.reduce((n, f) => (f.effect === effect ? n + 1 : n), 0)
}

export interface EngraveCheck {
  readonly ok: boolean
  readonly reason?: string
}

/**
 * `A6` : la valeur reste dans 1…faces. Il n'y a **plus de plafond de faces
 * identiques** — l'ancien `A7` ne protégeait de rien (§17) : c'est `D1b`, la
 * meilleure combinaison de trois parmi quatre, qui rend la saturation perdante.
 */
export function canEngrave(die: Die, faceIndex: number, value: number): EngraveCheck {
  const n = die.faces.length
  if (faceIndex < 0 || faceIndex >= n) return { ok: false, reason: `face ${faceIndex} hors du dé` }
  if (!Number.isInteger(value) || value < 1 || value > n) {
    return { ok: false, reason: `la valeur doit être un entier de 1 à ${n}` }
  }
  return { ok: true }
}

/** Grave la face de bout en bout — réservé aux tests et à la mise en place. */
export function engrave(die: Die, faceIndex: number, value: number, effect: FaceEffectId | null = null): Die {
  const faces = [...die.faces]
  faces[faceIndex] = face(value, effect)
  return { faces }
}

/** `F11` : changer la **valeur** d'une face. Son effet éventuel est conservé. */
export function engraveValue(die: Die, faceIndex: number, value: number): Die {
  const faces = [...die.faces]
  const current = die.faces[faceIndex] as Face
  faces[faceIndex] = face(value, current.effect)
  return { faces }
}

/** `F11` : poser un **effet** sur une face. Sa valeur est conservée. */
export function engraveEffect(die: Die, faceIndex: number, effect: FaceEffectId): Die {
  const faces = [...die.faces]
  const current = die.faces[faceIndex] as Face
  faces[faceIndex] = face(current.value, effect)
  return { faces }
}

/**
 * `F6` / `F8` : montée de dé. Les nouvelles valeurs entrent **par paires, aux
 * extrémités** — ce qui préserve tous les appariements existants (`i` ↔ `n−1−i`)
 * et donc les gravures déjà faites, effets compris.
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
    faces = [face(low), ...faces, face(high)]
    low++
    high--
  }
  return { faces }
}

/**
 * Le dé « naturel » d'une taille donnée. Il faut suivre **la même échelle de
 * montées** que le dé réel (`ladder`) : monter 6 → 100 d'un coup ne range pas
 * les faces comme 6 → 8 → 12 → 20 → 100.
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
  for (let i = 0; i < die.faces.length; i++) {
    const a = die.faces[i] as Face
    const b = natural[i] as Face
    if (a.value !== b.value || a.effect !== null) out.push(i)
  }
  return out
}
