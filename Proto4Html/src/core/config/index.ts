import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from './load'
import { loadShopConfig } from '../shop/load'
import { translateRaceConfig, translateShopConfig } from './i18n'
import type { ShopConfig } from '../shop/items'

/**
 * Configuration de la course et catalogue de la boutique, validés au chargement du module.
 *
 * `let` et non `const` : `setConfigLanguage` les recharge quand le joueur change de langue,
 * et les liaisons d'import étant vivantes, tous ceux qui importent `config` voient la
 * nouvelle valeur au rendu suivant — comme pour les groupes de `presentation/texts`.
 * Au premier chargement, c'est le français, celui qui est écrit dans les fichiers.
 */
export let config = loadConfig(rawConfig)
/** Catalogue et paramètres de la boutique, validés au chargement. */
export let shop: ShopConfig = loadShopConfig(rawShop)

/**
 * Repose les noms d'âmes, de cercles, de boss, de terrains et d'objets dans la langue
 * demandée. Rien d'autre ne bouge : les nombres sont les mêmes dans toutes les langues, et
 * la validation est refaite pour que la couche de traduction soit contrôlée comme le reste.
 */
export function setConfigLanguage(lang: string): void {
  config = loadConfig(translateRaceConfig(rawConfig, lang))
  shop = loadShopConfig(translateShopConfig(rawShop, lang))
}

export type { RaceConfig } from './schema'
export { loadConfig, ConfigError } from './load'
