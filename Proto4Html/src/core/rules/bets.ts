/**
 * Paris — GDD proto4 §3.
 *
 * Un pari est débité au moment où il est posé. S'il gagne, il rapporte
 * mise × multiplicateur ; s'il perd, la mise est perdue. Les paris sont évalués
 * sur le classement définitif uniquement (principe non négociable n°3).
 *
 * Pari en course : seulement avant de lancer ses dés (la présentation tient la
 * fenêtre), et plus du tout dès qu'une âme quelconque est en zone de fin
 * (a atteint le seuil 60 %) — principe n°4. Un même pari (type + âmes) ne peut
 * pas être posé deux fois.
 *
 * Décote : plus la course est avancée, plus on en sait, moins un pari est risqué.
 * La cote d'un pari est donc figée au moment où il est posé, à partir de la cote
 * de base et de l'avancement de l'âme de tête vers le seuil.
 */
import type { BetTypeId } from './betTypes'
import { isInBetZone, type RaceState, type Ranked, type SoulId } from './race'

export type { BetTypeId } from './betTypes'
export { BET_TYPE_IDS } from './betTypes'

export type BetTier = 'simple' | 'intermediate' | 'advanced'

export interface BetTypeDef {
  id: BetTypeId
  label: string
  tier: BetTier
  /** Nombre d'âmes à désigner, ou 'all' pour toutes. */
  souls: number | 'all'
  /** L'ordre des âmes désignées compte. */
  ordered: boolean
  /** Intitulé de chaque emplacement (générique si absent). */
  slots?: readonly string[]
  description: string
}

export const BET_TYPES: readonly BetTypeDef[] = [
  { id: 'winner', label: 'Vainqueur pur', tier: 'simple', souls: 1, ordered: false, description: "L'âme termine première." },
  { id: 'top3', label: 'Top 3', tier: 'simple', souls: 1, ordered: false, description: "L'âme termine dans les trois premières." },
  { id: 'notTop3', label: 'Pas dans le top 3', tier: 'simple', souls: 1, ordered: false, description: "L'âme ne termine pas dans les trois premières." },
  { id: 'last', label: 'Dernière place', tier: 'simple', souls: 1, ordered: false, description: "L'âme termine dernière." },
  { id: 'podiumAnyOrder', label: 'Top 3 dans le désordre', tier: 'intermediate', souls: 3, ordered: false, description: 'Les trois âmes occupent les trois premières places, dans un ordre quelconque.' },
  { id: 'twoInTop3', label: 'Deux âmes dans le top 3', tier: 'intermediate', souls: 2, ordered: false, description: 'Les deux âmes terminent toutes deux dans le top 3.' },
  { id: 'duel', label: 'Duel', tier: 'intermediate', souls: 2, ordered: true, slots: ['devant', 'derrière'], description: 'La première âme termine devant la seconde.' },
  { id: 'podiumExact', label: 'Podium exact', tier: 'advanced', souls: 3, ordered: true, slots: ['1re', '2e', '3e'], description: 'Les trois premières places, dans cet ordre exact.' },
  { id: 'fullRankingExact', label: 'Classement complet exact', tier: 'advanced', souls: 'all', ordered: true, description: 'Toutes les positions finales, dans cet ordre exact.' },
  { id: 'winnerAndLast', label: 'Vainqueur + dernier', tier: 'advanced', souls: 2, ordered: true, slots: ['vainqueur', 'dernier'], description: 'La première et la dernière âme, exactement.' },
]

export const TIER_LABEL: Readonly<Record<BetTier, string>> = {
  simple: 'Simples',
  intermediate: 'Combinés',
  advanced: 'Avancés',
}

export function betType(id: BetTypeId): BetTypeDef {
  const def = BET_TYPES.find((t) => t.id === id)
  if (!def) throw new Error(`type de pari inconnu : ${id}`)
  return def
}

export function slotCount(def: BetTypeDef, soulCount: number): number {
  return def.souls === 'all' ? soulCount : def.souls
}

export type BetStatus = 'open' | 'won' | 'lost'

export interface Bet {
  id: number
  type: BetTypeId
  /** Âmes désignées, dans l'ordre choisi. */
  souls: readonly SoulId[]
  stake: number
  /** Cote figée au moment du pari (base décotée selon l'avancement). */
  multiplier: number
  /** 0 = pari initial, sinon numéro du tour où il a été posé. */
  turn: number
  status: BetStatus
  /** Somme rendue au joueur (0 si perdu ou en cours). */
  payout: number
}

export function potentialPayout(stake: number, multiplier: number): number {
  return Math.round(stake * multiplier)
}

export interface Decay {
  exponent: number
  minMultiplier: number
}

/** Avancement de la course, de 0 (départ) à 1 (l'âme de tête a atteint le seuil 60 %). */
export function raceProgress(state: RaceState): number {
  const lead = state.souls.reduce((m, s) => Math.max(m, s.position), 0)
  return Math.min(1, lead / state.track.betThresholdColumn)
}

/** Cote effective d'un pari posé à cet avancement, arrondie au centième. */
export function currentMultiplier(base: number, progress: number, decay: Decay): number {
  const p = Math.min(1, Math.max(0, progress))
  const m = 1 + (base - 1) * Math.pow(1 - p, decay.exponent)
  return Math.round(Math.max(decay.minMultiplier, m) * 100) / 100
}

export function fmtMultiplier(m: number): string {
  return `×${m.toFixed(2).replace(/\.?0+$/, '')}`
}

