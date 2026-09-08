/**
 * Decks de cartes — GDD §5 (`K1` à `K5`) et tirage d'une bataille (`C2` à `C5`).
 */

import type { CardsConfig } from '../config/schema'
import type { Rng } from '../rules/random'
import type { Card, Suit } from '../rules/types'

let nextUid = 1

export function newCard(value: number, suit: Suit): Card {
  return { uid: nextUid++, value, suit }
}

/** Compteur d'`uid`, sauvé avec le run pour qu'un clone d'après reprise reste unique. */
export function peekUid(): number {
  return nextUid
}

export function restoreUid(value: number): void {
  if (Number.isInteger(value) && value > nextUid) nextUid = value
}

export function cloneCard(card: Card): Card {
  return { uid: nextUid++, value: card.value, suit: card.suit }
}

/** `K2` : 52 cartes, du 2 à l'As dans les 4 couleurs, sans joker. */
export function createStartingDeck(cfg: CardsConfig): Card[] {
  const deck: Card[] = []
  for (const suit of cfg.suits) for (const value of cfg.values) deck.push(newCard(value, suit))
  return deck
}

/**
 * `C5` : le deck est remélangé **entièrement** au début de chaque bataille — les
 * trois batailles d'une partie sont indépendantes, seule la composition compte.
 */
export interface DrawState {
  readonly hand: Card[]
  /** Reste du deck, dans lequel les changements piochent (`C4`). */
  readonly pile: Card[]
  /** Cartes défaussées : elles ne reviennent pas dans la même bataille (`C4`). */
  readonly discarded: Card[]
}

export function drawHand(deck: readonly Card[], size: number, rng: Rng): DrawState {
  if (deck.length < size) throw new Error(`deck de ${deck.length} cartes, main de ${size} demandée (K5)`)
  const pile = rng.shuffle([...deck])
  return { hand: pile.splice(0, size), pile, discarded: [] }
}

/** `C3` : une passe de changement, de 0 à toutes les cartes. */
export function mulligan(state: DrawState, swapIndices: readonly number[], _rng: Rng): DrawState {
  const hand = [...state.hand]
  const pile = [...state.pile]
  const discarded = [...state.discarded]
  const wanted = [...new Set(swapIndices)].sort((a, b) => a - b)
  for (const i of wanted) {
    const card = hand[i]
    if (!card) continue
    if (pile.length === 0) break
    discarded.push(card)
    hand[i] = pile.shift() as Card
  }
  return { hand, pile, discarded }
}
