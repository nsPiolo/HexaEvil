/**
 * Montage, tour de jeu et fin de partie — règles A1..A5, C7..C12, D1..D6,
 * F13, W1..W5.
 *
 * Séquence d'un tour (A3) : entretien → ouverture → pose → bonus de pose →
 * effets → résolution → clôture.
 */

import { hexKey, hexesInRadius, neighbors } from '../hex/hexCoord'
import { forceChanges, resolveDestruction, resolvePlacement } from './combat'
import { placementBonusAt, viewBoard } from './derived'
import { buildBoard } from './board'
import { createRng, type Rng } from './random'
import { opposite } from './relations'
import { suppliedUids } from './supply'
import { ALL_COLORS, PLAYING_SIDES } from './types'
import type { GameConfig } from '../config/schema'
import type {
  ColorId,
  GameOutcome,
  GameState,
  LogEntry,
  PlacedTile,
  PlayingSide,
  ResolutionStep,
} from './types'
import type { HexCoord } from '../hex/hexCoord'

export interface Move {
  readonly typeId: string
  readonly at: HexCoord
}

function emptyDecks(): Record<ColorId, string[]> {
  return { red: [], blue: [], green: [], black: [], yellow: [] }
}

/** D1, D2 : partition par Couleur puis mélange germé de chaque pile. */
function buildDecks(config: GameConfig, rng: Rng): GameState['decks'] {
  const out = {} as Record<PlayingSide, Record<ColorId, string[]>>
  for (const side of PLAYING_SIDES) {
    const piles = emptyDecks()
    for (const id of config.decks[side]) {
      const def = config.tileTypes.get(id)
      if (!def) throw new Error(`Type inconnu dans le Deck ${side} : « ${id} »`)
      piles[def.color].push(id)
    }
    for (const color of ALL_COLORS) rng.shuffle(piles[color])
    out[side] = piles
  }
  return out as GameState['decks']
}

export function setupGame(config: GameConfig): GameState {
  const rng = createRng(config.seed)
  const spaces = buildBoard(config, rng)

  let uid = 1
  const tiles: PlacedTile[] = config.setup.map((entry) => ({
    uid: uid++,
    typeId: entry.type,
    side: entry.side,
    at: { q: entry.q, r: entry.r },
    // Les Tuiles pré-posées n'ont pas de bonus de pose : elles font partie de l'énoncé.
    placementBonus: 0,
    damage: 0,
    grantedShields: config.tileTypes.get(entry.type)?.shields ?? 0,
  }))

  return {
    turn: 1,
    round: 1,
    activeSide: config.firstPlayer,
    imposedColor: config.startingColor,
    spaces,
    tiles,
    decks: buildDecks(config, rng),
    consecutivePasses: 0,
    outcome: null,
    nextUid: uid,
    log: [],
    lastResolution: null,
  }
}

/** Options de `playMove` / `applyUpkeep`. */
export interface PlayOptions {
  /**
   * Produit la trace d'étapes pour l'affichage (`U16`). Par défaut `false` :
   * l'IA simule des milliers de poses par partie et ne doit pas payer la
   * construction des instantanés.
   */
  readonly trace?: boolean
}

/** D3 : la main est le sommet du Deck de la Couleur imposée. */
export function handOf(config: GameConfig, state: GameState, side: PlayingSide): string[] {
  const color = state.imposedColor
  if (color === null) {
    // C9 : premier tour libre — on montre le sommet de chaque Couleur active.
    return config.activeColors.flatMap((c) => state.decks[side][c].slice(0, config.handSize))
  }
  return [...state.decks[side][color].slice(0, config.handSize)]
}

export function freeSpaceKeys(state: GameState): string[] {
  const occupied = new Set(state.tiles.map((t) => hexKey(t.at)))
  return state.spaces.filter((s) => !s.blocked && !occupied.has(hexKey(s.at))).map((s) => hexKey(s.at))
}

/** A4 : aucune contrainte d'adjacence — toute case vide est posable. */
export function legalMoves(config: GameConfig, state: GameState, side: PlayingSide): Move[] {
  if (state.outcome) return []
  const hand = [...new Set(handOf(config, state, side))]
  const keys = freeSpaceKeys(state)
  const moves: Move[] = []
  for (const typeId of hand) {
    for (const key of keys) {
      const [q, r] = key.split(',').map(Number)
      moves.push({ typeId, at: { q: q as number, r: r as number } })
    }
  }
  return moves
}

export type PassReason = 'noColorTile' | 'noFreeSpace'

/** A5 : pourquoi le camp actif ne peut pas poser, ou `null` s'il peut. */
export function passReason(config: GameConfig, state: GameState, side: PlayingSide): PassReason | null {
  if (freeSpaceKeys(state).length === 0) return 'noFreeSpace'
  if (handOf(config, state, side).length === 0) return 'noColorTile'
  return null
}

