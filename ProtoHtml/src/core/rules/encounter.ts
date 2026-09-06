/**
 * Frontière publique du moteur : **fonctions pures**. Chaque appel clone l'état
 * puis laisse `tick.ts` le faire évoluer en séquence (`C3`), ce qui donne
 * l'annulation par historique et le rejeu sans immutabilité laborieuse.
 *
 * Toutes les valeurs de gameplay viennent de la configuration (`G3`).
 */
import { directionIndex, hex, key, neighbors, type HexCoord } from '../hex/hexCoord'
import { exitsRefusal, isFree, isOnBoard, tileAt } from './board'
import { tileType } from './recipes'
import { runTickInPlace } from './tick'
import type { GameConfig, GameState, Owner, Side, TileState, TileTypeId } from './types'
import { range } from '../hex/hexCoord'

const clone = <T>(value: T): T => structuredClone(value)

/**
 * `C1b` — durée de la Manche `round` (la première vaut 1) : `start` Ticks, plus
 * `step` par tranche de `delay` Manches écoulées, plafonné à `max`.
 */
export const ticksForRound = (config: GameConfig, round: number): number => {
  const { start, max, step, delay } = config.ticksPerRound
  const paliers = Math.floor(Math.max(0, round - 1) / delay)
  return Math.min(max, start + paliers * step)
}

/** `B11` — Espace existant mais fermé à la construction. */
export const isBlocked = (state: GameState, coord: HexCoord): boolean =>
  state.config.board.blocked.some((b) => b.q === coord.q && b.r === coord.r)

/**
 * `B12` — Espaces reliés au `Puits des âmes` par une **chaîne de Tuiles
 * adjacentes**. La chaîne ignore les Sorties : c'est une continuité de terrain,
 * pas un chemin praticable — on peut donc préparer un tracé avant de le brancher.
 * Les Tuiles du démon n'y participent jamais.
 */
export const connectedToSource = (state: GameState): Set<string> => {
  const reached = new Set<string>()
  const queue: HexCoord[] = []
  for (const tile of Object.values(state.tiles)) {
    if (tileType(state.config, tile.typeId).spawns === 'player') {
      reached.add(key(tile.coord))
      queue.push(tile.coord)
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const next of neighbors(current)) {
      const k = key(next)
      if (reached.has(k)) continue
      const tile = state.tiles[k]
      if (!tile || tile.owner === 'demon') continue
      reached.add(k)
      queue.push(next)
    }
  }
  return reached
}

/**
 * `B12` — Espaces où le joueur peut poser : libres, constructibles, et voisins
 * d'une Tuile reliée au `Puits`. Le réseau ne pousse donc qu'à partir de sa
 * source, il n'apparaît pas par îlots.
 */
export const buildableSpaces = (state: GameState): HexCoord[] => {
  const connected = connectedToSource(state)
  return state.spaces.filter(
    (space) =>
      isFree(state, space) &&
      !isBlocked(state, space) &&
      neighbors(space).some((n) => connected.has(key(n))),
  )
}

const emptySpend = () => ({ delivered: 0, blocked: 0, backtrack: 0 })

const createTile = (
  coord: HexCoord,
  typeId: TileTypeId,
  owner: Owner,
  exits: readonly number[],
): TileState => ({
  coord,
  typeId,
  owner,
  exits: [...exits],
  input: {},
  output: {},
  roundRobin: 0,
  productionsDone: 0,
})

/** Monte une Rencontre neuve depuis une configuration validée (`B3`, `B5`, `B6`). */
export const createGame = (config: GameConfig): GameState => {
  const spaces = range(hex(0, 0), config.board.radius)
  const tiles: Record<string, TileState> = {}
  for (const init of config.initialTiles) {
    const coord = hex(init.q, init.r)
    tiles[key(coord)] = createTile(
      coord,
      init.type,
      init.owner,
      init.exits.map(directionIndex),
    )
  }
  return {
    config,
    tick: 0,
    round: 1,
    phase: 'placement',
    ticksLeftInRound: ticksForRound(config, 1),
    spaces,
    tiles,
    entities: [],
    nextEntityId: 1,
    spawned: { player: 0, demon: 0 },
    spent: { player: emptySpend(), demon: emptySpend() },
    progress: 0,
    drain: { applied: 0, absorbed: 0 },
    placedThisRound: false,
    events: [],
    log: [{ tick: 0, side: 'system', text: 'La Rencontre commence : pose ta première Tuile.' }],
    outcome: 'ongoing',
  }
}

/** Refus éventuel d'une pose (`B4`, `C1`, `T6`). `undefined` = pose permise. */
export const placementRefusal = (
  state: GameState,
  coord: HexCoord,
  typeId: TileTypeId,
  exits: readonly number[],
): string | undefined => {
  if (state.phase !== 'placement') return 'la pose n’est possible que pendant la phase de pose (C1)'
  if (state.placedThisRound) return 'une seule Tuile par Manche (C1)'
  if (!state.config.catalog.includes(typeId)) return `« ${typeId} » n’est pas au catalogue posable (T7)`
  if (!isOnBoard(state, coord)) return `l’Espace (${coord.q},${coord.r}) est hors du Plateau`
  if (!isFree(state, coord)) return `l’Espace (${coord.q},${coord.r}) est déjà occupé (B4)`
  if (isBlocked(state, coord)) return `l’Espace (${coord.q},${coord.r}) n’est pas constructible (B11)`
  if (!neighbors(coord).some((n) => connectedToSource(state).has(key(n)))) {
    return `l’Espace (${coord.q},${coord.r}) n’est relié au Puits des âmes par aucune chaîne de Tuiles (B12)`
  }
  return exitsRefusal(state, coord, typeId, 'player', exits)
}

