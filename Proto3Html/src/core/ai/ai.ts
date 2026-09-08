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
  /** `I5` : 0 = joue toujours le meilleur coup ; plus c'est haut, plus il se trompe. */
  readonly temperature: number
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
  return { profile, temperature: level.temperature, weights: ai.rewardWeights }
}

/**
 * `I5` : le niveau de jeu, en **une** fonction — les trois décisions de l'IA
 * (garde des dés, échange de cartes, choix de récompense) passent par ici.
 *
 * Tirage de Boltzmann : chaque coup est tiré avec un poids `exp(note / T)`,
 * après avoir ramené les notes sur `[0, 1]`. Deux propriétés, et ce sont les
 * deux qu'on cherchait :
 *
 * - **la normalisation** rend `T` comparable d'une décision à l'autre. Sans
 *   elle, une main d'une carte a une amplitude de ~12 points quand une main de
 *   deux en a ~2000 (le rang pèse ×1000), et aucun réglage unique ne conviendrait
 *   aux deux ;
 * - **l'exponentielle** rend une erreur grossière exponentiellement improbable,
 *   quel que soit le niveau, tout en laissant deux coups proches interchangeables.
 *   C'est ce qui empêche un démon faible de jeter un As, tout en le laissant rater
 *   les décisions subtiles.
 *
 * L'ancien modèle — tirer au hasard parmi les `topN` meilleurs — faisait l'inverse :
 * il se trompait sans regarder ce que l'erreur coûtait.
 *
 * `I7` : à température nulle on joue le meilleur coup, les ex æquo étant
 * départagés par le tirage germé, jamais par l'ordre d'énumération.
 */
function pickByTemperature<T>(scored: { item: T; score: number }[], temperature: number, rng: Rng): T {
  if (scored.length === 0) throw new Error('choix sur une liste vide')
  let max = -Infinity
  let min = Infinity
  for (const s of scored) {
    if (s.score > max) max = s.score
    if (s.score < min) min = s.score
  }

  if (temperature <= 0 || max === min) {
    const best = max === min ? scored : scored.filter((s) => s.score >= max - 1e-9)
    return (best[rng.int(best.length)] as { item: T }).item
  }

  const span = max - min
  const weights = scored.map((s) => Math.exp((s.score - min) / span / temperature))
  const total = weights.reduce((a, b) => a + b, 0)
  let draw = rng.next() * total
  for (let i = 0; i < scored.length; i++) {
    draw -= weights[i] as number
    if (draw <= 0) return (scored[i] as { item: T }).item
  }
  return (scored[scored.length - 1] as { item: T }).item
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
      for (const f of (dice[i] as Die).faces) {
        next[i] = f.value
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
  /** `F10` : seconde valeur des faces `wild`. */
  readonly alts?: readonly (number | null)[] | null
  /** `F10` : dés relançables gratuitement. */
  readonly freeRerolls?: readonly number[]
  readonly throwNo: number
  readonly maxThrows: number
  readonly faces: number
  readonly combos: CombinationsConfig
  /** `I5` : un démon faible ne choisit pas toujours la meilleure garde. */
  readonly temperature: number
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
  const alts = input.alts ?? undefined

  if (values === null) return { type: 'roll', keep: new Array<boolean>(n).fill(false), useSet42: false }

  const current = bestStrength(values, faces, combos, alts)

  // `F10` : une relance gratuite ne coûte rien — on la prend dès qu'elle espère mieux.
  for (const i of input.freeRerolls ?? []) {
    const mask = dice.map((_, k) => k === i)
    if (expectedStrength(dice, values, mask, faces, combos, rng) > current) {
      return { type: 'freeReroll', dieIndex: i }
    }
  }
  if (throwsLeft <= 0) return { type: 'stop' }
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
  const bestMask = pickByTemperature(scored, input.temperature, rng)
  return { type: 'roll', keep: bestMask.map((r) => !r), useSet42: false }
}

/* --------------------------------------------------------------- Cartes */

/** `I5` : garder la meilleure combinaison partielle, changer le reste. */
export function aiMulligan(
  hand: readonly Card[],
  pile: readonly Card[],
  cfg: CardsConfig,
  temperature: number,
  rng: Rng,
): number[] {
  const size = hand.length
  if (size === 0 || pile.length === 0) return []
  // Le nombre de coups double à chaque carte (2^size) : sans plus de tirages,
  // à 5 cartes le classement est dominé par le bruit et même la température 0
  // ne joue plus le meilleur coup. On échantillonne donc proportionnellement.
  const samples = 24 * size
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
  return pickByTemperature(scored, temperature, rng)
}

/* --------------------------------------------------------- Récompenses */

export function aiReward(
  offered: readonly RewardId[],
  settings: AiSettings,
  rng: Rng,
): RewardId {
  const scored = offered.map((id) => ({ item: id, score: settings.weights[id] ?? 1 }))
  return pickByTemperature(scored, settings.temperature, rng)
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
