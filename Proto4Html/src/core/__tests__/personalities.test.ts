/**
 * Personnalités d'âmes (GDD §6.5, docs/proto4/personnalites.md).
 *
 * Chaque effet est vérifié là où il se résout, parce qu'aucun ne se résout au même endroit :
 * la lecture de la face et l'amplitude passent par `buildMoves`, le plateau par `applyMove`,
 * le dé Âme par `rollPlayerDice`, le Juge par `settleBets`.
 */
import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from '../config/load'
import type { RaceConfig } from '../config/schema'
import { plainFace } from '../rules/dice'
import { settleBets, type Bet } from '../rules/bets'
import {
  applyMove,
  buildMoves,
  createRace,
  ranking,
  rollPlayerDice,
  type MoveContext,
  type Move,
  type RaceState,
  type SoulsContext,
} from '../rules/race'
import {
  CONSTANT_VALUE,
  PERSONALITY_IDS,
  TRICKSTER_ONE_IN,
  drawPersonality,
  judgeFactor,
  readDie,
  revealTarget,
  revealsPersonality,
  shapeMove,
  soulWith,
  type Personalities,
} from '../rules/personalities'
import { seededRng } from '../rules/rng'
import { loadShopConfig } from '../shop/load'
import { applyPurchase, defaultInventory, findItem, generateVitrine, type Inventory } from '../shop/shop'
import { allIds } from '../shop/unlocks'

const cfg: RaceConfig = loadConfig(rawConfig)
const shop = loadShopConfig(rawShop)

function withPositions(positions: number[], lanes = 1, blocked: { column: number; lane: number }[] = []): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: positions.length } }, { soulCount: positions.length, lanes, blocked })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: positions[i] ?? 0 })) }
}

function ctxOf(race: RaceState, personalities: Personalities, turn = 1): MoveContext {
  const souls: SoulsContext = { personalities, positions: race.souls.map((s) => s.position), betThresholdColumn: race.track.betThresholdColumn }
  return { turn, clepsydre: false, bettedSouls: new Set(), sealBonus: 0, souls }
}

/** La distance réellement jouée par une âme pour une face donnée, personnalité comprise. */
function distanceOf(race: RaceState, personalities: Personalities, soul: number, face: number, turn = 1): number {
  const roll = { distance: [face], faces: [plainFace(face)], soul: [soul] }
  return buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }], 'player', ctxOf(race, personalities, turn))[0]!.distance
}

function move(soul: number, distance: number): Move {
  return { source: 'player', soul, distance, parts: [{ soulDie: 0, distanceDie: 0, distance }], notes: [], effects: [] }
}

describe('catalogue des personnalités', () => {
  it('en compte dix, toutes distinctes', () => {
    expect(PERSONALITY_IDS).toHaveLength(10)
    expect(new Set(PERSONALITY_IDS).size).toBe(10)
  })
  it('a son masque en boutique, plus le masque brisé qui en retire une', () => {
    const masques = shop.items.filter((i) => i.kind === 'personality')
    expect(masques).toHaveLength(PERSONALITY_IDS.length + 1)
    for (const id of PERSONALITY_IDS) {
      expect(masques.some((m) => m.kind === 'personality' && m.personality === id), id).toBe(true)
    }
    expect(masques.filter((m) => m.kind === 'personality' && m.personality === null)).toHaveLength(1)
  })
  it('refuse un masque dont la personnalité n’existe pas', () => {
    const raw = JSON.parse(JSON.stringify(rawShop))
    const i = raw.items.findIndex((it: { id: string }) => it.id === 'masqueMartyr')
    raw.items[i].personality = 'lunatique'
    expect(() => loadShopConfig(raw)).toThrow(/sans implémentation/)
  })
})

describe('lecture du dé', () => {
  it('Le Constant avance d’une case, quoi que dise le dé', () => {
    for (const face of [-1, 1, 2, 3]) expect(readDie('constant', face)).toBe(CONSTANT_VALUE)
    const race = withPositions([0, 0])
    expect(distanceOf(race, { 0: 'constant' }, 0, 3)).toBe(1)
    expect(distanceOf(race, { 0: 'constant' }, 0, -1)).toBe(1)
  })
  it('L’Opposant prend la valeur opposée : un 2 devient −2, un −1 devient 1', () => {
    expect(readDie('opposant', 2)).toBe(-2)
    expect(readDie('opposant', -1)).toBe(1)
    const race = withPositions([3, 0])
    expect(distanceOf(race, { 0: 'opposant' }, 0, 2)).toBe(-2)
    expect(distanceOf(race, { 0: 'opposant' }, 0, -1)).toBe(1)
  })
  it('ne touche pas aux âmes sans personnalité', () => {
    const race = withPositions([0, 0])
    expect(distanceOf(race, { 1: 'opposant' }, 0, 3)).toBe(3)
  })
})

