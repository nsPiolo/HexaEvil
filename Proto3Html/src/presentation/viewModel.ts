/**
 * Modèle de vue : ce qu'il y a **sur la table** à l'étape courante.
 *
 * Reconstruit en rejouant la file d'étapes jusqu'au curseur. Aucune règle : on
 * ne fait qu'accumuler ce que le moteur a déjà dit (`U2`).
 */

import type { Card, DiceHand, FaceEffectId, HandRank, PhaseId, RewardId } from '../core/rules/types'
import type { CoinSide, TraceStep } from '../core/rules/trace'

export interface DiceSlot {
  readonly values: readonly number[]
  readonly rolled: readonly boolean[]
  /** `D3b` : les 3 dés que le jeu a retenus parmi les N lancés. */
  readonly kept: readonly number[]
  /** `F10` : l'effet de la face visible de chaque dé. */
  readonly effects: readonly (FaceEffectId | null)[]
  readonly hand: DiceHand | null
  readonly done: boolean
}

export interface CoinView {
  readonly side: CoinSide
  readonly result: CoinSide
  readonly winner: number
  readonly candidates: readonly number[]
  readonly reason: string
}

export interface View {
  mode: 'duel' | 'dice'
  circle: number
  isCircleFinal: boolean
  hands: Card[][]
  revealed: boolean
  ranks: HandRank[] | null
  duelWinner: number | null
  duel: { series: number; index: number; total: number; handSize: number } | null
  offered: RewardId[]
  owned: Map<RewardId, number>
  dice: (DiceSlot | null)[]
  activeThrower: number | null
  phase: PhaseId | null
  round: number
  leader: number | null
  roundOutcome: { best: number; worst: number; amount: number } | null
  /** `D4` : le nombre de jets du meneur — c'est le plafond des autres. */
  leaderThrows: number | null
  coin: CoinView | null
  out: number[]
}

/** Après un retrait, les indices retenus se recalent sur les valeurs restantes. */
function bestIndices(values: readonly number[], hand: DiceHand): number[] {
  const wanted = [...hand.values]
  const out: number[] = []
  for (let i = 0; i < values.length && out.length < 3; i++) {
    const k = wanted.indexOf(values[i] as number)
    if (k >= 0) {
      wanted.splice(k, 1)
      out.push(i)
    }
  }
  return out
}

function empty(count: number): View {
  return {
    mode: 'duel',
    circle: 1,
    isCircleFinal: false,
    hands: Array.from({ length: count }, () => []),
    revealed: false,
    ranks: null,
    duelWinner: null,
    duel: null,
    offered: [],
    owned: new Map(),
    dice: Array.from({ length: count }, () => null),
    activeThrower: null,
    phase: null,
    round: 0,
    leader: null,
    roundOutcome: null,
    leaderThrows: null,
    coin: null,
    out: [],
  }
}

export function buildView(steps: readonly TraceStep[], upTo: number, count: number): View {
  const v = empty(count)
  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const s = steps[i] as TraceStep
    switch (s.kind) {
      case 'matchStart':
        v.circle = s.circle
        v.isCircleFinal = s.isCircleFinal
        break
      case 'rewardsDrawn':
        v.offered = [...s.offered]
        break
      case 'duelStart':
        v.mode = 'duel'
        v.duel = { series: s.series, index: s.index, total: s.total, handSize: s.handSize }
        v.revealed = false
        v.ranks = null
        v.duelWinner = null
        v.coin = null
        break
      case 'duelDraw':
      case 'duelMulligan':
        v.hands = s.hands.map((h) => [...h])
        break
      case 'duelReveal':
        v.hands = s.hands.map((h) => [...h])
        v.ranks = [...s.ranks]
        v.revealed = true
        break
      case 'coinFlip':
        v.coin = {
          side: s.side,
          result: s.result,
          winner: s.winner,
          candidates: [...s.candidates],
          reason: s.reason,
        }
        break
      case 'duelWon':
        v.duelWinner = s.who
        break
      case 'rewardTaken':
        v.offered = [...s.remaining]
        v.owned.set(s.id, s.who)
        break
      case 'phaseStart':
        v.mode = 'dice'
        v.phase = s.phase
        v.leader = s.leader
        v.dice = v.dice.map(() => null)
        v.roundOutcome = null
        v.leaderThrows = null
        v.coin = null
        break
      case 'roundStart':
        v.round = s.round
        v.leader = s.leader
        v.dice = v.dice.map(() => null)
        v.roundOutcome = null
        v.leaderThrows = null
        v.coin = null
        break
      case 'throw':
        v.activeThrower = s.who
        v.dice[s.who] = {
          values: [...s.values],
          rolled: [...s.rolled],
          kept: [...s.kept],
          effects: [...s.effects],
          hand: s.hand,
          done: false,
        }
        break
      case 'dropDie':
        v.dice[s.who] = {
          values: [...s.values],
          rolled: s.values.map(() => false),
          kept: [...bestIndices(s.values, s.hand)],
          effects: [...s.effects],
          hand: s.hand,
          done: false,
        }
        break
      case 'forcedReroll':
        v.dice[s.who] = {
          values: [...s.values],
          rolled: s.values.map(() => true),
          kept: [...s.kept],
          effects: [...s.effects],
          hand: s.hand,
          done: false,
        }
        break
      case 'flipUsed': {
        const slot = v.dice[s.who]
        if (slot) {
          const values = [...slot.values]
          values[s.dieIndex] = s.to
          v.dice[s.who] = {
            values,
            rolled: values.map((_, k) => k === s.dieIndex),
            kept: slot.kept,
            effects: [...s.effects],
            hand: s.hand,
            done: false,
          }
        }
        break
      }
      case 'turnEnd': {
        const slot = v.dice[s.who]
        if (slot) v.dice[s.who] = { ...slot, done: true, rolled: slot.values.map(() => false) }
        // `D4` : ce chiffre-là est le plafond des suivants, il doit se voir.
        if (s.who === v.leader) v.leaderThrows = s.throws
        v.activeThrower = null
        break
      }
      case 'roundResult':
        v.roundOutcome = { best: s.best, worst: s.worst, amount: s.amount }
        break
      case 'out':
        if (!v.out.includes(s.who)) v.out.push(s.who)
        break
      case 'rewardSetting':
      case 'rewardApplied':
      case 'faceBonus':
      case 'sideGift':
      case 'nenetteGift':
      case 'phaseEnd':
      case 'matchEnd':
        break
    }
  }
  return v
}
