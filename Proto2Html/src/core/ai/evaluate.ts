/**
 * Barème de l'IA — règles I4, I5, I5b, I6, I7.
 *
 * Chaque pose possible est simulée entièrement (le moteur, pas une
 * approximation) et comparée à l'état d'avant. Le critère « dégâts sur les
 * Tuiles adverses » du brouillon a été retiré : il faisait doublon avec le
 * delta de force adverse, plus complet (Q10).
 */

import { viewBoard } from '../rules/derived'
import { legalMoves, playMove, type Move } from '../rules/game'
import { opposite } from '../rules/relations'
import { suppliedUids } from '../rules/supply'
import type { GameConfig } from '../config/schema'
import type { Rng } from '../rules/random'
import type { GameState, PlayingSide } from '../rules/types'

export interface Measures {
  readonly enemyKingDamage: number
  readonly enemyTilesKilled: number
  readonly enemyForceDelta: number
  readonly enemySupplyCut: number
  readonly ownKingDamage: number
  readonly ownTilesLost: number
  readonly shieldsGained: number
  readonly ownForceDelta: number
  readonly ownTileSupplied: number
  readonly offeredColor: number
  readonly winsNow: boolean
  readonly losesNow: boolean
}

export interface ScoredMove {
  readonly move: Move
  readonly score: number
  readonly attack: number
  readonly defense: number
  readonly measures: Measures
}

interface Snapshot {
  readonly kingForce: Record<PlayingSide, number>
  readonly totalForce: Record<PlayingSide, number>
  readonly tileCount: Record<PlayingSide, number>
  readonly shields: Record<PlayingSide, number>
  readonly supplied: Record<PlayingSide, number>
  readonly kingAlive: Record<PlayingSide, boolean>
}

function snapshot(config: GameConfig, state: GameState): Snapshot {
  const view = viewBoard(config, state.tiles)
  const kingForce = { player: 0, demon: 0 }
  const totalForce = { player: 0, demon: 0 }
  const tileCount = { player: 0, demon: 0 }
  const shields = { player: 0, demon: 0 }
  const kingAlive = { player: false, demon: false }
  for (const t of state.tiles) {
    if (t.side === 'neutral') continue
    const side = t.side as PlayingSide
    totalForce[side] += view.forceOf(t)
    tileCount[side] += 1
    shields[side] += view.shieldsOf(t)
    if (view.defOf(t).role === 'king') {
      kingForce[side] = view.forceOf(t)
      kingAlive[side] = true
    }
  }
  const supplied = {
    player: suppliedUids(view, state.tiles, 'player').size,
    demon: suppliedUids(view, state.tiles, 'demon').size,
  }
  return { kingForce, totalForce, tileCount, shields, supplied, kingAlive }
}

function measure(config: GameConfig, before: Snapshot, after: GameState, side: PlayingSide, placedUid: number): Measures {
  const enemy = opposite(side)
  const post = snapshot(config, after)
  const view = viewBoard(config, after.tiles)
  const placed = view.byUid.get(placedUid)
  const suppliedOwn = suppliedUids(view, after.tiles, side)

  return {
    enemyKingDamage: Math.max(0, before.kingForce[enemy] - post.kingForce[enemy]),
    enemyTilesKilled: Math.max(0, before.tileCount[enemy] - post.tileCount[enemy]),
    enemyForceDelta: post.totalForce[enemy] - before.totalForce[enemy],
    // I5b : couper la chaîne adverse est un gain qui ne passe pas par les dégâts (F14).
    enemySupplyCut: Math.max(0, before.supplied[enemy] - post.supplied[enemy]),
    ownKingDamage: Math.max(0, before.kingForce[side] - post.kingForce[side]),
    ownTilesLost: Math.max(0, before.tileCount[side] + 1 - post.tileCount[side]),
    shieldsGained: post.shields[side] - before.shields[side],
    ownForceDelta: post.totalForce[side] - before.totalForce[side],
    // I5b : une Tuile non ravitaillée ne se soignera jamais (F13).
    ownTileSupplied: placed && suppliedOwn.has(placed.uid) ? 1 : 0,
    offeredColor: 0,
    winsNow: !post.kingAlive[enemy],
    losesNow: !post.kingAlive[side],
  }
}

