/**
 * Apparition des entités (`C4`, `C5`, `X1`). Elle est **illimitée** : une entité
 * par Tick et par Tuile d'apparition, tant que la Rencontre dure. C'est
 * l'horloge (`E2`) qui borne la partie, plus une réserve.
 */
import { describe, expect, it } from 'vitest'
import { key } from '../hex/hexCoord'
import { runTick, spawnedCount } from '../rules/encounter'
import { buildGame, entityIds } from './helpers'

const soloWell = {
  board: { radius: 2 },
  initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
}

describe('Apparition (C4, C5, X1)', () => {
  it('fait apparaître 1 Âme par Tick sur le Puits (C4)', () => {
    let state = buildGame(soloWell)
    state = runTick(state)
    // Le Puits n'a ici aucune Sortie : l'Âme apparaît, puis est détruite dans la
    // phase de déplacement du même Tick (D6). Une par Tick, chacune éphémère.
    expect(spawnedCount(state, 'player')).toBe(1)
    expect(state.spent.player.blocked).toBe(1)
    expect(entityIds(state)).toEqual([])

    state = runTick(state)
    expect(spawnedCount(state, 'player')).toBe(2)
    expect(state.spent.player.blocked).toBe(2)
  })

  it('place la nouvelle Âme sur l’Espace du Puits (C4)', () => {
    const state = runTick(
      buildGame({
        board: { radius: 2 },
        initialTiles: [
          { q: -1, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
          { q: 0, r: 0, type: 'empty', owner: 'player', exits: [] },
        ],
      }),
    )
    // Apparue en (-1,0), elle a franchi sa Sortie dans le même Tick : elle est en (0,0).
    expect(state.entities).toHaveLength(1)
    expect(key(state.entities[0]!.space)).toBe('0,0')
    expect(state.entities[0]!.visited).toEqual(['-1,0', '0,0'])
  })

  it('n’a aucune réserve : elle continue jusqu’à l’horloge (C5, E2)', () => {
    let state = buildGame({ ...soloWell, maxTicks: 7 })
    while (state.outcome === 'ongoing') state = runTick(state)
    expect(state.tick).toBe(7)
    expect(spawnedCount(state, 'player')).toBe(7) // une par Tick, sans plafond
  })

  it('n’est pas freinée par les entités déjà présentes (C4)', () => {
    // Puits avec Sortie vers un Vide sans Sortie : les Âmes s'accumulent puis
    // meurent, sans jamais bloquer l'apparition suivante.
    let state = buildGame({
      board: { radius: 2 },
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    for (let i = 0; i < 3; i++) state = runTick(state)
    expect(spawnedCount(state, 'player')).toBe(3)
  })

  it('fait apparaître un Sbire par Tick au Gouffre (X1)', () => {
    let state = buildGame({
      board: { radius: 2 },
      maxTicks: 4,
      initialTiles: [{ q: 0, r: 0, type: 'chasm', owner: 'demon', exits: [] }],
    })
    while (state.outcome === 'ongoing') state = runTick(state)
    expect(spawnedCount(state, 'demon')).toBe(4)
    expect(spawnedCount(state, 'player')).toBe(0) // pas de Puits : aucune Âme
  })
})
