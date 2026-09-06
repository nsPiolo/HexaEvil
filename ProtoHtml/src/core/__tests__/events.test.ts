/**
 * Les événements d'un Tick (`U6`, `U7`) : c'est le moteur qui énonce ce qui
 * s'est passé, l'interface ne fait que l'animer. Un événement manquant est un
 * mouvement invisible à l'écran.
 */
import { describe, expect, it } from 'vitest'
import { runTick } from '../rules/encounter'
import type { TickEvent } from '../rules/types'
import { at, buildGame, seedInput } from './helpers'

const kinds = (events: readonly TickEvent[]) => events.map((e) => e.kind)

const stocks = (events: readonly TickEvent[]) =>
  events
    .filter((e): e is Extract<TickEvent, { kind: 'stock' }> => e.kind === 'stock')
    .map((e) => ({ coord: `${e.coord.q},${e.coord.r}`, resource: e.resource, delta: e.delta, reason: e.reason }))

const chain = {
  board: { radius: 2 },
  soulBudget: 2,
  initialTiles: [
    { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
    { q: 1, r: 0, type: 'quarry', owner: 'player', exits: ['E'] },
    { q: 2, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
  ],
}

describe('Événements de Tick', () => {
  it('annonce l’apparition puis le déplacement, avec la case de départ et d’arrivée', () => {
    const state = runTick(buildGame(chain))
    expect(kinds(state.events)).toEqual(['spawn', 'move'])
    const move = state.events.find((e) => e.kind === 'move')!
    expect(move).toMatchObject({ entityId: 1, side: 'player', from: at(0, 0), to: at(1, 0) })
  })

  it('annonce la production (+), le ramassage (−) et le dépôt (+)', () => {
    let state = buildGame(chain)
    state = runTick(state) // l'Âme #1 rejoint la Carrière
    state = runTick(state) // elle produit, emporte 1, dépose à l'Escalier

    expect(stocks(state.events)).toEqual([
      { coord: '1,0', resource: 'rawBasalt', delta: 2, reason: 'produced' },
      { coord: '1,0', resource: 'rawBasalt', delta: -1, reason: 'picked' },
      { coord: '2,0', resource: 'rawBasalt', delta: 1, reason: 'deposited' },
    ])
  })

  it('annonce la consommation des IN au démarrage d’une Recette', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stonecutter', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state)
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state) // démarrage : les IN sortent de la réserve
    expect(stocks(state.events)).toEqual([
      { coord: '1,0', resource: 'rawBasalt', delta: -1, reason: 'consumed' },
    ])
  })

  it('annonce la progression et la destruction à l’Escalier', () => {
    let state = buildGame(chain)
    for (let i = 0; i < 3; i++) state = runTick(state)
    const progress = state.events.find((e) => e.kind === 'progress')
    expect(progress).toMatchObject({ coord: at(2, 0), delta: 1 })
    const destroy = state.events.find((e) => e.kind === 'destroy')
    expect(destroy).toMatchObject({ entityId: 1, coord: at(2, 0), cause: 'delivered' })
  })

  it('annonce la ponction du démon en négatif', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      minionBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
        { q: 1, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      ],
    })
    state.progress = 3
    state = runTick(state)
    state = runTick(state)
    expect(state.events.find((e) => e.kind === 'progress')).toMatchObject({ delta: -1 })
  })

  it('ne décrit que le Tick courant', () => {
    let state = buildGame(chain)
    state = runTick(state)
    const first = state.events.length
    state = runTick(state)
    expect(first).toBeGreaterThan(0)
    expect(state.events.every((e) => e.kind !== 'spawn' || e.entityId === 2)).toBe(true)
  })
})
