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

/**
 * Où en est la partie, pour le fil d'Ariane imprimé sur la table. Le `stage`
 * suit l'ordre fixe des étapes (`S1`) : batailles, répartition, batailles,
 * distribution — l'écran en déduit ce qui est derrière et ce qui reste.
 */
export interface Timeline {
  stage: string | null
  /** Batailles terminées, par série. */
  duelsDone: number[]
  /** Index de la bataille en cours dans sa série, `-1` hors bataille. */
  duelIndex: number
  over: boolean
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
  /** Cartes qui viennent d'arriver du deck, par siège — pour les animer. */
  entering: number[][]
  /** Cartes qui viennent de quitter la main, avec leur place d'origine. */
  leaving: { card: Card; at: number }[][]
  offered: RewardId[]
  owned: Map<RewardId, number>
  /** Récompenses consommées : elles quittent le tapis (spéc. interface). */
  used: Set<RewardId>
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
  timeline: Timeline
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
    entering: Array.from({ length: count }, () => []),
    leaving: Array.from({ length: count }, () => [] as { card: Card; at: number }[]),
    offered: [],
    owned: new Map(),
    used: new Set(),
    dice: Array.from({ length: count }, () => null),
    activeThrower: null,
    phase: null,
    round: 0,
    leader: null,
    roundOutcome: null,
    leaderThrows: null,
    coin: null,
    out: [],
    timeline: { stage: null, duelsDone: [], duelIndex: -1, over: false },
  }
}

export function buildView(steps: readonly TraceStep[], upTo: number, count: number): View {
  const v = empty(count)
  const noneEntering = (): number[][] => Array.from({ length: count }, () => [])
  const noneLeaving = (): { card: Card; at: number }[][] =>
    Array.from({ length: count }, () => [] as { card: Card; at: number }[])

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
        v.entering = noneEntering()
        v.leaving = noneLeaving()
        v.timeline.stage = `duels${s.series}`
        v.timeline.duelIndex = s.index
        while (v.timeline.duelsDone.length <= s.series) v.timeline.duelsDone.push(0)
        break
      case 'duelDraw':
        v.hands = s.hands.map((h) => [...h])
        v.entering = s.hands.map((h) => h.map((c) => c.uid))
        v.leaving = noneLeaving()
        break
      case 'duelMulligan': {
        // Ce qui entre vient du deck, ce qui sort glisse vers la défausse : les
        // deux mouvements se voient, c'est ce que demande la spéc.
        const before = v.hands
        v.entering = s.hands.map((h, k) => {
          const old = before[k] ?? []
          return h.filter((c) => !old.some((p) => p.uid === c.uid)).map((c) => c.uid)
        })
        v.leaving = (before.length > 0 ? before : s.hands.map(() => [])).map((h, k) => {
          const now = s.hands[k] ?? []
          // On garde la place : le fantôme glisse hors de la case que la
          // nouvelle carte vient occuper, les deux mouvements se répondent.
          return h
            .map((card, at) => ({ card, at }))
            .filter(({ card }) => !now.some((p) => p.uid === card.uid))
        })
        v.hands = s.hands.map((h) => [...h])
        break
      }
      case 'duelReveal':
        v.hands = s.hands.map((h) => [...h])
        v.ranks = [...s.ranks]
        v.revealed = true
        v.entering = noneEntering()
        v.leaving = noneLeaving()
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
      case 'duelWon': {
        v.duelWinner = s.who
        const series = v.duel?.series ?? 0
        while (v.timeline.duelsDone.length <= series) v.timeline.duelsDone.push(0)
        v.timeline.duelsDone[series] = (v.duel?.index ?? 0) + 1
        break
      }
      case 'rewardTaken':
        v.offered = [...s.remaining]
        v.owned.set(s.id, s.who)
        break
      case 'rewardApplied':
        // Un don s'applique une fois pour toutes : la tuile quitte le tapis.
        v.used.add(s.id)
        break
      case 'phaseStart':
        v.mode = 'dice'
        v.phase = s.phase
        v.leader = s.leader
        v.dice = v.dice.map(() => null)
        v.roundOutcome = null
        v.leaderThrows = null
        v.coin = null
        v.timeline.stage = s.phase
        v.timeline.duelIndex = -1
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
        if (s.via === 'set42') v.used.add('set42')
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
        v.used.add('flipDie')
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
      case 'matchEnd':
        v.timeline.over = true
        break
      case 'rewardSetting':
      case 'faceBonus':
      case 'sideGift':
      case 'nenetteGift':
      case 'phaseEnd':
        break
    }
  }
  return v
}
