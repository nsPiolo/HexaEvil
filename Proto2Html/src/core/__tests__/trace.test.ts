import { describe, expect, it } from 'vitest'
import { applyUpkeep, playMove, setupGame } from '../rules/game'
import { viewBoard } from '../rules/derived'
import type { GameState } from '../rules/types'
import { traceConfig } from './helpers'

/**
 * La trace d'étapes (`U16`) est un flux d'événements pour l'affichage : elle ne
 * doit influencer AUCUN calcul, et l'IA ne doit pas la payer.
 */
describe('U16 — trace de résolution', () => {
  const config = traceConfig()

  it('la trace ne change pas l’état final du jeu', () => {
    const base = setupGame(config)
    const withTrace = playMove(config, base, { typeId: 'R01', at: { q: 3, r: -1 } }, { trace: true })
    const without = playMove(config, base, { typeId: 'R01', at: { q: 3, r: -1 } })
    const strip = (s: GameState) => ({ ...s, lastResolution: null })
    expect(strip(withTrace)).toEqual(strip(without))
  })

  it('sans demande explicite, aucune trace n’est construite (coût nul pour l’IA)', () => {
    const base = setupGame(config)
    const after = playMove(config, base, { typeId: 'R01', at: { q: 3, r: -1 } })
    expect(after.lastResolution).toBeNull()
  })

  it('décompose la pose : pose → attaque → riposte → destruction', () => {
    const base = setupGame(config)
    const after = playMove(config, base, { typeId: 'R01', at: { q: 3, r: -1 } }, { trace: true })
    const kinds = after.lastResolution?.steps.map((s) => s.kind)
    expect(kinds).toEqual(['place', 'attack', 'riposte', 'destroy'])
  })

  it('chaque étape porte les variations de force à animer', () => {
    const base = setupGame(config)
    const after = playMove(config, base, { typeId: 'R01', at: { q: 3, r: -1 } }, { trace: true })
    const steps = after.lastResolution?.steps ?? []

    // Attaque : le Roi 20 → 15 (7 − 2 boucliers) et la Tour 10 → 3.
    const attack = steps.find((s) => s.kind === 'attack')
    expect(attack?.changes.map((c) => [c.typeId, c.from, c.to]).sort()).toEqual([
      ['N00', 20, 15],
      ['V00', 10, 3],
    ])

    // Riposte : R01 7 → −13, elle seule.
    const riposte = steps.find((s) => s.kind === 'riposte')
    expect(riposte?.changes).toHaveLength(1)
    expect(riposte?.changes[0]).toMatchObject({ typeId: 'R01', from: 7, to: -13 })
  })

  it('l’étape de destruction contient ENCORE la Tuile condamnée, pour l’animer', () => {
    const base = setupGame(config)
    const after = playMove(config, base, { typeId: 'R01', at: { q: 3, r: -1 } }, { trace: true })
    const destroy = after.lastResolution?.steps.find((s) => s.kind === 'destroy')
    expect(destroy?.destroyed).toHaveLength(1)
    const doomed = destroy?.destroyed[0] as number
    expect(destroy?.tiles.some((t) => t.uid === doomed)).toBe(true)
    // …et elle a bien disparu de l'état final.
    expect(after.tiles.some((t) => t.uid === doomed)).toBe(false)
  })

  it('une étape par effet à la pose, avant le combat (E5, E6)', () => {
    const cfg = traceConfig({ firstPlayer: 'player', startingColor: 'red' })
    const base = setupGame(cfg)
    const after = playMove(cfg, base, { typeId: 'R05', at: { q: 3, r: -1 } }, { trace: true })
    const kinds = after.lastResolution?.steps.map((s) => s.kind) ?? []
    expect(kinds[0]).toBe('place')
    expect(kinds[1]).toBe('effect')
    expect(kinds.indexOf('effect')).toBeLessThan(kinds.indexOf('attack'))
  })

  it('F11 — chaque vague de cascade est une étape distincte', () => {
    // J02 (+2 force alliée) meurt, sa voisine B03 tombe alors à 0 : deux vagues.
    const cfg = traceConfig({
      upkeepHeal: 0,
      firstPlayer: 'demon',
      startingColor: 'red',
      decks: { player: ['R03'], demon: ['R03'] },
      setup: [
        { side: 'player', type: 'N00', q: -4, r: 0 },
        { side: 'demon', type: 'N00', q: 4, r: 0 },
        { side: 'player', type: 'J02', q: 0, r: 0 },
        { side: 'player', type: 'B03', q: 1, r: 0 },
      ],
    })
    const base = setupGame(cfg)
    const view = viewBoard(cfg, base.tiles)
    const b03 = base.tiles.find((t) => t.typeId === 'B03')
    // B03 : 1 de base + 2 d'aura = 3.
    expect(view.forceOf(b03!)).toBe(3)
    // On blesse B03 de 2 : elle vit à 1 grâce à l'aura seulement.
    const state: GameState = {
      ...base,
      tiles: base.tiles.map((t) => (t.typeId === 'B03' ? { ...t, damage: 2 } : t)),
    }
    // (0,-1) touche J02 mais PAS B03 : sinon les deux mourraient dans la même
    // vague et il n'y aurait pas de cascade à observer.
    const after = playMove(cfg, state, { typeId: 'R03', at: { q: 0, r: -1 } }, { trace: true })
    const destroys = after.lastResolution?.steps.filter((s) => s.kind === 'destroy') ?? []
    expect(destroys.length).toBeGreaterThanOrEqual(2)
    expect(destroys[1]?.label).toContain('Cascade')
    expect(after.tiles.some((t) => t.typeId === 'B03')).toBe(false)
  })

  it('F13 — le soin produit une étape, avec ses variations', () => {
    const cfg = traceConfig({
      upkeepHeal: 2,
      setup: [
        { side: 'player', type: 'N00', q: -4, r: 2 },
        { side: 'player', type: 'V04', q: -3, r: 2 },
        { side: 'demon', type: 'N00', q: 4, r: -2 },
      ],
    })
    const base = setupGame(cfg)
    const wounded: GameState = {
      ...base,
      tiles: base.tiles.map((t) => (t.typeId === 'V04' ? { ...t, damage: 3 } : t)),
    }
    const after = applyUpkeep(cfg, wounded, { trace: true })
    const step = after.lastResolution?.steps[0]
    expect(step?.kind).toBe('heal')
    expect(step?.changes).toEqual([
      expect.objectContaining({ typeId: 'V04', from: 1, to: 3 }),
    ])
  })
})
