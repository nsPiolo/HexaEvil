import { describe, expect, it } from 'vitest'
import { livingEntities, runTick, totalSpent } from '../rules/encounter'
import { at, buildGame, seedInput } from './helpers'

describe('Fin de Rencontre (E1, E2, E3, E7)', () => {
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
    const frozen = runTick(state)
    expect(frozen).toBe(state)
  })

  it('déclare la défaite quand la réserve est épuisée et qu’il ne reste aucune Âme (E2)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
    })
    state = runTick(state) // l'unique Âme apparaît et meurt aussitôt
    expect(state.spawned.player).toBe(1)
    expect(livingEntities(state, 'player')).toBe(0)
    expect(state.outcome).toBe('defeat')
  })

  it('n’déclare pas la défaite tant qu’une Âme est encore en jeu (E3)', () => {
    let state = buildGame({
      board: { radius: 3 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state) // réserve épuisée, mais l'Âme marche encore
    expect(state.spawned.player).toBe(1)
    expect(state.outcome).toBe('ongoing')
    state = runTick(state)
    expect(state.outcome).toBe('ongoing')
    state = runTick(state) // elle meurt au bout du chemin
    expect(state.outcome).toBe('defeat')
  })

  it('termine toujours, même sur un réseau bouclé (E7, D16)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 3,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: ['SW'] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: ['NW'] },
      ],
    })
    let ticks = 0
    while (state.outcome === 'ongoing' && ticks < 200) {
      state = runTick(state)
      ticks += 1
    }
    expect(state.outcome).toBe('defeat')
    expect(ticks).toBeLessThan(20) // aucune boucle infinie
    expect(totalSpent(state, 'player')).toBe(3)
    expect(state.spent.player.backtrack).toBe(3) // toutes perdues sur la boucle
  })
})
