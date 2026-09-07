import { describe, expect, it } from 'vitest'
import { livingEntities, runTick, totalSpent } from '../rules/encounter'
import { at, buildGame, seedInput } from './helpers'

describe('Fin de Rencontre (E1, E2, E3)', () => {
  it('déclare la victoire dès que la cible est atteinte (E1)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 5,
      stairwayTarget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
      ],
    })
    state = runTick(state)
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state)
    expect(state.progress).toBe(1)
    expect(state.outcome).toBe('victory')
    expect(state.phase).toBe('over')
    // La partie est arrêtée : plus aucun Tick n'a d'effet.
    expect(runTick(state)).toBe(state)
  })

  it('déclare la défaite quand l’horloge est écoulée (E2)', () => {
    let state = buildGame({
      board: { radius: 2 },
      maxTicks: 4,
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
    })
    for (let i = 0; i < 3; i++) state = runTick(state)
    expect(state.tick).toBe(3)
    expect(state.outcome).toBe('ongoing') // il reste un Tick

    state = runTick(state)
    expect(state.tick).toBe(4)
    expect(state.outcome).toBe('defeat')
    expect(runTick(state)).toBe(state)
  })

  it('ne s’arrête plus quand il n’y a plus d’Âme, seulement quand le temps est écoulé (E2)', () => {
    // L'unique Âme meurt au Tick 1 ; la Rencontre continue jusqu'à l'horloge.
    let state = buildGame({
      board: { radius: 2 },
      maxTicks: 5,
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
    })
    state = runTick(state)
    expect(state.entities).toHaveLength(0)
    expect(state.outcome).toBe('ongoing')

    for (let i = 0; i < 3; i++) state = runTick(state)
    expect(state.outcome).toBe('ongoing')
    state = runTick(state)
    expect(state.outcome).toBe('defeat')
    expect(state.tick).toBe(5)
  })

  it('laisse la livraison du dernier Tick faire gagner (E3)', () => {
    // L'Escalier a de quoi produire : la Recette aboutit au Tick 2, qui est le
    // dernier. Le test de défaite passe après, donc la victoire prime.
    let state = buildGame({
      board: { radius: 2 },
      maxTicks: 2,
      stairwayTarget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
      ],
    })
    state = runTick(state)
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state)
    expect(state.tick).toBe(2)
    expect(state.outcome).toBe('victory')
  })

  it('termine même sur un réseau bouclé, par l’horloge comme par D16', () => {
    let state = buildGame({
      board: { radius: 2 },
      maxTicks: 12,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: ['SW'] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: ['NW'] },
      ],
    })
    let ticks = 0
    while (state.outcome === 'ongoing' && ticks < 500) {
      state = runTick(state)
      ticks += 1
    }
    expect(state.outcome).toBe('defeat')
    expect(state.tick).toBe(12) // l'horloge, désormais
    // D16 reste actif : aucune Âme ne tourne indéfiniment dans la boucle. Les
    // Âmes apparues au Tick k y meurent au Tick k+3, donc les toutes dernières
    // sont encore en chemin à l'échéance.
    expect(state.spent.player.backtrack).toBeGreaterThan(0)
    expect(state.spent.player.blocked).toBe(0)
    expect(totalSpent(state, 'player') + livingEntities(state, 'player')).toBe(
      state.spawned.player,
    )
  })
})
