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

export type BetTier = 'simple' | 'intermediate' | 'advanced' | 'exotic'

export interface BetTypeDef {
  id: BetTypeId
  tier: BetTier
  /** Nombre d'âmes à désigner, ou 'all' pour toutes. */
  souls: number | 'all'
  /** L'ordre des âmes désignées compte. */
  ordered: boolean
}

export const BET_TYPES: readonly BetTypeDef[] = [
  { id: 'winner', tier: 'simple', souls: 1, ordered: false },
  { id: 'top3', tier: 'simple', souls: 1, ordered: false },
  { id: 'notTop3', tier: 'simple', souls: 1, ordered: false },
  { id: 'last', tier: 'simple', souls: 1, ordered: false },
  { id: 'podiumAnyOrder', tier: 'intermediate', souls: 3, ordered: false },
  { id: 'twoInTop3', tier: 'intermediate', souls: 2, ordered: false },
  { id: 'duel', tier: 'intermediate', souls: 2, ordered: true },
  { id: 'podiumExact', tier: 'advanced', souls: 3, ordered: true },
  { id: 'fullRankingExact', tier: 'advanced', souls: 'all', ordered: true },
  { id: 'winnerAndLast', tier: 'advanced', souls: 2, ordered: true },
  // Registre des paris exotiques : on parie sur la MANIÈRE dont la course se déroule.
  // « Aucun recul » ne désigne personne : c'est le seul pari sans âme sur le ticket.
  { id: 'rammedTwice', tier: 'exotic', souls: 1, ordered: false },
  { id: 'noBackward', tier: 'exotic', souls: 0, ordered: false },
]

/**
 * Guichets qui n'existent que si le joueur possède l'artefact nommé : le grade du stagiaire ne
 * suffit pas à les ouvrir, il faut avoir acheté le registre.
 */
export const BET_TYPE_ARTEFACT: Readonly<Partial<Record<BetTypeId, string>>> = {
  rammedTwice: 'registreExotique',
  noBackward: 'registreExotique',
}

/** Niveau du stagiaire requis par type de pari (config economy.betUnlockLevel). */
export type BetUnlockLevels = Readonly<Record<BetTypeId, number>>

/** Le type est-il ouvert au niveau donné ? Les paris à gros multiplicateur arrivent avec les grades du stagiaire. */
export function betUnlocked(type: BetTypeId, level: number, unlock: BetUnlockLevels, owned: readonly string[] = []): boolean {
  const needed = BET_TYPE_ARTEFACT[type]
  if (needed !== undefined && !owned.includes(needed)) return false
  return level >= unlock[type]
}

