/**
 * Utilitaires de test : les tests partent du **vrai** fichier de configuration
 * (`config/gameplay.json`) et n'en surchargent que le Plateau et les réserves.
 * Une régression dans la configuration livrée fait donc échouer les tests.
 */
import rawConfig from '../../../config/gameplay.json'
import { parseConfig } from '../config/load'
import { hex, key, type HexCoord } from '../hex/hexCoord'
import { createGame } from '../rules/encounter'
import type { EntityState, GameConfig, GameState, ResourceId, Side, TileState } from '../rules/types'

export const rawGameplay = (): Record<string, unknown> =>
  structuredClone(rawConfig) as unknown as Record<string, unknown>

export const buildConfig = (overrides: Record<string, unknown> = {}): GameConfig =>
  parseConfig({ ...rawGameplay(), ...overrides })

/**
 * Disposition de référence du GDD `B7b`, avec les recettes et budgets livrés.
 * Les tests l'utilisent au lieu de la disposition du fichier : le terrain est ce
 * qu'on manipule le plus en réglant, et un terrain en cours d'édition ne doit
 * pas faire rougir toute la suite. La validité du fichier livré est vérifiée
 * par un test dédié (`config.test.ts`).
 */
export const referenceConfig = (): GameConfig =>
  buildConfig({
    board: { radius: 3 },
    initialTiles: [
      { q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
      { q: 3, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      { q: 2, r: 0, type: 'empty', owner: 'demon', exits: ['W'] },
      { q: 1, r: 0, type: 'empty', owner: 'demon', exits: ['W'] },
      { q: -3, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
    ],
  })

/**
 * Main garantie : le sac contient exactement `tiles` et tout est distribué, donc
 * le tirage aléatoire (`A8`) n'a aucune prise. À utiliser dès qu'un test doit
 * poser une Tuile précise.
 */
export const withHand = (tiles: readonly string[]): Record<string, unknown> => ({
  deck: [...tiles],
  handMax: Math.max(1, tiles.length),
  handStart: tiles.length,
  seed: 1,
})

/**
 * Surcharge les Recettes d'un type de Tuile. Les tests de comportement moteur
 * (trace de référence, événements) épinglent ainsi leurs propres valeurs : le
 * réglage des recettes livrées peut bouger sans les invalider.
 */
export const withRecipes = (typeId: string, recipes: unknown[]): Record<string, unknown> => ({
  tileTypes: (rawGameplay().tileTypes as { id: string }[]).map((t) =>
    t.id === typeId ? { ...t, recipes } : t,
  ),
})

/** Une Rencontre dont on maîtrise entièrement la disposition. */
export const buildGame = (overrides: Record<string, unknown> = {}): GameState =>
  createGame(buildConfig({ minionBudget: 0, ...overrides }))

export const tile = (state: GameState, coord: HexCoord): TileState => {
  const t = state.tiles[key(coord)]
  if (!t) throw new Error(`Pas de Tuile en (${coord.q},${coord.r})`)
  return t
}

export const entityIds = (state: GameState, side: Side = 'player'): number[] =>
  state.entities.filter((e) => e.side === side).map((e) => e.id).sort((a, b) => a - b)

export const entity = (state: GameState, id: number) => {
  const e = state.entities.find((x) => x.id === id)
  if (!e) throw new Error(`Entité #${id} absente (détruite ?)`)
  return e
}

export const isAlive = (state: GameState, id: number): boolean =>
  state.entities.some((e) => e.id === id)

/**
 * Place une entité à la main sur un Espace, sans passer par une Tuile
 * d'apparition. Les apparitions étant illimitées (`C5`), c'est la seule façon
 * d'isoler **une** entité pour tester une règle de production ou de
 * déplacement : un `Puits` en ferait naître une par Tick.
 */
export const injectEntity = (
  state: GameState,
  coord: HexCoord,
  side: Side = 'player',
): EntityState => {
  const entity: EntityState = {
    id: state.nextEntityId++,
    side,
    space: coord,
    visited: [key(coord)],
    producedHere: false,
  }
  state.entities.push(entity)
  state.spawned[side] += 1
  return entity
}

/** Sème une Ressource dans une réserve, pour tester une règle en isolation. */
export const seedInput = (state: GameState, coord: HexCoord, stock: Record<ResourceId, number>): void => {
  Object.assign(tile(state, coord).input, stock)
}

export const seedOutput = (state: GameState, coord: HexCoord, stock: Record<ResourceId, number>): void => {
  Object.assign(tile(state, coord).output, stock)
}

export const at = hex
