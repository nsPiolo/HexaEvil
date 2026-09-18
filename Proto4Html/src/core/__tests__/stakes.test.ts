/**
 * L'échelle des mises qui grandit avec le cercle (rules/stakes.ts) : c'est le revenu qui doit
 * suivre les prix (docs/proto4/equilibrage.md), avec une garantie — l'avance seule permet
 * toujours le pari minimum.
 */
import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import { loadConfig } from '../config/load'
import { allowanceAtCircle } from '../rules/allowance'
import { growWithCircle } from '../rules/growth'
import { stakesAtCircle } from '../rules/stakes'

const cfg = loadConfig(rawConfig)
const eco = cfg.economy

describe('échelle des mises par cercle', () => {
  it('au cercle 1, c’est l’échelle de la configuration', () => {
    expect(stakesAtCircle(eco, 1)).toEqual([...eco.stakes])
  })

  it('grandit avec le cercle, arrondie à 5, comme les prix de la boutique', () => {
    const c9 = stakesAtCircle(eco, 9)
    expect(c9[c9.length - 1]).toBe(growWithCircle(eco.stakes[eco.stakes.length - 1]!, 9, eco.stakeGrowthPerCircle))
    for (let n = 1; n <= 40; n++) for (const v of stakesAtCircle(eco, n)) expect(v % 5).toBe(0)
    for (let n = 2; n <= 40; n++) {
      const before = stakesAtCircle(eco, n - 1)
      const now = stakesAtCircle(eco, n)
      expect(now[now.length - 1]!).toBeGreaterThanOrEqual(before[before.length - 1]!)
    }
  })

  it('le plus petit jeton ne dépasse jamais l’avance de course du cercle', () => {
    for (let n = 1; n <= 60; n++) expect(stakesAtCircle(eco, n)[0]!).toBeLessThanOrEqual(allowanceAtCircle(eco, n))
  })

  it('reste strictement croissante, sans doublon, même quand le plafond rejoint le deuxième jeton', () => {
    for (let n = 1; n <= 60; n++) {
      const ladder = stakesAtCircle(eco, n)
      expect(ladder.length).toBeGreaterThan(0)
      for (let i = 1; i < ladder.length; i++) expect(ladder[i]!).toBeGreaterThan(ladder[i - 1]!)
    }
  })

  it('croissance nulle : la même échelle partout', () => {
    const flat = { ...eco, stakeGrowthPerCircle: 0 }
    expect(stakesAtCircle(flat, 12)).toEqual([...eco.stakes])
  })

  it('la config refuse une échelle décroissante, ou un premier jeton au-dessus de l’avance', () => {
    type Raw = { economy: { stakes: number[]; raceAllowance: number; stakeGrowthPerCircle: number } }
    const clone = (): Raw => JSON.parse(JSON.stringify(rawConfig)) as Raw
    const down = clone()
    down.economy.stakes = [10, 5, 20, 50]
    expect(() => loadConfig(down)).toThrow(/croissantes/)
    const tooBig = clone()
    tooBig.economy.stakes = [25, 50]
    expect(() => loadConfig(tooBig)).toThrow(/avance/)
    const negative = clone()
    negative.economy.stakeGrowthPerCircle = -1
    expect(() => loadConfig(negative)).toThrow(/stakeGrowthPerCircle/)
  })
})
