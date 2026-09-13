import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from '../config/load'
import { defaultDice, plainFace } from '../rules/dice'
import { buildMoves, createRace, createTrack, rollOpponentPair, rollPlayerDice, unusedSoulMove } from '../rules/race'
import { seededRng } from '../rules/rng'
import { loadShopConfig } from '../shop/load'
import { applyPurchase, defaultInventory, findItem, forgeFace, generateVitrine, opponentNegativesFlipped, priceAtCircle } from '../shop/shop'

const cfg = loadConfig(rawConfig)
const shop = loadShopConfig(rawShop)

describe('catalogue', () => {
  it('charge le fichier livré et refuse un id sans implémentation', () => {
    expect(shop.items.length).toBeGreaterThanOrEqual(shop.slots)
    const raw = JSON.parse(JSON.stringify(rawShop))
    raw.items[0].id = 'inconnu'
    expect(() => loadShopConfig(raw)).toThrow(/sans implémentation/)
  })
  it('les prix grandissent par cercle, arrondis à 5', () => {
    expect(priceAtCircle(50, 1, 0.25)).toBe(50)
    expect(priceAtCircle(50, 2, 0.25)).toBe(65)
    expect(priceAtCircle(80, 5, 0.25)).toBe(160)
  })
})

describe('vitrine', () => {
  it('propose `slots` objets distincts, sans artefact déjà possédé', () => {
    const inv = { ...defaultInventory(cfg), artefacts: ['lateBet' as const] }
    for (let seed = 1; seed < 50; seed++) {
      const v = generateVitrine(shop, inv, seededRng(seed))
      expect(v).toHaveLength(shop.slots)
      expect(new Set(v.map((i) => i.id)).size).toBe(shop.slots)
      expect(v.some((i) => i.id === 'lateBet')).toBe(false)
    }
  })
  it("n'offre plus d'artefact quand les emplacements sont pleins", () => {
    const inv = { ...defaultInventory(cfg), artefacts: ['lateBet', 'sablier', 'boussole', 'clepsydre', 'ferACheval'] as const }
    const v = generateVitrine(shop, { artefacts: [...inv.artefacts], dice: inv.dice }, seededRng(3))
    expect(v.every((i) => i.kind !== 'artefact')).toBe(true)
  })
})

describe('achats', () => {
  const inv = defaultInventory(cfg)
  it('ajoute un artefact', () => {
    const r = applyPurchase(findItem(shop, 'boussole'), inv, null)
    expect(r.inventory.artefacts).toEqual(['boussole'])
    expect(() => applyPurchase(findItem(shop, 'boussole'), r.inventory, null)).toThrow(/déjà/)
  })
  it('remplace un dé par un dé spécial', () => {
    const r = applyPurchase(findItem(shop, 'glace'), inv, { dieIndex: 1 })
    expect(r.inventory.dice[1]?.faces.map((f) => f.value)).toEqual([-1, -1, 2, 5])
    expect(r.inventory.dice[0]?.kind).toBe('base')
    expect(() => applyPurchase(findItem(shop, 'glace'), inv, null)).toThrow(/choisissez/)
  })
  it('forge une face, une seule fois, en gardant une face positive', () => {
    const r = applyPurchase(findItem(shop, 'limee'), inv, { dieIndex: 0, faceIndex: 0 })
    expect(r.inventory.dice[0]?.faces[0]).toEqual({ value: 0, effect: null, altered: 'limee' })
    expect(() => applyPurchase(findItem(shop, 'doree'), r.inventory, { dieIndex: 0, faceIndex: 0 })).toThrow(/déjà forgée/)
    const limbes = applyPurchase(findItem(shop, 'limbes'), inv, { dieIndex: 0 }).inventory
    let cur = limbes
    for (let i = 0; i < 3; i++) cur = applyPurchase(findItem(shop, 'limee'), cur, { dieIndex: 0, faceIndex: i }).inventory
    expect(() => applyPurchase(findItem(shop, 'limee'), cur, { dieIndex: 0, faceIndex: 3 })).toThrow(/positive/)
  })
  it('la Face retournée retourne aussi les -1 adverses', () => {
    const r = applyPurchase(findItem(shop, 'retournee'), inv, { dieIndex: 0, faceIndex: 0 })
    expect(forgeFace('retournee', plainFace(-1)).value).toBe(1)
    expect(opponentNegativesFlipped(inv)).toBe(false)
    expect(opponentNegativesFlipped(r.inventory)).toBe(true)
    const rolls = Array.from({ length: 40 }, (_, i) => rollOpponentPair(cfg, 5, seededRng(i), { flipNegatives: true }).distance[0])
    expect(rolls.every((d) => d !== undefined && d > 0)).toBe(true)
  })
})

