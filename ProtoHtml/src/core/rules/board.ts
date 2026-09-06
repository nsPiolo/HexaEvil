/**
 * Le Plateau : Espaces, Tuiles posées, Accès. Aucune règle de tour ici.
 * GDD §3 (`B1`-`B9`), §5 (`T1`-`T7`), et `D1`-`D5` pour les Accès.
 */
import { isCrossing } from '../config/load'
import { key, neighbor, oppositeAccess, type HexCoord } from '../hex/hexCoord'
import { tileType } from './recipes'
import type { GameConfig, GameState, Owner, Side, TileState, TileTypeId } from './types'

export const tileAt = (state: GameState, coord: HexCoord): TileState | undefined => state.tiles[key(coord)]

export const isOnBoard = (state: GameState, coord: HexCoord): boolean =>
  state.spaces.some((s) => s.q === coord.q && s.r === coord.r)

export const isFree = (state: GameState, coord: HexCoord): boolean =>
  isOnBoard(state, coord) && tileAt(state, coord) === undefined

/** Un Accès est une Entrée dès qu'il n'est pas une Sortie (`D3`). */
export const isEntrance = (tile: TileState, access: number): boolean => !tile.exits.includes(access)

/**
 * `D5` — la destination d'une Sortie, ou `undefined` si le déplacement est
 * impossible : pas de Tuile en face, ou Sortie en face d'une Sortie.
 */
export const destinationThrough = (state: GameState, tile: TileState, exit: number): HexCoord | undefined => {
  const target = neighbor(tile.coord, exit)
  const targetTile = tileAt(state, target)
  if (!targetTile) return undefined
  return isEntrance(targetTile, oppositeAccess(exit)) ? target : undefined
}

/**
 * `D8b` — les Sorties **praticables** : celles qui débouchent réellement sur une
 * Entrée (`D5`). Le tourniquet ne considère qu'elles ; une Sortie qui ne mène
 * nulle part est traitée comme inexistante, et non comme un tour perdu.
 *
 * C'est une propriété de la Tuile, pas de l'entité : le retour en arrière
 * (`D16`) ne rend pas une Sortie impraticable, il tue l'entité qui l'emprunte.
 */
export const practicableExits = (state: GameState, tile: TileState): number[] =>
  tile.exits.filter((exit) => destinationThrough(state, tile, exit) !== undefined)

/** L'entité de `side` peut-elle travailler sur cette Tuile ? (`T2`, `D15`) */
export const isWorkableBy = (tile: TileState, side: Side): boolean =>
  tile.owner === 'neutral' || tile.owner === side

/**
 * `B8`/`B10` — une Sortie ne peut pas déboucher sur une Tuile du camp adverse.
 * Retourne la raison du refus, ou `undefined` si la Sortie est permise.
 */
export const exitRefusal = (
  state: GameState,
  coord: HexCoord,
  owner: Owner,
  exit: number,
): string | undefined => {
  const target = neighbor(coord, exit)
  const targetTile = tileAt(state, target)
  if (!targetTile) return undefined // Espace vide ou hors Plateau : autorisé (D5 tranchera)
  if (isCrossing(owner, targetTile.owner)) {
    return `une Sortie vers (${target.q},${target.r}) ferait entrer le flux dans le réseau adverse (B8)`
  }
  return undefined
}

/** Refus éventuel d'un jeu de Sorties sur une Tuile donnée (`T4`, `B8`). */
export const exitsRefusal = (
  state: GameState,
  coord: HexCoord,
  typeId: TileTypeId,
  owner: Owner,
  exits: readonly number[],
): string | undefined => {
  const type = tileType(state.config, typeId)
  if (new Set(exits).size !== exits.length) return 'la même Sortie est désignée deux fois'
  if (exits.some((e) => e < 0 || e > 5)) return 'Accès hors des 6 côtés de l’hexagone (D1)'
  if (exits.length > type.maxExits) {
    return `« ${type.name} » n’autorise que ${type.maxExits} Sortie(s) (T4)`
  }
  for (const exit of exits) {
    const refusal = exitRefusal(state, coord, owner, exit)
    if (refusal) return refusal
  }
  return undefined
}

/** Tuiles d'apparition d'un camp (`C4`, `X1`). */
export const spawnersOf = (config: GameConfig, state: GameState, side: Side): TileState[] =>
  Object.values(state.tiles).filter((tile) => tileType(config, tile.typeId).spawns === side)

export const emptyTiles = (state: GameState): HexCoord[] => state.spaces.filter((s) => isFree(state, s))

export const entitiesOn = (state: GameState, coord: HexCoord) =>
  state.entities.filter((e) => e.space.q === coord.q && e.space.r === coord.r)

export const countEntitiesOn = (state: GameState, coord: HexCoord, side: Side): number =>
  entitiesOn(state, coord).filter((e) => e.side === side).length
