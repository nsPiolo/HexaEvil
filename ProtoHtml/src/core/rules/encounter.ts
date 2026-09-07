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
import { nextIndex, randomSeed } from './random'
import { runTickInPlace } from './tick'
import type {
  GameConfig,
  GameState,
  Owner,
  RoundAction,
  Side,
  TileState,
  TileTypeId,
} from './types'
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

/**
 * `A2`, `A8` — retire une Tuile **au hasard** de la pioche et la rend. La pioche
 * est un sac : l'ordre de la liste de configuration n'a aucune importance.
 */
const takeFromDeck = (state: GameState): TileTypeId | undefined => {
  if (state.deck.length === 0) return undefined
  const [drawn] = state.deck.splice(nextIndex(state, state.deck.length), 1)
  return drawn
}

/**
 * `A7` — pioche automatique à l'ouverture du tour du joueur. Elle ne dépense
 * **pas** l'action de la Manche (`A1`) : sans ça, un tour sur deux servirait à
 * se réapprovisionner. Elle est simplement sautée si la pioche est vide ou la
 * main pleine (`A3`).
 */
const autoDraw = (state: GameState): void => {
  if (state.deck.length === 0) return
  if (state.hand.length >= state.config.handMax) return
  const drawn = takeFromDeck(state)!
  state.hand.push(drawn)
  state.log.push({
    tick: state.tick,
    side: 'player',
    text:
      `Pioche automatique : « ${tileType(state.config, drawn).name} » ` +
      `(${state.deck.length} restantes).`,
  })
}

/** Monte une Rencontre neuve depuis une configuration validée (`B3`, `B5`, `B6`). */
export const createGame = (config: GameConfig): GameState => {
  const state = createGameState(config)
  // La main de départ est tirée au hasard elle aussi (`A3`, `A8`).
  for (let i = 0; i < config.handStart; i++) {
    const drawn = takeFromDeck(state)
    if (drawn === undefined) break
    state.hand.push(drawn)
  }
  autoDraw(state) // A7 — le premier tour s'ouvre comme les autres
  return state
}

const createGameState = (config: GameConfig): GameState => {
  const seed = config.seed ?? randomSeed()
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
    deck: [...config.deck],
    hand: [],
    seed,
    rngState: seed,
    events: [],
    log: [{ tick: 0, side: 'system', text: 'La Rencontre commence : pose ta première Tuile.' }],
    outcome: 'ongoing',
  }
}

/**
 * `A1` — refus éventuel de dépenser l'action de la Manche. Commun aux quatre
 * actions : c'est ce qui garantit qu'on n'en fait qu'une.
 */
export const actionRefusal = (state: GameState): string | undefined => {
  if (state.outcome !== 'ongoing') return 'la Rencontre est terminée'
  if (state.phase !== 'placement') return 'les actions se jouent pendant la phase de pose (C1)'
  if (state.action !== undefined) return `action déjà dépensée cette Manche (${state.action}) (A1)`
  return undefined
}

/** Refus éventuel d'une pose (`A1`, `A2`, `B4`). `undefined` = pose permise. */
export const placementRefusal = (
  state: GameState,
  coord: HexCoord,
  typeId: TileTypeId,
  exits: readonly number[],
): string | undefined => {
  const busy = actionRefusal(state)
  if (busy !== undefined) return busy
  if (!state.hand.includes(typeId)) return `« ${typeId} » n’est pas dans ta main (A2)`
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
  next.hand.splice(next.hand.indexOf(typeId), 1) // la Tuile quitte la main (A2)
  next.action = 'place'
  next.log.push({
    tick: next.tick,
    side: 'player',
    text: `Pose de « ${tileType(next.config, typeId).name} » en (${coord.q},${coord.r}).`,
  })
  return next
}

/** `A2` — refus éventuel d'une pioche. */
export const drawRefusal = (state: GameState): string | undefined => {
  const busy = actionRefusal(state)
  if (busy !== undefined) return busy
  if (state.deck.length === 0) return 'la pioche est vide (A2)'
  if (state.hand.length >= state.config.handMax) {
    return `main pleine : ${state.config.handMax} Tuiles au maximum (A3)`
  }
  return undefined
}

