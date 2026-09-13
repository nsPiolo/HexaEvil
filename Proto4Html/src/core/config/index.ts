import rawConfig from '../../../config/race.json'
import { loadConfig } from './load'

/** Configuration de la course, validée au chargement du module. */
export const config = loadConfig(rawConfig)
export type { RaceConfig } from './schema'
export { loadConfig, ConfigError } from './load'
