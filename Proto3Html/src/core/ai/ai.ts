/**
 * IA des démons — GDD §12 (`I1` à `I7`).
 *
 * `I1` : les démons jouent **pour gagner la partie**, jamais pour l'argent — ils
 * n'ont pas de boutique, donc aucune raison de ramasser des jetons. L'asymétrie
 * est volontaire : elle laisse au joueur le monopole de la décision « cupidité
 * contre survie » (`D12`).
 *
 * Limite connue et assumée du proto : le démon meneur ne calcule pas l'effet de
 * son nombre de jets sur le plafond des autres (`D4`). C'est le seul pan
 * stratégique du 4-21 qu'il ne voit pas.
 */

import { evaluateHand } from '../cards/hands'
import { bestStrength } from '../dice/combinations'
import { throwDie } from '../dice/dice'
import type { AiConfig, AiProfile, CardsConfig, CombinationsConfig } from '../config/schema'
import type { Rng } from '../rules/random'
import type { TurnAction } from '../rules/asks'
import type { Card, DiceHand, Die, RewardId } from '../rules/types'
import type { CoinSide } from '../rules/trace'

/** Scalaire unique à maximiser : le rang domine, la valeur départage (`V4`). */
export function strength(hand: DiceHand): number {
  return (10 - hand.rank) * 1000 + hand.baseValue
}

export interface AiSettings {
  readonly profile: AiProfile
  readonly topN: number
  readonly weights: Readonly<Record<string, number>>
}

export function settingsFor(ai: AiConfig, demonIndex: number, circleIndex: number): AiSettings {
  const demon = ai.demons[demonIndex] ?? ai.demons[0]
  if (!demon) throw new Error('aucun démon configuré')
  const profile = ai.profiles[demon.profile]
  if (!profile) throw new Error(`profil d'IA inconnu : ${demon.profile}`)
  // `S5` : le niveau vient du Cercle, pas du démon.
  const levelName = ai.levelByCircle[circleIndex] ?? demon.level
  const level = ai.levels[levelName]
  if (!level) throw new Error(`niveau d'IA inconnu : ${levelName}`)
  return { profile, topN: level.topN, weights: ai.rewardWeights }
}

/** `I5`/`I7` : on choisit parmi les `topN` meilleurs, départage par tirage germé. */
function pickAmongBest<T>(scored: { item: T; score: number }[], topN: number, rng: Rng): T {
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const slice = sorted.slice(0, Math.max(1, topN))
  const chosen = slice[rng.int(slice.length)]
  if (!chosen) throw new Error('pickAmongBest sur une liste vide')
  return chosen.item
}

/* ------------------------------------------------------------------ Dés */

// Avec 4 ou 5 dés, l'espace des relances explose : 2^n masques, chacun sur
// faces^k tirages. Ces deux budgets sont ce qui garde une décision sous la
// milliseconde au D100.
const ENUMERATION_BUDGET = 4_000
const SAMPLE_COUNT = 400

/** Espérance de force après avoir relancé les dés marqués dans `reroll`. */
export function expectedStrength(
  dice: readonly Die[],
  values: readonly number[],
  reroll: readonly boolean[],
  faces: number,
  combos: CombinationsConfig,
  rng: Rng,
): number {
  const idx: number[] = []
  for (let i = 0; i < dice.length; i++) if (reroll[i]) idx.push(i)
  if (idx.length === 0) return bestStrength(values, faces, combos)

  const outcomes = idx.reduce((n, i) => n * (dice[i] as Die).faces.length, 1)
  const next = [...values]

  if (outcomes <= ENUMERATION_BUDGET) {
    let total = 0
    const walk = (k: number): void => {
      if (k === idx.length) {
        total += bestStrength(next, faces, combos)
        return
      }
      const i = idx[k] as number
      for (const face of (dice[i] as Die).faces) {
        next[i] = face
        walk(k + 1)
      }
    }
    walk(0)
    return total / outcomes
  }

  let total = 0
  for (let s = 0; s < SAMPLE_COUNT; s++) {
    for (const i of idx) next[i] = throwDie(dice[i] as Die, rng).value
    total += bestStrength(next, faces, combos)
  }
  return total / SAMPLE_COUNT
}