/** `A2` — pioche la Tuile du dessus. Dépense l'action de la Manche. */
export const drawTile = (state: GameState): GameState => {
  if (drawRefusal(state) !== undefined) return state
  const next = clone(state)
  const drawn = takeFromDeck(next)!
  next.hand.push(drawn)
  next.action = 'draw'
  next.log.push({
    tick: next.tick,
    side: 'player',
    text: `Pioche de « ${tileType(next.config, drawn).name} » (${next.deck.length} restantes).`,
  })
  return next
}

/** `A4` — refus éventuel d'un déplacement de Tuile posée. */
export const moveRefusal = (state: GameState, from: HexCoord, to: HexCoord): string | undefined => {
  const busy = actionRefusal(state)
  if (busy !== undefined) return busy
  const tile = tileAt(state, from)
  if (!tile) return `aucune Tuile en (${from.q},${from.r})`
  if (tile.owner !== 'player') return 'seules les Tuiles du joueur se déplacent (A4)'
  if (tileType(state.config, tile.typeId).fixedExits === true) {
    return `« ${tileType(state.config, tile.typeId).name} » fait partie du terrain (T8)`
  }
  if (key(from) === key(to)) return 'la Tuile est déjà là'

  // Un déplacement, c'est reprendre la Tuile puis la reposer : la destination
  // s'évalue donc sur un Plateau **privé** de cette Tuile.
  const lifted = clone(state)
  delete lifted.tiles[key(from)]
  if (!isOnBoard(lifted, to)) return `l'Espace (${to.q},${to.r}) est hors du Plateau`
  if (!isFree(lifted, to)) return `l'Espace (${to.q},${to.r}) est déjà occupé (B4)`
  if (isBlocked(lifted, to)) return `l'Espace (${to.q},${to.r}) n'est pas constructible (B11)`
  if (!neighbors(to).some((n) => connectedToSource(lifted).has(key(n)))) {
    return `l'Espace (${to.q},${to.r}) n'est relié au Puits des âmes par aucune chaîne de Tuiles (B12)`
  }
  return exitsRefusal(lifted, to, tile.typeId, 'player', tile.exits)
}

/**
 * `A4` — déplace une Tuile posée, avec ses réserves. Les entités qui s'y
 * trouvaient **perdent pied et sont détruites** : déplacer un Bâtiment, c'est le
 * démonter, pas le faire glisser avec ses ouvriers.
 */
export const moveTile = (state: GameState, from: HexCoord, to: HexCoord): GameState => {
  if (moveRefusal(state, from, to) !== undefined) return state
  const next = clone(state)
  const tile = next.tiles[key(from)]!
  delete next.tiles[key(from)]
  tile.coord = to
  tile.roundRobin = 0
  next.tiles[key(to)] = tile

  const stranded = next.entities.filter((e) => key(e.space) === key(from))
  for (const entity of stranded) {
    next.entities = next.entities.filter((e) => e.id !== entity.id)
    next.spent[entity.side].blocked += 1
  }
  next.action = 'move'
  next.log.push({
    tick: next.tick,
    side: 'player',
    text:
      `Déplacement de « ${tileType(next.config, tile.typeId).name} » ` +
      `(${from.q},${from.r}) → (${to.q},${to.r})` +
      (stranded.length > 0 ? `, ${stranded.length} entité(s) perdue(s)` : '') +
      '.',
  })
  return next
}

/** `A5` — passer son tour : l'action est dépensée sans rien faire. */
export const passRefusal = (state: GameState): string | undefined => actionRefusal(state)

export const passTurn = (state: GameState): GameState => {
  if (passRefusal(state) !== undefined) return state
  const next = clone(state)
  next.action = 'pass'
  next.log.push({ tick: next.tick, side: 'player', text: 'Le joueur passe son tour.' })
  return next
}

/** Les actions encore jouables, pour l'interface (`A1`). */
export const availableActions = (state: GameState): RoundAction[] => {
  if (actionRefusal(state) !== undefined) return []
  const actions: RoundAction[] = []
  if (state.hand.length > 0) actions.push('place')
  if (drawRefusal(state) === undefined) actions.push('draw')
  actions.push('move', 'pass')
  return actions
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
    next.action = undefined
    autoDraw(next) // A7 — le tour du joueur s'ouvre par une pioche
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

/** Entités apparues depuis le début de la Rencontre (`K1`). */
export const spawnedCount = (state: GameState, side: Side): number => state.spawned[side]