/** Deux paris sont identiques s'ils ont le même type et les mêmes âmes (dans le même ordre si l'ordre compte). */
export function isSameBet(a: Pick<Bet, 'type' | 'souls'>, b: Pick<Bet, 'type' | 'souls'>): boolean {
  if (a.type !== b.type || a.souls.length !== b.souls.length) return false
  if (betType(a.type).ordered) return a.souls.every((id, i) => b.souls[i] === id)
  const set = new Set(b.souls)
  return a.souls.every((id) => set.has(id))
}

/** Vrai dès qu'une âme a atteint le seuil : plus aucun pari sur cette course. */
export function bettingClosed(state: RaceState): boolean {
  return state.finished || state.souls.some((s) => isInBetZone(state.track, s.position))
}

/**
 * Raison pour laquelle un pari ne peut pas être posé, ou null s'il est valide.
 * `souls` peut être incomplet : la première raison renvoyée est alors le manque d'âmes.
 */
export function betRefusal(
  state: RaceState,
  type: BetTypeId,
  souls: readonly SoulId[],
  stake: number,
  money: number,
  existing: readonly Pick<Bet, 'type' | 'souls'>[] = [],
): string | null {
  if (state.finished) return 'La course est terminée.'
  if (bettingClosed(state)) return 'Une âme a dépassé le seuil : plus de pari sur cette course.'
  const def = betType(type)
  const needed = slotCount(def, state.souls.length)
  if (new Set(souls).size !== souls.length) return 'Une âme ne peut être désignée qu’une fois.'
  if (souls.length < needed) return `Désignez ${needed} âme${needed > 1 ? 's' : ''} (${souls.length}/${needed}).`
  if (souls.length > needed) return 'Trop d’âmes désignées.'
  for (const id of souls) {
    if (!state.souls[id]) return 'Âme inconnue.'
  }
  if (existing.some((b) => isSameBet(b, { type, souls }))) return 'Ce pari est déjà posé.'
  if (stake <= 0) return 'Choisissez une mise.'
  if (stake > money) return 'Pas assez d’argent pour cette mise.'
  return null
}

function rankOf(ranked: readonly Ranked[], id: SoulId): number {
  const r = ranked.find((x) => x.soul.id === id)
  if (!r) throw new Error(`âme ${id} absente du classement`)
  return r.rank
}

/** Vrai si le pari est gagné contre ce classement définitif. */
export function evaluateBet(bet: Pick<Bet, 'type' | 'souls'>, ranked: readonly Ranked[]): boolean {
  const s = bet.souls
  const last = ranked.reduce((m, r) => Math.max(m, r.rank), 0)
  const at = (i: number): SoulId => {
    const v = s[i]
    if (v === undefined) throw new Error('pari incomplet')
    return v
  }
  // Ordre exact : aucune égalité tolérée sur les places concernées.
  const exactOrder = (count: number): boolean =>
    s.slice(0, count).every((id, i) => ranked[i]?.soul.id === id && ranked[i]?.rank === i + 1)

  switch (bet.type) {
    case 'winner':
      return rankOf(ranked, at(0)) === 1
    case 'top3':
      return rankOf(ranked, at(0)) <= 3
    case 'notTop3':
      return rankOf(ranked, at(0)) > 3
    case 'last':
      return rankOf(ranked, at(0)) === last
    case 'podiumAnyOrder':
      return s.length === 3 && s.every((id) => rankOf(ranked, id) <= 3)
    case 'twoInTop3':
      return s.length === 2 && s.every((id) => rankOf(ranked, id) <= 3)
    case 'duel':
      return rankOf(ranked, at(0)) < rankOf(ranked, at(1))
    case 'podiumExact':
      return s.length === 3 && exactOrder(3)
    case 'fullRankingExact':
      return s.length === ranked.length && exactOrder(ranked.length)
    case 'winnerAndLast':
      return rankOf(ranked, at(0)) === 1 && rankOf(ranked, at(1)) === last
  }
}

export interface Settlement {
  bets: Bet[]
  /** Total misé sur la course. */
  staked: number
  /** Total rendu au joueur, remboursement compris. */
  returned: number
  /** Livre des comptes : remboursement partiel du plus gros pari perdu (0 sinon). */
  refund: number
}

export interface SettleOptions {
  /** Livre des comptes : part remboursée du plus gros pari perdu. */
  refundRatio?: number
}

/** Fer à cheval : facteurs appliqués à la cote de base selon le type. */
export interface BaseModifiers {
  winnerFactor?: number
  lastFactor?: number
}

/** Cote de base d'un type, une fois les artefacts appliqués, arrondie au centième. */
export function effectiveBase(type: BetTypeId, base: number, mods: BaseModifiers): number {
  let m = base
  if (type === 'winner' && mods.winnerFactor !== undefined) m *= mods.winnerFactor
  if (type === 'last' && mods.lastFactor !== undefined) m *= mods.lastFactor
  return Math.round(m * 100) / 100
}

/** Règle tous les paris ouverts contre le classement définitif, à la cote figée de chaque pari. */
export function settleBets(bets: readonly Bet[], ranked: readonly Ranked[], options: SettleOptions = {}): Settlement {
  let staked = 0
  let returned = 0
  const settled = bets.map((b) => {
    staked += b.stake
    if (b.status !== 'open') {
      returned += b.payout
      return b
    }
    const won = evaluateBet(b, ranked)
    const payout = won ? potentialPayout(b.stake, b.multiplier) : 0
    returned += payout
    return { ...b, status: won ? 'won' : 'lost', payout } as Bet
  })
  let refund = 0
  if (options.refundRatio) {
    const biggestLost = settled.filter((b) => b.status === 'lost').reduce((m, b) => Math.max(m, b.stake), 0)
    refund = Math.round(biggestLost * options.refundRatio)
    returned += refund
  }
  return { bets: settled, staked, returned, refund }
}
