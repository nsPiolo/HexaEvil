/** Métriques du proto — règles M1..M6. Lecture seule, jamais de logique de règle. */

import { viewBoard } from './derived'
import { suppliedUids } from './supply'
import { ALL_COLORS, PLAYING_SIDES } from './types'
import type { GameConfig } from '../config/schema'
import type { ColorId, GameState, PlayingSide } from './types'

export interface RoundSample {
  readonly turn: number
  readonly kingForce: Record<PlayingSide, number>
  readonly tileCount: Record<PlayingSide, number>
  /** M6 : part des Tuiles reliées à leur Roi. */
  readonly suppliedRatio: Record<PlayingSide, number>
  readonly healedTotal: Record<PlayingSide, number>
}

export interface Metrics {
  readonly samples: readonly RoundSample[]
  /** M3 : histogramme des Couleurs imposées. */
  readonly imposedHistogram: Record<ColorId, number>
  readonly starvingImposed: number
  readonly passes: Record<PlayingSide, number>
  readonly destroyedByType: Record<string, number>
  readonly placedByType: Record<string, number>
  readonly supplyCuts: number
}

export function sample(config: GameConfig, state: GameState, healedTotal: Record<PlayingSide, number>): RoundSample {
  const view = viewBoard(config, state.tiles)
  const kingForce = { player: 0, demon: 0 }
  const tileCount = { player: 0, demon: 0 }
  const suppliedRatio = { player: 0, demon: 0 }
  for (const t of state.tiles) {
    if (t.side === 'neutral') continue
    const side = t.side as PlayingSide
    tileCount[side] += 1
    if (view.defOf(t).role === 'king') kingForce[side] = view.forceOf(t)
  }
  for (const side of PLAYING_SIDES) {
    const supplied = suppliedUids(view, state.tiles, side).size
    suppliedRatio[side] = tileCount[side] === 0 ? 0 : supplied / tileCount[side]
  }
  return { turn: state.turn, kingForce, tileCount, suppliedRatio, healedTotal }
}

/** Reconstruit les agrégats depuis le journal — le moteur n'a rien à instrumenter. */
export function collect(config: GameConfig, state: GameState): Metrics {
  const imposedHistogram = { red: 0, blue: 0, green: 0, black: 0, yellow: 0 } as Record<ColorId, number>
  const passes: Record<PlayingSide, number> = { player: 0, demon: 0 }
  const destroyedByType: Record<string, number> = {}
  const placedByType: Record<string, number> = {}
  const healedTotal: Record<PlayingSide, number> = { player: 0, demon: 0 }
  let starvingImposed = 0

  for (const entry of state.log) {
    switch (entry.kind) {
      case 'imposed':
        imposedHistogram[entry.color] += 1
        if (entry.starves) starvingImposed += 1
        break
      case 'pass':
        passes[entry.side] += 1
        break
      case 'place':
        placedByType[entry.typeId] = (placedByType[entry.typeId] ?? 0) + 1
        break
      case 'destroyed': {
        const id = entry.text.slice(0, 3)
        destroyedByType[id] = (destroyedByType[id] ?? 0) + 1
        break
      }
      case 'upkeep':
        healedTotal[entry.side] += entry.healed.reduce((s, h) => s + h.amount, 0)
        break
      default:
        break
    }
  }

  return {
    samples: [sample(config, state, healedTotal)],
    imposedHistogram,
    starvingImposed,
    passes,
    destroyedByType,
    placedByType,
    supplyCuts: 0,
  }
}

export { ALL_COLORS }
