import { describe, expect, it } from 'vitest'
import { viewBoard } from '../rules/derived'
import { criticalLinks, suppliedUids } from '../rules/supply'
import type { PlacedTile, Side } from '../rules/types'
import { traceConfig } from './helpers'

function build(entries: { id: string; side: Side; q: number; r: number }[]) {
  const config = traceConfig()
  const tiles: PlacedTile[] = entries.map((e, i) => ({
    uid: i + 1,
    typeId: e.id,
    side: e.side,
    at: { q: e.q, r: e.r },
    placementBonus: 0,
    damage: 0,
    grantedShields: config.tileTypes.get(e.id)?.shields ?? 0,
  }))
  return { config, tiles, view: viewBoard(config, tiles) }
}

/** Règle F14 — chaîne de ravitaillement. */
describe('F14 — chaîne de ravitaillement', () => {
  it('le Roi est ravitaillé, chemin de longueur 0', () => {
    const { view, tiles } = build([{ id: 'N00', side: 'player', q: 0, r: 0 }])
    expect(suppliedUids(view, tiles, 'player')).toEqual(new Set([1]))
  })

  it('une chaîne alliée contiguë est ravitaillée de bout en bout', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: 0, r: 0 },
      { id: 'B03', side: 'player', q: 1, r: 0 },
      { id: 'B03', side: 'player', q: 2, r: 0 },
      { id: 'B03', side: 'player', q: 3, r: 0 },
    ])
    expect(suppliedUids(view, tiles, 'player').size).toBe(4)
  })

  it('un trou dans la chaîne coupe tout ce qui pend derrière', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: 0, r: 0 },
      { id: 'B03', side: 'player', q: 1, r: 0 },
      // (2,0) est vide
      { id: 'B03', side: 'player', q: 3, r: 0 },
      { id: 'B03', side: 'player', q: 4, r: 0 },
    ])
    const supplied = suppliedUids(view, tiles, 'player')
    expect(supplied).toEqual(new Set([1, 2]))
  })

  it('une Tuile adverse ne transmet pas le ravitaillement', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: 0, r: 0 },
      { id: 'B03', side: 'demon', q: 1, r: 0 },
      { id: 'B03', side: 'player', q: 2, r: 0 },
    ])
    expect(suppliedUids(view, tiles, 'player')).toEqual(new Set([1]))
  })

  /** Découle de T7 : une Tuile de camp n'est jamais alliée d'une neutre. */
  it('une Tuile NEUTRE ne transmet pas le ravitaillement (obstacle logistique)', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: 0, r: 0 },
      { id: 'B01', side: 'neutral', q: 1, r: 0 },
      { id: 'B03', side: 'player', q: 2, r: 0 },
    ])
    expect(suppliedUids(view, tiles, 'player')).toEqual(new Set([1]))
  })

  it('Roi mort ⇒ plus rien n’est ravitaillé', () => {
    const { view, tiles } = build([
      { id: 'B03', side: 'player', q: 1, r: 0 },
      { id: 'B03', side: 'player', q: 2, r: 0 },
    ])
    expect(suppliedUids(view, tiles, 'player').size).toBe(0)
  })

  it('une position avancée au contact du Roi adverse n’est pas ravitaillée', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: -4, r: 2 },
      { id: 'N00', side: 'demon', q: 4, r: -2 },
      { id: 'R01', side: 'player', q: 3, r: -1 },
    ])
    const supplied = suppliedUids(view, tiles, 'player')
    expect(supplied.has(1)).toBe(true)
    expect(supplied.has(3)).toBe(false)
  })
})

describe('U10/I5b — maillons critiques', () => {
  it('le maillon intermédiaire d’une chaîne linéaire est critique', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: 0, r: 0 },
      { id: 'B03', side: 'player', q: 1, r: 0 },
      { id: 'B03', side: 'player', q: 2, r: 0 },
    ])
    // Tuer (1,0) coupe (2,0) ; tuer (2,0) ne coupe rien.
    expect(criticalLinks(view, tiles, 'player')).toEqual(new Set([2]))
  })

  it('une chaîne redondante n’a aucun maillon critique', () => {
    const { view, tiles } = build([
      { id: 'N00', side: 'player', q: 0, r: 0 },
      { id: 'B03', side: 'player', q: 1, r: 0 },
      { id: 'B03', side: 'player', q: 0, r: 1 },
      { id: 'B03', side: 'player', q: 1, r: 1 },
    ])
    expect(criticalLinks(view, tiles, 'player').size).toBe(0)
  })
})
