import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from './load'
import { loadShopConfig } from '../shop/load'

/** Configuration de la course, validée au chargement du module. */
export const config = loadConfig(rawConfig)
/** Catalogue et paramètres de la boutique, validés au chargement. */
export const shop = loadShopConfig(rawShop)
export type { RaceConfig } from './schema'
export { loadConfig, ConfigError } from './load'