/** Pose une Tuile du joueur (`T5`, `T6`). Retourne un nouvel état, ou l'ancien si refusée. */
export const placeTile = (
  state: GameState,
  coord: HexCoord,
  typeId: TileTypeId,
  exits: readonly number[],
): GameState => {
  if (placementRefusal(state, coord, typeId, exits) !== undefined) return state
  const next = clone(state)
  next.tiles[key(coord)] = createTile(coord, typeId, 'player', exits)
  next.placedThisRound = true
  next.log.push({
    tick: next.tick,
    side: 'player',
    text: `Pose de « ${tileType(next.config, typeId).name} » en (${coord.q},${coord.r}).`,
  })
  return next
}

/**
 * Refus éventuel du **droit** de reconfigurer les Sorties d'une Tuile (`T5`,
 * `T8`), indépendamment des Sorties visées. C'est ce que l'interface interroge
 * pour savoir si elle peut proposer l'édition (`U12`).
 */
export const exitEditRefusal = (state: GameState, coord: HexCoord): string | undefined => {
  if (state.phase !== 'placement') return 'les Sorties ne se règlent que pendant la phase de pose (T5)'
  const tile = tileAt(state, coord)
  if (!tile) return `aucune Tuile en (${coord.q},${coord.r})`
  if (tile.owner !== 'player') return 'seules les Tuiles du joueur sont reconfigurables (T5)'
  const type = tileType(state.config, tile.typeId)
  if (type.fixedExits === true) {
    return `les Sorties de « ${type.name} » sont fixées par la configuration (T8)`
  }
  if (type.maxExits === 0) return `« ${type.name} » n’admet aucune Sortie (T4)`
  return undefined
}

/** Refus éventuel d'une reconfiguration de Sorties (`T5`, `T8`, `B8`). */
export const exitChangeRefusal = (
  state: GameState,
  coord: HexCoord,
  exits: readonly number[],
): string | undefined => {
  const refusal = exitEditRefusal(state, coord)
  if (refusal !== undefined) return refusal
  const tile = tileAt(state, coord)!
  return exitsRefusal(state, coord, tile.typeId, tile.owner, exits)
}

/**
 * `T5` — reconfiguration libre et sans coût des Sorties d'une Tuile du joueur,
 * pendant n'importe quelle phase de pose.
 */
export const setExits = (state: GameState, coord: HexCoord, exits: readonly number[]): GameState => {
  if (exitChangeRefusal(state, coord, exits) !== undefined) return state
  const next = clone(state)
  const tile = next.tiles[key(coord)]!
  tile.exits = [...exits]
  tile.roundRobin = 0
  return next
}

/** Passe de la phase de pose au déroulé des Ticks (`C6`). */
export const startRound = (state: GameState): GameState => {
  if (state.phase !== 'placement') return state
  const next = clone(state)
  next.phase = 'running'
  next.ticksLeftInRound = ticksForRound(next.config, next.round)
  return next
}

/** Un Tick (`C2`). Sert aussi au pas-à-pas de l'interface (`U5`). */
export const runTick = (state: GameState): GameState => {
  if (state.outcome !== 'ongoing') return state
  const next = clone(state)
  if (next.phase === 'placement') {
    next.phase = 'running'
    next.ticksLeftInRound = ticksForRound(next.config, next.round)
  }
  runTickInPlace(next)
  next.ticksLeftInRound -= 1
  if (next.outcome === 'ongoing' && next.ticksLeftInRound <= 0) {
    next.phase = 'placement'
    next.round += 1
    next.ticksLeftInRound = ticksForRound(next.config, next.round)
    next.placedThisRound = false
  }
  return next
}

/** Les N Ticks d'une Manche d'un coup (`C1`). */
export const runRound = (state: GameState): GameState => {
  let next = startRound(state)
  // Le budget vient de `startRound` : pas de recalcul qui pourrait diverger.
  let guard = next.ticksLeftInRound
  while (next.phase === 'running' && next.outcome === 'ongoing' && guard-- > 0) {
    next = runTick(next)
  }
  return next
}

/** Progression par Âme dépensée — l'indicateur central du proto (`K3`). */
export const progressPerSoulSpent = (state: GameState): number => {
  const spent = totalSpent(state, 'player')
  return spent === 0 ? 0 : state.progress / spent
}

export const totalSpent = (state: GameState, side: Side): number => {
  const s = state.spent[side]
  return s.delivered + s.blocked + s.backtrack
}

export const livingEntities = (state: GameState, side: Side): number =>
  state.entities.filter((e) => e.side === side).length

export const reserveLeft = (state: GameState, side: Side): number =>
  (side === 'player' ? state.config.soulBudget : state.config.minionBudget) - state.spawned[side]
