/**
 * Un run joué sans écran, pour l'équilibrage (`npm run balance`).
 *
 * La boucle rejoue celle de `src/presentation/useRace.ts` dans le même ordre — avance, paris,
 * boutique, lancer, appariement, résolution, adversaire, fin de tour, règlement, prix du cercle —
 * mais sans pause ni rendu. Tout ce qui est une **règle** vient du noyau ou de `useRace`, jamais
 * réécrit ici : une divergence ferait mentir les chiffres. Ce que le simulateur ajoute, ce sont
 * les **décisions** du joueur, rassemblées dans `profiles.ts`.
 *
 * Ce que le simulateur ne joue pas, et qui rend ses chiffres légèrement pessimistes : les paris
 * posés en cours de course (l'Œil du parieur et la fenêtre de pari entre deux tours), le retrait
 * d'un pari, et le choix de l'âme pariée d'après le plateau. Un vrai joueur fait mieux que le
 * profil « joueur ».
 */
import { config, shop } from '../src/core/config'
import { circleAt } from '../src/core/rules/circles'
import { allowanceAtCircle, raceAllowance } from '../src/core/rules/allowance'
import {
  bettingClosed,
  betRefusal,
  betType,
  betUnlocked,
  currentMultiplier,
  raceProgress,
  settleBets,
  slotCount,
  type Bet,
  type BetTypeId,
} from '../src/core/rules/bets'
import {
  applyMove,
  buildMoves,
  createRace,
  endTurn,
  naturalCombinations,
  ranking,
  rollOpponentPair,
  rollPlayerDice,
  unusedSoulMoves,
  type Combination,
  type RaceState,
  type Roll,
} from '../src/core/rules/race'
import { seededRng, type Rng } from '../src/core/rules/rng'
import { stakesAtCircle } from '../src/core/rules/stakes'
import { terrainFor } from '../src/core/rules/terrain'
import { applyPurchase, generateVitrine, opponentNegativesFlipped, type Inventory } from '../src/core/shop/shop'
import { allIds } from '../src/core/shop/unlocks'
import { bossContext, bossDistanceMods, bossMoveRules, type Move } from '../src/core/rules/race'
import { bossValue } from '../src/core/rules/boss'
import { defaultInventory } from '../src/core/shop/shop'
import { riskOf, type ShopItem } from '../src/core/shop/items'
import { applyProdigality, betBase, bettedSouls, circleOf, moveRules, priceFor } from '../src/presentation/useRace'
import { demonLevelAtRace } from '../src/presentation/demon'
import { BETTING_ORDER, TICKETS, type Profile } from './profiles'

/** Vivier de la vitrine pour la simulation : tout le catalogue, une fois pour toutes. */
const CATALOGUE = allIds(shop)

/** Ce qu'une course a rapporté ou coûté. */
export interface RaceOutcome {
  /** Avance versée par le stagiaire au départ. */
  allowance: number
  staked: number
  returned: number
  /** Dépensé en boutique. */
  spent: number
  turns: number
}

/** Ce qu'un cercle a donné : le solde au moment de payer, et si le prix est passé. */
export interface CircleOutcome {
  circle: number
  price: number
  /** Solde après les trois courses, avant de payer le prix. */
  money: number
  paid: boolean
  /** Flux d'argent des trois courses du cercle : d'où il vient, où il va. */
  allowance: number
  staked: number
  returned: number
  spent: number
}

export interface RunResult {
  seed: number
  profile: string
  /** Nombre de cercles **payés** depuis le départ du run ; 0 si le premier prix n'a pas été réuni. */
  cleared: number
  /** Cercle où le run s'est arrêté (celui dont le prix n'a pas pu être payé). */
  diedAt: number
  /** Le neuvième cercle a-t-il été payé (l'évasion est acquise) ? */
  escaped: boolean
  circles: CircleOutcome[]
}

/** Au-delà, on considère que le joueur ne s'arrêtera jamais : garde-fou du simulateur. */
const MAX_CIRCLES = 40

/**
 * Appariement des dés, le vrai levier de jeu : l'ordre est gratuit, les dés Âme désignent qui
 * bouge et les dés Distance de combien.
 *
 * - `naturelle` : dé Âme i avec dé Distance i, celui du noyau — le joueur qui n'a pas vu le levier.
 * - `favorite` : les distances positives vont à l'âme portée si un dé la désigne, sinon à l'âme
 *   la plus en retard (pour ne pas aider la tête) ; les distances négatives vont à l'âme sacrifiée,
 *   sinon à la mieux placée des autres, jamais à l'âme portée.
 */
