import { describe, expect, it } from 'vitest'
import { runTick } from '../rules/encounter'
import { at, buildGame, injectEntity, seedInput } from './helpers'

/**
 * Une Âme déjà posée sur l'Escalier. Les apparitions étant illimitées (`C5`),
 * un `Puits` en enverrait une par Tick et masquerait ce qu'on mesure.
 */
const delivery = (overrides: Record<string, unknown> = {}) => {
  const state = buildGame({
    board: { radius: 2 },
    initialTiles: [{ q: 1, r: 0, type: 'stairway', owner: 'neutral', exits: [] }],
    ...overrides,
  })
  injectEntity(state, at(1, 0))
  return state
}

describe('Escalier (R5, R6, R8, X3)', () => {
  it('retient la Recette la plus rentable par Tick parmi celles disponibles (R5)', () => {
    const state0 = delivery()
    seedInput(state0, at(1, 0), { rawBasalt: 1, cutBasalt: 1, basaltBlock: 1 })
    let state = state0

    state = runTick(state) // démarre le Pavé (7/3 = 2,33 par Tick) : 3 Ticks
    expect(state.progress).toBe(0)
    state = runTick(state)
    state = runTick(state)
    expect(state.progress).toBe(7)
    // Seul le Pavé a été consommé.
    expect(state.tiles['1,0']!.input).toEqual({ rawBasalt: 1, cutBasalt: 1 })
  })

  it('se rabat sur le Basalte brut quand c’est tout ce qu’il y a (R5)', () => {
    const state = delivery()
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    expect(runTick(state).progress).toBe(1)
  })

  it('ne laisse rien emporter depuis l’Escalier (R6)', () => {
    let state = delivery()
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state) // livre : +1, puis l'Âme est détruite faute de Sortie
    expect(state.tiles['1,0']!.output).toEqual({})
    expect(state.spent.player.delivered).toBe(1)
    expect(state.entities).toHaveLength(0)
  })

  it('consume le Sbire lui-même et retire 1 à la progression (X3)', () => {
    let state = buildGame({
      board: { radius: 2 },
      maxTicks: 2, // deux Ticks : le Sbire marche, puis se consume
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
      maxTicks: 3, // le Gouffre en envoie un par Tick, deux atteignent l'Escalier
      initialTiles: [
        { q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
        { q: 1, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      ],
    })
    while (state.outcome === 'ongoing') state = runTick(state)
    expect(state.progress).toBe(0) // jamais négatif
    expect(state.drain.applied).toBe(0)
    expect(state.drain.absorbed).toBe(2) // les ponctions sont perdues pour le démon
  })
})
