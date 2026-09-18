import { describe, expect, it } from 'vitest'
import rawShop from '../../../config/shop.json'
import { seededRng } from '../rules/rng'
import { loadShopConfig } from '../shop/load'
import { allIds, drawUnlock, lockedItems, unlockedIds, unlockedItems } from '../shop/unlocks'

const shop = loadShopConfig(rawShop)

describe('socle de départ', () => {
  it('remplit au moins une vitrine et ne cite que des objets du catalogue', () => {
    expect(shop.unlockedAtStart.length).toBeGreaterThanOrEqual(shop.slots)
    const known = new Set(shop.items.map((i) => i.id))
    expect(shop.unlockedAtStart.every((id) => known.has(id))).toBe(true)
  })
  it('refuse un socle trop court, un id inconnu ou un doublon', () => {
    const raw = (): Record<string, unknown> => JSON.parse(JSON.stringify(rawShop))
    const short = raw()
    short.unlockedAtStart = ['limee', 'doree']
    expect(() => loadShopConfig(short)).toThrow(/shop\.slots/)
    const unknown = raw()
    unknown.unlockedAtStart = ['limee', 'doree', 'limbes', 'fantome']
    expect(() => loadShopConfig(unknown)).toThrow(/absent de shop\.items/)
    const dup = raw()
    dup.unlockedAtStart = ['limee', 'doree', 'limbes', 'limee']
    expect(() => loadShopConfig(dup)).toThrow(/en double/)
    const missing = raw()
    delete missing.unlockedAtStart
    expect(() => loadShopConfig(missing)).toThrow(/tableau d’identifiants/)
  })
})

describe('état débloqué', () => {
  it('ajoute le socle aux ids sauvegardés, ignore les inconnus et garde l’ordre du catalogue', () => {
    const ids = unlockedIds(shop, ['sceau', 'objetRetire', 'limee'])
    expect(ids).toContain('sceau')
    expect(ids).not.toContain('objetRetire')
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of shop.unlockedAtStart) expect(ids).toContain(id)
    const order = shop.items.map((i) => i.id)
    expect(ids).toEqual(order.filter((id) => ids.includes(id)))
  })
  it('partage le catalogue en débloqués et scellés, sans recouvrement', () => {
    const ids = unlockedIds(shop, [])
    const open = unlockedItems(shop, ids)
    const sealed = lockedItems(shop, ids)
    expect(open.length + sealed.length).toBe(shop.items.length)
    expect(open.some((i) => sealed.includes(i))).toBe(false)
    expect(open.map((i) => i.id).sort()).toEqual([...shop.unlockedAtStart].sort())
  })
})

describe('tirage de fin de cercle', () => {
  it('ne rend qu’un objet encore scellé', () => {
    const ids = unlockedIds(shop, [])
    for (let seed = 1; seed < 80; seed++) {
      const got = drawUnlock(shop, ids, seededRng(seed))
      expect(got).not.toBeNull()
      expect(ids).not.toContain(got?.id)
    }
  })
  it('descelle tout le catalogue en autant de cercles qu’il reste d’objets, puis rend null', () => {
    const rng = seededRng(12)
    let ids = unlockedIds(shop, [])
    const sealed = shop.items.length - ids.length
    for (let i = 0; i < sealed; i++) {
      const got = drawUnlock(shop, ids, rng)
      expect(got).not.toBeNull()
      ids = [...ids, got!.id]
    }
    expect(ids.length).toBe(shop.items.length)
    expect(drawUnlock(shop, ids, rng)).toBeNull()
    expect(drawUnlock(shop, allIds(shop), rng)).toBeNull()
  })
  it('tire un commun plus souvent qu’un rare (pondération par rareté)', () => {
    const ids = unlockedIds(shop, [])
    const rng = seededRng(5)
    let common = 0
    let rare = 0
    for (let i = 0; i < 2000; i++) {
      const got = drawUnlock(shop, ids, rng)
      if (got?.rarity === 'common') common++
      if (got?.rarity === 'rare') rare++
    }
    expect(common).toBeGreaterThan(rare)
  })
})
