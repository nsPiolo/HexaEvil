/**
 * Déblocage d'objets (méta-progression). Le catalogue de `config/shop.json` n'est pas
 * ouvert d'un bloc : seuls les objets de `unlockedAtStart` sont en rayon au premier
 * lancement, et **chaque cercle payé en débloque un de plus**, tiré au sort parmi les
 * objets encore scellés. Un objet débloqué l'est pour de bon : il survit à la mort du
 * run (`clearRun` n'y touche pas) et rejoint le vivier où la boutique tire sa vitrine.
 *
 * Le tirage réutilise `rarityWeights` : un commun sort plus souvent qu'un rare, un rare
 * plus souvent qu'un légendaire, si bien que les objets qui changent le plus la partie
 * arrivent dans les runs tardifs — même intention que le déblocage par grade du stagiaire
 * (boutique-README § Déblocage par la hiérarchie du stagiaire).
 */
import type { ShopConfig, ShopItem } from './items'
import type { Rng } from '../rules/rng'
import { weightedPick } from './shop'

/**
 * Objets réellement ouverts : le socle de départ plus ce que les runs précédents ont
 * débloqué. Les ids inconnus (objet retiré du catalogue depuis la dernière sauvegarde)
 * sont ignorés, et l'ordre du catalogue est conservé pour que l'affichage soit stable.
 */
export function unlockedIds(shop: ShopConfig, saved: readonly string[]): string[] {
  const open = new Set<string>([...shop.unlockedAtStart, ...saved])
  return shop.items.filter((it) => open.has(it.id)).map((it) => it.id)
}

/** Tout le catalogue ouvert : mode e2e et menu développeur, jamais le jeu normal. */
export function allIds(shop: ShopConfig): string[] {
  return shop.items.map((it) => it.id)
}

export function unlockedItems(shop: ShopConfig, unlocked: readonly string[]): ShopItem[] {
  const open = new Set(unlocked)
  return shop.items.filter((it) => open.has(it.id))
}

export function lockedItems(shop: ShopConfig, unlocked: readonly string[]): ShopItem[] {
  const open = new Set(unlocked)
  return shop.items.filter((it) => !open.has(it.id))
}

/**
 * Tire l'objet débloqué par un cercle payé, ou null si le catalogue est déjà entier.
 * Ne touche à rien : l'appelant ajoute l'id à la liste et la persiste.
 */
export function drawUnlock(shop: ShopConfig, unlocked: readonly string[], rng: Rng): ShopItem | null {
  const locked = lockedItems(shop, unlocked)
  return locked.length === 0 ? null : weightedPick(locked, shop.rarityWeights, rng)
}
