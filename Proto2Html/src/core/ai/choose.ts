/** Sélection du coup selon le niveau — règles I3, I8. */

import { rankMoves, type ScoredMove } from './evaluate'
import type { GameConfig } from '../config/schema'
import type { Rng } from '../rules/random'
import type { GameState, PlayingSide } from '../rules/types'

export interface AiDecision {
  readonly chosen: ScoredMove
  readonly ranked: readonly ScoredMove[]
  readonly window: readonly ScoredMove[]
}

export function chooseMove(config: GameConfig, state: GameState, side: PlayingSide, rng: Rng): AiDecision | null {
  const aiSide = config.ai[side]
  if (!aiSide) return null
  // I8 : le rng est passé au classement pour que les égalités ne soient pas
  // tranchées par l'ordre d'énumération des Espaces.
  const ranked = rankMoves(config, state, side, rng)
  if (ranked.length === 0) return null

  const level = config.ai.levels[aiSide.level]
  const topN = level?.topN ?? 1
  const skipBest = level?.skipBest ?? 0

  // I3 : `mauvais` exclut les 2 meilleures options ; si l'exclusion ne laisse
  // rien, on prend le moins bon disponible.
  let window = ranked.slice(skipBest, topN)
  if (window.length === 0) window = ranked.slice(-1)

  // I8 : égalités départagées par un tirage germé — même `seed`, même partie.
  const chosen = rng.pick(window)
  return { chosen, ranked, window }
}