export function pair(roll: Roll, state: RaceState, plan: Plan | null, how: Profile['pairing']): Combination[] {
  if (how === 'naturelle' || plan === null) return naturalCombinations(roll)
  const position = (soul: number): number => state.souls[soul]?.position ?? 0
  // Les grosses distances d'abord : elles méritent la meilleure cible.
  const distances = roll.distance.map((value, index) => ({ value, index })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  const free = roll.soul.map((soul, index) => ({ soul, index }))
  const combos: Combination[] = []
  for (const d of distances) {
    const available = free.filter((s) => !combos.some((c) => c.soulDie === s.index))
    if (available.length === 0) break
    const onFavourite = available.find((s) => s.soul === plan.favourite)
    const onVictim = available.find((s) => s.soul === plan.victim)
    let chosen
    if (d.value >= 0) {
      // Avancer : l'âme portée, sinon la plus en retard — surtout pas la sacrifiée ni la tête.
      const others = available.filter((s) => s.soul !== plan.victim).sort((a, b) => position(a.soul) - position(b.soul))
      chosen = onFavourite ?? others[0] ?? available[0]
    } else {
      // Reculer : l'âme sacrifiée, sinon la mieux placée des autres — jamais l'âme portée.
      const others = available.filter((s) => s.soul !== plan.favourite).sort((a, b) => position(b.soul) - position(a.soul))
      chosen = onVictim ?? others[0] ?? available[0]
    }
    if (!chosen) break
    combos.push({ soulDie: chosen.index, distanceDie: d.index })
  }
  return combos
}

/**
 * Le plan de course du joueur simulé : une âme qu'il pousse, une qu'il freine. Tous ses paris
 * en découlent, sinon il parierait pour et contre la même âme dans la même course.
 */
export interface Plan {
  favourite: number
  victim: number
}

/** Types de paris qui parient **contre** une âme : ils visent la sacrifiée, pas la portée. */
const AGAINST: ReadonlySet<BetTypeId> = new Set<BetTypeId>(['notTop3', 'last'])

/** Âmes à désigner pour un ticket, cohérentes avec le plan de course. */
export function soulsFor(type: BetTypeId, state: RaceState, plan: Plan): number[] {
  const count = slotCount(betType(type), state.souls.length)
  const ids = state.souls.map((s) => s.id)
  if (AGAINST.has(type)) return [plan.victim, ...ids.filter((id) => id !== plan.victim)].slice(0, count)
  // Le duel et le « vainqueur + dernier » veulent les deux bouts du plan, dans cet ordre.
  if (type === 'duel' || type === 'winnerAndLast') return [plan.favourite, plan.victim].slice(0, count)
  const middle = ids.filter((id) => id !== plan.favourite && id !== plan.victim)
  return [plan.favourite, ...middle, plan.victim].slice(0, count)
}

/** Mises proposées au cercle, de la plus grosse à la plus petite — la même échelle que celle du joueur à l'écran. */
const stakesDesc = (circle: number): number[] => stakesAtCircle(config, circle).sort((a, b) => b - a)

/** Paris posés avant le départ, selon le profil. Renvoie les paris et ce qu'ils ont coûté. */
function placeBets(state: RaceState, money: number, inventory: Inventory, level: number, profile: Profile, plan: Plan, ladder: readonly number[]): { bets: Bet[]; staked: number } {
  const budget = Math.floor(money * profile.stakeShare)
  const order = BETTING_ORDER[profile.betting].filter((t) => betUnlocked(t, level, config.economy.betUnlockLevel))
  const bets: Bet[] = []
  let staked = 0
  let id = 0
  // Un même type ne se repose pas sur les mêmes âmes (le noyau refuse le doublon) : on décale
  // l'âme portée d'un cran à chaque ticket supplémentaire, comme un joueur qui étale ses tickets.
  const soulCount = state.souls.length
  const wanted = TICKETS[profile.betting]
  const queue = order.flatMap((type) => Array.from({ length: wanted }, (_, k) => ({ type, shift: k })))
  for (const { type, shift } of queue) {
    if (bets.length >= wanted) break
    const shifted: Plan = { favourite: (plan.favourite + shift) % soulCount, victim: (plan.victim - shift + soulCount * 2) % soulCount }
    const souls = soulsFor(type, state, shift === 0 ? plan : shifted)
    const stake = ladder.find((s) => s <= budget - staked && s <= money - staked)
    if (stake === undefined) break
    if (betRefusal(state, type, souls, stake, money - staked, bets)) continue
    bets.push({
      id: id++,
      type,
      souls,
      stake,
      multiplier: currentMultiplier(betBase(type, inventory), raceProgress(state), config.economy.decay),
      turn: 0,
      status: 'open',
      payout: 0,
    })
    staked += stake
  }
  return { bets, staked }
}

/**
 * Part du solde qu'un acheteur prudent accepte de mettre dans un objet. Sans ce garde-fou, il
 * vide sa bourse au premier cercle pour un artefact et n'a plus de quoi payer la sortie : c'est
 * ce que faisait la première version du simulateur, et ça écrasait tous les autres chiffres.
 */
const SHOP_SHARE = 0.25

/**
 * Achats du profil `prudent` : le meilleur objet sans contrepartie qu'il peut payer sans y
 * mettre plus d'un quart de sa bourse. Un seul objet par vitrine.
 */
function shopFor(vitrine: readonly ShopItem[], money: number, raceIndex: number, inventory: Inventory, reserve: number): { inventory: Inventory; spent: number } {
  const budget = Math.min(money - reserve, money * SHOP_SHARE)
  const affordable = vitrine
    .filter((i) => riskOf(i) !== 'danger' && i.warning === null)
    .filter((i) => priceFor(i, raceIndex) <= budget)
    .filter((i) => i.kind !== 'artefact' || inventory.artefacts.length < shop.artefactSlots)
  // Le plus cher des objets abordables : dans cette boutique, le prix suit l'impact.
  const best = affordable.sort((a, b) => priceFor(b, raceIndex) - priceFor(a, raceIndex))[0]
  if (!best) return { inventory, spent: 0 }
  // Un dé remplace le premier dé Distance ; une forge attaque la première face encore libre,
  // et se renonce s'il n'y en a plus (le noyau refuserait l'achat).
  let target = null
  if (best.kind === 'die') target = { dieIndex: 0 }
  if (best.kind === 'forge') {
    const faceIndex = inventory.dice[0]?.faces.findIndex((f) => f.altered === null) ?? -1
    if (faceIndex < 0) return { inventory, spent: 0 }
    target = { dieIndex: 0, faceIndex }
  }
  // Le noyau refuse certains achats en levant une exception (forger la dernière face positive
  // d'un dé, par exemple) : pour le joueur simulé, c'est le forgeron qui dit non — pas d'achat.
  try {
    const result = applyPurchase(best, inventory, target)
    if (typeof result === 'string') return { inventory, spent: 0 }
    return { inventory: result.inventory, spent: priceFor(best, raceIndex) }
  } catch {
    return { inventory, spent: 0 }
  }
}

/** Une course entière, de l'avance au règlement des paris. */
function simulateRace(raceIndex: number, money: number, inventory: Inventory, profile: Profile, rng: Rng, seed: number): { money: number; inventory: Inventory; outcome: RaceOutcome } {
  const { circle, raceInCircle } = circleOf(raceIndex)
  const cfg = circleAt(config.run, circle)
  const level = demonLevelAtRace(raceIndex)
  const terrain = terrainFor(cfg.terrains, seed)

  const allowance = raceAllowance(allowanceAtCircle(config.economy, circle), inventory, shop).total
  let cash = money + allowance
  let inv = inventory
  const sablier = inv.artefacts.includes('sablier')
  // Course du boss : son pouvoir s'applique, comme en jeu (src/core/rules/boss.ts). Sans lui,
  // l'équilibrage mesurerait deux courses sur trois et ignorerait la plus dure.
  const boss = raceInCircle === config.run.racesPerCircle ? [...cfg.powers] : []
  const bossRules = bossMoveRules(boss)
  const bossMods = bossDistanceMods(boss)
  let state = createRace(config, {
    soulCount: cfg.souls,
    lanes: cfg.lanes,
    blocked: terrain.blocked,
    specials: terrain.specials,
    ...(bossValue(boss, 'betThreshold') !== null ? { betThresholdRatio: bossValue(boss, 'betThreshold')! / 100 } : {}),
    ...(sablier ? { betThresholdRatio: config.artefacts.sablier.betThresholdRatio } : {}),
  })

  // Le plan : l'âme du couloir du bas est portée, celle du haut est sacrifiée. Les âmes sont
  // interchangeables au départ, seul compte le fait que le joueur s'y tienne toute la course.
  const plan: Plan = { favourite: 0, victim: state.souls.length - 1 }
  const ladder = stakesDesc(circle)
  const { bets, staked } = placeBets(state, cash, inv, level, profile, plan, ladder)
  cash -= staked

  // La boutique n'ouvre qu'après un pari posé, et sa vitrine est tirée à l'ouverture.
  // On simule un compte où tout est descellé (`allIds`) : c'est le plafond du catalogue,
  // pas la première évasion d'un joueur neuf, qui ne voit que `shop.unlockedAtStart` plus
  // un objet par cercle payé (src/core/shop/unlocks.ts).
  let spent = 0
  if (profile.shopping !== 'rien' && bets.length > 0) {
    const vitrine = generateVitrine(shop, inv, CATALOGUE, rng)
    const bought = shopFor(vitrine, cash, raceIndex, inv, ladder[ladder.length - 1] ?? 0)
    inv = bought.inventory
    spent = bought.spent
    cash -= spent
  }

  let guard = 0
  let nextBetId = bets.length
  while (!state.finished && guard++ < 200) {
    // Pari de tour : tant que le guichet est ouvert, on remise sur l'âme en tête. La cote a
    // décoté avec l'avancement (`currentMultiplier`), mais le pari est bien plus sûr — c'est le
    // geste que fait un joueur qui regarde le plateau, et il change tout le rendement.
    if (profile.lateBets === 'opportuniste' && state.turn > 1 && !bettingClosed(state)) {
      // On ne remise que sur l'âme qu'on pousse, et seulement quand elle est en tête : parier sur
      // le meneur du moment quand ce n'est pas la sienne revient à parier contre son propre jeu.
      const leader = ranking(state)[0]?.soul.id === plan.favourite ? plan.favourite : undefined
      const stake = ladder.find((v) => v <= cash * profile.stakeShare)
      if (leader !== undefined && stake !== undefined && !betRefusal(state, 'winner', [leader], stake, cash, bets)) {
        bets.push({
          id: nextBetId++,
          type: 'winner',
          souls: [leader],
          stake,
          multiplier: currentMultiplier(betBase('winner', inv), raceProgress(state), config.economy.decay),
          turn: state.turn,
          status: 'open',
          payout: 0,
        })
        cash -= stake
      }
    }
    const roll = rollPlayerDice(config, state.souls.length, rng, inv.dice)
    const combos = pair(roll, state, plan, profile.pairing)
    const { roll: charged } = applyProdigality(roll, combos, inv.dice, cash)
    const ctx = {
      turn: state.turn,
      clepsydre: inv.artefacts.includes('clepsydre'),
      bettedSouls: bettedSouls(bets),
      sealBonus: 2,
      boss: bossMods,
    }
    // Les tickets ouverts entrent aussi dans les règles de déplacement : la case payante ne verse
    // que sur une âme pariée, et une simulation qui l'ignorerait surestimerait les recettes.
    const rules = { ...moveRules(inv), ...bossRules, bettedSouls: ctx.bettedSouls }
    // Le simulateur résout aussi les déplacements induits (liens, aimant, souffle, cases spéciales).
    const run = (move: Move): void => {
      const out = applyMove(state, move, rules)
      state = out.state
      cash += out.coins
      for (const f of out.follow) state = applyMove(state, f, rules).state
    }
    for (const move of buildMoves(charged, combos, 'player', ctx)) run(move)
    if (inv.artefacts.includes('boussole')) {
      for (const move of unusedSoulMoves(charged, combos)) run(move)
    }
    const oppOpts = { flipNegatives: opponentNegativesFlipped(inv), ...(bossValue(boss, 'opponentBoost') !== null ? { boost: bossValue(boss, 'opponentBoost')! } : {}) }
    const pairs = config.opponent.rollsPerTurn + (bossValue(boss, 'extraPairs') ?? 0)
    for (let k = 0; k < pairs; k++) {
      const opponent = rollOpponentPair(config, state.souls.length, rng, oppOpts)
      for (const move of buildMoves(opponent, naturalCombinations(opponent), 'opponent', bossContext(state.turn, boss))) run(move)
    }
    state = endTurn(state, boss)
  }

  const refundRatio = inv.artefacts.includes('livreDesComptes') ? 0.5 : 0
  const settlement = settleBets(bets, ranking(state), refundRatio > 0 ? { refundRatio, pickLost: (n) => rng.int(n) } : {})
  return {
    money: cash + settlement.returned,
    inventory: inv,
    outcome: { allowance, staked: settlement.staked, returned: settlement.returned, spent, turns: state.turn },
  }
}

/** Point de départ d'un run simulé : le début du jeu, ou un cercle donné avec une bourse donnée. */
export interface Start {
  /** Premier cercle joué (1 = début du jeu). */
  circle: number
  /** Bourse à l'entrée de ce cercle, avant l'avance de la première course. */
  money: number
}

const FROM_SCRATCH: Start = { circle: 1, money: config.economy.startingMoney }

/**
 * Un run complet : on enchaîne les cercles jusqu'à ce qu'un prix ne soit plus payable.
 *
 * `start` permet de mesurer la fin de la courbe sans attendre que des runs y arrivent : trop peu
 * de runs partis du cercle 1 atteignent le sixième pour que leurs taux de passage veuillent dire
 * quelque chose. Partir du cercle 6 avec une marge typique (ce qu'il reste après avoir payé le
 * cinquième) donne des centaines de cas au lieu de trois. L'inventaire, lui, repart à neuf : on
 * mesure les prix, pas la boutique.
 */
export function simulateRun(seed: number, profile: Profile, start: Start = FROM_SCRATCH): RunResult {
  let money = start.money
  let inventory = defaultInventory(config)
  let raceIndex = (start.circle - 1) * config.run.racesPerCircle
  const circles: CircleOutcome[] = []

  for (let circle = start.circle; circle <= MAX_CIRCLES; circle++) {
    let allowance = 0
    let staked = 0
    let returned = 0
    let spent = 0
    for (let r = 0; r < config.run.racesPerCircle; r++) {
      // Même règle de graine que le jeu : une par course, dérivée de celle du run.
      const raceSeed = (seed + raceIndex) >>> 0
      const out = simulateRace(raceIndex, money, inventory, profile, seededRng(raceSeed), raceSeed)
      money = out.money
      inventory = out.inventory
      allowance += out.outcome.allowance
      staked += out.outcome.staked
      returned += out.outcome.returned
      spent += out.outcome.spent
      raceIndex++
    }
    const price = circleAt(config.run, circle).price
    const paid = money >= price
    circles.push({ circle, price, money, paid, allowance, staked, returned, spent })
    if (!paid) {
      return { seed, profile: profile.name, cleared: circle - start.circle, diedAt: circle, escaped: circle > config.run.escapeCircle, circles }
    }
    money -= price
  }
  return { seed, profile: profile.name, cleared: MAX_CIRCLES - start.circle + 1, diedAt: MAX_CIRCLES + 1, escaped: true, circles }
}

/**
 * Chances réelles de l'âme pariée, mesurées sur `races` courses d'un cercle donné, sans pari.
 *
 * C'est le chiffre qui commande les cotes : un pari « Vainqueur » n'est équitable qu'à la cote
 * `1 / chance de gagner`. Si l'appariement soigné ne fait pas monter cette chance au-dessus de
 * `1 / âmes`, le levier de jeu ne paie pas et aucun réglage de prix ne sauvera le run.
 */
export function measureOdds(circle: number, pairing: Profile['pairing'], races: number, firstSeed = 1): { winner: number; top3: number; last: number } {
  const cfg = circleAt(config.run, circle)
  const inventory = defaultInventory(config)
  let winner = 0
  let top3 = 0
  let last = 0
  for (let i = 0; i < races; i++) {
    const seed = (firstSeed + i * 7919) >>> 0
    const rng = seededRng(seed)
    let state = createRace(config, { soulCount: cfg.souls, lanes: cfg.lanes, blocked: terrainFor(cfg.terrains, seed).blocked })
    let guard = 0
    while (!state.finished && guard++ < 200) {
      const roll = rollPlayerDice(config, state.souls.length, rng, inventory.dice)
      const combos = pair(roll, state, pairing === 'favorite' ? { favourite: 0, victim: state.souls.length - 1 } : null, pairing)
      for (const move of buildMoves(roll, combos, 'player', { turn: state.turn, clepsydre: false, bettedSouls: new Set(), sealBonus: 2 })) state = applyMove(state, move).state
      for (let k = 0; k < config.opponent.rollsPerTurn; k++) {
        const opponent = rollOpponentPair(config, state.souls.length, rng)
        for (const move of buildMoves(opponent, naturalCombinations(opponent), 'opponent')) state = applyMove(state, move).state
      }
      state = endTurn(state)
    }
    const ranked = ranking(state)
    const rank = ranked.find((r) => r.soul.id === 0)?.rank ?? ranked.length
    if (rank === 1) winner++
    if (rank <= 3) top3++
    if (rank === ranked.length) last++
  }
  return { winner: winner / races, top3: top3 / races, last: last / races }
}

/** `runs` runs d'un profil, graines consécutives à partir de `firstSeed`. */
export function simulateMany(profile: Profile, runs: number, firstSeed = 1, start: Start = FROM_SCRATCH): RunResult[] {
  return Array.from({ length: runs }, (_, i) => simulateRun((firstSeed + i * 7919) >>> 0, profile, start))
}
