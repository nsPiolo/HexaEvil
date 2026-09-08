/**
 * Le run — GDD §2 (`R*`), §9 (`J*`), §10 (`A*`), §11 (`F*`).
 *
 * `R6` : une défaite **termine le run**. Il n'y a ni vie, ni reprise : toutes
 * les victoires d'un run sont donc consécutives par construction (`R6b`).
 */

import { settingsFor } from '../ai/ai'
import { cloneCard, createStartingDeck, newCard } from '../cards/deck'
import { canEngrave, createDie, engraveEffect, engraveValue, upgradeDie } from '../dice/dice'
import type { GameConfig, ShopOptionId } from '../config/schema'
import { MatchDriver, type MatchParticipant, type MatchResult } from './match'
import type { Rng } from './random'
import type { Card, Die, FaceEffectId, Suit } from './types'

export type RunStatus = 'playing' | 'dead' | 'won'

export interface RunState {
  readonly cfg: GameConfig
  circleIndex: number
  /** Victoires dans le Cercle courant. Une défaite ne le remet pas à 0 : elle tue le run. */
  wins: number
  matchesPlayed: number
  money: number
  forgePoints: number
  deck: Card[]
  dice: Die[]
  status: RunStatus
  /** Meilleur Cercle atteint sur la session, seule trace d'un run à l'autre (`U16`). */
  bestCircle: number
  lastMoney: number
  totalMoney: number
}

export const HUMAN = 0

export function createRun(cfg: GameConfig, bestCircle = 1): RunState {
  const start = Math.min(Math.max(1, cfg.debugStart.circle), cfg.circles.length)
  const circle = cfg.circles[start - 1]
  if (!circle) throw new Error('Cercle de départ introuvable')
  const dice = Array.from({ length: cfg.dice.playerDice }, () =>
    upgradeDie(createDie(cfg.dice.startingFaces), circle.dieFaces),
  )
  return {
    cfg,
    circleIndex: start - 1,
    wins: 0,
    matchesPlayed: 0,
    money: cfg.debugStart.money,
    forgePoints: cfg.debugStart.forgePoints,
    deck: createStartingDeck(cfg.cards),
    dice,
    status: 'playing',
    bestCircle: Math.max(bestCircle, start),
    lastMoney: 0,
    totalMoney: 0,
  }
}

export function currentCircle(run: RunState) {
  const c = run.cfg.circles[run.circleIndex]
  if (!c) throw new Error(`Cercle ${run.circleIndex} introuvable`)
  return c
}

/** `R12b` : la dernière partie du Cercle est connue d'avance — c'est celle à 3. */
export function isCircleFinal(run: RunState): boolean {
  return run.wins + 1 >= currentCircle(run).winsRequired
}

export function participantCount(run: RunState): number {
  return isCircleFinal(run) ? run.cfg.participants.circleFinal : run.cfg.participants.default
}

export function buildParticipants(run: RunState): MatchParticipant[] {
  const count = participantCount(run)
  const list: MatchParticipant[] = [
    { index: HUMAN, name: 'Vous', isHuman: true, deck: run.deck, dice: run.dice, ai: null },
  ]
  const circle = currentCircle(run)
  const demonDeck = createStartingDeck(run.cfg.cards)
  const demonDice = Array.from({ length: run.cfg.dice.demonDice }, () =>
    upgradeDie(createDie(run.cfg.dice.startingFaces), circle.dieFaces),
  )
  for (let d = 0; d < count - 1; d++) {
    const demon = run.cfg.ai.demons[d]
    list.push({
      index: d + 1,
      name: demon?.name ?? `Démon ${d + 1}`,
      isHuman: false,
      // `S4` : deck et dés de départ, pour toute la durée du run.
      deck: demonDeck,
      dice: demonDice,
      ai: settingsFor(run.cfg.ai, d, run.circleIndex),
    })
  }
  return list
}

export function startMatch(run: RunState, rng: Rng): MatchDriver {
  const driver = new MatchDriver({
    cfg: run.cfg,
    circleIndex: run.circleIndex,
    participants: buildParticipants(run),
    rng,
    isCircleFinal: isCircleFinal(run),
  })
  driver.advance()
  return driver
}

export interface MatchOutcome {
  readonly won: boolean
  readonly money: number
  readonly forgeGained: number
  readonly circleCleared: boolean
  readonly status: RunStatus
}