/**
 * I7 : la Couleur offerte est notée par la meilleure réponse adverse qu'elle
 * autorise. Zéro réponse possible (Deck épuisé, C10) est le meilleur coup du
 * jeu : l'adversaire passe.
 */
function scoreOfferedColor(config: GameConfig, after: GameState, side: PlayingSide): number {
  const enemy = opposite(side)
  const replies = legalMoves(config, after, enemy)
  if (replies.length === 0) return 100 // l'adversaire passe son tour (C10)
  const before = snapshot(config, after)
  let best = -Infinity
  for (const reply of replies) {
    let next: GameState
    try {
      next = playMove(config, after, reply)
    } catch {
      continue
    }
    const m = measure(config, before, next, enemy, next.nextUid - 1)
    if (m.winsNow) return -1000
    const value = m.enemyKingDamage * 10 + m.enemyTilesKilled * 2 - m.enemyForceDelta
    if (value > best) best = value
  }
  return best === -Infinity ? 0 : -best
}

export function scoreMove(
  config: GameConfig,
  state: GameState,
  side: PlayingSide,
  move: Move,
  before: Snapshot,
): ScoredMove | null {
  let after: GameState
  try {
    after = playMove(config, state, move)
  } catch {
    return null
  }
  const placedUid = after.nextUid - 1
  const base = measure(config, before, after, side, placedUid)
  const w = config.ai.weights
  const weight = (key: string): number => w[key] ?? 0

  const offered = weight('offeredColor') !== 0 ? scoreOfferedColor(config, after, side) : 0
  const measures: Measures = { ...base, offeredColor: offered }

  // I6 : garde-fous absolus, avant tout barème.
  if (measures.losesNow) return { move, score: -Infinity, attack: 0, defense: 0, measures }
  if (measures.winsNow) return { move, score: Infinity, attack: 0, defense: 0, measures }

  const attack =
    measures.enemyKingDamage * weight('enemyKingDamage') +
    measures.enemyTilesKilled * weight('enemyTilesKilled') -
    measures.enemyForceDelta * weight('enemyForceDelta') +
    measures.enemySupplyCut * weight('enemySupplyCut')

  const defense =
    -measures.ownKingDamage * weight('ownKingDamage') -
    measures.ownTilesLost * weight('ownTilesLost') +
    measures.shieldsGained * weight('shieldsGained') +
    measures.ownForceDelta * weight('ownForceDelta') +
    measures.ownTileSupplied * weight('ownTileSupplied')

  const aiSide = config.ai[side]
  const profile = aiSide ? config.ai.profiles[aiSide.profile] : undefined
  const wa = profile?.attack ?? 1
  const wd = profile?.defense ?? 1
  const score = wa * attack + wd * defense + offered * weight('offeredColor')

  return { move, score, attack, defense, measures }
}

/**
 * I8 : les égalités de score sont départagées par un mélange GERMÉ, jamais par
 * l'ordre de génération des coups.
 *
 * Sans ce mélange, `legalMoves` énumère les Espaces dans l'ordre de
 * `hexesInRadius` (q croissant), et le tri stable de V8 laisse cet ordre
 * trancher toutes les égalités : les deux camps posent alors préférentiellement
 * du côté q négatif du Plateau. Le camp dont le Roi est en q positif joue donc
 * systématiquement loin de son Roi — hors ravitaillement (F14) et sans défendre.
 * Mesuré : 19 victoires sur 24 pour `player` sur une position pourtant
 * strictement symétrique. Voir le test « symétrie des camps ».
 */
export function rankMoves(config: GameConfig, state: GameState, side: PlayingSide, rng?: Rng): ScoredMove[] {
  const before = snapshot(config, state)
  const scored: ScoredMove[] = []
  for (const move of legalMoves(config, state, side)) {
    const result = scoreMove(config, state, side, move, before)
    if (result) scored.push(result)
  }
  if (rng) rng.shuffle(scored)
  return scored.sort((a, b) => b.score - a.score)
}

export { snapshot }
