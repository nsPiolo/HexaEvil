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
import { BET_TYPE_ARTEFACT, betRefusal, betType, betUnlocked, cancelBet as cancelBetRule, currentMultiplier, effectiveBase, fmtMultiplier, potentialPayout, raceProgress, settleBets, ticketMultiplier, unlockedBetTypes, type BaseModifiers, type Bet, type BetTypeId, type RaceStats, type SettleOptions, type Settlement } from '../core/rules/bets'
import { fmtFace, type DistanceDie, type Face } from '../core/rules/dice'
import { allowanceAtCircle, raceAllowance } from '../core/rules/allowance'
import {
  applyMove,
  buildMoves,
  createRace,
  createTrack,
  endTurn,
  isPairingComplete,
  bossContext,
  bossDistanceMods,
  bossMoveRules,
  isInBetZone,
  naturalCombinations,
  placeTribune,
  previewMove,
  ranking,
  rollOpponentPair,
  rollPlayerDice,
  sendToStart,
  hookDistance,
  placeMarker,
  simpleMove,
  unusedSoulMoves,
  type Combination,
  type Move,
  type MoveContext,
  type MoveResult,
  type MoveRules,
  type OpponentOptions,
  type RaceOptions,
  type RaceState,
  type Roll,
  type SoulsContext,
} from '../core/rules/race'
import { randomSeed, seededRng, type Rng } from '../core/rules/rng'
import { TRICKSTER_ONE_IN, judgeFactor, soulWith } from '../core/rules/personalities'
import { circleAt, isBeyondWritten } from '../core/rules/circles'
import { bossValue, generateBossEffects, hasBoss, type BossEffect } from '../core/rules/boss'
import { betLabel, betRefusalText, describeBossEffects, dieName, noteText, purchaseLogText } from './messages'
import { stakesAtCircle } from '../core/rules/stakes'
import { terrainFor } from '../core/rules/terrain'
import type { SpecialCellKind, Terrain } from '../core/config/schema'
import { exclusiveWith, isArtefactId, type ArtefactId, type ShopItem } from '../core/shop/items'
import { applyPurchase, artefactSlotsAt, decapFace, effectivePrice, effectiveRerollCost, findItem, generateVitrine, maxAlteredFaces, opponentNegativesFlipped, resaleValue, sellArtefact, type Inventory, type PriceRules, type PurchaseTarget } from '../core/shop/shop'
import { demonLevelAtRace, rankOfLevel } from './demon'
import { e2eMode, seedForRace } from './urlParams'
import { BETS, ITEMS, LOG, MOVE, UI, fill, ordinal, plural } from './texts'

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
  /** Pouvoir du boss appliqué à cette course (vide hors course de boss). */
  boss: readonly BossEffect[]
  /** Boss L'Ange : le tour d'arrivée a-t-il déjà été rejoué ? */
  replayed: boolean
  /** Sommeil du contremaître : lancers du joueur depuis le début du run, jamais remis à zéro. */
  rolls: number
  /** Sommeil du contremaître : l'adversaire dort-il à ce tour-ci ? */
  opponentAsleep: boolean
  /** Boule de Cocyte : la relance générale de la course a-t-elle servi ? */
  cocytusUsed: boolean
  /** Crochet de Charon : le rappel de la course a-t-il servi ? */
  hookUsed: boolean
  /** Roue d'Ixion : la charge du cercle a-t-elle servi ? */
  ixionUsed: boolean
  /** Sceau du stagiaire : le masque brisé offert du cercle a-t-il servi ? */
  maskFreeUsed: boolean
  /**
   * Écho du Styx : âme dont la combinaison sera rejouée à l'identique, marquée avant de
   * résoudre. Null tant que rien n'est marqué ; la charge tombe une fois la course entamée.
   */
  styxSoul: number | null
  /** Écho du Styx : l'écho de la course a-t-il servi ? */
  styxUsed: boolean
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
  /**
   * Sommeil du contremaître : lancers du joueur depuis le début du run. Il court d'une course
   * et d'un cercle à l'autre — c'est ce qui distingue l'artefact d'une charge par course.
   */
  rolls?: number
  /** Roue d'Ixion : la charge du cercle a-t-elle servi ? Remise à faux au cercle suivant. */
  ixionUsed?: boolean
  /** Sceau du stagiaire : le masque brisé offert du cercle a-t-il servi ? Remis à faux au cercle suivant. */
  maskFreeUsed?: boolean
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

/**
 * Artefacts qui redessinent la piste à l'achat : ils sont achetés en préparation, personne n'a
 * encore bougé, la piste est donc refaite sur-le-champ plutôt qu'à la course suivante.
 */
const TRACK_ARTEFACTS: readonly ArtefactId[] = ['sablier', 'raccourci', 'chaineDesLimbes']

/** Les trois bornes posables (artefacts.md n°33), du type de case au mot lu par le joueur. */
export const MARKER_KINDS: readonly SpecialCellKind[] = ['trap', 'boost', 'tar']

/** Bornes posables par course avec les Bornes du stagiaire, ou 0 sans l'artefact. */
export function markerCount(inventory: Inventory): number {
  return has(inventory, 'bornes') ? param('bornes', 'count', 2) : 0
}
const MARKER_LABEL: Readonly<Record<string, string>> = { trap: ITEMS.pit, boost: ITEMS.springboard, tar: ITEMS.tar }

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

/**
 * Pouvoir du boss appliqué à cette course (GDD §5.1) : uniquement la dernière course du cercle.
 * Au-delà des cercles écrits, il est assemblé sur la graine du cercle (§8.1) — déterministe,
 * pour que la carte annonce exactement ce qui sera joué.
 */
export function bossEffectsFor(raceIndex: number): BossEffect[] {
  const { circle, raceInCircle } = circleOf(raceIndex)
  if (raceInCircle !== config.run.racesPerCircle) return []
  if (!isBeyondWritten(config.run, circle)) return [...circleAt(config.run, circle).powers]
  return generateBossEffects(seededRng(circle * 7919))
}

/**
 * Pouvoir du boss d'un cercle, tel qu'il s'annonce au joueur : le texte écrit de `race.json`, ou
 * la description des effets assemblés au-delà des cercles écrits. La carte et le bandeau de la
 * course du boss lisent la même phrase — annoncer un pouvoir puis en jouer un autre serait une
 * trahison de règle, pas une surprise.
 */
