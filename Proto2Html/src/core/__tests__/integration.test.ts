import { describe, expect, it } from 'vitest'
import { playBatch, playOut } from '../rules/driver'
import { viewBoard } from '../rules/derived'
import { hexKey } from '../hex/hexCoord'
import { loadConfig } from '../config/load'
import type { GameConfig } from '../config/schema'
import type { GameState } from '../rules/types'
import { defaultRaw } from './helpers'

/** Les deux camps pilotés par l'IA (I9), pour jouer des parties entières. */
function aiVsAi(overrides: Partial<GameConfig> = {}): GameConfig {
  const raw = defaultRaw()
  const { config } = loadConfig({
    ...raw,
    ai: { ...raw.ai, player: { profile: 'neutre', level: 'expert' } },
  })
  return { ...config, ...overrides }
}

/** Invariants qui doivent tenir à tout instant, quelle que soit la partie. */
function assertInvariants(config: GameConfig, state: GameState): void {
  const view = viewBoard(config, state.tiles)

  // Un Espace porte au plus une Tuile (B3).
  const keys = state.tiles.map((t) => hexKey(t.at))
  expect(new Set(keys).size).toBe(keys.length)

  for (const tile of state.tiles) {
    const space = state.spaces.find((s) => hexKey(s.at) === hexKey(tile.at))
    // Rien ne se pose sur un Espace bloqué (B2).
    expect(space?.blocked).toBe(false)
    // F1 : les dégâts ne sont jamais négatifs.
    expect(tile.damage).toBeGreaterThanOrEqual(0)
    // F10 : aucune Tuile à force ≤ 0 ne subsiste sur le Plateau.
    expect(view.forceOf(tile)).toBeGreaterThan(0)
    // F1 : les boucliers dérivés sont bornés à 0.
    expect(view.shieldsOf(tile)).toBeGreaterThanOrEqual(0)
    // F13 : le soin ne fait jamais dépasser la force nominale.
    const def = view.defOf(tile)
    expect(view.forceOf(tile)).toBeLessThanOrEqual(def.force + tile.placementBonus + 12)
  }

  // Les Tuiles neutres du montage ne meurent jamais au combat (T6/T7).
  const neutrals = state.tiles.filter((t) => t.side === 'neutral')
  expect(neutrals.length).toBeLessThanOrEqual(4)
}

describe('parties complètes IA contre IA', () => {
  it('une partie se termine, avec une cause et un vainqueur cohérents', () => {
    const config = aiVsAi()
    const { state, turns } = playOut(config)
    expect(state.outcome).not.toBeNull()
    expect(turns).toBeGreaterThan(1)
    expect(['kingDestroyed', 'twoPasses', 'boardFull']).toContain(state.outcome?.cause)
    assertInvariants(config, state)
  })

  it('W3b — la terminaison est garantie par la finitude des Decks, sans limite de tours', () => {
    // 74 Tuiles au total : aucune partie ne peut dépasser ~76 tours.
    for (let seed = 1; seed <= 6; seed++) {
      const config = aiVsAi({ seed })
      const { state, turns } = playOut(config, 400)
      expect(state.outcome).not.toBeNull()
      expect(turns).toBeLessThan(120)
    }
  })

  it('G4 — deux parties de même seed sont identiques au coup près', () => {
    const config = aiVsAi({ seed: 7 })
    const a = playOut(config)
    const b = playOut(config)
    expect(a.state.turn).toBe(b.state.turn)
    expect(a.state.outcome).toEqual(b.state.outcome)
    expect(a.state.log.length).toBe(b.state.log.length)
    expect(a.state.tiles.map((t) => [t.typeId, t.at, t.damage])).toEqual(
      b.state.tiles.map((t) => [t.typeId, t.at, t.damage]),
    )
  })

  it('des seeds différentes donnent des parties différentes', () => {
    const a = playOut(aiVsAi({ seed: 11 }))
    const b = playOut(aiVsAi({ seed: 12 }))
    expect(a.state.log.length).not.toBe(b.state.log.length)
  })

  it('les invariants tiennent sur 8 parties', () => {
    for (let seed = 20; seed < 28; seed++) {
      const config = aiVsAi({ seed })
      const { state } = playOut(config)
      assertInvariants(config, state)
    }
  })
})

/**
 * §14 — la question d'équilibrage ouverte : avec 2 boucliers, 2 Tours et un soin
 * de 2 par manche, le Roi est-il encore tuable ? Ce test ne juge pas, il
 * MESURE : il échouera si l'équilibrage bascule franchement, ce qui est le
 * signal attendu.
 */
describe('§14 — mesure de l’équilibrage (M4)', () => {
  it('le soin ralentit bien le Roi : sans soin, il meurt nettement plus souvent', () => {
    const withHeal = playBatch(aiVsAi({ upkeepHeal: 2 }), 12)
    const without = playBatch(aiVsAi({ upkeepHeal: 0 }), 12)
    const kingDeaths = (s: typeof withHeal): number => s.byCause['kingDestroyed'] ?? 0
    expect(kingDeaths(without)).toBeGreaterThanOrEqual(kingDeaths(withHeal))
  })

  it('M4 — le lot produit un résumé exploitable', () => {
    const summary = playBatch(aiVsAi(), 10)
    expect(summary.rows).toHaveLength(10)
    expect(summary.wins.player + summary.wins.demon + summary.draws).toBe(10)
    expect(summary.medianTurns).toBeGreaterThan(0)
    const causes = Object.values(summary.byCause).reduce((a, b) => a + b, 0)
    expect(causes).toBe(10)
  })
})
