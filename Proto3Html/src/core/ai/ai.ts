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
 * stratégique du 4-21 qu'il ne voit pas — et depuis que `D5` est remise, il
 * annonce donc son dernier jet (`I8`) sans voir qu'il plafonne les suivants du
 * même geste.
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

export interface RollOutlook {
  /** Espérance de force après le jet. */
  readonly mean: number
  /** `D5` : part des tirages qui atteignent `level` — ce qu'annoncer protège. */
  readonly above: number
}

/**
 * Ce qu'un jet promet, en une passe : son espérance, et la part de ses tirages
 * qui atteignent `level`. La seconde sert à `D5` — si le jet a de bonnes
 * chances de tomber sur une main qu'on ne voudrait pas relancer, il faut
 * l'annoncer **avant** de le lancer.
 */
export function rollOutlook(
  dice: readonly Die[],
  values: readonly number[],
  reroll: readonly boolean[],
  faces: number,
  combos: CombinationsConfig,
  rng: Rng,
  level = Infinity,
): RollOutlook {
  const idx: number[] = []
  for (let i = 0; i < dice.length; i++) if (reroll[i]) idx.push(i)
  if (idx.length === 0) {
    const s = bestStrength(values, faces, combos)
    return { mean: s, above: s >= level ? 1 : 0 }
  }

  const outcomes = idx.reduce((n, i) => n * (dice[i] as Die).faces.length, 1)
  const next = [...values]
  let total = 0
  let hits = 0

  if (outcomes <= ENUMERATION_BUDGET) {
    const walk = (k: number): void => {
      if (k === idx.length) {
        const s = bestStrength(next, faces, combos)
        total += s
        if (s >= level) hits++
        return
      }
      const i = idx[k] as number
      for (const f of (dice[i] as Die).faces) {
        next[i] = f.value
        walk(k + 1)
      }
    }
    walk(0)
    return { mean: total / outcomes, above: hits / outcomes }
  }

  for (let s = 0; s < SAMPLE_COUNT; s++) {
    for (const i of idx) next[i] = throwDie(dice[i] as Die, rng).value
    const v = bestStrength(next, faces, combos)
    total += v
    if (v >= level) hits++
  }
  return { mean: total / SAMPLE_COUNT, above: hits / SAMPLE_COUNT }
}

/** Espérance de force après avoir relancé les dés marqués dans `reroll`. */
export function expectedStrength(
  dice: readonly Die[],
  values: readonly number[],
  reroll: readonly boolean[],
  faces: number,
  combos: CombinationsConfig,
  rng: Rng,
): number {
  return rollOutlook(dice, values, reroll, faces, combos, rng).mean
}

export interface AiTurnInput {
  readonly dice: readonly Die[]
  readonly values: readonly number[] | null
  /** `F10` : seconde valeur des faces `wild`. */
  readonly alts?: readonly (number | null)[] | null
  /** `F10` : dés relançables gratuitement. */
  readonly freeRerolls?: readonly number[]
  /** `D5` : jets encore disponibles — 0 dès que le dernier a été annoncé. */
  readonly throwsLeft: number
  /** `D5` : plancher de dés qu'un jet doit relancer. */
  readonly minReroll: number
  /** `B18` : le démon peut encore s'arrêter **après** avoir vu ses dés. */
  readonly canLateStop?: boolean
  readonly faces: number
  readonly combos: CombinationsConfig
  /** `I5` : un démon faible ne choisit pas toujours la meilleure garde. */
  readonly temperature: number
}

/**
 * `D5` : au-delà de cette probabilité de tomber sur une main qu'on garderait,
 * le démon annonce son dernier jet. À 3 dés, un jet neuf laisse ~24 % de mains
 * au-dessus de sa propre espérance : le seuil laisse donc passer le premier
 * jet, et déclenche l'annonce dès qu'un début de main est en place.
 */
const ANNOUNCE_THRESHOLD = 0.3

/**
 * `I8` : échelle de l'erreur d'annonce, en probabilité. Une décision **binaire**
 * ne peut pas passer par `pickByTemperature` : celui-ci normalise par l'écart
 * des notes, donc à deux options l'écart *est* l'échelle et l'on se tromperait
 * autant sur un choix évident que sur un choix serré — le défaut exact que
 * `I5b` reproche à l'ancien modèle. On tire donc l'erreur sur l'écart **brut**.
 */
const ANNOUNCE_MARGIN = 0.1

