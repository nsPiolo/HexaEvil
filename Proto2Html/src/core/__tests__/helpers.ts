/** Montages de test. Chaque test cite la règle du GDD qu'il vérifie. */

import { loadConfig } from '../config/load'
import type { GameConfig, RawConfig } from '../config/schema'
import rawGameplay from '../../../config/gameplay.json'

export function defaultRaw(): RawConfig {
  return JSON.parse(JSON.stringify(rawGameplay)) as RawConfig
}

export function defaultConfig(): GameConfig {
  return loadConfig(defaultRaw()).config
}

/**
 * Montage de la trace de référence (GDD §13) : relief vide pour que tous les
 * Espaces cités soient libres, et `upkeepHeal: 0` pour isoler le combat.
 *
 * Le rayon est **épinglé à 4** : ce montage a ses propres coordonnées et ne doit
 * pas casser quand le rayon du Plateau par défaut change (B1).
 */
export function traceRaw(overrides: Partial<RawConfig> = {}): RawConfig {
  const raw = defaultRaw()
  return {
    ...raw,
    upkeepHeal: 0,
    startingColor: null,
    board: { ...raw.board, radius: 4, blocked: [], symmetricColors: false },
    // Decks minimaux : la trace isole le combat, elle ne doit pas dépendre du
    // mélange germé du Deck complet (D2).
    decks: { player: ['R01', 'R05'], demon: ['V03', 'V01'] },
    setup: [
      { side: 'player', type: 'N00', q: -4, r: 2 },
      { side: 'demon', type: 'N00', q: 4, r: -2 },
      { side: 'demon', type: 'V00', q: 4, r: -1 },
    ],
    ...overrides,
  }
}

export function traceConfig(overrides: Partial<RawConfig> = {}): GameConfig {
  return loadConfig(traceRaw(overrides)).config
}
