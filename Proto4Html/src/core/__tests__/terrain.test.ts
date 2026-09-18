/**
 * Tirage du terrain (src/core/rules/terrain.ts) : déterministe à graine égale, et surtout sans
 * toucher au flux de hasard de la course — sinon toutes les graines de référence des tests e2e
 * changeraient de résultat à chaque ajout de variante.
 */
import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import { loadConfig } from '../config/load'
import { rollPlayerDice } from '../rules/race'
import { seededRng } from '../rules/rng'
import { terrainFor } from '../rules/terrain'
import { defaultDice } from '../rules/dice'

const cfg = loadConfig(rawConfig)
const dice = defaultDice(cfg)

describe('tirage du terrain', () => {
  it('rejoue le même terrain à graine égale', () => {
    const terrains = cfg.run.circles[8]!.terrains
    for (let seed = 1; seed <= 50; seed++) expect(terrainFor(terrains, seed)).toBe(terrainFor(terrains, seed))
  })

  it("rend toujours un terrain du cercle, et le seul terrain d'un cercle qui n'en a qu'un", () => {
    for (const circle of cfg.run.circles) {
      for (let seed = 0; seed < 200; seed++) expect(circle.terrains).toContain(terrainFor(circle.terrains, seed))
    }
    const one = cfg.run.circles[0]!
    expect(one.terrains).toHaveLength(1)
    expect(terrainFor(one.terrains, 12345)).toBe(one.terrains[0])
  })

  it('tire les trois variantes sur un échantillon de graines (aucune ne dort)', () => {
    for (const circle of cfg.run.circles.filter((c) => c.terrains.length > 1)) {
      const seen = new Set(Array.from({ length: 300 }, (_, seed) => terrainFor(circle.terrains, seed).name))
      expect(seen.size).toBe(circle.terrains.length)
    }
  })

  it('ne consomme pas le hasard de la course : les dés d’une graine sont les mêmes avec ou sans tirage', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const witness = seededRng(seed)
      const expected = Array.from({ length: 5 }, () => rollPlayerDice(cfg, 6, witness, dice))
      terrainFor(cfg.run.circles[2]!.terrains, seed)
      const rng = seededRng(seed)
      expect(Array.from({ length: 5 }, () => rollPlayerDice(cfg, 6, rng, dice))).toEqual(expected)
    }
  })
})
