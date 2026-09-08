/**
 * Décisions attendues du joueur humain — tout ce qui arrête le moteur.
 * Les démons répondent aux mêmes questions, mais sans passer par ici (§12).
 */

import type { Card, DiceHand, HandRank, PhaseId, RewardId } from './types'
import type { CoinSide } from './trace'

export interface TurnContext {
  readonly who: number
  readonly phase: PhaseId
  /** `null` avant le premier jet du tour. */
  readonly values: readonly number[] | null
  readonly hand: DiceHand | null
  /** Les 3 dés retenus parmi les N lancés (`D3b`). */
  readonly kept: readonly number[]
  readonly throwNo: number
  readonly maxThrows: number
  readonly isLeader: boolean
  readonly canFlip: boolean
  readonly canSet42: boolean
  readonly diceCount: number
}

export type Ask =
  | { kind: 'mulligan'; who: number; pass: number; total: number; hand: readonly Card[]; rank: HandRank }
  | { kind: 'coin'; who: number; candidates: readonly number[]; reason: string }
  | { kind: 'reward'; who: number; offered: readonly RewardId[] }
  | { kind: 'rewardTarget'; who: number; id: RewardId; candidates: readonly number[] }
  | { kind: 'chooseRerolls'; who: number; options: readonly number[] }
  | { kind: 'turn'; context: TurnContext }

export type TurnAction =
  | { type: 'roll'; keep: readonly boolean[]; useSet42: boolean }
  | { type: 'stop' }
  | { type: 'flip'; dieIndex: number }

export type Answer =
  | { kind: 'mulligan'; swap: readonly number[] }
  | { kind: 'coin'; side: CoinSide }
  | { kind: 'reward'; id: RewardId }
  | { kind: 'rewardTarget'; target: number }
  | { kind: 'chooseRerolls'; value: number }
  | { kind: 'turn'; action: TurnAction }
