import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from '../config/load'
import { loadShopConfig } from '../shop/load'
import { raceAllowance } from '../rules/allowance'
import { applyPurchase, defaultInventory, findItem } from '../shop/shop'

const cfg = loadConfig(rawConfig)
const shop = loadShopConfig(rawShop)

describe('avance de course', () => {
  it('la config livrée verse 20 pièces avant chaque course', () => {
    expect(cfg.economy.raceAllowance).toBe(20)
    const raw = JSON.parse(JSON.stringify(rawConfig))
    raw.economy.raceAllowance = -5
    expect(() => loadConfig(raw)).toThrow(/raceAllowance/)
  })
  it('sans artefact : l’avance de base ; avec la Tirelire du stagiaire : + son bonus', () => {
    const inv = defaultInventory(cfg)
    expect(raceAllowance(cfg.economy.raceAllowance, inv, shop)).toEqual({ total: 20, bonus: 0 })
    const withTirelire = applyPurchase(findItem(shop, 'tirelire'), inv, null).inventory
    expect(raceAllowance(cfg.economy.raceAllowance, withTirelire, shop)).toEqual({ total: 30, bonus: 10 })
    expect(findItem(shop, 'tirelire').kind).toBe('artefact')
  })
})
