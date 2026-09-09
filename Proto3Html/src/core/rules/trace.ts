/**
 * Trace d'étapes — GDD §13 (`U2`).
 *
 * Le moteur *dit* ce qu'il fait ; l'affichage le rejoue dans le temps. La trace
 * n'influence aucun calcul : c'est un flux d'événements sortant, rien d'autre.
 * Chaque étape porte l'état visible qu'elle produit (pot, piles), pour que
 * l'affichage n'ait jamais à recalculer quoi que ce soit.
 */

import type { Card, DiceHand, FaceEffectId, HandRank, PhaseId, RewardId } from './types'

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
      /** `F10` : l'effet porté par la face visible de chaque dé. */
      effects: readonly (FaceEffectId | null)[]
      hand: DiceHand
      /** `D5` : le jet a été **annoncé** comme le dernier avant d'être lancé. */
      last: boolean
      via: 'normal' | 'set42' | 'extraDie' | 'freeReroll'
    }
  | {
      kind: 'dropDie'
      who: number
      before: readonly number[]
      dropped: number
      values: readonly number[]
      effects: readonly (FaceEffectId | null)[]
      hand: DiceHand
    }
  | {
      kind: 'flipUsed'
      who: number
      dieIndex: number
      from: number
      to: number
      effects: readonly (FaceEffectId | null)[]
      hand: DiceHand
    }
  | {
      /** `F10` : un effet de face a produit quelque chose. */
      kind: 'faceBonus'
      who: number
      effect: FaceEffectId
      amount: number
      detail: string
      pot: number
      chips: readonly number[]
    }
  | {
      /** `B13` : un 4-2-1 adverse est annulé, tous les dés repartent. */
      kind: 'forcedReroll'
      who: number
      owner: number
      before: readonly number[]
      values: readonly number[]
      kept: readonly number[]
      effects: readonly (FaceEffectId | null)[]
      hand: DiceHand
    }
  | {
      /** `B15` : la moitié part chez le troisième participant. */
      kind: 'sideGift'
      from: number
      to: number
      amount: number
      pot: number
      chips: readonly number[]
    }
  | {
      /** `B16` : la nénette fait circuler un jeton par adversaire. */
      kind: 'nenetteGift'
      who: number
      targets: readonly number[]
      amount: number
      source: 'pot' | 'owner'
      pot: number
      chips: readonly number[]
    }
  | {
      /** `B18` : le bonus a servi — on s'arrête sans l'avoir annoncé. */
      kind: 'lateStop'
      who: number
      hand: DiceHand
      throwNo: number
      maxThrows: number
    }
  | { kind: 'turnEnd'; who: number; hand: DiceHand; throws: number }
  | {
      kind: 'roundResult'
      phase: PhaseId
      best: number
      worst: number
      /** Valeur réclamée avant plafonnement — `B14` peut l'avoir réduite de 1. */
      base: number
      amount: number
      pot: number
      chips: readonly number[]
      hands: readonly (DiceHand | null)[]
    }
  | { kind: 'out'; who: number; place: number; chips: readonly number[] }
  | { kind: 'phaseEnd'; phase: PhaseId; pot: number; chips: readonly number[] }
  | {
      kind: 'matchEnd'
      ranking: readonly number[]
      money: readonly number[]
      /** `R14` : le run continue — donc « pas dernier », pas « premier ». */
      humanWon: boolean
      humanFirst: boolean
      /** Place du joueur au classement, à partir de 0. */
      humanPlace: number
    }
