import { rankOfLevel } from './demon'
import { BETS, fill } from './texts'

/**
 * Motif unique « verrouillé par le grade du stagiaire » (spec 01/C3) : cadenas + nom du
 * grade, sur un élément qui reste visible et lisible. Utilisé pour les paris ; prêt pour
 * les objets de boutique quand leur déblocage par rang arrivera.
 */
export function LockBadge({ level }: { level: number }) {
  return <span className="lock-badge">🔒 {fill(BETS.lockedBadge, { rank: rankOfLevel(level).name })}</span>
}

/** Explication complète du verrou, pour un `title`. */
export function lockTitle(level: number): string {
  return fill(BETS.locked, { rank: rankOfLevel(level).name })
}

/**
 * Second motif : « verrouillé tant qu'on ne possède pas cet objet ». Les guichets exotiques
 * (artefacts.md n°39) ne s'ouvrent pas au grade mais à l'achat du Registre des paris
 * exotiques — leur dire « dès Stagiaire », le grade de départ, ne voudrait rien dire.
 */
export function ItemLockBadge({ name }: { name: string }) {
  return <span className="lock-badge">🔒 {fill(BETS.lockedItemBadge, { name })}</span>
}

export function itemLockTitle(name: string): string {
  return fill(BETS.lockedItem, { name })
}