describe('amplitude du déplacement', () => {
  const plain = { turn: 2, position: 0, betThresholdColumn: 9 }
  it('L’Ambitieux pousse les grands écarts dans les deux sens', () => {
    expect(shapeMove('ambitieux', 3, plain)).toBe(4)
    expect(shapeMove('ambitieux', -1, plain)).toBe(-2)
    expect(shapeMove('ambitieux', 2, plain)).toBe(2)
  })
  it('Le Martyr avance d’une case de moins, sans jamais tomber sous 1', () => {
    expect(shapeMove('martyr', 3, plain)).toBe(2)
    expect(shapeMove('martyr', 1, plain)).toBe(1)
    expect(shapeMove('martyr', -1, plain)).toBe(-1)
  })
  it('Le Condamné part lourd au premier tour et gagne une case depuis la zone de fin', () => {
    expect(shapeMove('condamne', 2, { ...plain, turn: 1 })).toBe(1)
    expect(shapeMove('condamne', 2, { ...plain, turn: 2 })).toBe(2)
    expect(shapeMove('condamne', 2, { ...plain, position: 10 })).toBe(3)
    // Un recul reste un recul, quelle que soit la case d'où il part.
    expect(shapeMove('condamne', -1, { ...plain, position: 10 })).toBe(-1)
  })
  it('se lit sur la position réelle de l’âme dans la course', () => {
    const race = withPositions([0, 0])
    const late = { ...race, souls: race.souls.map((s) => (s.id === 0 ? { ...s, position: race.track.betThresholdColumn } : s)) }
    expect(distanceOf(late, { 0: 'condamne' }, 0, 2, 3)).toBe(3)
  })
})

describe('contre le plateau', () => {
  it('Le Résolu s’arrête sur une case bloquée comme sur une autre', () => {
    const blocked = [{ column: 3, lane: 0 }]
    const race = withPositions([1, 8], 2, blocked)
    const normal = applyMove(race, move(0, 2), {}).result
    expect(normal.to === 3 && normal.toLane === 0).toBe(false)
    const resolu = applyMove(race, move(0, 2), { personalities: { 0: 'resolu' } }).result
    expect({ to: resolu.to, lane: resolu.toLane, detour: resolu.detour }).toEqual({ to: 3, lane: 0, detour: null })
  })
  it('L’Ogre fait reculer d’une case l’âme qu’il dépasse', () => {
    const race = withPositions([1, 3])
    const { result, follow } = applyMove(race, move(0, 2), { personalities: { 0: 'ogre' } })
    expect(result.collision).toEqual({ kind: 'jump', over: [1] })
    expect(follow.map((m) => ({ soul: m.soul, distance: m.distance }))).toContainEqual({ soul: 1, distance: -1 })
    // Sans l'Ogre, la percussion ne pousse personne.
    expect(applyMove(race, move(0, 2), {}).follow).toHaveLength(0)
  })
  it('Le Parasite suit l’âme qui le précède quand elle avance de 2 ou plus', () => {
    // 0 est devant, 1 le suit de près, 2 est loin derrière : seul 1 est parasité par 0.
    const race = withPositions([4, 3, 0])
    const rules = { personalities: { 1: 'parasite' } as Personalities }
    expect(applyMove(race, move(0, 2), rules).follow.map((m) => m.soul)).toEqual([1])
    // Une avancée d'une seule case ne le réveille pas.
    expect(applyMove(race, move(0, 1), rules).follow).toHaveLength(0)
    // Ni le déplacement d'une âme qui n'est pas devant lui.
    expect(applyMove(race, move(2, 2), rules).follow).toHaveLength(0)
  })
  it('Le Martyr garde rancune quand on le percute, et tout lui revient en zone de fin', () => {
    const rules = { personalities: { 1: 'martyr' } as Personalities }
    const race = withPositions([1, 2])
    // Percuté (saut par-dessus) : une rancune. Échangé (recul sur sa case) : une de plus.
    const after = applyMove(race, move(0, 1), rules).state
    expect(after.grudges[1]).toBe(1)
    const twice = applyMove(after, move(0, -1), rules).state
    expect(twice.grudges[1]).toBe(2)
    // En entrant en zone de fin, il dépense tout d'un coup.
    const seuil = twice.track.betThresholdColumn
    const before = { ...twice, souls: twice.souls.map((s) => (s.id === 1 ? { ...s, position: seuil - 1 } : s)) }
    const { follow, state } = applyMove(before, move(1, 1), rules)
    expect(follow.map((m) => ({ soul: m.soul, distance: m.distance }))).toEqual([{ soul: 1, distance: 2 }])
    expect(state.grudges[1]).toBe(0)
  })
  it('n’invente rien quand personne n’est marqué', () => {
    const race = withPositions([1, 3])
    const { state, follow } = applyMove(race, move(0, 2), {})
    expect(follow).toHaveLength(0)
    expect(state.grudges).toEqual({})
  })
})

