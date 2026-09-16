/**
 * Avance de course : au début de chaque course, le stagiaire verse une somme au joueur
 * (config economy.raceAllowance), avant les paris initiaux. La Tirelire du stagiaire
 * l'augmente de son paramètre `bonus`. Pur : la présentation l'applique à la création
 * de la course et le raconte dans le journal.
 */
import type { Inventory } from '../shop/shop'
import type { ShopConfig } from '../shop/items'

export interface Allowance {
  /** Somme versée, artefacts compris. */
  total: number
  /** Part venant de la Tirelire du stagiaire (0 sans elle). */
  bonus: number
}

export function raceAllowance(base: number, inventory: Inventory, shop: ShopConfig): Allowance {
  const tirelire = inventory.artefacts.includes('tirelire') ? shop.items.find((i) => i.id === 'tirelire') : undefined
  const bonus = tirelire?.params.bonus ?? 0
  return { total: Math.max(0, base) + bonus, bonus }
}
