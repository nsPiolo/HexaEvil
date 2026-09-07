/**
 * Règle T7 — relation d'alliance, ASYMÉTRIQUE.
 *
 * « Allié » et « adverse » se lisent toujours DEPUIS une Tuile donnée, jamais
 * comme une propriété du couple :
 *
 *   depuis un camp   → même camp        : allié
 *   depuis un camp   → camp opposé      : adverse
 *   depuis un camp   → neutre           : ni l'un ni l'autre
 *   depuis un neutre → n'importe quelle : allié
 *
 * Tout le comportement des Tuiles neutres (T6) en découle : hors combat (elles
 * ne sont l'adverse de personne), coupe-chaîne et sans bonus de pose (elles ne
 * sont l'alliée de personne), sanctuaire du `B01` neutre (elles considèrent
 * tout le monde comme allié). Aucune règle spéciale à écrire pour elles.
 */

import type { EffectTarget, Side } from './types'

/** `other` est-elle alliée, vue depuis `from` ? */
export function isAllyOf(from: Side, other: Side): boolean {
  if (from === 'neutral') return true
  return from === other
}

/** `other` est-elle adverse, vue depuis `from` ? */
export function isEnemyOf(from: Side, other: Side): boolean {
  if (from === 'neutral' || other === 'neutral') return false
  return from !== other
}

/** Une cible d'effet ou d'aura retient-elle `other`, vue depuis `from` ? */
export function matchesTarget(target: EffectTarget, from: Side, other: Side): boolean {
  switch (target) {
    case 'allyAdjacent':
      return isAllyOf(from, other)
    case 'enemyAdjacent':
      return isEnemyOf(from, other)
    case 'anyAdjacent':
    case 'adjacent':
      return true
  }
}

export function opposite(side: 'player' | 'demon'): 'player' | 'demon' {
  return side === 'player' ? 'demon' : 'player'
}
