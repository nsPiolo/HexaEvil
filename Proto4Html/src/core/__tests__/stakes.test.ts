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
import { circleAt } from '../rules/circles'
import { stakesAtCircle } from '../rules/stakes'

const cfg = loadConfig(rawConfig)
const eco = cfg.economy

describe('échelle des mises par cercle', () => {
  it('au cercle 1, c’est l’échelle de la configuration, moins les jetons pas encore ouverts', () => {
    expect(stakesAtCircle(cfg, 1)).toEqual(eco.stakes.filter((_, i) => eco.stakeUnlockCircle[i] === 1))
  })

  it('un jeton retardé n’apparaît qu’à son cercle, et l’échelle reste ordonnée quand il s’insère', () => {
    for (let i = 0; i < eco.stakes.length; i++) {
      const from = eco.stakeUnlockCircle[i]!
      if (from === 1) continue
      // La veille il n'est pas là, le jour même il y est : c'est la seule chose que le cercle change.
      expect(stakesAtCircle(cfg, from - 1)).toHaveLength(stakesAtCircle(cfg, from).length - 1)
      expect(stakesAtCircle(cfg, from)).toHaveLength(eco.stakes.filter((_, k) => eco.stakeUnlockCircle[k]! <= from).length)
    }
  })

  it('la config refuse un tableau d’ouverture mal formé', () => {
    type Raw = { economy: { stakeUnlockCircle: number[] } }
    const clone = (): Raw => JSON.parse(JSON.stringify(rawConfig)) as Raw
    const short = clone()
    short.economy.stakeUnlockCircle = [1, 1]
    expect(() => loadConfig(short)).toThrow(/stakeUnlockCircle/)
    // Sans le plus petit jeton dès le premier cercle, un joueur sans le sou n'a rien à poser.
    const late = clone()
    late.economy.stakeUnlockCircle = [2, 1, 4, 1]
    expect(() => loadConfig(late)).toThrow(/cercle 1/)
  })

  it('grandit avec le cercle, arrondie à 5, comme les prix de la boutique', () => {
    const c9 = stakesAtCircle(cfg, 9)
    expect(c9[c9.length - 1]).toBe(growWithCircle(eco.stakes[eco.stakes.length - 1]!, 9, eco.stakeGrowthPerCircle))
    for (let n = 1; n <= 40; n++) for (const v of stakesAtCircle(cfg, n)) expect(v % 5).toBe(0)
    for (let n = 2; n <= 40; n++) {
      const before = stakesAtCircle(cfg, n - 1)
      const now = stakesAtCircle(cfg, n)
      expect(now[now.length - 1]!).toBeGreaterThanOrEqual(before[before.length - 1]!)
    }
  })

  it('le plus petit jeton ne dépasse jamais l’avance de course du cercle', () => {
    for (let n = 1; n <= 60; n++) expect(stakesAtCircle(cfg, n)[0]!).toBeLessThanOrEqual(allowanceAtCircle(eco, n))
  })

  it('reste strictement croissante, sans doublon, même quand le plafond rejoint le deuxième jeton', () => {
    for (let n = 1; n <= 60; n++) {
      const ladder = stakesAtCircle(cfg, n)
      expect(ladder.length).toBeGreaterThan(0)
      for (let i = 1; i < ladder.length; i++) expect(ladder[i]!).toBeGreaterThan(ladder[i - 1]!)
    }
  })

  it('au-delà du dernier cercle écrit, le gros jeton compose au lieu de suivre la droite', () => {
    const written = cfg.run.circles.length
    const top = (n: number): number => {
      const l = stakesAtCircle(cfg, n)
      return l[l.length - 1]!
    }
    const base = top(written)
    for (let k = 1; k <= 10; k++) {
      expect(top(written + k)).toBe(Math.round((base * eco.beyondStakeGrowth ** k) / 5) * 5)
      // Une droite au même point de départ serait déjà loin derrière au dixième cercle.
      expect(top(written + k)).toBeGreaterThanOrEqual(top(written + k - 1))
    }
    expect(top(written + 10)).toBeGreaterThan(top(written) * 10)
  })

  it('le rapport entre le gros jeton et le prix de sortie se fige au-delà des écrits', () => {
    const written = cfg.run.circles.length
    const ratio = (n: number): number => {
      const l = stakesAtCircle(cfg, n)
      return circleAt(cfg.run, n).price / l[l.length - 1]!
    }
    // Les deux taux sont égaux par construction : seul l'arrondi à 5 fait bouger le rapport.
    // Comparaison relative : à l'arrondi à 5 près, et le rapport se compte en dizaines.
    const at15 = ratio(written)
    for (let k = 1; k <= 10; k++) expect(ratio(written + k) / at15).toBeCloseTo(1, 1)
  })

  it('croissance nulle : la même échelle partout', () => {
    const flat = { ...cfg, economy: { ...eco, stakeGrowthPerCircle: 0, beyondStakeGrowth: 1 } }
    expect(stakesAtCircle(flat, 12)).toEqual([...eco.stakes])
  })

  it('la config refuse une échelle décroissante, ou un premier jeton au-dessus de l’avance', () => {
    type Raw = { economy: { stakes: number[]; raceAllowance: number; stakeGrowthPerCircle: number; beyondStakeGrowth: number } }
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
    // Sous 1, les jetons rétréciraient pendant que le prix de sortie continue de composer.
    const shrinking = clone()
    shrinking.economy.beyondStakeGrowth = 0.9
    expect(() => loadConfig(shrinking)).toThrow(/beyondStakeGrowth/)
  })
})