/**
 * `D5` : faut-il annoncer ce jet comme le dernier ? On compare la chance qu'il
 * tombe sur une main qu'on ne voudrait **pas** relancer au seuil ci-dessus. Le
 * niveau de référence est ce qu'espère un jet neuf : au-dessus, une main vaut
 * la peine d'être gardée ; en dessous, on préfère la relancer.
 *
 * `I5` : le niveau se voit ici aussi — plus `T` monte, plus le démon annonce à
 * contretemps, mais une annonce franchement mauvaise reste improbable.
 */
function announceLast(
  dice: readonly Die[],
  values: readonly number[],
  mask: readonly boolean[],
  input: AiTurnInput,
  rng: Rng,
): boolean {
  const { faces, combos, temperature } = input
  const fresh = dice.map(() => true)
  const level = rollOutlook(dice, values, fresh, faces, combos, rng).mean
  const chance = rollOutlook(dice, values, mask, faces, combos, rng, level).above
  const margin = chance - ANNOUNCE_THRESHOLD
  const best = margin >= 0
  if (temperature <= 0) return best
  const wrong = 1 / (1 + Math.exp(Math.abs(margin) / (temperature * ANNOUNCE_MARGIN)))
  return rng.next() < wrong ? !best : best
}

/**
 * `I2`/`I3` : le démon maximise la force de sa main dans les deux phases — en
 * répartition pour ne pas être le pire, en don pour être le meilleur et se
 * débarrasser de ses jetons. Le même objectif sert les deux.
 *
 * `D5` rend la décision **double** : quels dés relancer, et si c'est le dernier
 * jet. La seconde se prend à l'aveugle, avant le résultat, et elle est
 * engageante : ne pas annoncer, c'est s'obliger à faire voler `minReroll` dés
 * de plus — donc à casser la main qu'on vient d'obtenir.
 */
export function aiTurn(input: AiTurnInput, rng: Rng): TurnAction {
  const { dice, values, throwsLeft, faces, combos } = input
  const n = dice.length
  const minReroll = Math.min(Math.max(1, input.minReroll), n)
  const alts = input.alts ?? undefined
  const canLateStop = input.canLateStop ?? false

  if (values === null) {
    // Premier jet : tout part, l'annonce est la seule décision à prendre.
    const keep = new Array<boolean>(n).fill(false)
    const fresh = dice.map(() => true)
    const zeros = new Array<number>(n).fill(0)
    const last = throwsLeft <= 1 || (!canLateStop && announceLast(dice, zeros, fresh, input, rng))
    return { type: 'roll', keep, useSet42: false, last }
  }

  const current = bestStrength(values, faces, combos, alts)

  // `F10` : une relance gratuite ne coûte rien — on la prend dès qu'elle espère mieux.
  for (const i of input.freeRerolls ?? []) {
    const mask = dice.map((_, k) => k === i)
    if (expectedStrength(dice, values, mask, faces, combos, rng) > current) {
      return { type: 'freeReroll', dieIndex: i }
    }
  }
  if (throwsLeft <= 0) return { type: 'stop' }

  // `D5` : un jet fait voler au moins `minReroll` dés — les autres masques
  // n'existent pas, et c'est ce qui donne son prix à l'annonce.
  const scored: { item: boolean[]; score: number }[] = []
  for (let m = 1; m < 1 << n; m++) {
    const reroll = Array.from({ length: n }, (_, i) => Boolean(m & (1 << i)))
    if (reroll.filter(Boolean).length < minReroll) continue
    scored.push({ item: reroll, score: rollOutlook(dice, values, reroll, faces, combos, rng).mean })
  }
  const topValue = Math.max(...scored.map((x) => x.score))

  if (topValue <= current) {
    // Aucun jet n'espère mieux que la main en cours. On s'arrête si on en a le
    // droit (`B18`) ; sinon on subit le jet le moins destructeur — annoncé,
    // pour qu'il soit le dernier.
    if (canLateStop) return { type: 'stop' }
    const leastBad = pickByTemperature(scored, input.temperature, rng)
    return { type: 'roll', keep: leastBad.map((r) => !r), useSet42: false, last: true }
  }

  // `I5` : c'est **ici** que le niveau se joue. Le faire porter uniquement sur
  // les cartes ne changeait rien au taux de victoire — les parties se décident
  // aux dés.
  const bestMask = pickByTemperature(scored, input.temperature, rng)
  // `B18` dispense d'annoncer : on garde le droit de s'arrêter après coup.
  const last = throwsLeft <= 1 || (!canLateStop && announceLast(dice, values, bestMask, input, rng))
  return { type: 'roll', keep: bestMask.map((r) => !r), useSet42: false, last }
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
