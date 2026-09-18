/**
 * Machine à états de la course côté écran.
 *
 * Phases :  betting → shop → idle → rolling → pairing → resolving → opponent → (idle | finished)
 *
 * Le noyau est pur ; ici on enchaîne ses fonctions avec des pauses pour que le
 * testeur voie chaque geste. Un `runId` invalide toute séquence en cours quand on
 * relance une course. La vérité vit dans `uiRef` ; `setUi` ne sert qu'à rafraîchir.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { config, shop } from '../core/config'
import { betRefusal, betType, betUnlocked, cancelBet as cancelBetRule, currentMultiplier, effectiveBase, fmtMultiplier, potentialPayout, raceProgress, settleBets, ticketMultiplier, type BaseModifiers, type Bet, type BetTypeId, type SettleOptions, type Settlement } from '../core/rules/bets'
import { fmtFace, type DistanceDie, type Face } from '../core/rules/dice'
import { allowanceAtCircle, raceAllowance } from '../core/rules/allowance'
import {
  applyMove,
  buildMoves,
  createRace,
  createTrack,
  endTurn,
  isPairingComplete,
  isInBetZone,
  naturalCombinations,
  placeTribune,
  previewMove,
  ranking,
  rollOpponentPair,
  rollPlayerDice,
  unusedSoulMoves,
  type Combination,
  type Move,
  type MoveContext,
  type MoveResult,
  type MoveRules,
  type RaceOptions,
  type RaceState,
  type Roll,
} from '../core/rules/race'
import { randomSeed, seededRng, type Rng } from '../core/rules/rng'
import { stakesAtCircle } from '../core/rules/stakes'
import { terrainFor } from '../core/rules/terrain'
import type { Terrain } from '../core/config/schema'
import type { ArtefactId, ShopItem } from '../core/shop/items'
import { applyPurchase, effectivePrice, effectiveRerollCost, findItem, generateVitrine, opponentNegativesFlipped, type Inventory, type PriceRules, type PurchaseTarget } from '../core/shop/shop'
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
  /** Terrain tiré pour cette course (une des variantes du cercle). */
  terrain: Terrain
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
  /** Marteau d'Héphaïstos : la forge offerte du cercle a-t-elle déjà servi ? */
  forgeFreeUsed: boolean
  /** Fiole de sang : tour où le +1 a été acheté (0 = jamais ce tour-ci), une fois par tour. */
  fioleTurn: number
  /** Fiole de sang : bonus en attente sur chaque dé Distance, appliqué au lancer courant. */
  fioleBonus: readonly number[]
  /** Verrou de Minos : dé Distance gardé sur sa face du tour précédent (index), ou null. */
  lockedDie: number | null
  /** Faces du lancer précédent, pour le Verrou de Minos. */
  lastFaces: readonly Face[] | null
  /** Face d'élan : dés dont la relance a déjà été prise ce tour. */
  momentumUsed: readonly number[]
  /** Pièce à deux faces : les mises ont été doublées, l'adversaire lance une paire de plus. */
  doubledStakes: boolean
  /** Œil de Charon / Fouet du contremaître : paires adverses connues avant d'ordonner. */
  opponentPreview: readonly Roll[] | null
  /** Tribune infernale : la tribune de cette course est-elle posée ? */
  tribunePlaced: boolean
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
  /** Marteau d'Héphaïstos : la forge offerte de ce cercle a-t-elle servi ? Remis à faux au cercle suivant. */
  forgeFreeUsed?: boolean
  /** Dette infernale : somme empruntée, à ajouter au prix du cercle suivant. Absente = aucune dette. */
  debt?: number
  /** Dette infernale : l'emprunt unique du run a-t-il déjà été fait ? */
  debtUsed?: boolean
}

