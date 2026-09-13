/**
 * Décisions attendues du joueur humain — tout ce qui arrête le moteur.
 * Les démons répondent aux mêmes questions, mais sans passer par ici (§12).
 */

import type { Card, DiceHand, FaceEffectId, HandRank, PhaseId, RewardId } from './types'
import type { HandBonuses, Reads } from '../dice/combinations'
import type { CoinSide } from './trace'

export interface TurnContext {
  readonly who: number
  readonly phase: PhaseId
  /** `null` avant le premier jet du tour. */
  readonly values: readonly number[] | null
  readonly hand: DiceHand | null
  /** Les 3 dés retenus parmi les N lancés (`D3b`). */
  readonly kept: readonly number[]
  /** Effet porté par la face visible de chaque dé (`F10`). */
  readonly effects: readonly (FaceEffectId | null)[]
  /** `F10` : lectures de chaque dé — `wild` et `wild35` en donnent plusieurs. */
  readonly reads: Reads
  /** `B17` à `B24` : ce que ses récompenses changent à la lecture de sa main. */
  readonly bonuses: HandBonuses
  /** Dés relançables gratuitement, tout de suite (`F10`, `freeReroll`). */
  readonly freeRerolls: readonly number[]
  readonly throwNo: number
  readonly maxThrows: number
  /** `D5` : jets encore disponibles — passe à 0 dès que le dernier est annoncé. */
  readonly throwsLeft: number
  /** `D5` : nombre minimal de dés qu'un jet doit relancer. */
  readonly minReroll: number
  /** `D5`/`B18` : finir son tour sans lancer — plafond atteint, ou bonus en main. */
  readonly canStop: boolean
  /** `B18` : s'arrêter maintenant consommerait « s'arrêter après ». */
  readonly stopUsesBonus: boolean
  /** `D4` : le meneur fixe le plafond ; pour les autres, `maxThrows` **est** ce plafond. */
  readonly isLeader: boolean
  readonly canFlip: boolean
  readonly canSet42: boolean
  readonly diceCount: number
}

export type Ask =
  | { kind: 'mulligan'; who: number; pass: number; total: number; hand: readonly Card[]; rank: HandRank }
  | { kind: 'coin'; who: number; candidates: readonly number[]; reason: string }
  | { kind: 'reward'; who: number; offered: readonly RewardId[] }
  /** `B2` : les bonus que le joueur met en jeu, parmi les siens. */
  | { kind: 'stakeBonuses'; who: number; owned: readonly RewardId[]; count: number }
  | { kind: 'rewardTarget'; who: number; id: RewardId; candidates: readonly number[] }
  | { kind: 'chooseRerolls'; who: number; options: readonly number[] }
  /** `F10` (`forceReroll`) : sur qui le graveur renvoie la relance forcée. */
  | { kind: 'faceTarget'; who: number; effect: FaceEffectId; candidates: readonly number[] }
  /**
   * `F10` (`forceReroll`) : la victime choisit les dés qu'elle relance. Sa main
   * est déjà validée, donc la question arrive **hors** de son tour.
   */
  | {
      kind: 'pickDice'
      who: number
      count: number
      values: readonly number[]
      effects: readonly (FaceEffectId | null)[]
      by: number
    }
  | { kind: 'turn'; context: TurnContext }

export type TurnAction =
  /** `D5` : `last` est **l'annonce** — elle se donne avant de lancer, pas après. */
  | { type: 'roll'; keep: readonly boolean[]; useSet42: boolean; last: boolean }
  | { type: 'stop' }
  | { type: 'flip'; dieIndex: number }
  | { type: 'freeReroll'; dieIndex: number }

export type Answer =
  | { kind: 'mulligan'; swap: readonly number[] }
  | { kind: 'coin'; side: CoinSide }
  | { kind: 'reward'; id: RewardId }
  | { kind: 'stakeBonuses'; ids: readonly RewardId[] }
  | { kind: 'rewardTarget'; target: number }
  | { kind: 'chooseRerolls'; value: number }
  | { kind: 'faceTarget'; target: number }
  | { kind: 'pickDice'; dice: readonly number[] }
  | { kind: 'turn'; action: TurnAction }