/**
 * F13 : entretien. Les Tuiles ravitaillées (F14) du camp actif seulement voient
 * leurs dégâts réduits de `upkeepHeal`, borné à 0. Aucun contrôle de
 * destruction : le soin ne peut que réduire les dégâts. Le soin n'est pas un
 * effet de Tuile, `N01` ne l'annule donc pas (E7).
 */
export function applyUpkeep(config: GameConfig, state: GameState, opts: PlayOptions = {}): GameState {
  if (config.upkeepHeal <= 0) return state
  const view = viewBoard(config, state.tiles)
  const supplied = suppliedUids(view, state.tiles, state.activeSide)
  const healed: { uid: number; typeId: string; amount: number }[] = []

  const tiles = state.tiles.map((t) => {
    if (t.side !== state.activeSide || !supplied.has(t.uid) || t.damage === 0) return t
    // §14 levier 2 : réglage de mesure, le Roi peut être exclu du soin.
    if (!config.upkeepHealsKing && view.defOf(t).role === 'king') return t
    const amount = Math.min(config.upkeepHeal, t.damage)
    healed.push({ uid: t.uid, typeId: t.typeId, amount })
    return { ...t, damage: t.damage - amount }
  })

  if (healed.length === 0) return { ...state, tiles, lastResolution: null }
  const entry: LogEntry = { turn: state.turn, kind: 'upkeep', side: state.activeSide, healed }

  const steps: ResolutionStep[] = opts.trace
    ? [
        {
          kind: 'heal',
          label: `Entretien : ${healed.length} Tuile(s) ravitaillée(s) récupèrent ${config.upkeepHeal} force (F13, F14).`,
          tiles,
          spaces: state.spaces,
          changes: forceChanges(config, state.tiles, tiles),
          destroyed: [],
          focusUid: null,
        },
      ]
    : []

  return {
    ...state,
    tiles,
    log: [...state.log, entry],
    lastResolution: steps.length > 0 ? { turn: state.turn, steps } : null,
  }
}

/** W1..W5 : conditions de fin, évaluées en clôture de tour. */
function evaluateOutcome(config: GameConfig, state: GameState, activeSide: PlayingSide): GameOutcome | null {
  const view = viewBoard(config, state.tiles)
  const kingAlive: Record<PlayingSide, boolean> = { player: false, demon: false }
  for (const t of state.tiles) {
    if (t.side !== 'neutral' && view.defOf(t).role === 'king') kingAlive[t.side as PlayingSide] = true
  }

  // W1 / W5 : Roi détruit. Si les deux tombent, le camp actif gagne.
  if (!kingAlive.player && !kingAlive.demon) return { cause: 'kingDestroyed', winner: activeSide }
  if (!kingAlive.player) return { cause: 'kingDestroyed', winner: 'demon' }
  if (!kingAlive.demon) return { cause: 'kingDestroyed', winner: 'player' }

  // W3 : plus aucun Espace libre.
  if (freeSpaceKeys(state).length === 0) return { cause: 'boardFull', winner: tieBreak(config, state) }
  // W2 : deux passes consécutives.
  if (state.consecutivePasses >= 2) return { cause: 'twoPasses', winner: tieBreak(config, state) }
  return null
}

/** W4 : départage sur la force restante du Roi ; égalité = match nul. */
function tieBreak(config: GameConfig, state: GameState): PlayingSide | null {
  const view = viewBoard(config, state.tiles)
  const forceOfKing = (side: PlayingSide): number => {
    const king = state.tiles.find((t) => t.side === side && view.defOf(t).role === 'king')
    return king ? view.forceOf(king) : -Infinity
  }
  const p = forceOfKing('player')
  const d = forceOfKing('demon')
  if (p === d) return null
  return p > d ? 'player' : 'demon'
}

function advance(state: GameState, outcome: GameOutcome | null): GameState {
  if (outcome) return { ...state, outcome }
  const next = opposite(state.activeSide)
  return {
    ...state,
    turn: state.turn + 1,
    round: next === state.activeSide ? state.round : Math.floor(state.turn / 2) + 1,
    activeSide: next,
  }
}