describe('Le Tricheur', () => {
  it('relance parfois le dé Âme qui le désigne, jamais celui des autres', () => {
    const trickster = { soul: 0, oneIn: TRICKSTER_ONE_IN }
    let rerolled = 0
    for (let seed = 1; seed <= 400; seed++) {
      const rng = seededRng(seed)
      const sans = rollPlayerDice(cfg, 5, seededRng(seed), defaultInventory(cfg).dice)
      const avec = rollPlayerDice(cfg, 5, rng, defaultInventory(cfg).dice, { trickster })
      // Les dés qui ne le nomment pas ne bougent jamais.
      sans.soul.forEach((id, i) => {
        if (id !== 0) expect(avec.soul[i]).toBe(id)
      })
      if (sans.soul.includes(0) && sans.soul.some((id, i) => id === 0 && avec.soul[i] !== 0)) rerolled++
    }
    expect(rerolled).toBeGreaterThan(0)
  })
  it('ne consulte pas le hasard quand aucune âme ne le porte : les graines de référence tiennent', () => {
    const a = rollPlayerDice(cfg, 5, seededRng(97), defaultInventory(cfg).dice)
    const b = rollPlayerDice(cfg, 5, seededRng(97), defaultInventory(cfg).dice, {})
    expect(a).toEqual(b)
  })
  it('se retrouve par son id, une seule âme à la fois', () => {
    expect(soulWith({ 2: 'tricheur' }, 'tricheur', 5)).toBe(2)
    expect(soulWith({ 2: 'tricheur' }, 'juge', 5)).toBe(null)
    // Une âme absente de la course (cercle plus petit) ne compte pas.
    expect(soulWith({ 7: 'tricheur' }, 'tricheur', 5)).toBe(null)
  })
})

describe('Le Juge', () => {
  const ranked = (positions: number[]) => ranking(withPositions(positions))
  it('multiplie les gains dans le top 3, les divise s’il finit dernier', () => {
    expect(judgeFactor({ 0: 'juge' }, ranked([9, 5, 4, 3, 1]))).toBe(1.5)
    expect(judgeFactor({ 4: 'juge' }, ranked([9, 5, 4, 3, 1]))).toBe(0.5)
    expect(judgeFactor({ 3: 'juge' }, ranked([9, 5, 4, 3, 1]))).toBe(1)
    expect(judgeFactor({}, ranked([9, 5, 4, 3, 1]))).toBe(1)
  })
  it('n’agit que sur les gains, jamais sur les pertes', () => {
    const bets: Bet[] = [
      { id: 1, type: 'winner', souls: [0], stake: 10, multiplier: 2, turn: 0, status: 'open', payout: 0 },
      { id: 2, type: 'winner', souls: [4], stake: 10, multiplier: 2, turn: 0, status: 'open', payout: 0 },
    ]
    const r = ranked([9, 5, 4, 3, 1])
    const plein = settleBets(bets, r)
    const juge = settleBets(bets, r, { gainFactor: 1.5 })
    expect(juge.bets[0]!.payout).toBe(Math.round(plein.bets[0]!.payout * 1.5))
    expect(juge.bets[1]!.payout).toBe(0)
    expect(juge.staked).toBe(plein.staked)
  })
})