export interface UseRaceProps {
  carry: SessionCarry
  /** Ids des objets débloqués : la vitrine ne tire que là-dedans (core/shop/unlocks.ts). */
  unlocked: readonly string[]
  /** Nombre d'âmes en course pour ce cercle. */
  soulCount: number
  /** Couloirs du cercle et ses variantes de terrain (GDD §2.2) ; une est tirée par course. */
  lanes: number
  terrains: readonly Terrain[]
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

/** Raccourci de lecture : le joueur possède-t-il cet artefact ? */
export function has(inventory: Inventory, id: ArtefactId): boolean {
  return inventory.artefacts.includes(id)
}

/**
 * Règles de déplacement ouvertes par les artefacts de collision (artefacts.md n°7 à n°10) et
 * par la Tribune infernale (n°19). Un seul endroit les rassemble : la résolution et la
 * prévisualisation lisent la même chose, sinon le fantôme mentirait.
 */
export function moveRules(inventory: Inventory): MoveRules {
  const r: MoveRules = {}
  if (has(inventory, 'semellesDePlomb')) r.semelles = true
  if (has(inventory, 'balanceTruquee')) r.balance = true
  if (has(inventory, 'chaineDuCoccyte')) r.chaine = true
  if (has(inventory, 'batDeChameau')) r.bat = true
  if (has(inventory, 'tribuneInfernale')) r.tribune = { coins: param('tribuneInfernale', 'coins', 4), push: param('tribuneInfernale', 'push', 1) }
  return r
}

/** Règlement des paris : tous les artefacts d'argent, dans l'ordre documenté par `settleBets`. */
export function settleOptions(inventory: Inventory, circle: number, pickLost: (n: number) => number): SettleOptions {
  const o: SettleOptions = {}
  if (has(inventory, 'livreDesComptes')) {
    o.refundRatio = param('livreDesComptes', 'refundRatio', 0.5)
    o.pickLost = pickLost
  }
  if (has(inventory, 'quatriemeMarche')) o.topBonus = param('quatriemeMarche', 'bonus', 1)
  if (has(inventory, 'denierDuCercle')) o.stakeBonus = circle
  if (has(inventory, 'baumeDuPerdant')) o.lossRelief = param('baumeDuPerdant', 'relief', 0.1)
  if (has(inventory, 'encensoirDuDernier')) o.lastGap = { cells: param('encensoirDuDernier', 'cells', 5), factor: param('encensoirDuDernier', 'factor', 2) }
  return o
}

/** Remises de boutique (artefacts.md n°26 et n°30). `forgeFree` : la forge offerte du cercle est encore disponible. */
export function priceRules(inventory: Inventory, forgeFree: boolean): PriceRules {
  const r: PriceRules = {}
  if (has(inventory, 'rabaisDePloutos')) r.globalDiscount = param('rabaisDePloutos', 'discount', 0.03)
  if (has(inventory, 'marteauHephaistos')) {
    r.forgeDiscount = param('marteauHephaistos', 'discount', 0.2)
    r.forgeFreeAvailable = forgeFree
  }
  return r
}

/** Nombre de dés Âme du lancer : celui de la config, plus la Quatrième tête de Cerbère. */
export function soulDiceCount(inventory: Inventory): number {
  return config.dice.soulDice + (has(inventory, 'quatriemeTete') ? param('quatriemeTete', 'soulDice', 1) : 0)
}

/**
 * Paires lancées par l'adversaire à ce tour : la base, plus celle qu'a réveillée la Pièce à deux
 * faces, plus celle que coûte le Fouet du contremaître dès qu'une âme entre en zone de fin.
 */
export function opponentRolls(u: Pick<RaceUi, 'inventory' | 'doubledStakes' | 'race'>): number {
  const whipped = has(u.inventory, 'fouetDuContremaitre') && u.race.souls.some((so) => isInBetZone(u.race.track, so.position))
  return config.opponent.rollsPerTurn + (u.doubledStakes ? 1 : 0) + (whipped ? 1 : 0)
}

/** Le joueur voit-il le tour adverse avant d'ordonner, et jusqu'où ? */
export function opponentSight(inventory: Inventory): 'none' | 'first' | 'all' | 'resolved' {
  // Le Miroir rend l'Œil et le Fouet inutiles, le Fouet rend l'Œil inutile : on garde le plus fort.
  if (has(inventory, 'miroirDeNarcisse')) return 'resolved'
  if (has(inventory, 'fouetDuContremaitre')) return 'all'
  if (has(inventory, 'oeilDeCharon')) return 'first'
  return 'none'
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

/**
 * Prix demandé pour un objet : celui du cercle, puis les remises du joueur. `forgeFree` dit si
 * la forge offerte du Marteau d'Héphaïstos est encore disponible dans ce cercle.
 */
export function priceFor(item: ShopItem, raceIndex: number, inventory?: Inventory, forgeFree = false): number {
  const circle = circleOf(raceIndex).circle
  const rules = inventory ? priceRules(inventory, forgeFree) : {}
  return effectivePrice(item, circle, shop.priceGrowthPerCircle, rules)
}

/** Prix du renouvellement de vitrine, Rabais de Ploutos compris. */
export function rerollCostFor(inventory: Inventory): number {
  return effectiveRerollCost(shop, priceRules(inventory, false))
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
  // Mêmes règles qu'à la résolution (Bond, Semelles, Bât…) : le fantôme ne doit jamais mentir.
  const result = previewMove(u.race, first.soul, first.distance, first.effects, moveRules(u.inventory))
  return { ...result, move: first }
}

function initial(seed: number, carry: SessionCarry, terrain: Terrain, base: RaceOptions): RaceUi {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  const race = createRace(config, raceOptions(carry.inventory, { ...base, blocked: terrain.blocked }))
  const lanes = race.track.lanes
  const blocked = race.track.blocked.length
  // Avance de course : versée avant les paris initiaux, racontée dans le journal (visible sous le plateau).
  const allowance = raceAllowance(allowanceAtCircle(config.economy, circle), carry.inventory, shop)
  const log: LogEntry[] = [{ id: 0, turn: 1, source: 'system', text: `Cercle ${circle}, course ${raceInCircle}/${config.run.racesPerCircle} — terrain « ${terrain.name} », ${race.souls.length} âmes, ${config.track.columns} cases, ${lanes} couloir${lanes > 1 ? 's' : ''}${blocked > 0 ? `, ${blocked} case${blocked > 1 ? 's' : ''} bloquée${blocked > 1 ? 's' : ''}` : ''}, graine ${seed}. Posez vos paris initiaux.` }]
  if (allowance.total > 0) log.push({ id: 1, turn: 1, source: 'system', text: `Le stagiaire vous avance ${allowance.total} pièces pour cette course${allowance.bonus > 0 ? ` (dont ${allowance.bonus} grâce à la ${itemName('tirelire')})` : ''}.` })
  return {
    race,
    phase: 'prep',
    roll: null,
    combinations: [],
    selectedSoulDie: null,
    resolvingIndex: null,
    opponentRoll: null,
    lastResult: null,
    log,
    seed,
    terrain,
    money: carry.money + allowance.total,
    bets: [],
    settlement: null,
    inventory: carry.inventory,
    raceIndex: carry.raceIndex,
    lateBetCharges: carry.lateBetCharges,
    lateBetOpen: false,
    vitrine: null,
    pendingPurchase: null,
    tally: { spent: 0, bestBet: 0 },
    forgeFreeUsed: carry.forgeFreeUsed ?? false,
    fioleTurn: 0,
    fioleBonus: [],
    lockedDie: null,
    lastFaces: null,
    momentumUsed: [],
    doubledStakes: false,
    opponentPreview: null,
    tribunePlaced: false,
  }
}

/** Ce que la rencontre rend à la session quand elle est finie. */
export function carryOut(ui: RaceUi): SessionCarry {
  return { money: ui.money, inventory: ui.inventory, raceIndex: ui.raceIndex + 1, lateBetCharges: ui.lateBetCharges, forgeFreeUsed: ui.forgeFreeUsed }
}

export function useRace({ carry, unlocked, soulCount, lanes, terrains, speed }: UseRaceProps) {
  // Graine au hasard, sauf `?seed=NNN` dans l'URL (tests e2e) : course, dés et vitrine deviennent déterministes.
  const [seed] = useState(() => seedForRace(carry.raceIndex) ?? randomSeed())
  // Le terrain se tire sur la graine, à part du hasard de la course (terrain.ts).
  const terrain = useMemo(() => terrainFor(terrains, seed), [terrains, seed])
  const [ui, setUi] = useState<RaceUi>(() => initial(seed, carry, terrain, { soulCount, lanes }))
  const [auto, setAuto] = useState(false)

  const uiRef = useRef<RaceUi>(ui)
  const commit = useCallback((u: RaceUi): RaceUi => {
    uiRef.current = u
    setUi(u)
    return u
  }, [])

  const rngRef = useRef<Rng>(seededRng(seed))
  const runId = useRef(0)
  const logId = useRef(2)
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
    const initial = u.phase === 'prep'
    let multiplier = currentMultiplier(betBase(type, u.inventory), raceProgress(u.race), config.economy.decay)
    // Ticket de la première heure : la cote monte avant le premier lancer, descend en course.
    if (has(u.inventory, 'ticketPremiereHeure')) {
      multiplier = ticketMultiplier(multiplier, initial, { before: param('ticketPremiereHeure', 'before', 1), during: param('ticketPremiereHeure', 'during', 0.5) })
    }
    const bet: Bet = { id: betId.current++, type, souls: [...souls], stake, multiplier, turn: initial ? 0 : u.race.turn, status: 'open', payout: 0 }
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
      const vitrine = generateVitrine(shop, u.inventory, unlocked, rngRef.current)
      commit(pushLog({ ...u, vitrine, pendingPurchase: null }, 'shop', `La boutique ouvre : ${vitrine.length} objets en vitrine.`))
    }
    return true
  }, [commit, pushLog, shopUnlocked, unlocked])

  const rerollVitrine = useCallback(() => {
    const u = uiRef.current
    const cost = rerollCostFor(u.inventory)
    if (!shopUnlocked(u) || u.money < cost) return
    const vitrine = generateVitrine(shop, u.inventory, unlocked, rngRef.current)
    commit(pushLog({ ...u, money: u.money - cost, vitrine, pendingPurchase: null, tally: { ...u.tally, spent: u.tally.spent + cost } }, 'shop', `Vitrine renouvelée pour ${cost} pièces.`))
  }, [commit, pushLog, shopUnlocked, unlocked])

  /** Pourquoi un objet n'est pas achetable maintenant, ou null. */
  const purchaseRefusal = useCallback((u: RaceUi, item: ShopItem): string | null => {
    if (!shopUnlocked(u)) return 'La boutique est fermée.'
    const price = priceFor(item, u.raceIndex, u.inventory, !u.forgeFreeUsed)
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
    const needsTarget = item.kind === 'forge' || (item.kind === 'die' && item.mode === 'replace')
    if (needsTarget && !target) {
      commit({ ...u, pendingPurchase: itemId })
      return null
    }
    try {
      const { inventory, text } = applyPurchase(item, u.inventory, target)
      const freeForge = item.kind === 'forge' && has(u.inventory, 'marteauHephaistos') && !u.forgeFreeUsed
      const price = priceFor(item, u.raceIndex, u.inventory, !u.forgeFreeUsed)
      const lateBetCharges = item.kind === 'artefact' && item.id === 'lateBet' ? config.artefacts.lateBet.chargesPerCircle : u.lateBetCharges
      let next = pushLog({ ...u, money: u.money - price, inventory, lateBetCharges, forgeFreeUsed: u.forgeFreeUsed || freeForge, vitrine: (u.vitrine ?? []).filter((i) => i !== item), pendingPurchase: null, tally: { ...u.tally, spent: u.tally.spent + price } }, 'shop', freeForge ? `${text} — offert par le Marteau d'Héphaïstos.` : `${text} (${price} pièces)`)
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
      const inv = uiRef.current.inventory
      const coinsPerCollision = has(inv, 'boursePercee') ? param('boursePercee', 'coinsPerCollision', 2) : 0
      const rules = moveRules(inv)
      // File ouverte : un déplacement peut en induire d'autres (lien, aimant, souffle, tribune).
      // Ils sont insérés juste après lui et ne portent pas de numéro de combinaison.
      const queue: { move: Move; index: number | null }[] = moves.map((m, i) => ({ move: m, index: indexOf(i) }))
      for (let i = 0; i < queue.length; i++) {
        const entry = queue[i]
        if (!entry) continue
        commit({ ...uiRef.current, resolvingIndex: entry.index })
        if (!(await wait(config.animation.pauseMs, id))) return false
        const u = uiRef.current
        const { state, result, follow, coins } = applyMove(u.race, entry.move, rules)
        let next = pushLog({ ...u, race: state, lastResult: result }, entry.move.source, describe(u, result))
        if (result.collision && coinsPerCollision > 0) next = pushLog({ ...next, money: next.money + coinsPerCollision }, 'artefact', `Bourse percée : +${coinsPerCollision} pièces.`)
        if (coins > 0) next = pushLog({ ...next, money: next.money + coins }, 'artefact', `Tribune infernale : +${coins} pièces.`)
        commit(next)
        if (!(await wait(config.animation.stepMs, id))) return false
        queue.splice(i + 1, 0, ...follow.map((m) => ({ move: m, index: null })))
      }
      return true
    },
    [commit, describe, pushLog, wait],
  )

  const rollDice = useCallback(async () => {
    const id = runId.current
    const u = uiRef.current
    if (u.phase !== 'idle') return
    commit({ ...u, phase: 'rolling', roll: null, combinations: [], selectedSoulDie: null, lastResult: null, opponentRoll: null, opponentPreview: null })

    // Tour adverse connu d'avance (artefacts.md n°21, 22, 23). Les paires sont tirées ici, une
    // fois pour toutes : ce que le joueur voit est exactement ce qui sera résolu.
    const sight = opponentSight(u.inventory)
    if (sight !== 'none') {
      const flipNow = opponentNegativesFlipped(u.inventory)
      const pairs = Array.from({ length: opponentRolls(u) }, () => rollOpponentPair(config, u.race.souls.length, rngRef.current, { flipNegatives: flipNow }))
      if (sight === 'resolved') {
        // Miroir de Narcisse : l'adversaire joue et se résout avant le lancer du joueur.
        commit(pushLog({ ...uiRef.current, phase: 'opponent', opponentPreview: pairs }, 'artefact', 'Miroir de Narcisse : l’adversaire joue en premier.'))
        for (const pair of pairs) {
          const w = uiRef.current
          const who = w.race.souls[pair.soul[0] ?? 0]?.name ?? '?'
          commit(pushLog({ ...w, opponentRoll: pair }, 'opponent', `L'adversaire lance : ${who} ${fmt(pair.distance[0] ?? 0)}.`))
          if (!(await resolveMoves(id, buildMoves(pair, naturalCombinations(pair), 'opponent'), () => null))) return
        }
        commit({ ...uiRef.current, phase: 'rolling', opponentRoll: null, opponentPreview: [] })
      } else {
        const shown = sight === 'first' ? pairs.slice(0, 1) : pairs
        const names = shown.map((pr) => `${u.race.souls[pr.soul[0] ?? 0]?.name ?? '?'} ${fmt(pr.distance[0] ?? 0)}`)
        commit(pushLog({ ...uiRef.current, opponentPreview: pairs }, 'artefact', `${sight === 'all' ? 'Fouet du contremaître' : 'Œil de Charon'} : ${names.join(', ')}.`))
      }
    }

    // Verrou de Minos : le dé verrouillé garde sa face du tour précédent au lieu d'être relancé.
    const locked = u.lockedDie !== null && u.lastFaces?.[u.lockedDie] ? { [u.lockedDie]: u.lastFaces[u.lockedDie]! } : undefined
    const roll = rollPlayerDice(config, u.race.souls.length, rngRef.current, u.inventory.dice, {
      soulDice: soulDiceCount(u.inventory),
      rerollTwins: has(u.inventory, 'relanceJumelle'),
      ...(locked ? { locked } : {}),
    })
    if (!(await wait(config.animation.diceMs, id))) return
    const v = uiRef.current
    const names = roll.soul.map((s) => v.race.souls[s]?.name ?? `#${s}`)
    let next = pushLog({ ...v, phase: 'pairing', roll, lastFaces: roll.faces, lockedDie: null, momentumUsed: [], fioleBonus: [] }, 'player', `Lancer : Distance ${roll.faces.map(fmtFace).join(' / ')} — Âmes ${names.join(' / ')}.`)
    // Face dorée : pièces à chaque sortie, associée ou non.
    const gold = roll.faces.filter((f) => f.effect === 'gold').length
    if (gold > 0) {
      const coins = gold * param('doree', 'coins', 5)
      next = pushLog({ ...next, money: next.money + coins }, 'artefact', `Face dorée : +${coins} pièces.`)
    }
    // Pourboire du stagiaire : versé juste après le lancer, une fois par course (tour 1).
    if (has(next.inventory, 'pourboireDuStagiaire') && next.race.turn === 1) {
      const coins = param('pourboireDuStagiaire', 'coins', 10)
      next = pushLog({ ...next, money: next.money + coins }, 'artefact', `Pourboire du stagiaire : +${coins} pièces.`)
    }
    commit(next)
  }, [commit, pushLog, resolveMoves, wait])

  // ---- Objets à déclencher pendant l'appariement ---------------------------

  /** Fiole de sang : +1 sur un dé Distance, une fois par tour, 5 pièces comptant. */
  const useFiole = useCallback((distanceDie: number): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'fioleDeSang')) return 'Vous ne possédez pas la Fiole de sang.'
    if (u.phase !== 'pairing' || !u.roll) return 'Seulement après le lancer, avant de résoudre.'
    if (u.fioleTurn === u.race.turn) return 'La Fiole a déjà servi ce tour.'
    if (u.combinations.some((c) => c.distanceDie === distanceDie)) return 'Ce dé est déjà associé.'
    const cost = param('fioleDeSang', 'cost', 5)
    if (u.money < cost) return `Il faut ${cost} pièces comptant : la Fiole ne fait pas crédit.`
    const bonus = param('fioleDeSang', 'bonus', 1)
    const faces = u.roll.faces.map((f, i) => (i === distanceDie ? { ...f, value: f.value + bonus } : f))
    const roll = { ...u.roll, faces, distance: faces.map((f) => f.value) }
    commit(pushLog({ ...u, roll, money: u.money - cost, fioleTurn: u.race.turn }, 'artefact', `Fiole de sang : dé n°${distanceDie + 1} à ${fmtFace(faces[distanceDie]!)} pour ${cost} pièces.`))
    return null
  }, [commit, pushLog])

  /** Face d'élan : relance le dé et ajoute le résultat, une seule fois par dé et par tour. */
  const useMomentum = useCallback((distanceDie: number): string | null => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.roll) return 'Seulement après le lancer.'
    const face = u.roll.faces[distanceDie]
    if (!face || face.effect !== 'momentum') return "Ce dé n'a pas de face d'élan."
    if (u.momentumUsed.includes(distanceDie)) return 'Élan déjà pris sur ce dé.'
    if (u.combinations.some((c) => c.distanceDie === distanceDie)) return 'Ce dé est déjà associé.'
    const die = u.inventory.dice[distanceDie]
    if (!die) return 'Dé introuvable.'
    const again = die.faces[rngRef.current.int(die.faces.length)]!
    const faces = u.roll.faces.map((f, i) => (i === distanceDie ? { ...f, value: f.value + again.value } : f))
    const roll = { ...u.roll, faces, distance: faces.map((f) => f.value) }
    commit(pushLog({ ...u, roll, momentumUsed: [...u.momentumUsed, distanceDie] }, 'artefact', `Élan : ${fmtFace(again)} ajouté, le dé n°${distanceDie + 1} vaut ${fmtFace(faces[distanceDie]!)}.`))
    return null
  }, [commit, pushLog])

  /** Verrou de Minos : garde un dé sur sa face actuelle pour le prochain lancer. */
  const lockDie = useCallback((distanceDie: number | null): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'verrouDeMinos')) return 'Vous ne possédez pas le Verrou de Minos.'
    if (u.phase !== 'pairing') return 'Verrouillez pendant votre tour, pour le lancer suivant.'
    if (distanceDie !== null && !u.roll?.faces[distanceDie]) return 'Dé introuvable.'
    const face = distanceDie === null ? null : u.roll!.faces[distanceDie]!
    commit(pushLog({ ...u, lockedDie: distanceDie }, 'artefact', distanceDie === null ? 'Verrou de Minos levé.' : `Verrou de Minos : le dé n°${distanceDie + 1} gardera ${fmtFace(face!)}.`))
    return null
  }, [commit, pushLog])

  /** Pièce à deux faces : double les mises ouvertes, au prix d'une paire adverse de plus. */
  const doubleStakes = useCallback((): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'pieceADeuxFaces')) return 'Vous ne possédez pas la Pièce à deux faces.'
    if (u.doubledStakes) return 'La pièce a déjà été jetée cette course.'
    if (u.race.turn !== 1 || u.phase !== 'pairing') return 'Seulement après le premier lancer de la course.'
    const open = u.bets.filter((b) => b.status === 'open')
    if (open.length === 0) return 'Aucun pari ouvert à doubler.'
    const extra = open.reduce((sum, b) => sum + b.stake, 0)
    if (u.money < extra) return `Il faut ${extra} pièces pour doubler toutes les mises.`
    const bets = u.bets.map((b) => (b.status === 'open' ? { ...b, stake: b.stake * 2 } : b))
    commit(pushLog({ ...u, bets, money: u.money - extra, doubledStakes: true }, 'artefact', `Pièce à deux faces : mises doublées (−${extra} pièces). L'adversaire lance une paire de plus.`))
    return null
  }, [commit, pushLog])

  /** Tribune infernale : pose la tribune avant la course, sur une case libre hors zone de fin. */
  const putTribune = useCallback((column: number, lane: number): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'tribuneInfernale')) return 'Vous ne possédez pas la Tribune infernale.'
    if (u.phase !== 'prep') return 'La tribune se pose avant la course.'
    const race = placeTribune(u.race, column, lane)
    if (race === u.race) return 'Case impossible : hors départ, hors zone de fin, et libre.'
    commit(pushLog({ ...u, race, tribunePlaced: true }, 'artefact', `Tribune infernale posée case ${column}.`))
    return null
  }, [commit, pushLog])

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

  /** Associe directement un dé Âme et un dé Distance (glisser-déposer) : même règle que le clic-clic. */
  const pairDice = useCallback((soulDie: number, distanceDie: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.roll || u.roll.soul[soulDie] === undefined || u.roll.distance[distanceDie] === undefined) return
    if (u.combinations.some((c) => c.soulDie === soulDie || c.distanceDie === distanceDie)) return
    commit({ ...u, combinations: [...u.combinations, { soulDie, distanceDie }], selectedSoulDie: null })
  }, [commit])

  /** Déplace une combinaison à une autre place de la file (glisser-déposer d'une carte). */
  const moveCombinationTo = useCallback((from: number, to: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.combinations[from] || to < 0 || to >= u.combinations.length || from === to) return
    const next = [...u.combinations]
    const [card] = next.splice(from, 1)
    next.splice(to, 0, card!)
    commit({ ...u, combinations: next })
  }, [commit])

  /** Remplace l'ordre de la file par `next` (même ensemble de combinaisons) : réordonnancement par cartes fusionnées. */
  const setCombinations = useCallback((next: readonly Combination[]) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || next.length !== u.combinations.length) return
    const key = (c: Combination): string => `${c.soulDie}:${c.distanceDie}`
    const a = new Set(u.combinations.map(key))
    if (!next.every((c) => a.has(key(c))) || new Set(next.map(key)).size !== next.length) return
    commit({ ...u, combinations: [...next] })
  }, [commit])

  /** Dissocie plusieurs combinaisons d'un coup (carte fusionnée : tous ses dés reviennent). */
  const removeCombinations = useCallback((indices: readonly number[]) => {
    const u = uiRef.current
    if (u.phase !== 'pairing') return
    const drop = new Set(indices)
    commit({ ...u, combinations: u.combinations.filter((_, i) => !drop.has(i)), selectedSoulDie: null })
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

    // Tour de l'adversaire (§2.5.2). Avec le Miroir de Narcisse il a déjà joué (liste vide) ;
    // avec l'Œil ou le Fouet, ses paires ont été tirées au lancer et sont rejouées telles quelles.
    commit({ ...uiRef.current, phase: 'opponent', resolvingIndex: null })
    const flip = opponentNegativesFlipped(uiRef.current.inventory)
    const preview = uiRef.current.opponentPreview
    const pairs = preview ?? Array.from({ length: opponentRolls(uiRef.current) }, () => rollOpponentPair(config, uiRef.current.race.souls.length, rngRef.current, { flipNegatives: flip }))
    for (const pair of pairs) {
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
      commit({ ...u, race: ended, phase: 'idle', resolvingIndex: null, roll: null, combinations: [], opponentRoll: null, opponentPreview: null })
      return
    }
    let done = pushLog({ ...u, race: ended, phase: 'finished', resolvingIndex: null }, 'system', `Une âme a franchi l'arrivée : fin de course au tour ${ended.turn}.`)
    const settlement = settleBets(done.bets, ranking(ended), settleOptions(u.inventory, circleOf(u.raceIndex).circle, (n) => rngRef.current.int(n)))
    for (const b of settlement.bets) {
      const names = b.souls.map((id) => ended.souls[id]?.name ?? `#${id}`).join(betType(b.type).ordered ? ' > ' : ', ')
      done = pushLog(done, 'bet', b.status === 'won' ? `Pari ${betType(b.type).label} (${names}) gagné : +${b.payout - b.stake} net (mise ${b.stake} rendue).` : `Pari ${betType(b.type).label} (${names}) perdu : −${b.stake}.`)
    }
    if (settlement.refund > 0) done = pushLog(done, 'artefact', `Livre des comptes : ${settlement.refund} pièces remboursées.`)
    if (settlement.relief > 0) done = pushLog(done, 'artefact', `Baume du perdant : ${settlement.relief} pièces rendues sur les mises perdues.`)
    const net = settlement.returned - settlement.staked
    done = pushLog(done, 'system', `Bilan des paris : ${net >= 0 ? '+' : '−'}${Math.abs(net)}. Argent : ${done.money + settlement.returned}.`)
    const bestBet = settlement.bets.reduce((m, b) => Math.max(m, b.payout - b.stake), 0)
    commit({ ...done, bets: settlement.bets, settlement, money: done.money + settlement.returned, tally: { ...done.tally, bestBet } })
  }, [commit, pushLog, resolveMoves, wait])

  // Mode auto (test) : pari minimal, pas d'achat, combinaisons naturelles.
  useEffect(() => {
    if (!auto) return
    if (ui.phase === 'prep') {
      if (ui.bets.length === 0 && placeBet('winner', [0], stakesAtCircle(config.economy, circleOf(ui.raceIndex).circle)[0] ?? 0) !== null) {
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
    actions: {
      openShop, startRace, buy, cancelPurchase, rerollVitrine, placeBet, cancelBet, useLateBet, rollDice,
      pickSoulDie, pickDistanceDie, pairDice, resetPairing, removeCombination, removeCombinations,
      moveCombination, moveCombinationTo, setCombinations, autoPair, resolve,
      useFiole, useMomentum, lockDie, doubleStakes, putTribune,
    },
  }
}
