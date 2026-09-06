/**
 * Utilitaires de test : les tests partent du **vrai** fichier de configuration
 * (`config/gameplay.json`) et n'en surchargent que le Plateau et les réserves.
 * Une régression dans la configuration livrée fait donc échouer les tests.
 */
import rawConfig from '../../../config/gameplay.json'
import { parseConfig } from '../config/load'
import { hex, key, type HexCoord } from '../hex/hexCoord'
import { createGame } from '../rules/encounter'
import type { GameConfig, GameState, ResourceId, Side, TileState } from '../rules/types'

export const rawGameplay = (): Record<string, unknown> =>
  structuredClone(rawConfig) as unknown as Record<string, unknown>

export const buildConfig = (overrides: Record<string, unknown> = {}): GameConfig =>
  parseConfig({ ...rawGameplay(), ...overrides })

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

/** Sème une Ressource dans une réserve, pour tester une règle en isolation. */
export const seedInput = (state: GameState, coord: HexCoord, stock: Record<ResourceId, number>): void => {
  Object.assign(tile(state, coord).input, stock)
}

export const seedOutput = (state: GameState, coord: HexCoord, stock: Record<ResourceId, number>): void => {
  Object.assign(tile(state, coord).output, stock)
}

export const at = hex
