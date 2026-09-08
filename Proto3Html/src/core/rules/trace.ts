/**
 * Trace d'étapes — GDD §13 (`U2`).
 *
 * Le moteur *dit* ce qu'il fait ; l'affichage le rejoue dans le temps. La trace
 * n'influence aucun calcul : c'est un flux d'événements sortant, rien d'autre.
 * Chaque étape porte l'état visible qu'elle produit (pot, piles), pour que
 * l'affichage n'ait jamais à recalculer quoi que ce soit.
 */

import type { Card, DiceHand, HandRank, PhaseId, RewardId } from './types'

export type CoinSide = 'pile' | 'face'

export type TraceStep =
  | { kind: 'matchStart'; circle: number; names: readonly string[]; pot: number; isCircleFinal: boolean }
  | { kind: 'rewardsDrawn'; series: number; offered: readonly RewardId[] }
  | { kind: 'duelStart'; series: number; index: number; total: number; handSize: number }
  | { kind: 'duelDraw'; hands: readonly (readonly Card[])[] }
  | { kind: 'duelMulligan'; pass: number; swaps: readonly number[]; hands: readonly (readonly Card[])[] }
  | { kind: 'duelReveal'; hands: readonly (readonly Card[])[]; ranks: readonly HandRank[] }
  | {
      kind: 'coinFlip'
      chooser: number | null
      side: CoinSide
      result: CoinSide
      candidates: readonly number[]
      winner: number
      reason: string
    }
  | { kind: 'duelWon'; who: number; category: string }
  | { kind: 'rewardTaken'; who: number; id: RewardId; remaining: readonly RewardId[] }
  | { kind: 'rewardSetting'; who: number; id: RewardId; detail: string }
  | {
      kind: 'rewardApplied'
      id: RewardId
      owner: number
      target: number
      amount: number
      /** `B6` : ce qui vient du pot, et ce qui sort de la réserve du donneur. */
      fromPot: number
      fromOwner: number
      pot: number
      chips: readonly number[]
    }
  | { kind: 'phaseStart'; phase: PhaseId; leader: number; pot: number; chips: readonly number[] }
  | { kind: 'roundStart'; phase: PhaseId; round: number; leader: number; order: readonly number[] }
  | {
      kind: 'throw'
      who: number
      throwNo: number
      maxThrows: number
      values: readonly number[]
      rolled: readonly boolean[]
      /** `D3b` : les 3 dés que le jeu a retenus parmi les N lancés. */
      kept: readonly number[]
      hand: DiceHand
      via: 'normal' | 'set42' | 'extraDie'
    }
  | {
      kind: 'dropDie'
      who: number
      before: readonly number[]
      dropped: number
      values: readonly number[]
      hand: DiceHand
    }
  | { kind: 'flipUsed'; who: number; dieIndex: number; from: number; to: number; hand: DiceHand }
  | { kind: 'turnEnd'; who: number; hand: DiceHand; throws: number }
  | {
      kind: 'roundResult'
      phase: PhaseId
      best: number
      worst: number
      amount: number
      pot: number
      chips: readonly number[]
      hands: readonly (DiceHand | null)[]
    }
  | { kind: 'out'; who: number; place: number; chips: readonly number[] }
  | { kind: 'phaseEnd'; phase: PhaseId; pot: number; chips: readonly number[] }
  | { kind: 'matchEnd'; ranking: readonly number[]; money: readonly number[]; humanWon: boolean }
