/**
 * Machine à états de la course côté écran.
 *
 * Phases :  betting → shop → idle → rolling → pairing → resolving → opponent → (idle | finished)
 *
 * Le noyau est pur ; ici on enchaîne ses fonctions avec des pauses pour que le
 * testeur voie chaque geste. Un `runId` invalide toute séquence en cours quand on
 * relance une course. La vérité vit dans `uiRef` ; `setUi` ne sert qu'à rafraîchir.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { config, shop } from '../core/config'
import { betRefusal, betType, betUnlocked, cancelBet as cancelBetRule, currentMultiplier, effectiveBase, fmtMultiplier, potentialPayout, raceProgress, settleBets, type BaseModifiers, type Bet, type BetTypeId, type Settlement } from '../core/rules/bets'
import { fmtFace, type DistanceDie } from '../core/rules/dice'
import {
  applyMove,
  buildMoves,
  createRace,
  createTrack,
  endTurn,
  isPairingComplete,
  naturalCombinations,
  previewMove,
  ranking,
  rollOpponentPair,
  rollPlayerDice,
  unusedSoulMoves,
  type Combination,
  type MoveContext,
  type MoveResult,
  type RaceOptions,
  type RaceState,
  type Roll,
} from '../core/rules/race'
import { randomSeed, seededRng, type Rng } from '../core/rules/rng'
import type { BlockedCell } from '../core/config/schema'
import type { ShopItem } from '../core/shop/items'
import { applyPurchase, findItem, generateVitrine, opponentNegativesFlipped, priceAtCircle, type Inventory, type PurchaseTarget } from '../core/shop/shop'
import { demonLevelAtRace, rankOfLevel } from './demon'
import { seedForRace } from './urlParams'
import { BETS, fill } from './texts'

export type Phase = 'prep' | 'idle' | 'rolling' | 'pairing' | 'resolving' | 'opponent' | 'finished'

/** Phases pendant lesquelles on peut poser un pari : la préparation (paris initiaux + boutique), et avant de lancer ses dés. */
export const BETTING_PHASES: readonly Phase[] = ['prep', 'idle']

/** Peut-on poser un pari maintenant ? Avant de lancer, ou après le lancer si l'Œil du parieur a été activé ce tour. */
export function canBetNow(ui: Pick<RaceUi, 'phase' | 'lateBetOpen'>): boolean {
  return BETTING_PHASES.includes(ui.phase) || (ui.phase === 'pairing' && ui.lateBetOpen)
}

export interface LogEntry {
  id: number
  turn: number
  source: 'player' | 'opponent' | 'system' | 'bet' | 'shop' | 'artefact'
  text: string
}

export interface RaceUi {
  race: RaceState
  phase: Phase
  roll: Roll | null
  combinations: Combination[]
  selectedSoulDie: number | null
  resolvingIndex: number | null
  opponentRoll: Roll | null
  lastResult: MoveResult | null
  log: LogEntry[]
  seed: number
  /** Argent du joueur, conservé de course en course. */
  money: number
  bets: Bet[]
  settlement: Settlement | null
  /** Artefacts et dés, conservés de course en course. */
  inventory: Inventory
  /** Index de la course dans la session, à partir de 0 ; le cercle en découle. */
  raceIndex: number
  lateBetCharges: number
  lateBetOpen: boolean
  /** Vitrine de la boutique pour cette visite (générée à la première ouverture). */
  vitrine: ShopItem[] | null
  /** Objet en attente d'une cible (dé à remplacer, face à forger). */
  pendingPurchase: string | null
  /** Compteurs de la course pour les statistiques. */
  tally: RaceTally
}

export interface RaceTally {
  /** Dépenses en boutique (achats + renouvellements). */
  spent: number
  /** Meilleur gain net d'un pari de la course. */
  bestBet: number
}

export interface SessionCarry {
  money: number
  inventory: Inventory
  raceIndex: number
  lateBetCharges: number
}

export interface UseRaceProps {
  carry: SessionCarry
  /** Nombre d'âmes en course pour ce cercle. */
  soulCount: number
  /** Couloirs et cases bloquées du cercle (GDD §2.2). */
  lanes: number
  blocked: readonly BlockedCell[]
  /** Multiplicateur de vitesse des animations (option). */
  speed: number
}

