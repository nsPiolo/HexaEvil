/**
 * Parties complètes avec les recettes et les budgets livrés, sur la disposition
 * de référence (`B7b`).
 *
 * Ces tests vérifient des **invariants du moteur**, pas des valeurs
 * d'équilibrage : régler une recette ne doit pas les faire rougir. Les mesures
 * du réglage courant vivent dans le README, où elles sont rafraîchies à la
 * demande — une assertion sur « 190 points » serait un piège à chaque essai.
 */
import { describe, expect, it } from 'vitest'
import { directionIndex, hex } from '../hex/hexCoord'
import {
  createGame,
  livingEntities,
  placeTile,
  runRound,
  totalSpent,
} from '../rules/encounter'
import { tracksProgress } from '../rules/recipes'
import { referenceConfig, withHand } from './helpers'
import type { GameConfig, GameState } from '../rules/types'

const E = [directionIndex('E')]

/**
 * Joue la partie jusqu'au bout après avoir posé la chaîne demandée. Le sac ne
 * contient **que** les Tuiles de cette chaîne, toutes distribuées : le tirage
 * aléatoire (`A8`) n'interfère donc pas avec la mesure.
 */
const playOut = (chain: { q: number; r: number; type: string }[], maxRounds = 400): GameState => {
  let state = createGame({
    ...referenceConfig(),
    ...(withHand(chain.map((c) => c.type)) as {
      deck: string[]
      handMax: number
      handStart: number
      seed: number
    }),
  })
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

/** Ce que retire une Recette du démon, lu dans la configuration. */
const demonDrainPerMinion = (config: GameConfig): number => {
  const type = config.tileTypes.find(tracksProgress)!
  const recipe = (type.recipes ?? []).find((r) => r.side === 'demon')!
  return Math.abs(recipe.progress ?? 0)
}

const RAW_CHAIN = [
  { q: -2, r: 0, type: 'quarry' },
  { q: -1, r: 0, type: 'empty' },
]

const CUT_CHAIN = [
  { q: -2, r: 0, type: 'quarry' },
  { q: -1, r: 0, type: 'stonecutter' },
]

describe('Partie complète (configuration livrée)', () => {
  it('s’arrête à l’horloge, ou plus tôt sur une victoire (E1, E2)', () => {
    const state = playOut(RAW_CHAIN)
    const { maxTicks } = state.config
    if (state.outcome === 'victory') expect(state.tick).toBeLessThanOrEqual(maxTicks)
    else {
      expect(state.outcome).toBe('defeat')
      expect(state.tick).toBe(maxTicks)
    }
  })

  it('ne perd aucune entité sur une chaîne droite (D6, D16)', () => {
    const state = playOut(CUT_CHAIN)
    expect(state.spent.player.blocked).toBe(0)
    expect(state.spent.player.backtrack).toBe(0)
    expect(state.spent.demon.backtrack).toBe(0)
  })

  it('conserve les Âmes : apparues = livrées + perdues + encore en jeu (K1)', () => {
    const state = playOut(CUT_CHAIN)
    expect(totalSpent(state, 'player') + livingEntities(state, 'player')).toBe(state.spawned.player)
    expect(totalSpent(state, 'demon') + livingEntities(state, 'demon')).toBe(state.spawned.demon)
  })

  it('ne ponctionne jamais plus que ce que le démon a livré (X3, R8)', () => {
    const state = playOut(CUT_CHAIN)
    const perMinion = demonDrainPerMinion(state.config)
    expect(state.drain.applied + state.drain.absorbed).toBeLessThanOrEqual(
      state.spent.demon.delivered * perMinion,
    )
    expect(state.progress).toBeGreaterThanOrEqual(0) // R8 : jamais négatif
  })

  it('rend le raffinage strictement plus rentable que la pierre brute (E9)', () => {
    // Invariant de conception, pas une valeur : si un réglage l'inverse, c'est
    // le réglage qu'il faut revoir, et ce test est là pour le dire.
    const raw = playOut(RAW_CHAIN)
    const cut = playOut(CUT_CHAIN)
    expect(cut.progress).toBeGreaterThan(raw.progress)
  })

  it('réseau inachevé : la partie se termine quand même (E2)', () => {
    const state = playOut([])
    expect(state.outcome).toBe('defeat')
    expect(state.tick).toBe(state.config.maxTicks)
    expect(state.progress).toBe(0)
    expect(state.spent.player.blocked).toBeGreaterThan(0) // toutes mortes en sortant du Puits
  })
})
