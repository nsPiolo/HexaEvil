/** Libellés et couleurs d'affichage. Aucune règle ici (ADR-0003). */

import type { ColorId, EndCause, PlayingSide, Side } from '../core/rules/types'

export const SIDE_LABEL: Record<Side, string> = {
  player: 'Joueur',
  demon: 'Démon',
  neutral: 'Neutre',
}

export const SIDE_INK: Record<Side, string> = {
  player: '#2e86de',
  demon: '#c0392b',
  neutral: '#7f8c8d',
}

export const CAUSE_LABEL: Record<EndCause, string> = {
  kingDestroyed: 'Roi détruit (W1)',
  twoPasses: 'Deux passes consécutives (W2)',
  boardFull: 'Plateau plein (W3)',
}

export const PASS_REASON_LABEL: Record<'noColorTile' | 'noFreeSpace', string> = {
  noColorTile: 'Deck de la Couleur imposée épuisé (C10)',
  noFreeSpace: 'plus aucun Espace libre (W3)',
}

export function outcomeLabel(cause: EndCause, winner: PlayingSide | null): string {
  const who = winner === null ? 'match nul' : `victoire du ${SIDE_LABEL[winner]}`
  return `${CAUSE_LABEL[cause]} — ${who}`
}

export function colorLabel(colors: readonly { id: string; label: string }[], id: ColorId): string {
  return colors.find((c) => c.id === id)?.label ?? id
}

export function colorHex(colors: readonly { id: string; hex: string }[], id: ColorId | null): string {
  if (id === null) return '#1b1f24'
  return colors.find((c) => c.id === id)?.hex ?? '#888'
}