/** A3 étapes 3 à 7 : pose une Tuile et clôt le tour. */
export function playMove(
  config: GameConfig,
  state: GameState,
  move: Move,
  opts: PlayOptions = {},
): GameState {
  if (state.outcome) return state
  const key = hexKey(move.at)
  const space = state.spaces.find((s) => hexKey(s.at) === key)
  if (!space) throw new Error(`Pose hors Plateau : (${move.at.q},${move.at.r})`)
  if (space.blocked) throw new Error(`Pose sur un Espace bloqué : (${move.at.q},${move.at.r})`)
  if (state.tiles.some((t) => hexKey(t.at) === key)) throw new Error(`Espace déjà occupé : (${move.at.q},${move.at.r})`)

  const def = config.tileTypes.get(move.typeId)
  if (!def) throw new Error(`Type inconnu : « ${move.typeId} »`)
  if (state.imposedColor !== null && def.color !== state.imposedColor) {
    throw new Error(`Couleur imposée non respectée : ${move.typeId} est ${def.color}, il faut du ${state.imposedColor}`)
  }
  if (!handOf(config, state, state.activeSide).includes(move.typeId)) {
    throw new Error(`« ${move.typeId} » n'est pas dans la main du camp ${state.activeSide} (D3)`)
  }

  const side = state.activeSide
  const log: LogEntry[] = [...state.log]

  // Retrait de la Tuile du sommet de son Deck (D3, D4).
  const decks = { ...state.decks, [side]: { ...state.decks[side] } } as GameState['decks']
  const pile = [...decks[side][def.color]]
  const idx = pile.indexOf(move.typeId)
  if (idx >= 0) pile.splice(idx, 1)
  ;(decks[side] as Record<ColorId, readonly string[]>)[def.color] = pile

  // F3 : bonus de pose, figé.
  const view = viewBoard(config, state.tiles)
  const placementBonus = placementBonusAt(view, side, move.at)
  const placed: PlacedTile = {
    uid: state.nextUid,
    typeId: move.typeId,
    side,
    at: move.at,
    placementBonus,
    damage: 0,
    grantedShields: def.shields,
  }
  log.push({ turn: state.turn, kind: 'place', side, typeId: move.typeId, at: move.at, placementBonus })

  const withPlaced = [...state.tiles, placed]
  const resolution = resolvePlacement(config, withPlaced, state.spaces, placed.uid, state.turn, opts.trace === true)
  log.push(...resolution.log)

  // C7 : la Couleur de l'Espace occupé devient la Couleur imposée à l'adversaire.
  const occupiedSpace = resolution.spaces.find((s) => hexKey(s.at) === key)
  const imposedColor = occupiedSpace?.color ?? state.imposedColor
  const enemy = opposite(side)
  const starves = imposedColor !== null && (decks[enemy][imposedColor]?.length ?? 0) === 0
  if (imposedColor !== null) {
    log.push({ turn: state.turn, kind: 'imposed', color: imposedColor, starves })
  }

  const next: GameState = {
    ...state,
    spaces: resolution.spaces,
    tiles: resolution.tiles,
    decks,
    imposedColor,
    consecutivePasses: 0,
    nextUid: state.nextUid + 1,
    log,
    lastResolution: resolution.steps.length > 0 ? { turn: state.turn, steps: resolution.steps } : null,
  }
  const outcome = evaluateOutcome(config, next, side)
  if (outcome) log.push({ turn: state.turn, kind: 'end', text: describeOutcome(outcome) })
  return advance({ ...next, log }, outcome)
}

/**
 * A5 : passe. C12 — la Couleur imposée PERSISTE à travers la passe et s'impose
 * au camp suivant : elle ne se libère jamais après le premier tour.
 */
export function playPass(config: GameConfig, state: GameState, reason: PassReason): GameState {
  if (state.outcome) return state
  const log: LogEntry[] = [...state.log, { turn: state.turn, kind: 'pass', side: state.activeSide, reason }]
  const next: GameState = { ...state, consecutivePasses: state.consecutivePasses + 1, log, lastResolution: null }
  const outcome = evaluateOutcome(config, next, state.activeSide)
  if (outcome) log.push({ turn: state.turn, kind: 'end', text: describeOutcome(outcome) })
  return advance({ ...next, log }, outcome)
}

export function describeOutcome(outcome: GameOutcome): string {
  const who = outcome.winner === null ? 'match nul' : `victoire de ${outcome.winner}`
  switch (outcome.cause) {
    case 'kingDestroyed':
      return `Roi détruit (W1) — ${who}.`
    case 'twoPasses':
      return `Deux passes consécutives (W2) — départage sur la force du Roi (W4) : ${who}.`
    case 'boardFull':
      return `Plateau plein (W3) — départage sur la force du Roi (W4) : ${who}.`
  }
}

/** Ouverture de tour : entretien (F13), puis constat de passe éventuelle. */
export function openTurn(config: GameConfig, state: GameState, opts: PlayOptions = {}): GameState {
  if (state.outcome) return state
  return applyUpkeep(config, state, opts)
}

export { resolveDestruction, hexesInRadius, neighbors }
