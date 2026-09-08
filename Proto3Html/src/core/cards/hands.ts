/**
 * Reconnaissance et classement des mains de cartes — GDD §4 (`C11`, `C12`).
 *
 * Le classement des catégories **dépend de la taille de la main** et vit en
 * configuration (`C12c`) : le code ne sait que reconnaître une catégorie.
 */

import type { CardsConfig } from '../config/schema'
import type { Card, HandCategory, HandRank } from '../rules/types'

/** Valeurs groupées par effectif décroissant, puis par valeur décroissante. */
function groups(cards: readonly Card[]): { value: number; count: number }[] {
  const counts = new Map<number, number>()
  for (const c of cards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1)
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value)
}

function isFlush(cards: readonly Card[], min: number): boolean {
  if (cards.length < min) return false
  const first = cards[0] as Card
  return cards.every((c) => c.suit === first.suit)
}

/** `C11`/`C14` : toutes les valeurs se suivent, l'As ne boucle pas en bas. */
function isStraight(cards: readonly Card[], min: number): boolean {
  if (cards.length < min) return false
  const values = [...new Set(cards.map((c) => c.value))].sort((a, b) => a - b)
  if (values.length !== cards.length) return false
  return (values[values.length - 1] as number) - (values[0] as number) === cards.length - 1
}

export function categorize(cards: readonly Card[], cfg: CardsConfig): HandCategory {
  const g = groups(cards)
  const top = g[0]?.count ?? 0
  const second = g[1]?.count ?? 0
  const flush = isFlush(cards, cfg.flushMinSize)
  const straight = isStraight(cards, cfg.straightMinSize)

  if (top === 5) return 'cinqIdentiques'
  if (flush && straight) return 'quinteFlush'
  if (top === 4) return 'carre'
  if (top === 3 && second === 2) return 'full'
  if (flush) return 'couleur'
  if (straight) return 'suite'
  if (top === 3) return 'brelan'
  if (top === 2 && second === 2) return 'doublePaire'
  if (top === 2) return 'paire'
  return 'carteHaute'
}

export function evaluateHand(cards: readonly Card[], cfg: CardsConfig): HandRank {
  const category = categorize(cards, cfg)
  const ladder = cfg.handRankings[cards.length]
  if (!ladder) throw new Error(`aucun classement configuré pour une main de ${cards.length} cartes (C12c)`)
  const rank = ladder.indexOf(category)
  if (rank < 0) {
    throw new Error(
      `catégorie « ${category} » absente du classement des mains de ${cards.length} cartes (C12c)`,
    )
  }
  return { category, rank, tiebreak: groups(cards).map((x) => x.value) }
}

/** Retourne < 0 si `a` est meilleure. Ne compare que des mains de même taille. */
export function compareHands(a: HandRank, b: HandRank): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  const n = Math.max(a.tiebreak.length, b.tiebreak.length)
  for (let i = 0; i < n; i++) {
    const d = (b.tiebreak[i] ?? 0) - (a.tiebreak[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}
