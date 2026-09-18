/**
 * Garde-fous du simulateur d'équilibrage. Ils ne vérifient pas que le jeu est bien équilibré —
 * c'est le rapport (`npm run balance`) qui le montre — mais que l'outil dit la vérité : mêmes
 * graines, mêmes résultats, et un joueur soigné qui gagne vraiment plus qu'un joueur au hasard.
 */
import { describe, expect, it } from 'vitest'
import { config } from '../src/core/config'
import { allowanceAtCircle } from '../src/core/rules/allowance'
import { PROFILES } from './profiles'
import { measureOdds, simulateMany, simulateRun } from './run'

const profile = PROFILES[1]!

describe('simulateur d’équilibrage', () => {
  it('rejoue exactement le même run à graine égale', () => {
    const a = simulateRun(1234, profile)
    const b = simulateRun(1234, profile)
    expect(b).toEqual(a)
  })

  it('joue des runs complets : chaque cercle atteint a ses trois courses et un verdict', () => {
    for (const run of simulateMany(profile, 20)) {
      expect(run.circles.length).toBeGreaterThan(0)
      // Un seul cercle échoue, et c'est le dernier : le run s'arrête là.
      const failed = run.circles.filter((c) => !c.paid)
      expect(failed.length).toBeLessThanOrEqual(1)
      if (failed.length === 1) expect(failed[0]).toBe(run.circles[run.circles.length - 1])
      expect(run.cleared).toBe(run.circles.filter((c) => c.paid).length)
      for (const circle of run.circles) {
        expect(circle.allowance).toBe(allowanceAtCircle(config.economy, circle.circle) * config.run.racesPerCircle)
        expect(circle.staked).toBeGreaterThan(0)
        expect(circle.returned).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('des graines différentes donnent des issues différentes', () => {
    const cleared = new Set(simulateMany(profile, 40).map((r) => r.cleared))
    expect(cleared.size).toBeGreaterThan(1)
  })

  /**
   * Le cœur du jeu : l'ordre des combinaisons est gratuit et doit payer. Si ce test tombe, ce
   * n'est pas le simulateur qu'il faut corriger mais les règles — le levier aurait disparu.
   */
  it('l’appariement soigné fait gagner l’âme pariée bien plus souvent que le hasard', () => {
    for (const circle of [1, 5, 9]) {
      const hasard = measureOdds(circle, 'naturelle', 150)
      const soigne = measureOdds(circle, 'favorite', 150)
      expect(soigne.winner).toBeGreaterThan(hasard.winner * 2)
      expect(soigne.top3).toBeGreaterThan(hasard.top3)
    }
  })

  it('mesure les chances sur des parts cohérentes', () => {
    const odds = measureOdds(1, 'naturelle', 150)
    for (const value of [odds.winner, odds.top3, odds.last]) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
    expect(odds.top3).toBeGreaterThanOrEqual(odds.winner)
  })
})