export function finishMatch(run: RunState, result: MatchResult): MatchOutcome {
  // `F10` : l'argent des faces s'ajoute à celui des jetons donnés.
  const money = (result.money[HUMAN] ?? 0) + (result.bonusMoney[HUMAN] ?? 0)
  run.money += money
  run.forgePoints += result.bonusForge[HUMAN] ?? 0
  run.lastMoney = money
  run.totalMoney += money
  run.matchesPlayed++

  // `J7` : 1 point de forge toutes les N parties **du run**, sans discontinuité
  // au changement de Cercle.
  let forgeGained = 0
  if (run.matchesPlayed % run.cfg.forgePointEveryNMatches === 0) {
    forgeGained = 1
    run.forgePoints += 1
  }

  if (!result.humanWon) {
    // `R6` : une défaite termine le run.
    run.status = run.cfg.rules.runEndsOnLoss ? 'dead' : run.status
    if (!run.cfg.rules.runEndsOnLoss) run.wins = 0
    return { won: false, money, forgeGained, circleCleared: false, status: run.status }
  }

  run.wins++
  const circle = currentCircle(run)
  let cleared = false
  if (run.wins >= circle.winsRequired) {
    cleared = true
    if (run.circleIndex + 1 >= run.cfg.circles.length) {
      run.status = 'won'
    } else {
      run.circleIndex++
      run.wins = 0
      run.bestCircle = Math.max(run.bestCircle, run.circleIndex + 1)
      // `F6` : montée de dé — les faces gravées sont conservées.
      const next = currentCircle(run)
      run.dice = run.dice.map((d) => upgradeDie(d, next.dieFaces))
    }
  }
  return { won: true, money, forgeGained, circleCleared: cleared, status: run.status }
}

/* ----------------------------------------------------------- Boutique */

export interface ShopSession {
  readonly option: ShopOptionId
  /** Les cartes tirées au hasard dans le deck (`A3`), ou vide pour les gravures. */
  readonly cards: readonly Card[]
}

export function shopCost(run: RunState, option: ShopOptionId): { cost: number; currency: 'money' | 'forge' } {
  const entry = run.cfg.shop[option]
  if (!entry) throw new Error(`option de boutique inconnue : ${option}`)
  return { cost: entry.cost, currency: entry.currency }
}

export function canAfford(run: RunState, option: ShopOptionId): boolean {
  const { cost, currency } = shopCost(run, option)
  return currency === 'money' ? run.money >= cost : run.forgePoints >= cost
}

/** Nombre de cartes que l'option retire du deck, pour le plancher `K4`. */
function removalCount(option: ShopOptionId): number {
  if (option === 'removeTwo') return 2
  if (option === 'removeOne') return 1
  return 0
}

export function shopBlockedReason(run: RunState, option: ShopOptionId): string | null {
  if (!canAfford(run, option)) {
    const { cost, currency } = shopCost(run, option)
    return currency === 'money' ? `il faut ${cost} d'argent` : `il faut ${cost} point(s) de forge`
  }
  const removed = removalCount(option)
  if (removed > 0 && run.deck.length - removed < run.cfg.cards.minDeckSize) {
    return `plancher de ${run.cfg.cards.minDeckSize} cartes atteint (K4)`
  }
  return null
}

export function openShopOption(run: RunState, option: ShopOptionId, rng: Rng): ShopSession {
  const entry = run.cfg.shop[option]
  if (!entry) throw new Error(`option de boutique inconnue : ${option}`)
  const pool = entry.pool ?? 0
  if (pool === 0) return { option, cards: [] }
  // `A3` : tirage sans remise dans le deck, refait à chaque achat.
  const cards = rng.shuffle([...run.deck]).slice(0, Math.min(pool, run.deck.length))
  return { option, cards }
}

function pay(run: RunState, option: ShopOptionId): void {
  const { cost, currency } = shopCost(run, option)
  if (currency === 'money') run.money -= cost
  else run.forgePoints -= cost
}

/** `C13b` : un As n'est pas sélectionnable par `plusOneTwo`. */
export function canPlusOne(run: RunState, card: Card): boolean {
  return card.value < run.cfg.cards.maxValue
}

export interface CardSelection {
  readonly uids: readonly number[]
  readonly suit?: Suit
}

