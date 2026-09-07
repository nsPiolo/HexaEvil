/**
 * Pilote de partie : enchaîne les tours en appliquant A3 de bout en bout.
 * Sert au mode IA contre IA (I9) et à l'équilibrage par lots (M4).
 */

import { chooseMove } from '../ai/choose'
import { viewBoard } from './derived'
import { createRng, type Rng } from './random'
import { openTurn, passReason, playMove, playPass, setupGame } from './game'
import { collect, sample, type Metrics, type RoundSample } from './metrics'
import type { GameConfig } from '../config/schema'
import type { GameState, PlayingSide } from './types'

/** Un tour complet : entretien, puis pose de l'IA ou passe. */
export function stepAi(config: GameConfig, state: GameState, rng: Rng): GameState {
  if (state.outcome) return state
  const opened = openTurn(config, state)
  const reason = passReason(config, opened, opened.activeSide)
  if (reason) return playPass(config, opened, reason)
  const decision = chooseMove(config, opened, opened.activeSide, rng)
  if (!decision) return playPass(config, opened, 'noColorTile')
  return playMove(config, opened, decision.chosen.move)
}

export interface PlayoutResult {
  readonly state: GameState
  readonly metrics: Metrics
  readonly samples: readonly RoundSample[]
  readonly turns: number
}

/** M4 : joue une partie entière avec les deux camps pilotés par l'IA. */
export function playOut(config: GameConfig, maxTurns = 400): PlayoutResult {
  const rng = createRng(config.seed + 977)
  let state = setupGame(config)
  const samples: RoundSample[] = []
  let guard = 0
  while (!state.outcome && guard < maxTurns) {
    state = stepAi(config, state, rng)
    samples.push(sample(config, state, { player: 0, demon: 0 }))
    guard += 1
  }
  return { state, metrics: collect(config, state), samples, turns: guard }
}

export interface BatchRow {
  readonly seed: number
  readonly winner: PlayingSide | null
  readonly cause: string
  readonly turns: number
  readonly kingForce: Record<PlayingSide, number>
}

export interface BatchSummary {
  readonly rows: readonly BatchRow[]
  readonly wins: Record<PlayingSide, number>
  readonly draws: number
  readonly byCause: Record<string, number>
  readonly medianTurns: number
}

/**
 * M4 : N parties sur des `seed` successives. C'est la mesure décisive du §14 —
 * si la cause `kingDestroyed` devient rare, le soin (`F13`) est trop fort.
 */
export function playBatch(config: GameConfig, count: number): BatchSummary {
  const rows: BatchRow[] = []
  const wins: Record<PlayingSide, number> = { player: 0, demon: 0 }
  const byCause: Record<string, number> = {}
  let draws = 0

  for (let i = 0; i < count; i++) {
    const seeded: GameConfig = { ...config, seed: config.seed + i }
    const { state, turns } = playOut(seeded)
    const cause = state.outcome?.cause ?? 'inachevée'
    byCause[cause] = (byCause[cause] ?? 0) + 1
    const winner = state.outcome?.winner ?? null
    if (winner) wins[winner] += 1
    else draws += 1

    const view = viewBoard(seeded, state.tiles)
    const kingForce: Record<PlayingSide, number> = { player: 0, demon: 0 }
    for (const t of state.tiles) {
      if (t.side !== 'neutral' && view.defOf(t).role === 'king') kingForce[t.side as PlayingSide] = view.forceOf(t)
    }
    rows.push({ seed: seeded.seed, winner, cause, turns, kingForce })
  }

  const sorted = rows.map((r) => r.turns).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianTurns = sorted.length === 0 ? 0 : (sorted[mid] as number)
  return { rows, wins, draws, byCause, medianTurns }
}