describe('effets en course', () => {
  const dice = defaultDice(cfg)
  it('le lancer utilise les faces du joueur', () => {
    const limbes = applyPurchase(findItem(shop, 'limbes'), defaultInventory(cfg), { dieIndex: 0 }).inventory
    for (let seed = 0; seed < 30; seed++) {
      const r = rollPlayerDice(cfg, 5, seededRng(seed), limbes.dice)
      expect([1, 2]).toContain(r.distance[0])
      expect(r.faces[0]?.value).toBe(r.distance[0])
    }
  })
  it('la Clepsydre agit au tour 1 seulement', () => {
    const roll = { distance: [-1, 3], faces: [plainFace(-1), plainFace(3)], soul: [0, 1, 2] }
    const ctx = { turn: 1, clepsydre: true, bettedSouls: new Set<number>(), sealBonus: 2 }
    const t1 = buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }, { soulDie: 1, distanceDie: 1 }], 'player', ctx)
    expect(t1.map((m) => m.distance)).toEqual([0, 4])
    expect(t1[0]?.notes[0]).toMatch(/Clepsydre/)
    const t2 = buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }, { soulDie: 1, distanceDie: 1 }], 'player', { ...ctx, turn: 2 })
    expect(t2.map((m) => m.distance)).toEqual([-1, 3])
  })
  it('le Sceau du parieur ajoute +2 sur une âme pariée', () => {
    const seal = forgeFace('sceau', plainFace(1))
    const roll = { distance: [1, 2], faces: [seal, plainFace(2)], soul: [0, 1, 2] }
    const ctx = { turn: 3, clepsydre: false, bettedSouls: new Set([0]), sealBonus: 2 }
    const onBet = buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }], 'player', ctx)
    expect(onBet[0]?.distance).toBe(3)
    const offBet = buildMoves(roll, [{ soulDie: 1, distanceDie: 0 }], 'player', ctx)
    expect(offBet[0]?.distance).toBe(1)
  })
  it('la Boussole désigne le dé Âme inutilisé', () => {
    const roll = { distance: [1, 2], faces: [plainFace(1), plainFace(2)], soul: [0, 1, 2] }
    const m = unusedSoulMove(roll, [{ soulDie: 2, distanceDie: 0 }, { soulDie: 0, distanceDie: 1 }])
    expect(m?.soul).toBe(1)
    expect(m?.distance).toBe(1)
    expect(m?.source).toBe('artefact')
    expect(unusedSoulMove({ ...roll, soul: [0, 1] }, [{ soulDie: 0, distanceDie: 0 }, { soulDie: 1, distanceDie: 1 }])).toBeNull()
  })
  it('le Filet ajoute des cases après l’arrivée', () => {
    const race = createRace(cfg, { extraCellsAfterFinish: 2 })
    expect(race.track.cellsAfterFinish).toBe(cfg.track.cellsAfterFinish + 2)
    expect(race.track.totalCells).toBe(cfg.track.columns + cfg.track.cellsAfterFinish + 2)
    void dice
  })
})

describe('Sablier appliqué à la course en cours', () => {
  it('refait le plateau avec le nouveau seuil sans toucher aux âmes', () => {
    const race = createRace(cfg)
    const before = race.track.betThresholdColumn
    const track = createTrack(cfg.track, { betThresholdRatio: cfg.artefacts.sablier.betThresholdRatio })
    const after = { ...race, track }
    expect(after.track.betThresholdColumn).toBeGreaterThan(before)
    expect(after.track.betThresholdColumn).toBe(Math.ceil(cfg.track.columns * 0.7))
    expect(after.souls).toBe(race.souls)
  })
})
