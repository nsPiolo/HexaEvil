/**
 * Test d'acceptation du moteur — la trace de référence du GDD §14.
 *
 * Si ce test échoue, ce n'est pas le test qui a tort : c'est qu'une règle est
 * mal implémentée, ou que le GDD a changé sans que la trace soit refaite.
 *
 * La trace fixe elle-même la Recette de la `Carrière` (2 Basalte brut par
 * production) : elle décrit le **moteur**, pas le réglage courant, et régler la
 * Carrière dans `config/gameplay.json` ne doit pas la faire rougir.
 */
import { describe, expect, it } from 'vitest'
import { key } from '../hex/hexCoord'
import { progressPerSoulSpent, runTick, totalSpent } from '../rules/encounter'
import { at, buildGame, tile, withRecipes } from './helpers'

const traceGame = () =>
  buildGame({
    ...withRecipes('quarry', [{ out: { rawBasalt: 2 }, ticks: 1 }]),
    board: { radius: 2 },
    // Démon absent : la trace n'observe que la chaîne du joueur.
    minionBudget: 0,
    initialTiles: [
      { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
      { q: 1, r: 0, type: 'quarry', owner: 'player', exits: ['E'] },
      { q: 2, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
    ],
  })

const positions = (state: ReturnType<typeof traceGame>): Record<number, string> =>
  Object.fromEntries(state.entities.map((e) => [e.id, key(e.space)]))

describe('Trace de référence (GDD §14)', () => {
  it('Tick 1 — l’Âme #1 apparaît et rejoint la Carrière', () => {
    const state = runTick(traceGame())
    expect(positions(state)).toEqual({ 1: '1,0' })
    expect(state.entities[0]!.carrying).toBeUndefined()
    expect(tile(state, at(1, 0)).output).toEqual({})
    expect(state.progress).toBe(0)
  })

  it('Tick 2 — elle produit 2 basaltes bruts, en emporte 1 et le dépose à l’Escalier', () => {
    let state = traceGame()
    state = runTick(state)
    state = runTick(state)
    expect(positions(state)).toEqual({ 1: '2,0', 2: '1,0' })
    expect(tile(state, at(1, 0)).output).toEqual({ rawBasalt: 1 }) // 2 produits, 1 emporté
    expect(tile(state, at(2, 0)).input).toEqual({ rawBasalt: 1 }) // déposé à l'arrivée (D10)
    expect(state.entities.find((e) => e.id === 1)!.carrying).toBeUndefined()
  })

  it('Tick 3 — première progression, et l’Âme #1 se consume à l’Escalier', () => {
    let state = traceGame()
    for (let i = 0; i < 3; i++) state = runTick(state)
    expect(state.progress).toBe(1)
    expect(positions(state)).toEqual({ 2: '2,0', 3: '1,0' })
    expect(state.spent.player.delivered).toBe(1)
    expect(tile(state, at(1, 0)).output).toEqual({ rawBasalt: 2 }) // 1 restant + 2 produits - 1 emporté
  })

  it('Tick 4 — le régime permanent : +1 progression et 1 Âme par Tick', () => {
    let state = traceGame()
    for (let i = 0; i < 4; i++) state = runTick(state)
    expect(state.progress).toBe(2)
    expect(state.spent.player.delivered).toBe(2)
    expect(tile(state, at(1, 0)).output).toEqual({ rawBasalt: 3 }) // le surplus s'accumule
  })

  it('confirme E9 : la voie du Basalte brut rapporte 1 progression par Âme', () => {
    let state = traceGame()
    for (let i = 0; i < 12; i++) state = runTick(state)
    expect(state.progress).toBe(10)
    expect(totalSpent(state, 'player')).toBe(10)
    expect(progressPerSoulSpent(state)).toBe(1)
    // Le surplus non emporté grossit d'un basalte par Tick (2 produits, 1 emporté)
    // du Tick 2 au Tick 12 : le « ×2 » de la Carrière est perdu tant qu'aucune
    // Âme ne vient le hâler (D12 ne se déclenche que si elle ne peut pas produire).
    expect(tile(state, at(1, 0)).output.rawBasalt).toBe(11)
  })
})