describe('révélation', () => {
  it('ne se joue qu’à la première course, à partir du troisième cercle', () => {
    expect(revealsPersonality(1, 1)).toBe(false)
    expect(revealsPersonality(2, 1)).toBe(false)
    expect(revealsPersonality(3, 1)).toBe(true)
    expect(revealsPersonality(3, 2)).toBe(false)
    expect(revealsPersonality(9, 1)).toBe(true)
  })
  it('désigne la mieux classée parmi celles qui n’ont rien, sans hasard', () => {
    const ranked = ranking(withPositions([9, 5, 4, 3, 1]))
    expect(revealTarget(ranked, {})).toBe(0)
    expect(revealTarget(ranked, { 0: 'juge' })).toBe(1)
    expect(revealTarget(ranked, { 0: 'juge', 1: 'ogre' })).toBe(2)
    // Toutes marquées : plus personne à révéler.
    const toutes = Object.fromEntries(ranked.map((r) => [r.soul.id, 'ogre' as const]))
    expect(revealTarget(ranked, toutes)).toBe(null)
  })
  it('tire d’abord parmi les personnalités que personne ne porte', () => {
    const prises = Object.fromEntries(PERSONALITY_IDS.slice(0, 9).map((id, i) => [i, id]))
    for (let seed = 1; seed < 30; seed++) expect(drawPersonality(prises, seededRng(seed))).toBe(PERSONALITY_IDS[9])
    // Une fois les dix posées, il retire dans tout le catalogue plutôt que de rendre null.
    const toutes = Object.fromEntries(PERSONALITY_IDS.map((id, i) => [i, id]))
    expect(PERSONALITY_IDS).toContain(drawPersonality(toutes, seededRng(1)))
  })
})

describe('masques en boutique', () => {
  const inv = (): Inventory => defaultInventory(cfg)
  it('marquent l’âme choisie, et remplacent ce qu’elle portait', () => {
    const masque = findItem(shop, 'masqueOgre')
    const first = applyPurchase(masque, inv(), { dieIndex: 0, soul: 2 })
    expect(first.inventory.personalities).toEqual({ 2: 'ogre' })
    expect(first.log).toEqual({ kind: 'personalityGiven', soul: 2, personality: 'ogre', replaced: null })
    const second = applyPurchase(findItem(shop, 'masqueJuge'), first.inventory, { dieIndex: 0, soul: 2 })
    expect(second.inventory.personalities).toEqual({ 2: 'juge' })
    expect(second.log).toEqual({ kind: 'personalityGiven', soul: 2, personality: 'juge', replaced: 'ogre' })
  })
  it('refusent l’achat sans âme désignée, ou déjà portée', () => {
    const masque = findItem(shop, 'masqueOgre')
    expect(() => applyPurchase(masque, inv(), null)).toThrow(/âme/)
    const marked = applyPurchase(masque, inv(), { dieIndex: 0, soul: 1 }).inventory
    expect(() => applyPurchase(masque, marked, { dieIndex: 0, soul: 1 })).toThrow(/déjà/)
  })
  it('le masque brisé libère une âme marquée, et refuse une âme nue', () => {
    const brise = findItem(shop, 'masqueBrise')
    const marked = applyPurchase(findItem(shop, 'masqueOgre'), inv(), { dieIndex: 0, soul: 1 }).inventory
    const freed = applyPurchase(brise, marked, { dieIndex: 0, soul: 1 })
    expect(freed.inventory.personalities).toEqual({})
    expect(freed.log).toEqual({ kind: 'personalityRemoved', soul: 1, removed: 'ogre' })
    expect(() => applyPurchase(brise, inv(), { dieIndex: 0, soul: 1 })).toThrow(/n’a pas de personnalité/)
  })
  it('gardent le masque brisé hors vitrine tant qu’aucune âme n’est marquée', () => {
    const all = allIds(shop)
    for (let seed = 1; seed < 60; seed++) {
      expect(generateVitrine(shop, inv(), all, seededRng(seed)).some((i) => i.id === 'masqueBrise')).toBe(false)
    }
    const marked = applyPurchase(findItem(shop, 'masqueOgre'), inv(), { dieIndex: 0, soul: 1 }).inventory
    let seen = false
    for (let seed = 1; seed < 200 && !seen; seed++) {
      seen = generateVitrine(shop, marked, all, seededRng(seed)).some((i) => i.id === 'masqueBrise')
    }
    expect(seen).toBe(true)
  })
})
