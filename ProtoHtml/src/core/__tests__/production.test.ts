import { describe, expect, it } from 'vitest'
import { runTick } from '../rules/encounter'
import { destroyEntity, productionPhase } from '../rules/tick'
import { at, buildGame, entity, seedInput, tile } from './helpers'

/** Puits → Bâtiment, pour amener une Âme sur le Bâtiment au Tick 1. */
const chain = (type: string, exits: string[] = []) => ({
  board: { radius: 2 },
  soulBudget: 1,
  initialTiles: [
    { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
    { q: 1, r: 0, type, owner: 'player', exits },
  ],
})

describe('Production (P1-P8)', () => {
  it('démarre et termine une Recette de 1 Tick dans la même phase (P5)', () => {
    let state = buildGame(chain('quarry'))
    state = runTick(state) // l'Âme #1 rejoint la Carrière
    expect(tile(state, at(1, 0)).output).toEqual({})
    state = runTick(state) // production
    expect(tile(state, at(1, 0)).output).toEqual({ rawBasalt: 2 })
    expect(tile(state, at(1, 0)).productionsDone).toBe(1)
  })

  it('ne démarre pas sans les Ressources IN, et n’en bloque pas l’entité (P2, P7)', () => {
    let state = buildGame(chain('stonecutter', ['E']))
    state = runTick(state) // arrive au Tailleur, réserve vide
    state = runTick(state)
    expect(tile(state, at(1, 0)).output).toEqual({})
    expect(tile(state, at(1, 0)).productionsDone).toBe(0)
    // P7 : elle n'est pas bloquée, elle a continué son chemin (et est morte faute de Tuile).
    expect(state.entities).toHaveLength(0)
    expect(state.spent.player.blocked).toBe(1)
  })

  it('mène une Recette de plusieurs Ticks au bout, par la même entité (P3, P4, D12)', () => {
    // Puits → Tailleur → Vide : l'Âme survit à sa production et repart chargée.
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stonecutter', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state) // Âme #1 → Tailleur
    seedInput(state, at(1, 0), { rawBasalt: 1 })

    state = runTick(state) // Tick 1 de la Recette (durée 2)
    expect(entity(state, 1).production).toEqual({ recipeIndex: 0, ticksDone: 1 })
    expect(tile(state, at(1, 0)).input).toEqual({}) // P2 : les IN sont retirés au démarrage
    expect(entity(state, 1).space).toEqual(at(1, 0)) // D7 : en production, elle ne bouge pas

    state = runTick(state) // Tick 2 : elle termine, se libère et repart
    expect(tile(state, at(1, 0)).productionsDone).toBe(1)
    expect(tile(state, at(1, 0)).output).toEqual({ cutBasalt: 1 }) // 2 produits, 1 emporté (D12)
    expect(entity(state, 1).production).toBeUndefined()
    expect(entity(state, 1).carrying).toBe('cutBasalt')
    expect(entity(state, 1).space).toEqual(at(2, 0))
  })

  it('donne à un Bâtiment un débit proportionnel au nombre d’entités (P6)', () => {
    // Deux Âmes sur la même Carrière : deux productions indépendantes.
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 2,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'quarry', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state) // Âme #1 → Carrière
    state = runTick(state) // Âme #1 produit (2), Âme #2 → Carrière... puis #1 meurt (pas de Sortie)
    const afterOne = tile(state, at(1, 0)).output.rawBasalt ?? 0
    state = runTick(state) // Âme #2 produit à son tour
    const afterTwo = tile(state, at(1, 0)).output.rawBasalt ?? 0
    expect(afterOne).toBe(2)
    expect(afterTwo).toBe(4) // chaque entité mène sa propre production
  })

  it('ne produit pas deux fois sur le même Espace (P1)', () => {
    let state = buildGame(chain('quarry'))
    state = runTick(state)
    state = runTick(state) // produit : 2 basaltes bruts, l'Âme reste (pas de Sortie → détruite)
    const output = tile(state, at(1, 0)).output.rawBasalt
    // L'Âme a été détruite au déplacement : on relance la phase de production seule
    // pour vérifier qu'aucune production fantôme n'a lieu.
    productionPhase(state, 'player')
    expect(tile(state, at(1, 0)).output.rawBasalt).toBe(output)
  })

  it('rembourse les Ressources IN si l’entité est détruite en production (P8)', () => {
    let state = buildGame(chain('stonecutter'))
    state = runTick(state)
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state)
    expect(tile(state, at(1, 0)).input).toEqual({})
    // P8 est inatteignable en jeu normal (D7) : on appelle la destruction directement.
    destroyEntity(state, entity(state, 1), 'blocked')
    expect(tile(state, at(1, 0)).input).toEqual({ rawBasalt: 1 })
  })
})