/** Bonus du Sceau du parieur au-dessus du +1 de la face. */
const SEAL_BONUS = 2

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function fmt(d: number): string {
  return d > 0 ? `+${d}` : `${d}`
}

export function circleOf(raceIndex: number): { circle: number; raceInCircle: number } {
  return { circle: Math.floor(raceIndex / config.run.racesPerCircle) + 1, raceInCircle: (raceIndex % config.run.racesPerCircle) + 1 }
}

function param(id: string, key: string, fallback: number): number {
  return findItem(shop, id).params[key] ?? fallback
}

export function itemName(id: string): string {
  return findItem(shop, id).name
}

/** Fer à cheval : facteurs sur la cote de base. */
export function baseModifiers(inventory: Inventory): BaseModifiers {
  if (!inventory.artefacts.includes('ferACheval')) return {}
  return { winnerFactor: param('ferACheval', 'winnerFactor', 1.5), lastFactor: param('ferACheval', 'lastFactor', 0.5) }
}

/** Cote de base d'un type de pari, artefacts compris. */
export function betBase(type: BetTypeId, inventory: Inventory): number {
  return effectiveBase(type, config.economy.multipliers[type], baseModifiers(inventory))
}

export function priceFor(item: ShopItem, raceIndex: number): number {
  return priceAtCircle(item.price, circleOf(raceIndex).circle, shop.priceGrowthPerCircle)
}

/** Options de piste : celles du cercle, plus les artefacts qui changent le plateau. */
function raceOptions(inventory: Inventory, base: RaceOptions): RaceOptions {
  const o: RaceOptions = { ...base }
  if (inventory.artefacts.includes('sablier')) o.betThresholdRatio = config.artefacts.sablier.betThresholdRatio
  return o
}

/** Charges de l'Œil du parieur pour un cercle neuf. */
export function fullCharges(inventory: Inventory): number {
  return inventory.artefacts.includes('lateBet') ? config.artefacts.lateBet.chargesPerCircle : 0
}

/** Somme des mises des paris encore ouverts : ce qui est « misé en course » dans la jauge. */
export function stakedOpen(bets: readonly Bet[]): number {
  return bets.filter((b) => b.status === 'open').reduce((s, b) => s + b.stake, 0)
}

/** Contexte des modificateurs du joueur (Clepsydre, Sceau), identique en résolution et en prévisualisation. */
function moveContext(u: Pick<RaceUi, 'race' | 'inventory' | 'bets'>): MoveContext {
  return {
    turn: u.race.turn,
    clepsydre: u.inventory.artefacts.includes('clepsydre'),
    bettedSouls: new Set(u.bets.filter((b) => b.status === 'open').flatMap((b) => [...b.souls])),
    sealBonus: SEAL_BONUS,
  }
}

export interface ProdigalityCharge {
  die: DistanceDie
  distanceDie: number
  paid: boolean
}

/**
 * Dé de Prodigalité : chaque association d'un dé à coût prélève son prix, dans l'ordre de la
 * file ; sans argent, la face vaut 0. Pur : renvoie le lancer corrigé et la liste des
 * prélèvements, pour que la résolution et la prévisualisation racontent la même histoire.
 */
export function applyProdigality(roll: Roll, combinations: readonly Combination[], dice: readonly DistanceDie[], money: number): { roll: Roll; charges: ProdigalityCharge[] } {
  let out = roll
  let cash = money
  const charges: ProdigalityCharge[] = []
  for (const c of combinations) {
    const die = dice[c.distanceDie]
    if (!die || die.costPerUse <= 0) continue
    if (cash >= die.costPerUse) {
      cash -= die.costPerUse
      charges.push({ die, distanceDie: c.distanceDie, paid: true })
    } else {
      out = { ...out, faces: out.faces.map((f, i) => (i === c.distanceDie ? { ...f, value: 0 } : f)), distance: out.distance.map((d, i) => (i === c.distanceDie ? 0 : d)) }
      charges.push({ die, distanceDie: c.distanceDie, paid: false })
    }
  }
  return { roll: out, charges }
}

/**
 * Prévisualisation du prochain déplacement (spec 05/C2) : en appariement, le premier
 * déplacement de la file — cumul compris si deux combinaisons visent la même âme — passé
 * par les mêmes règles que `resolve` (Prodigalité, Clepsydre, Sceau, puis `previewMove`).
 * Null hors appariement ou file vide. Ne touche ni l'état ni le hasard.
 */
