/**
 * Dés Distance du joueur, face par face : la forge altère une face, un dé spécial
 * remplace un dé entier (GDD §6.3). L'adversaire garde toujours les dés de base.
 */
import type { RaceConfig } from '../config/schema'

/**
 * Effet spécial d'une face forgée, en plus de sa valeur (forge.md). Trois moments de résolution,
 * qui décident où chaque effet est câblé :
 *
 * - **au lancer** (`rollPlayerDice`) : `mirror` copie l'autre dé, `willOWisp` relance le dé ;
 * - **à l'association** (`useRace`) : `gold` verse des pièces, `momentum` propose une relance ;
 * - **à la résolution** (`applyMove`) : `betSeal`, `leap`, `explosive`, `magnet`, `freeze`
 *   dépendent du plateau ou des paris et ne se réduisent pas à une valeur.
 */
export type FaceEffect = 'gold' | 'betSeal' | 'mirror' | 'willOWisp' | 'momentum' | 'leap' | 'explosive' | 'magnet' | 'freeze'

/** Effets qui se résolvent contre le plateau, dans `applyMove` : leur valeur de face ne suffit pas. */
export const BOARD_EFFECTS: readonly FaceEffect[] = ['leap', 'explosive', 'magnet', 'freeze']

export interface Face {
  value: number
  effect: FaceEffect | null
  /** Id de l'altération de forge, pour l'affichage ; null pour une face d'origine. */
  altered: string | null
  /** Valeur d'avant la forge, gardée pour le décapage (forge.md). Absente sur une face d'origine. */
  original?: number
  /** Face « ? » du Dé de Fraude : elle copie la meilleure autre face du lancer (des.md n°5). */
  wild?: boolean
}

export interface DistanceDie {
  /**
   * Id de l'objet boutique dont il vient, ou 'base'. C'est de lui que l'écran tire le nom
   * à afficher (`dieName`, presentation/art.ts) : un dé acheté en français et regardé en
   * anglais se lit dans la langue du moment, pas dans celle de l'achat.
   */
  kind: string
  faces: Face[]
  /** Pièces prélevées à chaque association de ce dé (Dé de Prodigalité). */
  costPerUse: number
}

export function plainFace(value: number): Face {
  return { value, effect: null, altered: null }
}

export function baseDie(config: RaceConfig): DistanceDie {
  return { kind: 'base', faces: config.dice.distanceFaces.map(plainFace), costPerUse: 0 }
}

export function defaultDice(config: RaceConfig): DistanceDie[] {
  return Array.from({ length: config.dice.distanceDice }, () => baseDie(config))
}

export function fmtFace(f: Face): string {
  return f.value > 0 ? `+${f.value}` : `${f.value}`
}
