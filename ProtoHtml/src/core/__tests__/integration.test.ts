/**
 * Parties complètes avec **les recettes et les budgets livrés**, sur une
 * disposition épinglée par le test (celle de `B7b`).
 *
 * Pourquoi épingler le Plateau plutôt que prendre celui de la configuration :
 * la disposition est ce qu'on manipule le plus en réglant, et ces tests
 * mesurent l'économie, pas le terrain. En revanche les recettes, les budgets et
 * la cible viennent bien du fichier livré : changer un de ces nombres **doit**
 * faire bouger les mesures ci-dessous, et c'est le signal attendu.
 */
import { describe, expect, it } from 'vitest'
import { directionIndex, hex } from '../hex/hexCoord'
import { createGame, placeTile, progressPerSoulSpent, runRound, totalSpent } from '../rules/encounter'
import { referenceConfig } from './helpers'
import type { GameState } from '../rules/types'

const E = [directionIndex('E')]

/** Joue la partie jusqu'au bout après avoir posé la chaîne demandée. */
const playOut = (chain: { q: number; r: number; type: string }[], maxRounds = 200): GameState => {
  let state = createGame(referenceConfig())
  for (const step of chain) {
    const placed = placeTile(state, hex(step.q, step.r), step.type, E)
    expect(placed).not.toBe(state) // la pose doit être acceptée
    state = runRound(placed)
  }
  let rounds = 0
  while (state.outcome === 'ongoing' && rounds < maxRounds) {
    state = runRound(state)
    rounds += 1
  }
  return state
}

describe('Partie complète (configuration livrée)', () => {
  it('voie du Basalte brut : exactement annulée par le démon', () => {
    // Puits(-3,0) → Carrière(-2,0) → Vide(-1,0) → Escalier(0,0)
    const state = playOut([
      { q: -2, r: 0, type: 'quarry' },
      { q: -1, r: 0, type: 'empty' },
    ])

    // Valeurs mesurées : le moteur est déterministe, elles servent de référence
    // de régression. Si le réglage change, ces nombres doivent changer aussi.
    expect(state.outcome).toBe('defeat')
    expect(state.spawned.player).toBe(100)
    expect(state.spent.player.delivered).toBe(100)
    // La cadence courte des premières Manches (C1b) laisse achever la chaîne
    // avant qu'aucune Âme ne se perde.
    expect(state.spent.player.blocked).toBe(0)
    // +1 par Âme à 1 Âme par Tick contre −1 par Tick : les deux flux s'annulent.
    expect(state.progress).toBe(0)
    expect(state.drain.applied).toBe(100)
    expect(progressPerSoulSpent(state)).toBe(0)
    // Le « ×2 » de la Carrière part entièrement en surplus mort.
    expect(state.tiles['-2,0']!.output.rawBasalt).toBe(100)
  })

  it('voie du Basalte dégrossi : la cible est atteinte de justesse', () => {
    // Puits(-3,0) → Carrière(-2,0) → Tailleur(-1,0) → Escalier(0,0)
    const state = playOut([
      { q: -2, r: 0, type: 'quarry' },
      { q: -1, r: 0, type: 'stonecutter' },
    ])

    expect(state.outcome).toBe('victory')
    // 99 livraisons × 3 = 297 brut, moins 99 de ponction = 198… plus les 3 de la
    // livraison qui franchit la cible : 201 pour 200 demandés.
    expect(state.progress).toBe(201)
    expect(state.spent.player.delivered).toBe(99)
    expect(state.drain.applied).toBe(99)
    expect(totalSpent(state, 'player')).toBe(99) // gagné avec une Âme encore en jeu
    expect(progressPerSoulSpent(state)).toBeCloseTo(2.03, 2)
  })

  it('réseau inachevé : la partie se termine quand même (D16, E7)', () => {
    const state = playOut([], 300)
    expect(state.outcome).toBe('defeat')
    expect(state.spent.player.blocked).toBe(100) // toutes mortes en sortant du Puits
    expect(state.progress).toBe(0)
    expect(state.drain.absorbed).toBeGreaterThan(90) // ponction entièrement absorbée (R8)
  })
})
