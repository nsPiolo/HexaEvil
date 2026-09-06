import { describe, expect, it } from 'vitest'
import { runTick } from '../rules/encounter'
import { at, buildGame, seedInput } from './helpers'

/** Puits collé à l'Escalier : l'Âme y arrive au Tick 1. */
const delivery = (overrides: Record<string, unknown> = {}) =>
  buildGame({
    board: { radius: 2 },
    soulBudget: 1,
    initialTiles: [
      { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
      { q: 1, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
    ],
    ...overrides,
  })

describe('Escalier (R5, R6, R8, X3)', () => {
  it('retient la Recette la plus rentable par Tick parmi celles disponibles (R5)', () => {
    let state = delivery()
    state = runTick(state) // l'Âme arrive sur l'Escalier
    seedInput(state, at(1, 0), { rawBasalt: 1, cutBasalt: 1, basaltBlock: 1 })

    state = runTick(state) // démarre le Pavé (7/3 = 2,33 par Tick) : 3 Ticks
    expect(state.progress).toBe(0)
    state = runTick(state)
    state = runTick(state)
    expect(state.progress).toBe(7)
    // Seul le Pavé a été consommé.
    expect(state.tiles['1,0']!.input).toEqual({ rawBasalt: 1, cutBasalt: 1 })
  })

  it('se rabat sur le Basalte brut quand c’est tout ce qu’il y a (R5)', () => {
    let state = delivery()
    state = runTick(state)
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state)
    expect(state.progress).toBe(1)
  })

  it('ne laisse rien emporter depuis l’Escalier (R6)', () => {
    let state = delivery()
    state = runTick(state)
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state) // livre : +1, puis l'Âme est détruite faute de Sortie
    expect(state.tiles['1,0']!.output).toEqual({})
    expect(state.spent.player.delivered).toBe(1)
    expect(state.entities).toHaveLength(0)
  })

  it('consume le Sbire lui-même et retire 1 à la progression (X3)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      minionBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
        { q: 1, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      ],
    })
    state.progress = 5
    state = runTick(state) // le Sbire rejoint l'Escalier, les mains vides
    expect(state.entities.filter((e) => e.side === 'demon')).toHaveLength(1)
    state = runTick(state) // il se consume : -1
    expect(state.progress).toBe(4)
    expect(state.drain.applied).toBe(1)
    expect(state.drain.absorbed).toBe(0)
    expect(state.spent.demon.delivered).toBe(1)
  })

  it('borne la progression à 0 et compte la ponction absorbée (R8, E8)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      minionBudget: 2,
      initialTiles: [
        { q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
        { q: 1, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      ],
    })
    for (let i = 0; i < 4; i++) state = runTick(state)
    expect(state.progress).toBe(0) // jamais négatif
    expect(state.drain.applied).toBe(0)
    expect(state.drain.absorbed).toBe(2) // les deux ponctions sont perdues pour le démon
  })
})
