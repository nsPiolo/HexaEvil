/**
 * Dés Distance du joueur, face par face : la forge altère une face, un dé spécial
 * remplace un dé entier (GDD §6.3). L'adversaire garde toujours les dés de base.
 */
import type { RaceConfig } from '../config/schema'

/** Effet spécial d'une face forgée, en plus de sa valeur. */
export type FaceEffect = 'gold' | 'betSeal'

export interface Face {
  value: number
  effect: FaceEffect | null
  /** Id de l'altération de forge, pour l'affichage ; null pour une face d'origine. */
  altered: string | null
}

export interface DistanceDie {
  /** Id de l'objet boutique dont il vient, ou 'base'. */
  kind: string
  name: string
  faces: Face[]
  /** Pièces prélevées à chaque association de ce dé (Dé de Prodigalité). */
  costPerUse: number
}

export function plainFace(value: number): Face {
  return { value, effect: null, altered: null }
}

export function baseDie(config: RaceConfig): DistanceDie {
  return { kind: 'base', name: 'Dé de base', faces: config.dice.distanceFaces.map(plainFace), costPerUse: 0 }
}

export function defaultDice(config: RaceConfig): DistanceDie[] {
  return Array.from({ length: config.dice.distanceDice }, () => baseDie(config))
}

export function fmtFace(f: Face): string {
  return f.value > 0 ? `+${f.value}` : `${f.value}`
}