export interface AiTurnInput {
  readonly dice: readonly Die[]
  readonly values: readonly number[] | null
  readonly hand: DiceHand | null
  readonly throwNo: number
  readonly maxThrows: number
  readonly faces: number
  readonly combos: CombinationsConfig
  /** `I5` : un démon faible ne choisit pas toujours la meilleure garde. */
  readonly topN: number
}

/**
 * `I2`/`I3` : le démon maximise la force de sa main dans les deux phases — en
 * répartition pour ne pas être le pire, en don pour être le meilleur et se
 * débarrasser de ses jetons. Le même objectif sert les deux.
 *
 * Depuis que `D5` a sauté, la décision est simple : on relance tant qu'on
 * espère mieux, on s'arrête sinon. Plus rien à annoncer d'avance.
 */
export function aiTurn(input: AiTurnInput, rng: Rng): TurnAction {
  const { dice, values, throwNo, maxThrows, faces, combos } = input
  const n = dice.length
  const throwsLeft = maxThrows - throwNo

  if (values === null) return { type: 'roll', keep: new Array<boolean>(n).fill(false), useSet42: false }
  if (throwsLeft <= 0) return { type: 'stop' }

  const current = bestStrength(values, faces, combos)
  const scored: { item: boolean[]; score: number }[] = []
  for (let m = 1; m < 1 << n; m++) {
    const reroll = Array.from({ length: n }, (_, i) => Boolean(m & (1 << i)))
    scored.push({ item: reroll, score: expectedStrength(dice, values, reroll, faces, combos, rng) })
  }
  const topValue = Math.max(...scored.map((x) => x.score))
  if (topValue <= current) return { type: 'stop' }

  // `I5` : c'est **ici** que le niveau se joue. Le faire porter uniquement sur
  // les cartes ne changeait rien au taux de victoire — les parties se décident
  // aux dés.
  const bestMask = pickAmongBest(scored, input.topN, rng)
  return { type: 'roll', keep: bestMask.map((r) => !r), useSet42: false }
}

/* --------------------------------------------------------------- Cartes */

/** `I5` : garder la meilleure combinaison partielle, changer le reste. */
export function aiMulligan(
  hand: readonly Card[],
  pile: readonly Card[],
  cfg: CardsConfig,
  topN: number,
  rng: Rng,
): number[] {
  const size = hand.length
  if (size === 0 || pile.length === 0) return []
  const samples = 24
  const scored: { item: number[]; score: number }[] = []

  for (let mask = 0; mask < 1 << size; mask++) {
    const swap: number[] = []
    for (let i = 0; i < size; i++) if (mask & (1 << i)) swap.push(i)
    if (swap.length > pile.length) continue
    let total = 0
    for (let s = 0; s < samples; s++) {
      const candidate = [...hand]
      const bag = [...pile]
      for (const i of swap) {
        const j = rng.int(bag.length)
        candidate[i] = bag.splice(j, 1)[0] as Card
      }
      const rank = evaluateHand(candidate, cfg)
      total += -rank.rank * 1000 + (rank.tiebreak[0] ?? 0)
    }
    scored.push({ item: swap, score: total / samples })
  }
  return pickAmongBest(scored, topN, rng)
}

/* --------------------------------------------------------- Récompenses */

export function aiReward(
  offered: readonly RewardId[],
  settings: AiSettings,
  rng: Rng,
): RewardId {
  const scored = offered.map((id) => ({ item: id, score: settings.weights[id] ?? 1 }))
  return pickAmongBest(scored, settings.topN, rng)
}

/**
 * `give*` : on leste l'adversaire le plus léger, celui qui mène la course.
 * `take*` : on se sert chez le plus léger aussi — prendre des jetons dessert le
 * preneur (`B7`), donc le démon minimise son propre fardeau.
 */
export function aiTarget(candidates: readonly number[], chips: readonly number[]): number {
  let best = candidates[0] as number
  for (const c of candidates) if ((chips[c] as number) < (chips[best] as number)) best = c
  return best
}

/** `setRerolls` : le prudent réduit le hasard subi, le cupide cherche le gros coup. */
export function aiRerolls(settings: AiSettings, options: readonly number[]): number {
  const wanted = settings.profile.dischargeGreed > 0.4 ? Math.max(...options) : Math.min(...options)
  return options.includes(wanted) ? wanted : (options[0] as number)
}

export function aiCoin(rng: Rng): CoinSide {
  return rng.next() < 0.5 ? 'pile' : 'face'
}
