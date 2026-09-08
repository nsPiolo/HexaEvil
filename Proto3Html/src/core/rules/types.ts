/**
 * Vocabulaire du proto 3 — GDD §1. Données pures, aucune logique (ADR-0003).
 */

/* ---------------------------------------------------------------- Cartes */

export type Suit = 'diamonds' | 'hearts' | 'spades' | 'clubs'

export const ALL_SUITS: readonly Suit[] = ['diamonds', 'hearts', 'spades', 'clubs']

/** `uid` distingue deux exemplaires identiques nés d'un clonage (`K3`). */
export interface Card {
  readonly uid: number
  readonly value: number
  readonly suit: Suit
}

export type HandCategory =
  | 'cinqIdentiques'
  | 'quinteFlush'
  | 'carre'
  | 'full'
  | 'couleur'
  | 'suite'
  | 'brelan'
  | 'doublePaire'
  | 'paire'
  | 'carteHaute'

/**
 * `rank` est l'indice dans le classement de **cette taille de main** (`C12`) :
 * 0 est le meilleur. Il n'a de sens qu'entre mains de même taille.
 */
export interface HandRank {
  readonly category: HandCategory
  readonly rank: number
  readonly tiebreak: readonly number[]
}

/* ------------------------------------------------------------------- Dés */

/**
 * Effets qu'une face gravée peut porter (`F10`). Une face nue n'en a aucun.
 */
export type FaceEffectId =
  /** Relancer ce dé, gratuitement et sans consommer de jet. */
  | 'freeReroll'
  /** Visible en fin de tour : un jeton de moins à encaisser. */
  | 'takeLess'
  /** Vaut sa valeur **ou** celle de la face opposée — au mieux. */
  | 'wild'
  /** À chaque apparition : un jeton du pot pour chaque participant. */
  | 'payAll'
  /** Visible en fin de tour : +1 d'argent, +10 si tous les dés l'affichent. */
  | 'money'
  /** Trois exemplaires visibles en fin de tour : +1 point de forge. */
  | 'forge'

export interface Face {
  readonly value: number
  readonly effect: FaceEffectId | null
}

/** Un dé est la liste ordonnée de ses faces gravées, pas un nombre de côtés (`F1`). */
export interface Die {
  readonly faces: readonly Face[]
}

/** Un jet retient l'**indice** de face, dont `flipDie` et les effets ont besoin. */
export interface DieThrow {
  readonly faceIndex: number
  readonly value: number
  readonly effect: FaceEffectId | null
}

export type CombinationId =
  | '421'
  | 'triple1'
  | 'triple'
  | 'pairOfOnes'
  | 'straight'
  | 'junk'
  | 'nenette'

export interface DiceHand {
  readonly values: readonly number[]
  readonly id: CombinationId
  readonly rank: number
  readonly tieBreak: number
  /** Valeur nue : c'est elle qui classe (`V4`), jamais `chipValue`. */
  readonly baseValue: number
  /** Valeur transférée, `valuePlus1` compris (`B13`). */
  readonly chipValue: number
}

/* ---------------------------------------------------------- Récompenses */

export type RewardId =
  | 'give3'
  | 'give5'
  | 'setRerolls'
  | 'reroll421'
  | 'splitGive'
  | 'takeLess'
  | 'nenetteGift'
  | 'flipDie'
  | 'extraDie'
  | 'set42'
  | 'valuePlus1'

export type PhaseId = 'charge' | 'discharge'

/* -------------------------------------------------------------- Joueurs */

export interface Participant {
  readonly index: number
  readonly name: string
  readonly isHuman: boolean
  deck: Card[]
  dice: Die[]
}