export function bossPowerText(circle: number): string {
  if (!isBeyondWritten(config.run, circle)) return circleAt(config.run, circle).power
  return describeBossEffects(bossEffectsFor(circle * config.run.racesPerCircle - 1))
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
export function settleOptions(inventory: Inventory, circle: number, pickLost: (n: number) => number, gainFactor = 1, stats?: RaceStats): SettleOptions {
  const o: SettleOptions = {}
  // Registre des paris exotiques : les guichets exotiques se règlent sur le déroulé de la
  // course, pas sur le classement. Sans statistiques, ils sont perdus (voir `evaluateBet`).
  if (stats) o.stats = stats
  // Le Juge (personnalité) : il pèse sur tous les gains de la course, pas sur un type de pari.
  if (gainFactor !== 1) o.gainFactor = gainFactor
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

/**
 * Ce qui est encore offert dans ce cercle : la forge du Marteau d'Héphaïstos, le masque brisé
 * du Sceau du stagiaire. Les deux se réarment au paiement du cercle (`payCircle`).
 */
export interface FreeCharges {
  forge?: boolean
  mask?: boolean
}

/** Remises de boutique (artefacts.md n°25, 26 et 30). */
export function priceRules(inventory: Inventory, free: FreeCharges = {}): PriceRules {
  const r: PriceRules = {}
  if (has(inventory, 'rabaisDePloutos')) r.globalDiscount = param('rabaisDePloutos', 'discount', 0.03)
  if (has(inventory, 'marteauHephaistos')) {
    r.forgeDiscount = param('marteauHephaistos', 'discount', 0.2)
    r.forgeFreeAvailable = free.forge ?? false
  }
  if (has(inventory, 'sceauDuStagiaire')) {
    r.maskDiscount = param('sceauDuStagiaire', 'discount', 0.3)
    r.maskFreeAvailable = free.mask ?? false
  }
  return r
}

/**
 * Colonnes ajoutées ou retirées au parcours par les artefacts de plateau (artefacts.md n°34
 * et 35). Le seuil de pari se recalcule sur la longueur réelle, dans `createTrack`.
 */
export function trackColumnsDelta(inventory: Inventory): number {
  return (has(inventory, 'chaineDesLimbes') ? param('chaineDesLimbes', 'columns', 1) : 0) + (has(inventory, 'raccourci') ? param('raccourci', 'columns', -1) : 0)
}

/**
 * Sommeil du contremaître (artefacts.md n°38) : l'adversaire dort-il sur ce lancer-là ?
 * `rolls` est le compteur APRÈS incrément — le dixième lancer du run endort le tour qui suit.
 */
export function foremanAsleep(inventory: Inventory, rolls: number): boolean {
  if (!has(inventory, 'sommeilDuContremaitre')) return false
  const every = param('sommeilDuContremaitre', 'everyRolls', 10)
  return every > 0 && rolls > 0 && rolls % every === 0
}

/** Lancers restants avant que le contremaître ne s'endorme, ou null s'il n'est pas dans la besace. */
export function rollsBeforeSleep(inventory: Inventory, rolls: number): number | null {
  if (!has(inventory, 'sommeilDuContremaitre')) return null
  const every = param('sommeilDuContremaitre', 'everyRolls', 10)
  return every > 0 ? every - (rolls % every) : null
}

/** Nombre de dés Âme du lancer : celui de la config, plus la Quatrième tête de Cerbère. */
export function soulDiceCount(inventory: Inventory): number {
  return config.dice.soulDice + (has(inventory, 'quatriemeTete') ? param('quatriemeTete', 'soulDice', 1) : 0)
}

/**
 * Paires lancées par l'adversaire à ce tour : la base, plus celle qu'a réveillée la Pièce à deux
 * faces, plus celle que coûte le Fouet du contremaître dès qu'une âme entre en zone de fin.
 */
export function opponentRolls(u: Pick<RaceUi, 'inventory' | 'doubledStakes' | 'race' | 'boss'>): number {
  const whipped = has(u.inventory, 'fouetDuContremaitre') && u.race.souls.some((so) => isInBetZone(u.race.track, so.position))
  // Dé du Damné (des.md n°12) : sa contrepartie est une paire adverse de plus par dé possédé.
  const damned = u.inventory.dice.filter((d) => d.kind === 'damne').length * param('damne', 'opponentPairs', 1)
  return config.opponent.rollsPerTurn + (u.doubledStakes ? 1 : 0) + (whipped ? 1 : 0) + damned + (bossValue(u.boss, 'extraPairs') ?? 0)
}

/** Options du lancer adverse pour cette course : Face retournée du joueur, pouvoirs du boss. */
function opponentOptions(u: RaceUi): OpponentOptions {
  const o: OpponentOptions = { flipNegatives: opponentNegativesFlipped(u.inventory) }
  const trickster = tricksterOf(u)
  if (trickster) o.trickster = trickster
  const boost = bossValue(u.boss, 'opponentBoost')
  if (boost !== null) o.boost = boost
  if (hasBoss(u.boss, 'targetBettedSouls')) {
    const betted = [...bettedSouls(u.bets)]
    if (betted.length > 0) o.targets = betted
  }
  return o
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
export function priceFor(item: ShopItem, raceIndex: number, inventory?: Inventory, free: FreeCharges = {}): number {
  const circle = circleOf(raceIndex).circle
  const rules = inventory ? priceRules(inventory, free) : {}
  return effectivePrice(item, circle, shop.priceGrowthPerCircle, rules)
}

/** Ce qui reste offert au joueur dans le cercle en cours, tel que la boutique doit le facturer. */
export function freeCharges(u: Pick<RaceUi, 'forgeFreeUsed' | 'maskFreeUsed'>): FreeCharges {
  return { forge: !u.forgeFreeUsed, mask: !u.maskFreeUsed }
}

/** Prix du renouvellement de vitrine, Rabais de Ploutos compris. */
export function rerollCostFor(inventory: Inventory): number {
  return effectiveRerollCost(shop, priceRules(inventory))
}

/** Options de piste : celles du cercle, plus les artefacts qui changent le plateau. */
function raceOptions(inventory: Inventory, base: RaceOptions, boss: readonly BossEffect[] = []): RaceOptions {
  const o: RaceOptions = { ...base }
  // Raccourci de Malebolge et Chaîne des Limbes : ils ne se cumulent pas (la boutique refuse
  // d'avoir les deux), mais la somme est écrite ainsi pour que rien ne dépende de ce refus.
  const columns = trackColumnsDelta(inventory)
  if (columns !== 0) o.columns = config.track.columns + columns
  if (inventory.artefacts.includes('sablier')) o.betThresholdRatio = config.artefacts.sablier.betThresholdRatio
  // Boss Les Furies : le guichet ferme plus tôt. Le pouvoir l'emporte sur le Sablier — c'est le
  // boss qui impose sa règle, l'artefact ne l'annule pas.
  const threshold = bossValue(boss, 'betThreshold')
  if (threshold !== null) o.betThresholdRatio = threshold / 100
  return o
}

/**
 * Boss Le Guichetier : les types de paris fermés à ce tour. Ils tournent d'un tour à l'autre,
 * à partir du numéro de tour : le joueur peut anticiper, ce n'est pas une punition aveugle.
 */
export function closedBetTypes(u: Pick<RaceUi, 'boss' | 'race' | 'raceIndex' | 'inventory'>): ReadonlySet<BetTypeId> {
  const count = bossValue(u.boss, 'closeWindow')
  if (count === null || count <= 0) return new Set()
  // On ne ferme que des guichets réellement ouverts au joueur : fermer un pari qu'il ne peut
  // pas poser ne serait pas un pouvoir, juste du bruit.
  const open = unlockedBetTypes(demonLevelAtRace(u.raceIndex), config.economy.betUnlockLevel, u.inventory.artefacts)
  if (open.length <= 1) return new Set()
  return new Set(Array.from({ length: Math.min(count, open.length - 1) }, (_, k) => open[(u.race.turn + k) % open.length]!.id))
}

/** Charges de l'Œil du parieur pour un cercle neuf. */
export function fullCharges(inventory: Inventory): number {
  return inventory.artefacts.includes('lateBet') ? config.artefacts.lateBet.chargesPerCircle : 0
}

/** Somme des mises des paris encore ouverts : ce qui est « misé en course » dans la jauge. */
export function stakedOpen(bets: readonly Bet[]): number {
  return bets.filter((b) => b.status === 'open').reduce((s, b) => s + b.stake, 0)
}

/**
 * Âmes portées par un pari encore ouvert. Le Sceau, la paire adverse du boss Géryon et la case
 * payante lisent tous cette même liste : « âme pariée » doit vouloir dire la même chose partout.
 */
export function bettedSouls(bets: readonly Bet[]): Set<number> {
  return new Set(bets.filter((b) => b.status === 'open').flatMap((b) => [...b.souls]))
}

/**
 * Ce que les personnalités (GDD §6.5) ont besoin de lire du plateau pour modifier une
 * distance : qui porte quoi, où chacun se trouve, où commence la zone de fin.
 *
 * Les positions sont celles d'avant la résolution du tour, pas celles du moment où chaque
 * déplacement s'applique : `buildMoves` construit toute la file d'un coup, et c'est ce que
 * le joueur a sous les yeux quand il ordonne ses combinaisons. Un Condamné qui entre en zone
 * de fin par sa première combinaison n'en profite donc qu'au tour suivant — la
 * prévisualisation dit exactement ce qui sera joué, ce qui compte davantage ici.
 */
export function soulsContext(u: Pick<RaceUi, 'race' | 'inventory'>): SoulsContext {
  return {
    personalities: u.inventory.personalities,
    positions: u.race.souls.map((so) => so.position),
    betThresholdColumn: u.race.track.betThresholdColumn,
  }
}

/**
 * Le Tricheur en course, s'il y en a un : le dé Âme qui le désigne est relancé une fois sur
 * quatre. Null sinon — et sans lui, `rollPlayerDice` ne consulte pas le hasard de plus, les
 * graines de référence des courses sans personnalité restent donc valables.
 */
function tricksterOf(u: Pick<RaceUi, 'race' | 'inventory'>): { soul: number; oneIn: number } | null {
  const soul = soulWith(u.inventory.personalities, 'tricheur', u.race.souls.length)
  return soul === null ? null : { soul, oneIn: TRICKSTER_ONE_IN }
}

/** Contexte des modificateurs du joueur (Clepsydre, Sceau, personnalités), identique en résolution et en prévisualisation. */
function moveContext(u: Pick<RaceUi, 'race' | 'inventory' | 'bets' | 'boss'>): MoveContext {
  return {
    turn: u.race.turn,
    clepsydre: u.inventory.artefacts.includes('clepsydre'),
    bettedSouls: bettedSouls(u.bets),
    sealBonus: SEAL_BONUS,
    boss: bossDistanceMods(u.boss),
    souls: soulsContext(u),
  }
}

/**
 * Règles de déplacement de la course : celles du joueur, plus celles qu'impose le boss, plus
 * les tickets en cours — la case payante ne verse que sur une âme pariée.
 */
export function raceMoveRules(u: Pick<RaceUi, 'inventory' | 'boss' | 'bets'>): MoveRules {
  return { ...moveRules(u.inventory), ...bossMoveRules(u.boss), bettedSouls: bettedSouls(u.bets), personalities: u.inventory.personalities }
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
  const result = previewMove(u.race, first.soul, first.distance, first.effects, raceMoveRules(u))
  return { ...result, move: first }
}

function initial(seed: number, carry: SessionCarry, terrain: Terrain, base: RaceOptions): RaceUi {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  const boss = bossEffectsFor(carry.raceIndex)
  const race = createRace(config, raceOptions(carry.inventory, { ...base, blocked: terrain.blocked, specials: terrain.specials }, boss))
  const lanes = race.track.lanes
  const blocked = race.track.blocked.length
  // Avance de course : versée avant les paris initiaux, racontée dans le journal (visible sous le plateau).
  const allowance = raceAllowance(allowanceAtCircle(config.economy, circle), carry.inventory, shop)
  const log: LogEntry[] = [{ id: 0, turn: 1, source: 'system', text: fill(LOG.raceHeader, {
    circle,
    n: raceInCircle,
    total: config.run.racesPerCircle,
    terrain: terrain.name,
    souls: race.souls.length,
    columns: race.track.columns,
    lanes,
    s: plural(lanes),
    blocked: blocked > 0 ? fill(LOG.raceHeaderBlocked, { n: blocked, s: plural(blocked) }) : '',
    seed,
  }) }]
  if (allowance.total > 0) log.push({ id: 1, turn: 1, source: 'system', text: fill(LOG.allowance, { n: allowance.total, bonus: allowance.bonus > 0 ? fill(LOG.allowanceBonus, { n: allowance.bonus, item: itemName('tirelire') }) : '' }) })
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
    boss,
    replayed: false,
    rolls: carry.rolls ?? 0,
    opponentAsleep: false,
    cocytusUsed: false,
    hookUsed: false,
    ixionUsed: carry.ixionUsed ?? false,
    maskFreeUsed: carry.maskFreeUsed ?? false,
    styxSoul: null,
    styxUsed: false,
  }
}

/** Ce que la rencontre rend à la session quand elle est finie. */
export function carryOut(ui: RaceUi): SessionCarry {
  return {
    money: ui.money,
    inventory: ui.inventory,
    raceIndex: ui.raceIndex + 1,
    lateBetCharges: ui.lateBetCharges,
    forgeFreeUsed: ui.forgeFreeUsed,
    rolls: ui.rolls,
    ixionUsed: ui.ixionUsed,
    maskFreeUsed: ui.maskFreeUsed,
  }
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
    const notes = r.move.notes.length > 0 ? fill(MOVE.notes, { notes: r.move.notes.map(noteText).join(MOVE.notesSeparator) }) : ''
    if (r.blockedAtStart) return fill(MOVE.blockedAtStart, { who, dist, notes })
    let s = fill(MOVE.move, { who, dist, notes, from: r.from, to: r.to })
    if (r.detour === 'blocked') s += fill(MOVE.detourBlocked, { lane: r.toLane + 1 })
    if (r.detour === 'occupied') s += fill(MOVE.detourOccupied, { lane: r.toLane + 1 })
    if (r.collision?.kind === 'jump') s += fill(MOVE.jump, { souls: r.collision.over.map(name).join(', ') })
    if (r.collision?.kind === 'swap') s += fill(MOVE.swap, { soul: name(r.collision.with), to: r.collision.otherTo })
    if (r.crossedFinish) s += MOVE.crossedFinish
    return s
  }, [])

  // ---- Paris -------------------------------------------------------------

  /** Niveau du stagiaire pendant cette course : conditionne les types de paris ouverts. */
  const level = demonLevelAtRace(carry.raceIndex)
  /**
   * Grade utilisé pour filtrer la vitrine (`minRank`). En mode e2e il est levé, comme l'est
   * déjà le déblocage du catalogue : les specs de la boutique testent son comportement — tri
   * par risque, confirmation, remplacement de dé — pas la progression, et leurs graines de
   * référence doivent pouvoir tirer dans tout le catalogue.
   */
  const vitrineLevel = e2eMode() ? Number.POSITIVE_INFINITY : level

  const placeBet = useCallback((type: BetTypeId, souls: readonly number[], stake: number): string | null => {
    const u = uiRef.current
    if (!canBetNow(u)) return u.phase === 'pairing' ? UI.bets.diceRolled : UI.bets.waitResolution
    if (!betUnlocked(type, level, config.economy.betUnlockLevel, u.inventory.artefacts)) {
      // Deux verrous différents : le grade du stagiaire, ou un objet de boutique pour les
      // guichets exotiques. Dire « dès Stagiaire » sur ces derniers n'aurait aucun sens.
      const needed = BET_TYPE_ARTEFACT[type]
      const owned: readonly string[] = u.inventory.artefacts
      if (needed !== undefined && !owned.includes(needed)) return fill(BETS.lockedItem, { name: itemName(needed) })
      return fill(BETS.locked, { rank: rankOfLevel(config.economy.betUnlockLevel[type]).name })
    }
    // Boss Le Guichetier : certains guichets ferment, en rotation d'un tour à l'autre.
    if (closedBetTypes(u).has(type)) return fill(UI.bets.windowClosed, { type: betLabel(type) })
    const initial = u.phase === 'prep'
    // Boss Ploutos : un pari posé en course coûte plus cher que sa mise affichée. La mise
    // enregistrée reste celle du ticket : c'est le passage au guichet qui est taxé, pas le gain.
    const cost = Math.round(stake * (initial ? 1 : (bossValue(u.boss, 'costlyLateBets') ?? 1)))
    const refusal = betRefusal(u.race, type, souls, stake, u.money, u.bets)
    if (refusal) return betRefusalText(refusal)
    if (cost > u.money) return fill(UI.bets.counterCut, { cost, stake })
    let multiplier = currentMultiplier(betBase(type, u.inventory), raceProgress(u.race), config.economy.decay)
    // Ticket de la première heure : la cote monte avant le premier lancer, descend en course.
    if (has(u.inventory, 'ticketPremiereHeure')) {
      multiplier = ticketMultiplier(multiplier, initial, { before: param('ticketPremiereHeure', 'before', 1), during: param('ticketPremiereHeure', 'during', 0.5) })
    }
    // Cote montante : le miroir exact du Ticket, pour qui parie tard. Les deux ne peuvent pas
    // être possédés ensemble (`EXCLUSIVE_ARTEFACTS`), ils s'annuleraient.
    if (has(u.inventory, 'coteMontante')) {
      multiplier = ticketMultiplier(multiplier, !initial, { before: param('coteMontante', 'during', 0.5), during: param('coteMontante', 'before', 0.5) })
    }
    const bet: Bet = { id: betId.current++, type, souls: [...souls], stake, multiplier, turn: initial ? 0 : u.race.turn, status: 'open', payout: 0 }
    const names = souls.map((id) => u.race.souls[id]?.name ?? `#${id}`).join(betType(type).ordered ? ' > ' : ', ')
    commit(pushLog({ ...u, money: u.money - cost, bets: [...u.bets, bet] }, 'bet', fill(LOG.betPlaced, { type: betLabel(type), souls: names, stake, paid: cost !== stake ? fill(LOG.betPaid, { cost }) : '', mult: fmtMultiplier(multiplier), payout: potentialPayout(stake, multiplier) })))
    return null
  }, [commit, pushLog, level])

  /** Retrait d'un pari en préparation (spec 03/C3) : mise rendue en entier, pari supprimé. */
  const cancelBet = useCallback((id: number): string | null => {
    const u = uiRef.current
    const r = cancelBetRule(u.bets, id, u.phase === 'prep')
    if (typeof r === 'string') return r
    const bet = u.bets.find((b) => b.id === id)
    const label = bet ? betLabel(bet.type) : '?'
    commit(pushLog({ ...u, money: u.money + r.refund, bets: r.bets }, 'bet', fill(LOG.betCancelled, { type: label, refund: r.refund })))
    return null
  }, [commit, pushLog])

  /** Œil du parieur : ouvre la fenêtre de pari après le lancer, une charge par cercle. */
  const useLateBet = useCallback(() => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.inventory.artefacts.includes('lateBet') || u.lateBetCharges <= 0 || u.lateBetOpen) return
    commit(pushLog({ ...u, lateBetCharges: u.lateBetCharges - 1, lateBetOpen: true }, 'artefact', LOG.lateBetOpen))
  }, [commit, pushLog])

  // ---- Boutique ----------------------------------------------------------

  /** La boutique n'ouvre qu'avec au moins un pari initial ; la vitrine est tirée à la première ouverture. */
  const shopUnlocked = useCallback((u: RaceUi): boolean => u.phase === 'prep' && u.bets.length > 0, [])

  const openShop = useCallback((): boolean => {
    const u = uiRef.current
    if (!shopUnlocked(u)) return false
    if (u.vitrine === null) {
      const vitrine = generateVitrine(shop, u.inventory, unlocked, rngRef.current, vitrineLevel)
      commit(pushLog({ ...u, vitrine, pendingPurchase: null }, 'shop', fill(LOG.shopOpen, { n: vitrine.length })))
    }
    return true
  }, [commit, pushLog, shopUnlocked, unlocked, vitrineLevel])

  const rerollVitrine = useCallback(() => {
    const u = uiRef.current
    const cost = rerollCostFor(u.inventory)
    if (!shopUnlocked(u) || u.money < cost) return
    const vitrine = generateVitrine(shop, u.inventory, unlocked, rngRef.current, vitrineLevel)
    commit(pushLog({ ...u, money: u.money - cost, vitrine, pendingPurchase: null, tally: { ...u.tally, spent: u.tally.spent + cost } }, 'shop', fill(LOG.rerolled, { cost })))
  }, [commit, pushLog, shopUnlocked, unlocked, vitrineLevel])

  /** Pourquoi un objet n'est pas achetable maintenant, ou null. */
  const purchaseRefusal = useCallback((u: RaceUi, item: ShopItem): string | null => {
    if (!shopUnlocked(u)) return UI.shop.closed
    const price = priceFor(item, u.raceIndex, u.inventory, freeCharges(u))
    if (u.money < price) return UI.shop.notEnoughMoney
    if (item.kind === 'artefact' && u.inventory.artefacts.includes(item.id)) return UI.shop.alreadyOwned
    // Deux artefacts qui s'annulent exactement : l'emplacement serait perdu (artefacts.md).
    const clash = item.kind === 'artefact' ? exclusiveWith(item.id, u.inventory.artefacts) : null
    if (clash) return fill(UI.shop.exclusive, { name: itemName(clash) })
    if (item.kind === 'forge' && !u.inventory.dice.some((d) => d.faces.some((f) => !f.altered))) return UI.shop.noFaceLeft
    // Masque brisé : rien à retirer tant qu'aucune âme en course n'est marquée.
    if (item.kind === 'personality' && item.personality === null && !u.race.souls.some((so) => u.inventory.personalities[so.id])) return UI.shop.nothingToStrip
    return null
  }, [shopUnlocked, level])

  /**
   * Achat. Un dé spécial ou une altération de forge demande une cible : le premier
   * appel sans cible met l'objet en attente, l'écran propose le choix, le second appel l'applique.
   */
  const buy = useCallback((itemId: string, target: PurchaseTarget | null = null): string | null => {
    const u = uiRef.current
    const item = u.vitrine?.find((i) => i.id === itemId)
    if (!item) return UI.shop.notInWindow
    const refusal = purchaseRefusal(u, item)
    if (refusal) return refusal
    const slots = artefactSlotsAt(shop, level)
    const needsTarget =
      item.kind === 'forge' ||
      item.kind === 'personality' ||
      (item.kind === 'die' && item.mode === 'replace') ||
      (item.kind === 'artefact' && u.inventory.artefacts.length >= slots)
    if (needsTarget && !target) {
      commit({ ...u, pendingPurchase: itemId })
      return null
    }
    try {
      const { inventory, log: purchase } = applyPurchase(item, u.inventory, target, maxAlteredFaces(shop, level))
      // Un masque parle d'une âme : le journal la nomme, il ne dit pas « âme n°3 ».
      const soulName = (id: number): string => u.race.souls[id]?.name ?? `#${id}`
      const freeForge = item.kind === 'forge' && has(u.inventory, 'marteauHephaistos') && !u.forgeFreeUsed
      // Sceau du stagiaire : le masque brisé du cercle est offert une fois.
      const freeMask = item.kind === 'personality' && item.personality === null && has(u.inventory, 'sceauDuStagiaire') && !u.maskFreeUsed
      const price = priceFor(item, u.raceIndex, u.inventory, freeCharges(u))
      const lateBetCharges = item.kind === 'artefact' && item.id === 'lateBet' ? config.artefacts.lateBet.chargesPerCircle : u.lateBetCharges
      let next = pushLog({ ...u, money: u.money - price, inventory, lateBetCharges, forgeFreeUsed: u.forgeFreeUsed || freeForge, maskFreeUsed: u.maskFreeUsed || freeMask, vitrine: (u.vitrine ?? []).filter((i) => i !== item), pendingPurchase: null, tally: { ...u.tally, spent: u.tally.spent + price } }, 'shop', freeForge || freeMask ? fill(LOG.purchaseFreeForge, { text: purchaseLogText(purchase, soulName) }) : fill(LOG.purchase, { text: purchaseLogText(purchase, soulName), cost: price }))
      // Ces artefacts changent le plateau : on achète en préparation, personne n'a bougé, la
      // piste est donc refaite tout de suite — longueur et seuil compris.
      if (item.kind === 'artefact' && TRACK_ARTEFACTS.includes(item.id)) {
        const track = createTrack(config.track, raceOptions(inventory, { lanes: u.race.track.lanes, blocked: u.race.track.blocked, specials: u.race.track.specials }, u.boss))
        next = pushLog({ ...next, race: { ...next.race, track } }, 'shop', fill(LOG.trackChanged, { columns: track.columns, pct: Math.round(track.betThresholdRatio * 100) }))
      }
      commit(next)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Achat impossible.'
    }
  }, [commit, purchaseRefusal, pushLog, level])

  /** Revente d'un artefact : 40 % du prix du cercle, l'emplacement se libère (artefacts.md). */
  const sell = useCallback((id: string): string | null => {
    const u = uiRef.current
    if (!shopUnlocked(u)) return UI.shop.closed
    if (!isArtefactId(id) || !u.inventory.artefacts.includes(id)) return UI.artefacts.notOwned
    const item = findItem(shop, id)
    const back = resaleValue(shop, priceFor(item, u.raceIndex, u.inventory))
    try {
      const { inventory } = sellArtefact(u.inventory, id)
      commit(pushLog({ ...u, inventory, money: u.money + back }, 'shop', fill(LOG.sold, { name: item.name, back })))
      return null
    } catch (e) {
      return e instanceof Error ? e.message : UI.shop.sellFailed
    }
  }, [commit, pushLog, shopUnlocked])

  /** Décapage : la face forgée retrouve sa valeur d'origine, contre le prix fixé par la forge. */
  const decap = useCallback((dieIndex: number, faceIndex: number): string | null => {
    const u = uiRef.current
    if (!shopUnlocked(u)) return UI.shop.closed
    const cost = shop.forge.decapCost
    if (u.money < cost) return fill(UI.shop.decapCost, { cost })
    try {
      const { inventory, log: stripped } = decapFace(u.inventory, { dieIndex, faceIndex })
      commit(pushLog({ ...u, inventory, money: u.money - cost, tally: { ...u.tally, spent: u.tally.spent + cost } }, 'shop', fill(LOG.purchase, { text: purchaseLogText(stripped), cost })))
      return null
    } catch (e) {
      return e instanceof Error ? e.message : UI.artefacts.decapFailed
    }
  }, [commit, pushLog, shopUnlocked])

  const cancelPurchase = useCallback(() => {
    const u = uiRef.current
    if (u.pendingPurchase !== null) commit({ ...u, pendingPurchase: null })
  }, [commit])

  /** Fin de la préparation : au moins un pari, la course commence. */
  const startRace = useCallback(() => {
    const u = uiRef.current
    if (u.phase !== 'prep' || u.bets.length === 0) return
    commit(pushLog({ ...u, phase: 'idle', pendingPurchase: null }, 'system', LOG.raceStart))
  }, [commit, pushLog])

  // ---- Course ------------------------------------------------------------

  /** Résout une liste de déplacements avec animation ; renvoie false si la séquence a été annulée. */
  const resolveMoves = useCallback(
    async (id: number, moves: ReturnType<typeof buildMoves>, indexOf: (i: number) => number | null): Promise<boolean> => {
      const inv = uiRef.current.inventory
      const coinsPerCollision = has(inv, 'boursePercee') ? param('boursePercee', 'coinsPerCollision', 2) : 0
      const rules = raceMoveRules(uiRef.current)
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
        if (result.collision && coinsPerCollision > 0) next = pushLog({ ...next, money: next.money + coinsPerCollision }, 'artefact', fill(LOG.holedPurse, { n: coinsPerCollision }))
        if (coins > 0) next = pushLog({ ...next, money: next.money + coins }, 'artefact', fill(LOG.stand, { n: coins }))
        // Roue d'Ixion : la PREMIÈRE âme à franchir l'arrivée repart du départ si aucun de vos
        // paris ne porte sur elle. Elle se déclenche quel que soit qui l'a poussée — vos dés
        // comme la paire adverse — et une seule fois par cercle.
        const crosser = state.souls.find((so) => so.id === entry.move.soul)
        if (result.crossedFinish && crosser?.finishOrder === 1 && !next.ixionUsed && has(next.inventory, 'roueDIxion') && !bettedSouls(next.bets).has(entry.move.soul)) {
          next = pushLog({ ...next, race: sendToStart(next.race, entry.move.soul), ixionUsed: true }, 'artefact', fill(LOG.ixion, { who: crosser.name }))
        }
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
    const u0 = uiRef.current
    if (u0.phase !== 'idle') return
    // Sommeil du contremaître : le compteur de lancers court sur tout le run. Il est incrémenté
    // ici, avant le tirage, pour que le joueur voie l'adversaire s'endormir au moment où il lance.
    const rolls = u0.rolls + 1
    const asleep = foremanAsleep(u0.inventory, rolls)
    const u = { ...u0, rolls, opponentAsleep: asleep }
    commit({ ...u, phase: 'rolling', roll: null, combinations: [], selectedSoulDie: null, lastResult: null, opponentRoll: null, opponentPreview: null })

    // Tour adverse connu d'avance (artefacts.md n°21, 22, 23). Les paires sont tirées ici, une
    // fois pour toutes : ce que le joueur voit est exactement ce qui sera résolu. Un adversaire
    // endormi ne lance rien : il n'y a rien à prévoir.
    const sight = opponentSight(u.inventory)
    if (sight !== 'none' && !asleep) {
      const opts = opponentOptions(u)
      const pairs = Array.from({ length: opponentRolls(u) }, () => rollOpponentPair(config, u.race.souls.length, rngRef.current, opts))
      if (sight === 'resolved') {
        // Miroir de Narcisse : l'adversaire joue et se résout avant le lancer du joueur.
        commit(pushLog({ ...uiRef.current, phase: 'opponent', opponentPreview: pairs }, 'artefact', LOG.mirrorFirst))
        for (const pair of pairs) {
          const w = uiRef.current
          const who = w.race.souls[pair.soul[0] ?? 0]?.name ?? '?'
          commit(pushLog({ ...w, opponentRoll: pair }, 'opponent', fill(LOG.opponentRoll, { who, dist: fmt(pair.distance[0] ?? 0) })))
          if (!(await resolveMoves(id, buildMoves(pair, naturalCombinations(pair), 'opponent', bossContext(uiRef.current.race.turn, uiRef.current.boss, soulsContext(uiRef.current))), () => null))) return
        }
        commit({ ...uiRef.current, phase: 'rolling', opponentRoll: null, opponentPreview: [] })
      } else {
        const shown = sight === 'first' ? pairs.slice(0, 1) : pairs
        const names = shown.map((pr) => `${u.race.souls[pr.soul[0] ?? 0]?.name ?? '?'} ${fmt(pr.distance[0] ?? 0)}`)
        commit(pushLog({ ...uiRef.current, opponentPreview: pairs }, 'artefact', fill(LOG.foresight, { source: sight === 'all' ? LOG.foresightAll : LOG.foresightFirst, names: names.join(', ') })))
      }
    }

    // Verrou de Minos : le dé verrouillé garde sa face du tour précédent au lieu d'être relancé.
    const locked = u.lockedDie !== null && u.lastFaces?.[u.lockedDie] ? { [u.lockedDie]: u.lastFaces[u.lockedDie]! } : undefined
    const roll = rollPlayerDice(config, u.race.souls.length, rngRef.current, u.inventory.dice, {
      soulDice: soulDiceCount(u.inventory),
      rerollTwins: has(u.inventory, 'relanceJumelle'),
      ...(tricksterOf(u) ? { trickster: tricksterOf(u)! } : {}),
      ...(bossValue(u.boss, 'lyingSoulDice') !== null ? { lying: bossValue(u.boss, 'lyingSoulDice')! } : {}),
      ...(locked ? { locked } : {}),
    })
    if (!(await wait(config.animation.diceMs, id))) return
    const v = uiRef.current
    const names = roll.soul.map((s) => v.race.souls[s]?.name ?? `#${s}`)
    let next = pushLog({ ...v, phase: 'pairing', roll, lastFaces: roll.faces, lockedDie: null, momentumUsed: [], fioleBonus: [] }, 'player', fill(LOG.roll, { dist: roll.faces.map(fmtFace).join(' / '), souls: names.join(' / ') }))
    // Face dorée : pièces à chaque sortie, associée ou non.
    const gold = roll.faces.filter((f) => f.effect === 'gold').length
    if (gold > 0) {
      const coins = gold * param('doree', 'coins', 5)
      next = pushLog({ ...next, money: next.money + coins }, 'artefact', fill(LOG.gildedFace, { n: coins }))
    }
    // Sommeil du contremaître : le tour adverse saute, annoncé dès le lancer pour que le joueur
    // ordonne ses combinaisons en le sachant.
    if (asleep) next = pushLog(next, 'artefact', fill(LOG.foremanAsleep, { n: rolls }))
    // Pourboire du stagiaire : versé juste après le lancer, une fois par course (tour 1).
    if (has(next.inventory, 'pourboireDuStagiaire') && next.race.turn === 1) {
      const coins = param('pourboireDuStagiaire', 'coins', 10)
      next = pushLog({ ...next, money: next.money + coins }, 'artefact', fill(LOG.tip, { n: coins }))
    }
    commit(next)
  }, [commit, pushLog, resolveMoves, wait])

  // ---- Objets à déclencher pendant l'appariement ---------------------------

  /** Fiole de sang : +1 sur un dé Distance, une fois par tour, 5 pièces comptant. */
  const useFiole = useCallback((distanceDie: number): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'fioleDeSang')) return UI.artefacts.noVial
    if (u.phase !== 'pairing' || !u.roll) return 'Seulement après le lancer, avant de résoudre.'
    if (u.fioleTurn === u.race.turn) return UI.artefacts.vialUsed
    if (u.combinations.some((c) => c.distanceDie === distanceDie)) return UI.artefacts.diePaired
    const cost = param('fioleDeSang', 'cost', 5)
    if (u.money < cost) return fill(UI.artefacts.vialCash, { cost })
    const bonus = param('fioleDeSang', 'bonus', 1)
    const faces = u.roll.faces.map((f, i) => (i === distanceDie ? { ...f, value: f.value + bonus } : f))
    const roll = { ...u.roll, faces, distance: faces.map((f) => f.value) }
    commit(pushLog({ ...u, roll, money: u.money - cost, fioleTurn: u.race.turn }, 'artefact', fill(LOG.vial, { n: distanceDie + 1, face: fmtFace(faces[distanceDie]!), cost })))
    return null
  }, [commit, pushLog])

  /** Face d'élan : relance le dé et ajoute le résultat, une seule fois par dé et par tour. */
  const useMomentum = useCallback((distanceDie: number): string | null => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.roll) return 'Seulement après le lancer.'
    const face = u.roll.faces[distanceDie]
    if (!face || face.effect !== 'momentum') return UI.artefacts.noMomentumFace
    if (u.momentumUsed.includes(distanceDie)) return UI.artefacts.momentumUsed
    if (u.combinations.some((c) => c.distanceDie === distanceDie)) return UI.artefacts.diePaired
    const die = u.inventory.dice[distanceDie]
    if (!die) return UI.artefacts.dieNotFound
    const again = die.faces[rngRef.current.int(die.faces.length)]!
    const faces = u.roll.faces.map((f, i) => (i === distanceDie ? { ...f, value: f.value + again.value } : f))
    const roll = { ...u.roll, faces, distance: faces.map((f) => f.value) }
    commit(pushLog({ ...u, roll, momentumUsed: [...u.momentumUsed, distanceDie] }, 'artefact', fill(LOG.momentum, { added: fmtFace(again), n: distanceDie + 1, face: fmtFace(faces[distanceDie]!) })))
    return null
  }, [commit, pushLog])

  /** Verrou de Minos : garde un dé sur sa face actuelle pour le prochain lancer. */
  const lockDie = useCallback((distanceDie: number | null): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'verrouDeMinos')) return UI.artefacts.noLock
    if (u.phase !== 'pairing') return 'Verrouillez pendant votre tour, pour le lancer suivant.'
    if (distanceDie !== null && !u.roll?.faces[distanceDie]) return UI.artefacts.dieNotFound
    const face = distanceDie === null ? null : u.roll!.faces[distanceDie]!
    commit(pushLog({ ...u, lockedDie: distanceDie }, 'artefact', distanceDie === null ? LOG.lockOff : fill(LOG.lockOn, { n: distanceDie + 1, face: fmtFace(face!) })))
    return null
  }, [commit, pushLog])

  /** Pièce à deux faces : double les mises ouvertes, au prix d'une paire adverse de plus. */
  const doubleStakes = useCallback((): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'pieceADeuxFaces')) return UI.artefacts.noCoin
    if (u.doubledStakes) return UI.artefacts.coinUsed
    if (u.race.turn !== 1 || u.phase !== 'pairing') return 'Seulement après le premier lancer de la course.'
    const open = u.bets.filter((b) => b.status === 'open')
    if (open.length === 0) return UI.artefacts.nothingToDouble
    const extra = open.reduce((sum, b) => sum + b.stake, 0)
    if (u.money < extra) return fill(UI.artefacts.doubleCost, { cost: extra })
    const bets = u.bets.map((b) => (b.status === 'open' ? { ...b, stake: b.stake * 2 } : b))
    commit(pushLog({ ...u, bets, money: u.money - extra, doubledStakes: true }, 'artefact', fill(LOG.doubled, { cost: extra })))
    return null
  }, [commit, pushLog])

  /** Tribune infernale : pose la tribune avant la course, sur une case libre hors zone de fin. */
  const putTribune = useCallback((column: number, lane: number): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'tribuneInfernale')) return UI.artefacts.noStand
    if (u.phase !== 'prep') return 'La tribune se pose avant la course.'
    const race = placeTribune(u.race, column, lane)
    if (race === u.race) return UI.artefacts.badCell
    commit(pushLog({ ...u, race, tribunePlaced: true }, 'artefact', fill(LOG.standPlaced, { column })))
    return null
  }, [commit, pushLog])

  /** Boule de Cocyte : relance les cinq dés, une fois par course, avant toute association. */
  const useCocytus = useCallback((): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'bouleDeCocyte')) return UI.artefacts.noOrb
    if (u.phase !== 'pairing' || !u.roll) return UI.artefacts.orbWhen
    if (u.cocytusUsed) return UI.artefacts.orbUsed
    if (u.combinations.length > 0) return UI.artefacts.orbPaired
    const roll = rollPlayerDice(config, u.race.souls.length, rngRef.current, u.inventory.dice, {
      soulDice: soulDiceCount(u.inventory),
      rerollTwins: has(u.inventory, 'relanceJumelle'),
      ...(tricksterOf(u) ? { trickster: tricksterOf(u)! } : {}),
      ...(bossValue(u.boss, 'lyingSoulDice') !== null ? { lying: bossValue(u.boss, 'lyingSoulDice')! } : {}),
    })
    const names = roll.soul.map((so) => u.race.souls[so]?.name ?? `#${so}`)
    // Le verrou et les relances d'élan portaient sur l'ancien lancer : ils tombent avec lui.
    let next = pushLog({ ...u, roll, lastFaces: roll.faces, lockedDie: null, momentumUsed: [], cocytusUsed: true }, 'artefact', fill(LOG.orb, { dist: roll.faces.map(fmtFace).join(' / '), souls: names.join(' / ') }))
    // Face dorée : elle paie à chaque sortie, donc aussi sur le second lancer.
    const gold = roll.faces.filter((f) => f.effect === 'gold').length
    if (gold > 0) {
      const coins = gold * param('doree', 'coins', 5)
      next = pushLog({ ...next, money: next.money + coins }, 'artefact', fill(LOG.gildedFace, { n: coins }))
    }
    commit(next)
    return null
  }, [commit, pushLog])

  /** Crochet de Charon : ramène une âme de la zone de fin sous le seuil, une fois par course. */
  const useHook = useCallback((soul: number): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'crochetDeCharon')) return UI.artefacts.noHook
    if (u.phase !== 'idle' && u.phase !== 'pairing') return UI.artefacts.hookWhen
    if (u.hookUsed) return UI.artefacts.hookUsed
    const distance = hookDistance(u.race, soul)
    if (distance >= 0) return UI.artefacts.hookNotInZone
    // `induced` : le rappel ne déclenche ni chaîne, ni aimant, ni parasite — un déplacement
    // induit par âme et par tour (artefacts.md § Combinaisons à surveiller).
    const move: Move = { ...simpleMove('artefact', soul, distance, [{ id: 'hook' }]), induced: true }
    const { state, result } = applyMove(u.race, move, raceMoveRules(u))
    commit(pushLog({ ...u, race: state, hookUsed: true, lastResult: result }, 'artefact', describe(u, result)))
    return null
  }, [commit, describe, pushLog])

  /**
   * Face de fusion : la combinaison portée par la face fusionne avec celle du dé Âme désigné.
   * Rien à résoudre de neuf — les deux combinaisons visent la même âme, le cumul du GDD §2.5.1
   * fait le reste, et la file affiche une carte fusionnée comme pour deux dés Âme jumeaux.
   */
  const fuseCombination = useCallback((soulDie: number): string | null => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.roll) return UI.artefacts.fusionWhen
    const roll = u.roll
    const source = u.combinations.findIndex((c) => roll.faces[c.distanceDie]?.effect === 'fusion')
    if (source < 0) return UI.artefacts.noFusionFace
    const host = u.combinations.find((c, i) => i !== source && c.soulDie === soulDie)
    if (!host) return UI.artefacts.fusionTarget
    const combinations = u.combinations.map((c, i) => (i === source ? { ...c, soulDie } : c))
    const who = u.race.souls[roll.soul[soulDie] ?? 0]?.name ?? '?'
    commit(pushLog({ ...u, combinations, selectedSoulDie: null }, 'artefact', fill(LOG.fusion, { who })))
    return null
  }, [commit, pushLog])

  /**
   * Bornes du stagiaire : deux cases posées avant la course, chacune d'un type choisi. Même
   * fenêtre que la tribune — en préparation, avant que personne n'ait bougé.
   */
  const putMarker = useCallback((column: number, lane: number, kind: SpecialCellKind): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'bornes')) return UI.artefacts.noMarker
    if (u.phase !== 'prep') return UI.artefacts.markerWhen
    const max = param('bornes', 'count', 2)
    if (u.race.markers >= max) return UI.artefacts.markerAllPlaced
    const value = kind === 'trap' ? param('bornes', 'pit', 2) : kind === 'boost' ? param('bornes', 'springboard', 2) : 0
    const race = placeMarker(u.race, column, lane, kind, value, max)
    if (race === u.race) return UI.artefacts.badCell
    commit(pushLog({ ...u, race }, 'artefact', fill(LOG.markerPlaced, { kind: MARKER_LABEL[kind] ?? kind, column, left: max - race.markers })))
    return null
  }, [commit, pushLog])

  /**
   * Écho du Styx : marque la combinaison d'une âme. Elle sera rejouée à l'identique juste après
   * s'être résolue — effets de face compris, c'est ce qui en fait un outil de dernier tour.
   * Marquer une seconde fois la même âme lève la marque : on peut changer d'avis avant de résoudre.
   */
  const markStyx = useCallback((soul: number): string | null => {
    const u = uiRef.current
    if (!has(u.inventory, 'echoDuStyx')) return UI.artefacts.noStyx
    if (u.phase !== 'pairing') return UI.artefacts.styxWhen
    if (u.styxUsed) return UI.artefacts.styxUsed
    const styxSoul = u.styxSoul === soul ? null : soul
    const who = u.race.souls[soul]?.name ?? '?'
    commit(pushLog({ ...u, styxSoul }, 'artefact', styxSoul === null ? LOG.styxOff : fill(LOG.styxOn, { who })))
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
        ? commit(pushLog({ ...cur, money: cur.money - ch.die.costPerUse }, 'artefact', fill(LOG.dieCost, { name: dieName(ch.die.kind), cost: ch.die.costPerUse })))
        : commit(pushLog({ ...cur, roll }, 'artefact', fill(LOG.dieUnpaid, { name: dieName(ch.die.kind) })))
    }

    const moves = buildMoves(roll, cur.combinations, 'player', moveContext(cur))
    // Écho du Styx : la combinaison marquée est doublée dans la file, juste après elle-même.
    // Elle garde ses effets de face (Bond, Explosive, Aimant) : c'est le point de l'artefact.
    const styx = cur.styxSoul !== null && !cur.styxUsed ? moves.findIndex((m) => m.soul === cur.styxSoul && !m.induced) : -1
    if (styx >= 0) {
      moves.splice(styx + 1, 0, { ...moves[styx]!, notes: [...moves[styx]!.notes, { id: 'styx' }], parts: [] })
      cur = commit(pushLog({ ...cur, styxUsed: true, styxSoul: null }, 'artefact', fill(LOG.styxEcho, { who: cur.race.souls[moves[styx]!.soul]?.name ?? '?' })))
    }
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
    const opts = opponentOptions(uiRef.current)
    const preview = uiRef.current.opponentPreview
    // Sommeil du contremaître : aucune paire ce tour-ci.
    const pairs = uiRef.current.opponentAsleep ? [] : (preview ?? Array.from({ length: opponentRolls(uiRef.current) }, () => rollOpponentPair(config, uiRef.current.race.souls.length, rngRef.current, opts)))
    for (const pair of pairs) {
      commit({ ...uiRef.current, opponentRoll: null, lastResult: null })
      if (!(await wait(config.animation.diceMs, id))) return
      const u = uiRef.current
      const name = u.race.souls[pair.soul[0] ?? 0]?.name ?? '?'
      commit(pushLog({ ...u, opponentRoll: pair }, 'opponent', fill(LOG.opponentRoll, { who: name, dist: fmt(pair.distance[0] ?? 0) })))
      if (!(await resolveMoves(id, buildMoves(pair, naturalCombinations(pair), 'opponent', bossContext(uiRef.current.race.turn, uiRef.current.boss, soulsContext(uiRef.current))), () => null))) return
    }

    const u = uiRef.current
    const ended = endTurn(u.race, u.boss)
    if (!ended.finished) {
      commit({ ...u, race: ended, phase: 'idle', resolvingIndex: null, roll: null, combinations: [], opponentRoll: null, opponentPreview: null })
      return
    }

    // Boss L'Ange : le tour d'arrivée se rejoue une seconde fois, adversaire compris.
    // Une seule fois par course — le drapeau `replayed` empêche la boucle sans fin.
    if (hasBoss(u.boss, 'replayTurn') && !u.replayed) {
      let cur2 = commit(pushLog({ ...u, replayed: true, resolvingIndex: null }, 'artefact', LOG.angelReplay))
      if (!(await resolveMoves(id, buildMoves(roll, combos, 'player', moveContext(cur2)), indexOf))) return
      commit({ ...uiRef.current, phase: 'opponent', resolvingIndex: null })
      for (const pair of pairs) {
        cur2 = commit({ ...uiRef.current, opponentRoll: null, lastResult: null })
        if (!(await wait(config.animation.diceMs, id))) return
        const who = cur2.race.souls[pair.soul[0] ?? 0]?.name ?? '?'
        commit(pushLog({ ...uiRef.current, opponentRoll: pair }, 'opponent', fill(LOG.opponentReplay, { who, dist: fmt(pair.distance[0] ?? 0) })))
        if (!(await resolveMoves(id, buildMoves(pair, naturalCombinations(pair), 'opponent', bossContext(uiRef.current.race.turn, uiRef.current.boss, soulsContext(uiRef.current))), () => null))) return
      }
    }

    const after = uiRef.current
    let done = pushLog({ ...after, race: endTurn(after.race, after.boss), phase: 'finished', resolvingIndex: null }, 'system', fill(LOG.raceEnd, { turn: ended.turn }))
    const finalRace = done.race
    const ranked = ranking(finalRace)
    // Le Juge (personnalité) : sa place change tous les gains de la course. Dit avant le
    // détail des tickets, sinon le joueur lirait des montants sans savoir d'où vient l'écart.
    const judge = judgeFactor(u.inventory.personalities, ranked)
    if (judge !== 1) {
      const soul = ranked.find((r) => u.inventory.personalities[r.soul.id] === 'juge')
      done = pushLog(done, 'system', fill(judge > 1 ? LOG.judgeTop : LOG.judgeLast, { who: soul?.soul.name ?? '?', rank: ordinal(soul?.rank ?? 0) }))
    }
    const settlement = settleBets(done.bets, ranked, settleOptions(u.inventory, circleOf(u.raceIndex).circle, (n) => rngRef.current.int(n), judge, { rams: finalRace.rams, backward: finalRace.backward }))
    for (const b of settlement.bets) {
      const names = b.souls.map((id) => finalRace.souls[id]?.name ?? `#${id}`).join(betType(b.type).ordered ? ' > ' : ', ')
      done = pushLog(done, 'bet', b.status === 'won' ? fill(LOG.betWon, { type: betLabel(b.type), souls: names, net: b.payout - b.stake, stake: b.stake }) : fill(LOG.betLost, { type: betLabel(b.type), souls: names, stake: b.stake }))
    }
    if (settlement.refund > 0) done = pushLog(done, 'artefact', fill(LOG.bookRefund, { n: settlement.refund }))
    if (settlement.relief > 0) done = pushLog(done, 'artefact', fill(LOG.balmRefund, { n: settlement.relief }))
    const net = settlement.returned - settlement.staked
    done = pushLog(done, 'system', fill(LOG.tally, { net: `${net >= 0 ? '+' : '−'}${Math.abs(net)}`, money: done.money + settlement.returned }))
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
      useFiole, useMomentum, lockDie, doubleStakes, putTribune, sell, decap,
      useCocytus, useHook, fuseCombination, putMarker, markStyx,
    },
  }
}
