import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from '../config/load'
import { loadShopConfig } from '../shop/load'
import { allowanceAtCircle, raceAllowance } from '../rules/allowance'
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

  it('grandit avec le cercle, arrondie à 5, à partir de celle du cercle 1', () => {
    expect(allowanceAtCircle(cfg.economy, 1)).toBe(cfg.economy.raceAllowance)
    let previous = 0
    for (let n = 1; n <= 40; n++) {
      const a = allowanceAtCircle(cfg.economy, n)
      expect(a % 5).toBe(0)
      expect(a).toBeGreaterThanOrEqual(previous)
      previous = a
    }
    expect(allowanceAtCircle(cfg.economy, 9)).toBeGreaterThan(cfg.economy.raceAllowance)
    expect(allowanceAtCircle({ ...cfg.economy, allowanceGrowthPerCircle: 0 }, 12)).toBe(cfg.economy.raceAllowance)
    const raw = JSON.parse(JSON.stringify(rawConfig))
    raw.economy.allowanceGrowthPerCircle = -1
    expect(() => loadConfig(raw)).toThrow(/allowanceGrowthPerCircle/)
  })
})
