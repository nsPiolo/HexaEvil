/**
 * Parties complètes avec **la configuration livrée** (disposition `B7b`, démon
 * inclus). Ces tests ne vérifient pas une règle isolée : ils mesurent ce que le
 * réglage actuel produit, et servent de garde-fou aux hypothèses `E8`/`E9`.
 */
import { describe, expect, it } from 'vitest'
import { directionIndex, hex } from '../hex/hexCoord'
import { createGame, placeTile, progressPerSoulSpent, runRound, totalSpent } from '../rules/encounter'
import { parseConfig } from '../config/load'
import { rawGameplay } from './helpers'
import type { GameState } from '../rules/types'

const E = [directionIndex('E')]

/** Joue la partie jusqu'au bout après avoir posé la chaîne demandée. */
const playOut = (chain: { q: number; r: number; type: string }[], maxRounds = 200): GameState => {
  let state = createGame(parseConfig(rawGameplay()))
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
    expect(state.spent.player.delivered).toBe(96)
    expect(state.spent.player.blocked).toBe(4) // perdues pendant la Manche 1, réseau incomplet
    // +1 par Âme à 1 Âme par Tick contre −1 par Tick : les deux flux s'annulent.
    expect(state.progress).toBe(0)
    expect(state.drain.applied).toBe(96)
    expect(progressPerSoulSpent(state)).toBe(0)
    // Le « ×2 » de la Carrière part entièrement en surplus mort.
    expect(state.tiles['-2,0']!.output.rawBasalt).toBe(104)
  })

  it('voie du Basalte dégrossi : 192 sur 200, la cible est juste hors d’atteinte', () => {
    // Puits(-3,0) → Carrière(-2,0) → Tailleur(-1,0) → Escalier(0,0)
    const state = playOut([
      { q: -2, r: 0, type: 'quarry' },
      { q: -1, r: 0, type: 'stonecutter' },
    ])

    expect(state.outcome).toBe('defeat')
    expect(state.spent.player.delivered).toBe(96)
    // 96 livraisons × 3 = 288 brut, moins 96 de ponction = 192.
    expect(state.progress).toBe(192)
    expect(state.drain.applied).toBe(96)
    expect(progressPerSoulSpent(state)).toBeCloseTo(1.92, 2)
    expect(totalSpent(state, 'player')).toBe(100)
  })

  it('réseau inachevé : la partie se termine quand même (D16, E7)', () => {
    const state = playOut([], 300)
    expect(state.outcome).toBe('defeat')
    expect(state.spent.player.blocked).toBe(100) // toutes mortes en sortant du Puits
    expect(state.progress).toBe(0)
    expect(state.drain.absorbed).toBeGreaterThan(90) // ponction entièrement absorbée (R8)
  })
})