/** Types ouverts à un niveau, dans l'ordre du catalogue. */
export function unlockedBetTypes(level: number, unlock: BetUnlockLevels, owned: readonly string[] = []): BetTypeDef[] {
  return BET_TYPES.filter((t) => betUnlocked(t.id, level, unlock, owned))
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

/**
 * Ticket de la première heure (artefacts.md n°13) : les paris posés avant le premier lancer
 * paient plus, ceux posés en course paient moins, sans jamais descendre sous ×1 — un pari gagné
 * ne peut pas être déficitaire. S'applique après la décote, sur la cote figée du ticket.
 */
export function ticketMultiplier(multiplier: number, initial: boolean, mods: { before: number; during: number }): number {
  const m = multiplier + (initial ? mods.before : -mods.during)
  return Math.round(Math.max(1, m) * 100) / 100
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
 * Raison pour laquelle un pari ne peut pas être posé. Un code, pas une phrase : la phrase
 * est écrite par langue dans le lexique (`BETS.refusal`), le moteur dit seulement ce qui
 * cloche. `missingSouls` porte le compte, la phrase s'accorde dessus.
 */
export type BetRefusal =
  | { kind: 'raceFinished' }
  | { kind: 'bettingClosed' }
  | { kind: 'soulTwice' }
  | { kind: 'missingSouls'; given: number; needed: number }
  | { kind: 'tooManySouls' }
  | { kind: 'unknownSoul' }
  | { kind: 'soulBarred' }
  | { kind: 'alreadyPlaced' }
  | { kind: 'noStake' }
  | { kind: 'tooExpensive' }

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
): BetRefusal | null {
  if (state.finished) return { kind: 'raceFinished' }
  if (bettingClosed(state)) return { kind: 'bettingClosed' }
  const def = betType(type)
  const needed = slotCount(def, state.souls.length)
  if (new Set(souls).size !== souls.length) return { kind: 'soulTwice' }
  if (souls.length < needed) return { kind: 'missingSouls', given: souls.length, needed }
  if (souls.length > needed) return { kind: 'tooManySouls' }
  for (const id of souls) {
    if (!state.souls[id]) return { kind: 'unknownSoul' }
    // Roue d'Ixion : une âme renvoyée au départ garde son guichet fermé, où qu'elle soit.
    if (state.barred.includes(id)) return { kind: 'soulBarred' }
  }
  if (existing.some((b) => isSameBet(b, { type, souls }))) return { kind: 'alreadyPlaced' }
  if (stake <= 0) return { kind: 'noStake' }
  if (stake > money) return { kind: 'tooExpensive' }
  return null
}

export interface Cancellation {
  bets: Bet[]
  /** Mise rendue intégralement au joueur. */
  refund: number
}

/**
 * Retrait d'un pari : la mise est rendue en entier et le pari disparaît. Permis seulement
 * tant que la course n'a pas commencé (`beforeStart`, la préparation côté écran) : dès que
 * les dés roulent, l'engagement fait partie du jeu. Renvoie la raison du refus sinon.
 */
/** Raison d'un retrait refusé ; la phrase est dans le lexique (`BETS.cancelRefusal`). */
export type CancelRefusal = 'raceStarted' | 'notFound' | 'alreadySettled'

export function cancelBet(bets: readonly Bet[], id: number, beforeStart: boolean): Cancellation | CancelRefusal {
  if (!beforeStart) return 'raceStarted'
  const bet = bets.find((b) => b.id === id)
  if (!bet) return 'notFound'
  if (bet.status !== 'open') return 'alreadySettled'
  return { bets: bets.filter((b) => b.id !== id), refund: bet.stake }
}

function rankOf(ranked: readonly Ranked[], id: SoulId): number {
  const r = ranked.find((x) => x.soul.id === id)
  if (!r) throw new Error(`âme ${id} absente du classement`)
  return r.rank
}

/**
 * Vrai si le pari est gagné contre ce classement définitif. `topBonus` élargit les conditions
 * « dans le top 3 » (Quatrième marche, artefacts.md n°15) : elles réussissent aussi avec une 4e
 * place. Ni « Pas dans le top 3 » ni le Podium exact ne bougent — l'artefact ne doit pas rendre
 * un pari négatif plus facile à gagner, ni relâcher un ordre exact.
 */
/**
 * Ce que les guichets exotiques ont besoin de savoir du déroulé de la course, et que le
 * classement ne dit pas : combien de fois chaque âme s'est fait percuter, et si une seule âme
 * a reculé. Le moteur les compte dans `applyMove` (`RaceState.rams`, `RaceState.backward`).
 */
export interface RaceStats {
  rams: Readonly<Record<number, number>>
  backward: boolean
}

/** Percussions à atteindre pour gagner « cette âme sera percutée » (artefacts.md n°39). */
export const RAMMED_TARGET = 2

export function evaluateBet(bet: Pick<Bet, 'type' | 'souls'>, ranked: readonly Ranked[], topBonus = 0, stats?: RaceStats): boolean {
  const top = 3 + Math.max(0, topBonus)
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
      return rankOf(ranked, at(0)) <= top
    case 'notTop3':
      return rankOf(ranked, at(0)) > 3
    case 'last':
      return rankOf(ranked, at(0)) === last
    case 'podiumAnyOrder':
      return s.length === 3 && s.every((id) => rankOf(ranked, id) <= top)
    case 'twoInTop3':
      return s.length === 2 && s.every((id) => rankOf(ranked, id) <= top)
    case 'duel':
      return rankOf(ranked, at(0)) < rankOf(ranked, at(1))
    case 'podiumExact':
      return s.length === 3 && exactOrder(3)
    case 'fullRankingExact':
      return s.length === ranked.length && exactOrder(ranked.length)
    case 'winnerAndLast':
      return rankOf(ranked, at(0)) === 1 && rankOf(ranked, at(1)) === last
    // Sans statistiques de course, un pari exotique ne peut pas être gagné : on ne devine pas
    // un déroulé qu'on n'a pas observé, et perdre est le résultat prudent.
    case 'rammedTwice':
      return (stats?.rams[at(0)] ?? 0) >= RAMMED_TARGET
    case 'noBackward':
      return stats !== undefined && !stats.backward
  }
}

export interface Settlement {
  bets: Bet[]
  /** Total misé sur la course. */
  staked: number
  /** Total rendu au joueur, remboursement compris. */
  returned: number
  /** Livre des comptes : remboursement partiel d'un pari perdu tiré au sort (0 sinon). */
  refund: number
  /** Baume du perdant : part des mises perdues rendue (0 sinon). */
  relief: number
}