export function previewNext(u: RaceUi): MoveResult | null {
  if (u.phase !== 'pairing' || !u.roll || u.combinations.length === 0) return null
  const { roll } = applyProdigality(u.roll, u.combinations, u.inventory.dice, u.money)
  const first = buildMoves(roll, u.combinations, 'player', moveContext(u))[0]
  if (!first) return null
  const result = previewMove(u.race, first.soul, first.distance)
  return { ...result, move: first }
}

function initial(seed: number, carry: SessionCarry, base: RaceOptions): RaceUi {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  const race = createRace(config, raceOptions(carry.inventory, base))
  const lanes = race.track.lanes
  const blocked = race.track.blocked.length
  return {
    race,
    phase: 'prep',
    roll: null,
    combinations: [],
    selectedSoulDie: null,
    resolvingIndex: null,
    opponentRoll: null,
    lastResult: null,
    log: [{ id: 0, turn: 1, source: 'system', text: `Cercle ${circle}, course ${raceInCircle}/${config.run.racesPerCircle} — ${race.souls.length} âmes, ${config.track.columns} cases, ${lanes} couloir${lanes > 1 ? 's' : ''}${blocked > 0 ? `, ${blocked} case${blocked > 1 ? 's' : ''} bloquée${blocked > 1 ? 's' : ''}` : ''}, graine ${seed}. Posez vos paris initiaux.` }],
    seed,
    money: carry.money,
    bets: [],
    settlement: null,
    inventory: carry.inventory,
    raceIndex: carry.raceIndex,
    lateBetCharges: carry.lateBetCharges,
    lateBetOpen: false,
    vitrine: null,
    pendingPurchase: null,
    tally: { spent: 0, bestBet: 0 },
  }
}

/** Ce que la rencontre rend à la session quand elle est finie. */
export function carryOut(ui: RaceUi): SessionCarry {
  return { money: ui.money, inventory: ui.inventory, raceIndex: ui.raceIndex + 1, lateBetCharges: ui.lateBetCharges }
}

