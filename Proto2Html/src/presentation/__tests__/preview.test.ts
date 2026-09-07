/**
 * U17 — valeurs annoncées par le fantôme de pose.
 *
 * Le fantôme doit annoncer **exactement** ce que la résolution appliquera. Ces
 * valeurs sont lues dans la trace du moteur (`U16`), pas recalculées : ce test
 * verrouille cette équivalence.
 */

import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../core/config/load'
import { setupGame } from '../../core/rules/game'
import { previewMove } from '../preview'
import type { GameConfig, RawConfig } from '../../core/config/schema'
import type { GameState } from '../../core/rules/types'
import rawGameplay from '../../../config/gameplay.json'

function fixture(over: Partial<RawConfig> = {}): GameConfig {
  const raw = JSON.parse(JSON.stringify(rawGameplay)) as RawConfig
  const { config } = loadConfig({
    ...raw,
    upkeepHeal: 0,
    startingColor: null,
    board: { ...raw.board, radius: 4, blocked: [], symmetricColors: false },
    decks: { player: ['V01', 'R01', 'R05', 'V03'], demon: ['V04'] },
    setup: [
      { side: 'player', type: 'N00', q: -4, r: 0 },
      { side: 'player', type: 'V04', q: 1, r: 0 },
      { side: 'player', type: 'V04', q: 0, r: -1 },
      { side: 'demon', type: 'N00', q: 4, r: 0 },
      { side: 'demon', type: 'V00', q: 3, r: 0 },
    ],
    ...over,
  })
  return config
}

describe('U17 — le fantôme annonce les valeurs réelles', () => {
  const config = fixture()
  const state: GameState = setupGame(config)

  it('inclut le bonus de pose (F3)', () => {
    const p = previewMove(config, state, { typeId: 'R01', at: { q: 0, r: 0 } })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    // R01 : 7 de base + 2 alliés adjacents.
    expect(p.placementBonus).toBe(2)
    expect(p.placedForce).toBe(9)
  })

  /** Le piège : les boucliers de `V01` viennent de son effet à la pose (E1). */
  it('inclut les boucliers gagnés par l’effet à la pose, pas seulement les intrinsèques', () => {
    const p = previewMove(config, state, { typeId: 'V01', at: { q: 0, r: 0 } })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.placedForce).toBe(5) // 3 + 2 alliés
    expect(p.placedShields).toBe(2) // gagnés à la pose
  })

  it('E7 — une N01 adjacente annule l’effet, donc les boucliers annoncés tombent à 0', () => {
    const silenced = fixture({
      setup: [
        { side: 'player', type: 'N00', q: -4, r: 0 },
        { side: 'player', type: 'V04', q: 1, r: 0 },
        { side: 'player', type: 'V04', q: 0, r: -1 },
        { side: 'demon', type: 'N01', q: -1, r: 0 },
        { side: 'demon', type: 'N00', q: 4, r: 0 },
      ],
    })
    const p = previewMove(silenced, setupGame(silenced), { typeId: 'V01', at: { q: 0, r: 0 } })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.placedForce).toBe(5)
    expect(p.placedShields).toBe(0)
  })

  it('annonce la survie et le ravitaillement', () => {
    const safe = previewMove(config, state, { typeId: 'R01', at: { q: 0, r: 0 } })
    expect(safe.ok && safe.survives).toBe(true)
    // (0,0) n'est relié au Roi (-4,0) par aucune chaîne alliée.
    expect(safe.ok && safe.supplied).toBe(false)

    // Au contact du Roi adverse (20 force), la Tuile ne survit pas.
    const doomed = previewMove(config, state, { typeId: 'R01', at: { q: 4, r: -1 } })
    expect(doomed.ok && doomed.survives).toBe(false)
  })

  it('annonce les dégâts sur chaque voisin et la Couleur offerte', () => {
    const p = previewMove(config, state, { typeId: 'R01', at: { q: 4, r: -1 } })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    // R01 nue (7) : Roi 20 − (7−2) = 15, Tour 10 − 7 = 3.
    const lines = p.damaged.map((d) => [d.typeId, d.before, d.after])
    expect(lines).toEqual(expect.arrayContaining([['N00', 20, 15]]))
    expect(p.offeredColor).not.toBeNull()
  })

  it('refuse une pose illégale au lieu d’annoncer un fantôme', () => {
    const constrained: GameState = { ...state, imposedColor: 'black' }
    const p = previewMove(config, constrained, { typeId: 'R01', at: { q: 0, r: 0 } })
    expect(p.ok).toBe(false)
    if (p.ok) return
    expect(p.reason).toMatch(/Couleur imposée/)
  })
})