export function applyShopCards(run: RunState, session: ShopSession, selection: CardSelection): void {
  const chosen = session.cards.filter((c) => selection.uids.includes(c.uid))
  const byUid = new Map(run.deck.map((c, i) => [c.uid, i]))

  switch (session.option) {
    case 'removeOne':
    case 'removeTwo': {
      const need = session.option === 'removeTwo' ? 2 : 1
      if (chosen.length !== need) throw new Error(`${need} carte(s) à retirer, ${chosen.length} sélectionnée(s)`)
      if (run.deck.length - need < run.cfg.cards.minDeckSize) {
        throw new Error(`plancher de ${run.cfg.cards.minDeckSize} cartes (K4)`)
      }
      run.deck = run.deck.filter((c) => !selection.uids.includes(c.uid))
      break
    }
    case 'plusOneTwo': {
      if (chosen.length !== 2) throw new Error(`2 cartes à améliorer, ${chosen.length} sélectionnée(s)`)
      for (const c of chosen) {
        if (!canPlusOne(run, c)) throw new Error(`on ne peut pas augmenter un As (C13)`)
        const i = byUid.get(c.uid)
        if (i === undefined) continue
        run.deck[i] = newCard(c.value + 1, c.suit)
      }
      break
    }
    case 'clone': {
      if (chosen.length !== 1) throw new Error('une carte à cloner')
      run.deck.push(cloneCard(chosen[0] as Card))
      break
    }
    case 'recolor': {
      const suit = selection.suit
      if (!suit) throw new Error('choisir une couleur')
      for (const c of session.cards) {
        const i = byUid.get(c.uid)
        if (i === undefined) continue
        run.deck[i] = newCard(c.value, suit)
      }
      break
    }
    default:
      throw new Error(`${session.option} ne manipule pas de cartes`)
  }
  pay(run, session.option)
}

/** `F11` : une gravure agit sur **un seul** aspect de la face à la fois. */
export type EngraveOption =
  | { readonly kind: 'effect'; readonly effect: FaceEffectId }
  | { readonly kind: 'value'; readonly value: number }

export interface EngraveOrder {
  readonly dieIndex: number
  readonly faceIndex: number
  readonly option: EngraveOption
}

/**
 * `F11` : on ne choisit plus librement. Le graveur propose des **effets** — la
 * valeur de la face ne bouge pas — et quelques **valeurs** tirées au sort, qui
 * laissent l'effet en place. Les deux sont des achats légitimes : poser un effet
 * ajoute de la puissance sans rien retirer, changer une valeur reste un pari sur
 * la répétition — mauvais pari selon §17, mais c'est au joueur de voir.
 */
export function engraveOptions(
  run: RunState,
  dieIndex: number,
  faceIndex: number,
  rng: Rng,
): EngraveOption[] {
  const die = run.dice[dieIndex]
  if (!die) throw new Error(`dé ${dieIndex} introuvable`)
  const current = die.faces[faceIndex]
  if (!current) throw new Error(`face ${faceIndex} introuvable`)
  const cfg = run.cfg.dice.faceEffects

  const effects = rng
    .shuffle(cfg.catalogue.filter((e) => e !== current.effect))
    .slice(0, cfg.effectOptions)
    .map((effect): EngraveOption => ({ kind: 'effect', effect }))

  const pool: number[] = []
  for (let v = 1; v <= die.faces.length; v++) if (v !== current.value) pool.push(v)
  const values = rng
    .shuffle(pool)
    .slice(0, cfg.valueOptions)
    .map((value): EngraveOption => ({ kind: 'value', value }))

  return [...effects, ...values]
}

export function applyEngrave(run: RunState, option: 'engraveOne' | 'engraveAll', orders: readonly EngraveOrder[]): void {
  const expected = option === 'engraveOne' ? 1 : run.dice.length
  if (orders.length !== expected) throw new Error(`${expected} gravure(s) attendue(s), ${orders.length} fournie(s)`)
  for (const o of orders) {
    const die = run.dice[o.dieIndex]
    if (!die) throw new Error(`dé ${o.dieIndex} introuvable`)
    const target = o.option.kind === 'value' ? o.option.value : (die.faces[o.faceIndex]?.value ?? 0)
    const check = canEngrave(die, o.faceIndex, target)
    if (!check.ok) throw new Error(check.reason ?? 'gravure refusée')
  }
  for (const o of orders) {
    const die = run.dice[o.dieIndex] as Die
    run.dice[o.dieIndex] =
      o.option.kind === 'effect'
        ? engraveEffect(die, o.faceIndex, o.option.effect)
        : engraveValue(die, o.faceIndex, o.option.value)
  }
  pay(run, option)
}
