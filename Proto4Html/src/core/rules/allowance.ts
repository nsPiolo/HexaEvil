/**
 * Avance de course : au début de chaque course, le stagiaire verse une somme au joueur, avant
 * les paris initiaux. Elle vaut `economy.raceAllowance` au cercle 1 et grandit ensuite avec le
 * cercle (`allowanceAtCircle`) : c'est le revenu qui ne dépend pas de la bourse, celui qui
 * permet de repartir après avoir payé un cercle. La Tirelire du stagiaire l'augmente de son
 * paramètre `bonus`. Pur : la présentation l'applique à la création de la course et le raconte.
 */
import type { RaceConfig } from '../config/schema'
import type { Inventory } from '../shop/shop'
import type { ShopConfig } from '../shop/items'
import { growWithCircle } from './growth'

/** Avance de base du cercle, hors artefacts : celle du cercle 1 grandie par la même règle que les jetons. */
export function allowanceAtCircle(economy: RaceConfig['economy'], circle: number): number {
  return growWithCircle(economy.raceAllowance, circle, economy.allowanceGrowthPerCircle)
}

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
