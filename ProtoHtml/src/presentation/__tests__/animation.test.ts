/**
 * Agrégation des étiquettes temporaires (`U7`). C'est de l'affichage, mais
 * c'est l'affichage qui rend le proto lisible : une Ressource qui bouge sans
 * étiquette est un mouvement invisible.
 */
import { describe, expect, it } from 'vitest'
import { hex } from '../../core/hex/hexCoord'
import { runTick } from '../../core/rules/encounter'
import type { TickEvent } from '../../core/rules/types'
import { buildGame, withRecipes } from '../../core/__tests__/helpers'
import { aggregateFloaters } from '../useAnimation'

const stock = (q: number, r: number, delta: number, reason: 'produced' | 'picked'): TickEvent => ({
  kind: 'stock',
  coord: hex(q, r),
  resource: 'rawBasalt',
  delta,
  reason,
})

describe('Étiquettes « +x » / « −n » (U7)', () => {
  it('regroupe les entrées et les sorties d’une même Tuile en deux étiquettes', () => {
    const items = aggregateFloaters([stock(1, 0, 2, 'produced'), stock(1, 0, -1, 'picked')], 0)
    expect(items.map((f) => ({ text: f.text, kind: f.kind, slot: f.slot }))).toEqual([
      { text: '+2', kind: 'gain', slot: 0 },
      { text: '−1', kind: 'loss', slot: 1 },
    ])
  })

  it('additionne plusieurs mouvements de même signe sur une Tuile', () => {
    const items = aggregateFloaters([stock(0, 0, 2, 'produced'), stock(0, 0, 3, 'produced')], 0)
    expect(items).toHaveLength(1)
    expect(items[0]!.text).toBe('+5')
  })

  it('empile les étiquettes de Tuiles différentes sans les décaler', () => {
    const items = aggregateFloaters([stock(0, 0, 1, 'produced'), stock(1, 0, 1, 'produced')], 0)
    expect(items.every((f) => f.slot === 0)).toBe(true)
  })

  it('distingue la progression gagnée de la progression perdue', () => {
    const up = aggregateFloaters([{ kind: 'progress', coord: hex(0, 0), delta: 7 }], 0)
    const down = aggregateFloaters([{ kind: 'progress', coord: hex(0, 0), delta: -1 }], 0)
    expect(up[0]).toMatchObject({ text: '+7', kind: 'progress-up' })
    expect(down[0]).toMatchObject({ text: '−1', kind: 'progress-down' })
  })

  it('donne à la progression le premier emplacement, au-dessus des Ressources', () => {
    const items = aggregateFloaters(
      [stock(2, 0, 1, 'produced'), { kind: 'progress', coord: hex(2, 0), delta: 1 }],
      0,
    )
    expect(items[0]).toMatchObject({ kind: 'progress-up', slot: 0 })
    expect(items[1]).toMatchObject({ kind: 'gain', slot: 1 })
  })

  it('produit des étiquettes à partir d’un vrai Tick de simulation', () => {
    let state = buildGame({
      ...withRecipes('quarry', [{ out: { rawBasalt: 2 }, ticks: 1 }]),
      board: { radius: 2 },
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'quarry', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
      ],
    })
    state = runTick(state)
    state = runTick(state) // production + ramassage + dépôt
    const texts = aggregateFloaters(state.events, 0).map((f) => `${f.coord.q},${f.coord.r}:${f.text}`)
    expect(texts).toContain('1,0:+2') // 2 Basalte brut produits
    expect(texts).toContain('1,0:−1') // 1 emporté par l'Âme
    expect(texts).toContain('2,0:+1') // 1 déposé à l'Escalier
  })
})
