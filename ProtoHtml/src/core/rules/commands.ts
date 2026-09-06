/**
 * GameCommand — toute action jouable est encapsulée (ADR-0002).
 *
 * Écart assumé par rapport à l'ADR : l'état étant immuable en frontière,
 * `execute` retourne un nouvel état et l'annulation se fait en dépilant
 * l'historique (`presentation/useGame`) plutôt que par un `Undo` par commande.
 * Le rejeu d'une suite de commandes reste possible (`replay`), ce qui est le
 * bénéfice attendu pour déboguer une partie.
 */
import type { HexCoord } from '../hex/hexCoord'
import { directionName } from '../hex/hexCoord'
import { tileType } from './recipes'
import {
  exitChangeRefusal,
  placeTile,
  placementRefusal,
  runRound,
  runTick,
  setExits,
} from './encounter'
import type { GameState, TileTypeId } from './types'

export type GameCommand = Readonly<{
  kind: 'place-tile' | 'set-exits' | 'run-tick' | 'run-round'
  label: string
  /** Raison du refus, ou `undefined` si la commande est jouable. */
  refusal: (state: GameState) => string | undefined
  execute: (state: GameState) => GameState
}>

export const placeTileCommand = (
  coord: HexCoord,
  typeId: TileTypeId,
  exits: readonly number[],
): GameCommand => ({
  kind: 'place-tile',
  label: `Poser ${typeId} en (${coord.q},${coord.r})`,
  refusal: (state) => placementRefusal(state, coord, typeId, exits),
  execute: (state) => placeTile(state, coord, typeId, exits),
})

export const setExitsCommand = (coord: HexCoord, exits: readonly number[]): GameCommand => ({
  kind: 'set-exits',
  label: `Sorties de (${coord.q},${coord.r}) : ${exits.map(directionName).join(', ') || 'aucune'}`,
  refusal: (state) => exitChangeRefusal(state, coord, exits),
  execute: (state) => setExits(state, coord, exits),
})

export const runTickCommand = (): GameCommand => ({
  kind: 'run-tick',
  label: 'Dérouler 1 Tick',
  refusal: (state) => (state.outcome === 'ongoing' ? undefined : 'la Rencontre est terminée'),
  execute: (state) => runTick(state),
})

export const runRoundCommand = (): GameCommand => ({
  kind: 'run-round',
  label: 'Dérouler la Manche',
  refusal: (state) => (state.outcome === 'ongoing' ? undefined : 'la Rencontre est terminée'),
  execute: (state) => runRound(state),
})

/** Nom lisible d'un type de Tuile, pour les libellés d'interface. */
export const tileLabel = (state: GameState, typeId: TileTypeId): string =>
  tileType(state.config, typeId).name

/** Rejoue une suite de commandes depuis un état initial (debug / replay). */
export const replay = (initial: GameState, commands: readonly GameCommand[]): GameState =>
  commands.reduce((state, cmd) => (cmd.refusal(state) === undefined ? cmd.execute(state) : state), initial)
