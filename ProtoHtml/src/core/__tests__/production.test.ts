import { describe, expect, it } from 'vitest'
import { runTick } from '../rules/encounter'
import { destroyEntity, productionPhase } from '../rules/tick'
import { at, buildGame, entity, injectEntity, seedInput, tile, withRecipes } from './helpers'

/**
 * Un Bâtiment seul en (1,0) et **une** Âme posée dessus à la main : les
 * apparitions étant illimitées (`C5`), un `Puits` ferait naître une Âme par Tick
 * et brouillerait les comptes. La Recette de la `Carrière` est fixée ici
 * (2 par production) : ces tests décrivent le moteur, pas le réglage livré.
 */
const chain = (type: string, exits: string[] = []) => ({
  ...withRecipes('quarry', [{ out: { rawBasalt: 2 }, ticks: 1 }]),
  board: { radius: 2 },
  initialTiles: [{ q: 1, r: 0, type, owner: 'player', exits }],
})

/** L'Âme #1 déjà en place sur le Bâtiment. */
const withSoulOnBuilding = (type: string, exits: string[] = []) => {
  const state = buildGame(chain(type, exits))
  injectEntity(state, at(1, 0))
  return state
}

describe('Production (P1-P8)', () => {
  it('démarre et termine une Recette de 1 Tick dans la même phase (P5)', () => {
    let state = withSoulOnBuilding('quarry')
    expect(tile(state, at(1, 0)).output).toEqual({})
    state = runTick(state) // production, puis destruction faute de Sortie
    expect(tile(state, at(1, 0)).output).toEqual({ rawBasalt: 2 })
    expect(tile(state, at(1, 0)).productionsDone).toBe(1)
  })

  it('ne démarre pas sans les Ressources IN, et n’en bloque pas l’entité (P2, P7)', () => {
    // Tailleur à réserve vide, Sortie vers un Espace sans Tuile.
    const state = runTick(withSoulOnBuilding('stonecutter', ['E']))
    expect(tile(state, at(1, 0)).output).toEqual({})
    expect(tile(state, at(1, 0)).productionsDone).toBe(0)
    // P7 : elle n'est pas bloquée, elle a tenté de partir (et est morte faute de Tuile).
    expect(state.entities).toHaveLength(0)
    expect(state.spent.player.blocked).toBe(1)
  })

  it('mène une Recette de plusieurs Ticks au bout, par la même entité (P3, P4, D12)', () => {
    // Tailleur → Vide : l'Âme survit à sa production et repart chargée.
    let state = buildGame({
      board: { radius: 2 },
      initialTiles: [
        { q: 1, r: 0, type: 'stonecutter', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    injectEntity(state, at(1, 0))
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
    // Deux Âmes sur la même Carrière : deux productions indépendantes, dans le
    // même Tick.
    const one = withSoulOnBuilding('quarry')
    const two = withSoulOnBuilding('quarry')
    injectEntity(two, at(1, 0))

    expect(tile(runTick(one), at(1, 0)).output.rawBasalt).toBe(2)
    expect(tile(runTick(two), at(1, 0)).output.rawBasalt).toBe(4)
    expect(tile(runTick(two), at(1, 0)).productionsDone).toBe(2)
  })

  it('ne produit pas deux fois sur le même Espace (P1)', () => {
    const state = runTick(withSoulOnBuilding('quarry'))
    const output = tile(state, at(1, 0)).output.rawBasalt
    // L'Âme a été détruite au déplacement : on relance la phase de production seule
    // pour vérifier qu'aucune production fantôme n'a lieu.
    productionPhase(state, 'player')
    expect(tile(state, at(1, 0)).output.rawBasalt).toBe(output)
  })

  it('rembourse les Ressources IN si l’entité est détruite en production (P8)', () => {
    let state = withSoulOnBuilding('stonecutter')
    seedInput(state, at(1, 0), { rawBasalt: 1 })
    state = runTick(state)
    expect(tile(state, at(1, 0)).input).toEqual({})
    // P8 est inatteignable en jeu normal (D7) : on appelle la destruction directement.
    destroyEntity(state, entity(state, 1), 'blocked')
    expect(tile(state, at(1, 0)).input).toEqual({ rawBasalt: 1 })
  })
})
