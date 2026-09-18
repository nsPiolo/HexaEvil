/**
 * Les cercles au-delà de ceux qui sont écrits (src/core/rules/circles.ts, GDD §8.1) : le jeu ne
 * s'arrête pas au dernier, le paradis se rejoue avec un prix qui monte.
 */
import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import { loadConfig } from '../config/load'
import { circleAt, isBeyondWritten } from '../rules/circles'

const cfg = loadConfig(rawConfig)
const run = cfg.run
const last = run.circles[run.circles.length - 1]!

describe('un cercle par son numéro', () => {
  it('rend les cercles écrits tels quels', () => {
    for (let n = 1; n <= run.circles.length; n++) {
      expect(circleAt(run, n)).toBe(run.circles[n - 1])
      expect(isBeyondWritten(run, n)).toBe(false)
    }
  })

  it('rejoue le dernier cercle au-delà, décor et boss compris', () => {
    for (let n = run.circles.length + 1; n <= run.circles.length + 20; n++) {
      const c = circleAt(run, n)
      expect(isBeyondWritten(run, n)).toBe(true)
      expect(c.name).toBe(last.name)
      expect(c.boss).toBe(last.boss)
      expect(c.souls).toBe(last.souls)
      expect(c.lanes).toBe(last.lanes)
      expect(c.terrains).toBe(last.terrains)
    }
  })

  it('fait monter le prix sans fin, et jamais redescendre', () => {
    let previous = 0
    for (let n = 1; n <= 60; n++) {
      const price = circleAt(run, n).price
      expect(price).toBeGreaterThan(previous)
      expect(Number.isFinite(price)).toBe(true)
      previous = price
    }
    expect(circleAt(run, run.circles.length + 1).price).toBeGreaterThan(last.price)
  })

  it("s'arrête d'abord à l'évasion, qui est un cercle écrit", () => {
    expect(run.escapeCircle).toBeLessThanOrEqual(run.circles.length)
    expect(circleAt(run, run.escapeCircle)).toBe(run.circles[run.escapeCircle - 1])
  })
})