export function useRace({ carry, soulCount, lanes, blocked, speed }: UseRaceProps) {
  // Graine au hasard, sauf `?seed=NNN` dans l'URL (tests e2e) : course, dés et vitrine deviennent déterministes.
  const [seed] = useState(() => seedForRace(carry.raceIndex) ?? randomSeed())
  const [ui, setUi] = useState<RaceUi>(() => initial(seed, carry, { soulCount, lanes, blocked }))
  const [auto, setAuto] = useState(false)

  const uiRef = useRef<RaceUi>(ui)
  const commit = useCallback((u: RaceUi): RaceUi => {
    uiRef.current = u
    setUi(u)
    return u
  }, [])

  const rngRef = useRef<Rng>(seededRng(seed))
  const runId = useRef(0)
  const logId = useRef(1)
  const betId = useRef(1)
  const speedRef = useRef<number>(speed)
  speedRef.current = speed

  const wait = useCallback(async (ms: number, id: number): Promise<boolean> => {
    await sleep(ms / speedRef.current)
    return runId.current === id
  }, [])

  const pushLog = useCallback((u: RaceUi, source: LogEntry['source'], text: string): RaceUi => {
    return { ...u, log: [...u.log, { id: logId.current++, turn: u.race.turn, source, text }] }
  }, [])

  const describe = useCallback((u: RaceUi, r: MoveResult): string => {
    const name = (id: number): string => u.race.souls[id]?.name ?? `#${id}`
    const who = name(r.move.soul)
    const dist = r.move.parts.length > 1 ? `${r.move.parts.map((p) => fmt(p.distance)).join(' ')} = ${fmt(r.move.distance)}` : fmt(r.move.distance)
    const notes = r.move.notes.length > 0 ? ` (${r.move.notes.join(' ; ')})` : ''
    if (r.blockedAtStart) return `${who} ${dist}${notes} : sur la ligne de départ, ne recule pas.`
    let s = `${who} ${dist}${notes} : case ${r.from} → ${r.to}.`
    if (r.detour === 'blocked') s += ` Couloir bloqué, se décale sur le couloir ${r.toLane + 1}.`
    if (r.detour === 'occupied') s += ` Case occupée, se décale sur le couloir ${r.toLane + 1}.`
    if (r.collision?.kind === 'jump') s += ` Percute ${r.collision.over.map(name).join(', ')} et saute devant.`
    if (r.collision?.kind === 'swap') s += ` Recule sur ${name(r.collision.with)} : échange de place (${name(r.collision.with)} passe en ${r.collision.otherTo}).`
    if (r.crossedFinish) s += ` Franchit l'arrivée !`
    return s
  }, [])

  // ---- Paris -------------------------------------------------------------

  /** Niveau du stagiaire pendant cette course : conditionne les types de paris ouverts. */
  const level = demonLevelAtRace(carry.raceIndex)

  const placeBet = useCallback((type: BetTypeId, souls: readonly number[], stake: number): string | null => {
    const u = uiRef.current
    if (!canBetNow(u)) return u.phase === 'pairing' ? 'Les dés sont lancés : plus de pari avant le prochain tour.' : 'Attendez la fin de la résolution.'
    if (!betUnlocked(type, level, config.economy.betUnlockLevel)) return fill(BETS.locked, { rank: rankOfLevel(config.economy.betUnlockLevel[type]).name })
    const refusal = betRefusal(u.race, type, souls, stake, u.money, u.bets)
    if (refusal) return refusal
    const multiplier = currentMultiplier(betBase(type, u.inventory), raceProgress(u.race), config.economy.decay)
    const bet: Bet = { id: betId.current++, type, souls: [...souls], stake, multiplier, turn: u.phase === 'prep' ? 0 : u.race.turn, status: 'open', payout: 0 }
    const names = souls.map((id) => u.race.souls[id]?.name ?? `#${id}`).join(betType(type).ordered ? ' > ' : ', ')
    commit(pushLog({ ...u, money: u.money - stake, bets: [...u.bets, bet] }, 'bet', `Pari ${betType(type).label} sur ${names} : mise ${stake} à ${fmtMultiplier(multiplier)}, rapporte ${potentialPayout(stake, multiplier)} si gagné.`))
    return null
  }, [commit, pushLog, level])

  /** Retrait d'un pari en préparation (spec 03/C3) : mise rendue en entier, pari supprimé. */
  const cancelBet = useCallback((id: number): string | null => {
    const u = uiRef.current
    const r = cancelBetRule(u.bets, id, u.phase === 'prep')
    if (typeof r === 'string') return r
    const bet = u.bets.find((b) => b.id === id)
    const label = bet ? betType(bet.type).label : '?'
    commit(pushLog({ ...u, money: u.money + r.refund, bets: r.bets }, 'bet', `Pari ${label} retiré : ${r.refund} pièces rendues.`))
    return null
  }, [commit, pushLog])

  /** Œil du parieur : ouvre la fenêtre de pari après le lancer, une charge par cercle. */
  const useLateBet = useCallback(() => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.inventory.artefacts.includes('lateBet') || u.lateBetCharges <= 0 || u.lateBetOpen) return
    commit(pushLog({ ...u, lateBetCharges: u.lateBetCharges - 1, lateBetOpen: true }, 'artefact', "Œil du parieur : vous pouvez parier après avoir vu vos dés, jusqu'à la résolution."))
  }, [commit, pushLog])

  // ---- Boutique ----------------------------------------------------------

  /** La boutique n'ouvre qu'avec au moins un pari initial ; la vitrine est tirée à la première ouverture. */
  const shopUnlocked = useCallback((u: RaceUi): boolean => u.phase === 'prep' && u.bets.length > 0, [])

  const openShop = useCallback((): boolean => {
    const u = uiRef.current
    if (!shopUnlocked(u)) return false
    if (u.vitrine === null) {
      const vitrine = generateVitrine(shop, u.inventory, rngRef.current)
      commit(pushLog({ ...u, vitrine, pendingPurchase: null }, 'shop', `La boutique ouvre : ${vitrine.length} objets en vitrine.`))
    }
    return true
  }, [commit, pushLog, shopUnlocked])

  const rerollVitrine = useCallback(() => {
    const u = uiRef.current
    if (!shopUnlocked(u) || u.money < shop.rerollCost) return
    const vitrine = generateVitrine(shop, u.inventory, rngRef.current)
    commit(pushLog({ ...u, money: u.money - shop.rerollCost, vitrine, pendingPurchase: null, tally: { ...u.tally, spent: u.tally.spent + shop.rerollCost } }, 'shop', `Vitrine renouvelée pour ${shop.rerollCost} pièces.`))
  }, [commit, pushLog, shopUnlocked])

  /** Pourquoi un objet n'est pas achetable maintenant, ou null. */
  const purchaseRefusal = useCallback((u: RaceUi, item: ShopItem): string | null => {
    if (!shopUnlocked(u)) return 'La boutique est fermée.'
    const price = priceFor(item, u.raceIndex)
    if (u.money < price) return 'Pas assez d’argent.'
    if (item.kind === 'artefact') {
      if (u.inventory.artefacts.includes(item.id)) return 'Déjà possédé.'
      if (u.inventory.artefacts.length >= shop.artefactSlots) return `Emplacements d’artefacts pleins (${shop.artefactSlots}).`
    }
    if (item.kind === 'forge' && !u.inventory.dice.some((d) => d.faces.some((f) => !f.altered))) return 'Plus aucune face à forger.'
    return null
  }, [shopUnlocked])

  /**
   * Achat. Un dé spécial ou une altération de forge demande une cible : le premier
   * appel sans cible met l'objet en attente, l'écran propose le choix, le second appel l'applique.
   */
  const buy = useCallback((itemId: string, target: PurchaseTarget | null = null): string | null => {
    const u = uiRef.current
    const item = u.vitrine?.find((i) => i.id === itemId)
    if (!item) return 'Objet absent de la vitrine.'
    const refusal = purchaseRefusal(u, item)
    if (refusal) return refusal
    if (item.kind !== 'artefact' && !target) {
      commit({ ...u, pendingPurchase: itemId })
      return null
    }
    try {
      const { inventory, text } = applyPurchase(item, u.inventory, target)
      const price = priceFor(item, u.raceIndex)
      const lateBetCharges = item.kind === 'artefact' && item.id === 'lateBet' ? config.artefacts.lateBet.chargesPerCircle : u.lateBetCharges
      let next = pushLog({ ...u, money: u.money - price, inventory, lateBetCharges, vitrine: (u.vitrine ?? []).filter((i) => i !== item), pendingPurchase: null, tally: { ...u.tally, spent: u.tally.spent + price } }, 'shop', `${text} (${price} pièces)`)
      // Le Sablier change le plateau : on achète en préparation, personne n'a bougé, le plateau est refait tout de suite.
      if (item.kind === 'artefact' && item.id === 'sablier') {
        const track = createTrack(config.track, raceOptions(inventory, { lanes: u.race.track.lanes, blocked: u.race.track.blocked }))
        next = pushLog({ ...next, race: { ...next.race, track } }, 'shop', `Seuil de pari à ${Math.round(track.betThresholdRatio * 100)} % dès cette course.`)
      }
      commit(next)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Achat impossible.'
    }
  }, [commit, purchaseRefusal, pushLog])

  const cancelPurchase = useCallback(() => {
    const u = uiRef.current
    if (u.pendingPurchase !== null) commit({ ...u, pendingPurchase: null })
  }, [commit])

  /** Fin de la préparation : au moins un pari, la course commence. */
  const startRace = useCallback(() => {
    const u = uiRef.current
    if (u.phase !== 'prep' || u.bets.length === 0) return
    commit(pushLog({ ...u, phase: 'idle', pendingPurchase: null }, 'system', 'La course commence.'))
  }, [commit, pushLog])

  // ---- Course ------------------------------------------------------------

  /** Résout une liste de déplacements avec animation ; renvoie false si la séquence a été annulée. */
  const resolveMoves = useCallback(
    async (id: number, moves: ReturnType<typeof buildMoves>, indexOf: (i: number) => number | null): Promise<boolean> => {
      const coinsPerCollision = uiRef.current.inventory.artefacts.includes('boursePercee') ? param('boursePercee', 'coinsPerCollision', 2) : 0
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i]
        if (!m) continue
        commit({ ...uiRef.current, resolvingIndex: indexOf(i) })
        if (!(await wait(config.animation.pauseMs, id))) return false
        const u = uiRef.current
        const { state, result } = applyMove(u.race, m)
        let next = pushLog({ ...u, race: state, lastResult: result }, m.source, describe(u, result))
        if (result.collision && coinsPerCollision > 0) next = pushLog({ ...next, money: next.money + coinsPerCollision }, 'artefact', `Bourse percée : +${coinsPerCollision} pièces.`)
        commit(next)
        if (!(await wait(config.animation.stepMs, id))) return false
      }
      return true
    },
    [commit, describe, pushLog, wait],
  )

  const rollDice = useCallback(async () => {
    const id = runId.current
    const u = uiRef.current
    if (u.phase !== 'idle') return
    commit({ ...u, phase: 'rolling', roll: null, combinations: [], selectedSoulDie: null, lastResult: null, opponentRoll: null })
    const roll = rollPlayerDice(config, u.race.souls.length, rngRef.current, u.inventory.dice)
    if (!(await wait(config.animation.diceMs, id))) return
    const v = uiRef.current
    const names = roll.soul.map((s) => v.race.souls[s]?.name ?? `#${s}`)
    let next = pushLog({ ...v, phase: 'pairing', roll }, 'player', `Lancer : Distance ${roll.faces.map(fmtFace).join(' / ')} — Âmes ${names.join(' / ')}.`)
    // Face dorée : pièces à chaque sortie, associée ou non.
    const gold = roll.faces.filter((f) => f.effect === 'gold').length
    if (gold > 0) {
      const coins = gold * param('doree', 'coins', 5)
      next = pushLog({ ...next, money: next.money + coins }, 'artefact', `Face dorée : +${coins} pièces.`)
    }
    commit(next)
  }, [commit, pushLog, wait])

  const pickSoulDie = useCallback((i: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || u.combinations.some((c) => c.soulDie === i)) return
    commit({ ...u, selectedSoulDie: u.selectedSoulDie === i ? null : i })
  }, [commit])

  const pickDistanceDie = useCallback((i: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || u.selectedSoulDie === null || u.combinations.some((c) => c.distanceDie === i)) return
    commit({ ...u, combinations: [...u.combinations, { soulDie: u.selectedSoulDie, distanceDie: i }], selectedSoulDie: null })
  }, [commit])

  const resetPairing = useCallback(() => {
    const u = uiRef.current
    if (u.phase === 'pairing') commit({ ...u, combinations: [], selectedSoulDie: null })
  }, [commit])

  /** Dissocie une combinaison de la file : ses dés redeviennent disponibles, les numéros se recalculent (spec 05/C1). */
  const removeCombination = useCallback((index: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.combinations[index]) return
    commit({ ...u, combinations: u.combinations.filter((_, i) => i !== index), selectedSoulDie: null })
  }, [commit])

  /** Échange une combinaison avec sa voisine (dir −1 = plus tôt, +1 = plus tard) : l'ordre de résolution est une décision. */
  const moveCombination = useCallback((index: number, dir: -1 | 1) => {
    const u = uiRef.current
    const j = index + dir
    if (u.phase !== 'pairing' || !u.combinations[index] || !u.combinations[j]) return
    const next = [...u.combinations]
    const a = next[index]!
    next[index] = next[j]!
    next[j] = a
    commit({ ...u, combinations: next })
  }, [commit])

  const autoPair = useCallback(() => {
    const u = uiRef.current
    if (u.phase === 'pairing' && u.roll) commit({ ...u, combinations: naturalCombinations(u.roll), selectedSoulDie: null })
  }, [commit])

  const resolve = useCallback(async () => {
    const id = runId.current
    const s = uiRef.current
    if (s.phase !== 'pairing' || !s.roll || !isPairingComplete(s.roll, s.combinations)) return
    let cur = commit({ ...s, phase: 'resolving', selectedSoulDie: null, lateBetOpen: false })

    // Dé de Prodigalité : chaque association coûte ; sans argent, la face vaut 0. Même calcul que la prévisualisation.
    const { roll, charges } = applyProdigality(cur.roll as Roll, cur.combinations, cur.inventory.dice, cur.money)
    for (const ch of charges) {
      cur = ch.paid
        ? commit(pushLog({ ...cur, money: cur.money - ch.die.costPerUse }, 'artefact', `${ch.die.name} : −${ch.die.costPerUse} pièces pour cette association.`))
        : commit(pushLog({ ...cur, roll }, 'artefact', `${ch.die.name} : pas assez d'argent, la face vaut 0.`))
    }

    const moves = buildMoves(roll, cur.combinations, 'player', moveContext(cur))
    const combos = cur.combinations
    const indexOf = (i: number): number | null => {
      const first = moves[i]?.parts[0]
      return first ? combos.findIndex((c) => c.soulDie === first.soulDie && c.distanceDie === first.distanceDie) : null
    }
    if (!(await resolveMoves(id, moves, indexOf))) return

    // Boussole des Limbes : chaque dé Âme inutilisé fait avancer son âme de 1.
    if (uiRef.current.inventory.artefacts.includes('boussole')) {
      const extra = unusedSoulMoves(roll, combos)
      if (extra.length > 0) {
        commit({ ...uiRef.current, resolvingIndex: null })
        if (!(await resolveMoves(id, extra, () => null))) return
      }
    }

    // Tour de l'adversaire (§2.5.2).
    commit({ ...uiRef.current, phase: 'opponent', resolvingIndex: null })
    const flip = opponentNegativesFlipped(uiRef.current.inventory)
    for (let k = 0; k < config.opponent.rollsPerTurn; k++) {
      const pair = rollOpponentPair(config, uiRef.current.race.souls.length, rngRef.current, { flipNegatives: flip })
      commit({ ...uiRef.current, opponentRoll: null, lastResult: null })
      if (!(await wait(config.animation.diceMs, id))) return
      const u = uiRef.current
      const name = u.race.souls[pair.soul[0] ?? 0]?.name ?? '?'
      commit(pushLog({ ...u, opponentRoll: pair }, 'opponent', `L'adversaire lance : ${name} ${fmt(pair.distance[0] ?? 0)}.`))
      if (!(await resolveMoves(id, buildMoves(pair, naturalCombinations(pair), 'opponent'), () => null))) return
    }

    const u = uiRef.current
    const ended = endTurn(u.race)
    if (!ended.finished) {
      commit({ ...u, race: ended, phase: 'idle', resolvingIndex: null, roll: null, combinations: [], opponentRoll: null })
      return
    }
    let done = pushLog({ ...u, race: ended, phase: 'finished', resolvingIndex: null }, 'system', `Une âme a franchi l'arrivée : fin de course au tour ${ended.turn}.`)
    const refundRatio = u.inventory.artefacts.includes('livreDesComptes') ? param('livreDesComptes', 'refundRatio', 0.5) : 0
    const settlement = settleBets(done.bets, ranking(ended), refundRatio > 0 ? { refundRatio, pickLost: (n) => rngRef.current.int(n) } : {})
    for (const b of settlement.bets) {
      const names = b.souls.map((id) => ended.souls[id]?.name ?? `#${id}`).join(betType(b.type).ordered ? ' > ' : ', ')
      done = pushLog(done, 'bet', b.status === 'won' ? `Pari ${betType(b.type).label} (${names}) gagné : +${b.payout - b.stake} net (mise ${b.stake} rendue).` : `Pari ${betType(b.type).label} (${names}) perdu : −${b.stake}.`)
    }
    if (settlement.refund > 0) done = pushLog(done, 'artefact', `Livre des comptes : ${settlement.refund} pièces remboursées.`)
    const net = settlement.returned - settlement.staked
    done = pushLog(done, 'system', `Bilan des paris : ${net >= 0 ? '+' : '−'}${Math.abs(net)}. Argent : ${done.money + settlement.returned}.`)
    const bestBet = settlement.bets.reduce((m, b) => Math.max(m, b.payout - b.stake), 0)
    commit({ ...done, bets: settlement.bets, settlement, money: done.money + settlement.returned, tally: { ...done.tally, bestBet } })
  }, [commit, pushLog, resolveMoves, wait])

  // Mode auto (test) : pari minimal, pas d'achat, combinaisons naturelles.
  useEffect(() => {
    if (!auto) return
    if (ui.phase === 'prep') {
      if (ui.bets.length === 0 && placeBet('winner', [0], config.economy.stakes[0] ?? 0) !== null) {
        setAuto(false)
        return
      }
      startRace()
    } else if (ui.phase === 'idle') void rollDice()
    else if (ui.phase === 'pairing') {
      autoPair()
      void resolve()
    }
  }, [auto, ui.phase, ui.bets.length, placeBet, startRace, rollDice, autoPair, resolve])

  return {
    ui,
    auto,
    setAuto,
    shopUnlocked: shopUnlocked(ui),
    level,
    actions: { openShop, startRace, buy, cancelPurchase, rerollVitrine, placeBet, cancelBet, useLateBet, rollDice, pickSoulDie, pickDistanceDie, resetPairing, removeCombination, moveCombination, autoPair, resolve },
  }
}
