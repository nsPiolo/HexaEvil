import { describe, expect, it } from 'vitest'
import { key } from '../hex/hexCoord'
import { reserveLeft, runTick } from '../rules/encounter'
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
    expect(state.spawned.player).toBe(1)
    expect(state.spent.player.blocked).toBe(1)
    expect(entityIds(state)).toEqual([])

    state = runTick(state)
    expect(state.spawned.player).toBe(2)
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

  it('s’arrête définitivement quand la réserve est épuisée (C5)', () => {
    let state = buildGame({ ...soloWell, soulBudget: 3 })
    for (let i = 0; i < 6; i++) state = runTick(state)
    expect(state.spawned.player).toBe(3)
    expect(reserveLeft(state, 'player')).toBe(0)
  })

  it('compte un budget de partie, pas un plafond de population (C5b)', () => {
    // Puits avec Sortie vers un Vide sans Sortie : les Âmes s'accumulent puis meurent.
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 4,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    for (let i = 0; i < 3; i++) state = runTick(state)
    expect(state.spawned.player).toBe(3)
    // Les Âmes détruites ne libèrent pas de place : la réserve continue de baisser.
    expect(state.spawned.player + reserveLeft(state, 'player')).toBe(4)
  })

  it('fait apparaître les Sbires au Gouffre selon minionBudget (X1)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      minionBudget: 2,
      initialTiles: [{ q: 0, r: 0, type: 'chasm', owner: 'demon', exits: [] }],
    })
    for (let i = 0; i < 4; i++) state = runTick(state)
    expect(state.spawned.demon).toBe(2)
    expect(state.spawned.player).toBe(0) // pas de Puits : aucune Âme
  })
})