export interface SettleOptions {
  /** Livre des comptes : part remboursée d'un pari perdu tiré au sort. */
  refundRatio?: number
  /** Tirage parmi les n paris perdus : renvoie un index dans [0, n). Le premier par défaut. */
  pickLost?: (count: number) => number
  /** Quatrième marche : les conditions « top 3 » s'étendent au top 3 + n. */
  topBonus?: number
  /** Denier du cercle : mise virtuelle ajoutée au règlement d'un pari gagné, sans rien coûter. */
  stakeBonus?: number
  /** Baume du perdant : part de la mise rendue sur chaque pari perdu (appliquée après le Livre des comptes). */
  lossRelief?: number
  /** Encensoir du dernier : facteur sur « Dernière place » quand l'écart avec l'avant-dernière est assez grand. */
  lastGap?: { cells: number; factor: number }
  /**
   * Le Juge (personnalité, GDD §6.5) : facteur sur tous les gains de la course selon sa
   * place — 1,5 dans le top 3, 0,5 s'il finit dernier. Les pertes ne sont pas touchées :
   * c'est une prime, pas une amende. 1 (ou absent) quand aucun Juge n'est en piste.
   */
  gainFactor?: number
  /** Registre des paris exotiques : le déroulé de la course, que le classement ne porte pas. */
  stats?: RaceStats
}

/**
 * Encensoir du dernier : l'écart, en cases, entre la dernière âme et l'avant-dernière. Zéro
 * quand elles sont à égalité ou qu'il n'y a pas deux rangs distincts.
 */
export function lastGapCells(ranked: readonly Ranked[]): number {
  const last = ranked.reduce((m, r) => Math.max(m, r.rank), 0)
  const tail = ranked.filter((r) => r.rank === last)
  if (tail.length !== 1) return 0
  const others = ranked.filter((r) => r.rank !== last)
  if (others.length === 0) return 0
  const before = Math.min(...others.map((r) => r.soul.position))
  return Math.max(0, before - (tail[0]?.soul.position ?? 0))
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

/**
 * Règle tous les paris ouverts contre le classement définitif, à la cote figée de chaque pari.
 *
 * Ordre des artefacts d'argent, qui compte : le gain se calcule sur `mise + stakeBonus`
 * (Denier du cercle), l'Encensoir multiplie ensuite le seul pari Dernière place et Le Juge
 * tous les gains de la course (`gainFactor`, personnalités), puis le Livre
 * des comptes rembourse un perdant tiré au sort, et le Baume du perdant s'applique en dernier
 * sur ce qui reste perdu — les deux filets se cumulent sans jamais rendre plus que la mise.
 */
export function settleBets(bets: readonly Bet[], ranked: readonly Ranked[], options: SettleOptions = {}): Settlement {
  const stakeBonus = Math.max(0, options.stakeBonus ?? 0)
  const gap = options.lastGap && lastGapCells(ranked) >= options.lastGap.cells ? options.lastGap.factor : 1
  let staked = 0
  let returned = 0
  const settled = bets.map((b) => {
    staked += b.stake
    if (b.status !== 'open') {
      returned += b.payout
      return b
    }
    const won = evaluateBet(b, ranked, options.topBonus, options.stats)
    // L'Encensoir ne touche que « Dernière place » ; Le Juge, lui, pèse sur tout le tableau.
    const factor = (b.type === 'last' ? gap : 1) * (options.gainFactor ?? 1)
    const payout = won ? Math.round(potentialPayout(b.stake + stakeBonus, b.multiplier) * factor) : 0
    returned += payout
    return { ...b, status: won ? 'won' : 'lost', payout } as Bet
  })
  let refund = 0
  const lost = settled.filter((b) => b.status === 'lost')
  let refunded: Bet | null = null
  if (options.refundRatio && lost.length > 0) {
    const pick = options.pickLost ? options.pickLost(lost.length) : 0
    refunded = lost[Math.min(Math.max(0, Math.floor(pick)), lost.length - 1)]!
    refund = Math.round(refunded.stake * options.refundRatio)
    returned += refund
  }
  let relief = 0
  if (options.lossRelief) {
    for (const b of lost) {
      // Le Baume ne porte que sur la perte restante : ce que le Livre a déjà rendu n'est plus perdu.
      const already = b === refunded ? refund : 0
      relief += Math.round(Math.max(0, b.stake - already) * options.lossRelief)
    }
    returned += relief
  }
  return { bets: settled, staked, returned, refund, relief }
}
