/** Types du Core. Aucune logique ici — voir GDD proto2 §1 pour le lexique. */

import type { HexCoord } from '../hex/hexCoord'

export type ColorId = 'red' | 'blue' | 'green' | 'black' | 'yellow'
export const ALL_COLORS: readonly ColorId[] = ['red', 'blue', 'green', 'black', 'yellow']

/** Camp — règle T7. `neutral` est un camp à part entière (T6). */
export type Side = 'player' | 'demon' | 'neutral'
export type PlayingSide = 'player' | 'demon'
export const PLAYING_SIDES: readonly PlayingSide[] = ['player', 'demon']

export type EffectTarget = 'allyAdjacent' | 'enemyAdjacent' | 'anyAdjacent' | 'adjacent'

/** Effets « à la pose » (E1). Le code ne connaît que ces `kind` (T4). */
export type OnPlaceEffect =
  | { readonly kind: 'gainShields'; readonly amount: number }
  | { readonly kind: 'damage'; readonly target: EffectTarget; readonly amount: number }
  | { readonly kind: 'recolorSpaces'; readonly target: EffectTarget; readonly color: ColorId }

/** Effets permanents (E4). Jamais une mutation : un terme de la formule dérivée de F1. */
export type Aura =
  | { readonly kind: 'shields'; readonly target: EffectTarget; readonly amount: number }
  | { readonly kind: 'force'; readonly target: EffectTarget; readonly amount: number }
  | { readonly kind: 'silence'; readonly target: EffectTarget }

export interface TileDefinition {
  readonly id: string
  readonly color: ColorId
  readonly force: number
  /** Boucliers intrinsèques du type — 2 pour le Roi (T3, Q1). */
  readonly shields: number
  readonly role: 'king' | 'tower' | 'normal'
  /** E7 : `N01` ignore l'annulation d'une autre `N01` (Q6). */
  readonly immuneToSilence: boolean
  readonly onPlace: readonly OnPlaceEffect[]
  readonly aura: readonly Aura[]
  /** T2 : les IDs en `00` ne sont jamais dans un Deck. */
  readonly preplacedOnly: boolean
}

/**
 * État stocké d'une Tuile posée — règle F1.
 * Ces quatre valeurs et rien d'autre ; `force` et `shields` sont dérivés.
 */
export interface PlacedTile {
  readonly uid: number
  readonly typeId: string
  readonly side: Side
  readonly at: HexCoord
  /** F3 : +1 par allié adjacent, figé à l'instant de la pose. */
  readonly placementBonus: number
  /** F1 : borné à [0, +∞[. Croît au combat, décroît au soin (F13). */
  readonly damage: number
  /** Boucliers du type + ceux gagnés par ses propres effets `onPlace`. */
  readonly grantedShields: number
}

export interface HexSpace {
  readonly at: HexCoord
  /** B2 : un Espace bloqué n'a pas de Couleur et rien ne s'y pose. */
  readonly blocked: boolean
  /** C1 : `null` seulement si bloqué. */
  readonly color: ColorId | null
}

/**
 * Étape de résolution, émise par le moteur pour être *rejouée* à l'affichage
 * (U5, U16). Ce n'est pas une règle : c'est un flux d'événements, comme au
 * proto 1, qui permet d'animer sans mettre une once de logique de jeu dans la
 * présentation (ADR-0003).
 */
export type StepKind = 'heal' | 'place' | 'effect' | 'attack' | 'riposte' | 'destroy'

export interface ForceChange {
  readonly uid: number
  readonly typeId: string
  readonly at: HexCoord
  readonly from: number
  readonly to: number
}

export interface ResolutionStep {
  readonly kind: StepKind
  readonly label: string
  /** État du Plateau à la fin de l'étape. Pour `destroy`, les Tuiles condamnées y sont ENCORE présentes. */
  readonly tiles: readonly PlacedTile[]
  readonly spaces: readonly HexSpace[]
  /** Variations de force à animer pendant l'étape. */
  readonly changes: readonly ForceChange[]
  /** Uid des Tuiles retirées à la fin de l'étape (`destroy` uniquement). */
  readonly destroyed: readonly number[]
  /** La Tuile au centre de l'étape, à mettre en avant. */
  readonly focusUid: number | null
}

export interface ResolutionTrace {
  readonly turn: number
  readonly steps: readonly ResolutionStep[]
}

export type EndCause = 'kingDestroyed' | 'twoPasses' | 'boardFull'

export interface GameOutcome {
  readonly cause: EndCause
  /** `null` = match nul (W4). */
  readonly winner: PlayingSide | null
}

export interface GameState {
  readonly turn: number
  /** Une manche = un tour de chaque camp (§1). */
  readonly round: number
  readonly activeSide: PlayingSide
  /** C7/C12 : `null` uniquement au premier tour de la partie (C9). */
  readonly imposedColor: ColorId | null
  readonly spaces: readonly HexSpace[]
  readonly tiles: readonly PlacedTile[]
  /** D1 : une pile par Couleur active, par camp. Index 0 = sommet. */
  readonly decks: Readonly<Record<PlayingSide, Readonly<Record<ColorId, readonly string[]>>>>
  readonly consecutivePasses: number
  readonly outcome: GameOutcome | null
  readonly nextUid: number
  readonly log: readonly LogEntry[]
  /**
   * Trace du dernier tour, produite **seulement** si on la demande
   * (`playMove(..., { trace: true })`). L'IA simule des milliers de poses par
   * partie : elle ne doit pas payer la construction des instantanés.
   */
  readonly lastResolution: ResolutionTrace | null
}

export type LogEntry =
  | { readonly turn: number; readonly kind: 'upkeep'; readonly side: PlayingSide; readonly healed: readonly { uid: number; typeId: string; amount: number }[] }
  | { readonly turn: number; readonly kind: 'place'; readonly side: PlayingSide; readonly typeId: string; readonly at: HexCoord; readonly placementBonus: number }
  | { readonly turn: number; readonly kind: 'effect'; readonly text: string }
  | { readonly turn: number; readonly kind: 'attack'; readonly text: string }
  | { readonly turn: number; readonly kind: 'riposte'; readonly text: string }
  | { readonly turn: number; readonly kind: 'destroyed'; readonly text: string; readonly wave: number }
  | { readonly turn: number; readonly kind: 'pass'; readonly side: PlayingSide; readonly reason: 'noColorTile' | 'noFreeSpace' }
  | { readonly turn: number; readonly kind: 'imposed'; readonly color: ColorId; readonly starves: boolean }
  | { readonly turn: number; readonly kind: 'end'; readonly text: string }
