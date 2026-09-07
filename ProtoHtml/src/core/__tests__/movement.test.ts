import { describe, expect, it } from 'vitest'
import { key } from '../hex/hexCoord'
import { runTick } from '../rules/encounter'
import { at, buildGame, entity, injectEntity, seedOutput, tile } from './helpers'

describe('Déplacement (D4-D18)', () => {
  it('franchit une Sortie qui fait face à une Entrée (D4, D5)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: ['NE'] },
        { q: 2, r: -1, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state)
    expect(key(entity(state, 1).space)).toBe('1,0')
    state = runTick(state)
    expect(key(entity(state, 1).space)).toBe('2,-1') // un Espace par Tick (D4)
  })

  it('détruit l’entité quand une Sortie fait face à une Sortie (D5, D6)', () => {
    const state = runTick(
      buildGame({
        board: { radius: 2 },
        soulBudget: 1,
        initialTiles: [
          { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
          // Sa Sortie W regarde la Sortie E du Puits : aucun passage.
          { q: 1, r: 0, type: 'empty', owner: 'player', exits: ['W'] },
        ],
      }),
    )
    expect(state.entities).toHaveLength(0)
    expect(state.spent.player.blocked).toBe(1)
  })

  it('détruit l’entité quand il n’y a pas de Tuile en face (D5, D6)', () => {
    const state = runTick(
      buildGame({
        board: { radius: 2 },
        soulBudget: 1,
        initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
      }),
    )
    expect(state.entities).toHaveLength(0)
    expect(state.spent.player.blocked).toBe(1)
  })

  it('répartit les entités en tourniquet entre plusieurs Sorties (D8)', () => {
    // Aiguillage à 2 Sorties, chacune vers un Vide sans issue : on compte les arrivées.
    let state = buildGame({
      board: { radius: 3 },
      maxTicks: 6,
      initialTiles: [
        { q: -1, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 0, r: 0, type: 'splitter', owner: 'player', exits: ['NE', 'SE'] },
        { q: 1, r: -1, type: 'empty', owner: 'player', exits: [] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    const arrivals: string[] = []
    for (let i = 0; i < 6; i++) {
      state = runTick(state)
      for (const e of state.entities) {
        if (key(e.space) === '1,-1' || key(e.space) === '0,1') arrivals.push(key(e.space))
      }
    }
    // Chaque Âme prend la Sortie suivante : NE, SE, NE, SE…
    expect(arrivals.slice(0, 4)).toEqual(['1,-1', '0,1', '1,-1', '0,1'])
    expect(tile(state, at(0, 0)).roundRobin).toBeGreaterThanOrEqual(4)
  })

  it('ignore une Sortie qui ne mène nulle part (D8b)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 2,
      initialTiles: [
        { q: -1, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        // NW ne mène nulle part, SE mène au Vide : seule SE entre dans le tourniquet.
        { q: 0, r: 0, type: 'splitter', owner: 'player', exits: ['NW', 'SE'] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state) // Âme #1 → Aiguillage
    state = runTick(state) // elle emprunte SE, la seule praticable
    expect(key(entity(state, 1).space)).toBe('0,1')
    expect(state.spent.player.blocked).toBe(0)
    expect(tile(state, at(0, 0)).roundRobin).toBe(1)
  })

  it('ne bloque plus une voie quand une Sortie du tourniquet est morte (D8b)', () => {
    // Ancien comportement : le compteur se figeait sur la Sortie morte et toutes
    // les entités suivantes s'y écrasaient. Désormais elle n'existe pas pour le
    // tourniquet, et tout le flux passe par la Sortie vivante.
    let state = buildGame({
      board: { radius: 3 },
      maxTicks: 10,
      initialTiles: [
        { q: -1, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 0, r: 0, type: 'splitter', owner: 'player', exits: ['NW', 'SE'] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    while (state.outcome === 'ongoing') state = runTick(state)

    // Toutes les Âmes arrivées à l'Aiguillage en sont reparties par la Sortie
    // vivante : aucune n'a été sacrifiée sur la Sortie morte.
    // Une Âme apparue au Tick k atteint l'Aiguillage dans ce même Tick et en
    // repart au Tick k+1 : sur 10 Ticks, 9 départs effectifs.
    expect(tile(state, at(0, 0)).roundRobin).toBe(9)
    expect(state.spent.player.backtrack).toBe(0)
  })

  it('alterne entre les seules Sorties praticables (D8, D8b)', () => {
    let state = buildGame({
      board: { radius: 3 },
      soulBudget: 4,
      initialTiles: [
        { q: -1, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        // NW morte, NE et SE vivantes : le tourniquet ne voit que ces deux-là.
        { q: 0, r: 0, type: 'splitter', owner: 'player', exits: ['NW', 'NE', 'SE'] },
        { q: 1, r: -1, type: 'empty', owner: 'player', exits: [] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    const arrivals: string[] = []
    for (let i = 0; i < 6; i++) {
      state = runTick(state)
      for (const e of state.entities) {
        if (key(e.space) === '1,-1' || key(e.space) === '0,1') arrivals.push(key(e.space))
      }
    }
    expect(arrivals.slice(0, 4)).toEqual(['1,-1', '0,1', '1,-1', '0,1'])
  })

  it('dépose à l’arrivée et ramasse au départ, jamais les deux dans le même Tick (D10, D12, D13)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stonecutter', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    // Le Tailleur a déjà du dégrossi en sortie : l'Âme ne doit pas l'emporter
    // au Tick où elle arrive, seulement à celui où elle repart.
    seedOutput(state, at(1, 0), { cutBasalt: 1 })
    state = runTick(state)
    expect(entity(state, 1).carrying).toBeUndefined() // D13 : rien au Tick d'arrivée
    state = runTick(state)
    expect(entity(state, 1).carrying).toBe('cutBasalt') // ramassé au départ (D12)
    expect(tile(state, at(1, 0)).output).toEqual({})
  })

  it('conserve une Ressource qui n’est pas un IN du Bâtiment (D11)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'quarry', owner: 'player', exits: ['E'] },
        // La Carrière n'a aucun IN : le pavé traverse sans être déposé.
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    seedOutput(state, at(0, 0), { basaltBlock: 1 })
    state = runTick(state) // l'Âme ramasse le pavé au Puits et arrive à la Carrière
    expect(entity(state, 1).carrying).toBe('basaltBlock')
    expect(tile(state, at(1, 0)).input).toEqual({})
    state = runTick(state)
    expect(entity(state, 1).carrying).toBe('basaltBlock') // toujours portée
  })

  it('détruit l’entité qui reviendrait sur un Espace déjà traversé (D16, D17)', () => {
    // Boucle de trois Tuiles, avec **une** Âme injectée en (0,0) : les
    // apparitions étant illimitées, un Puits en enverrait une par Tick.
    let state = buildGame({
      board: { radius: 2 },
      initialTiles: [
        { q: 0, r: 0, type: 'empty', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'empty', owner: 'player', exits: ['SW'] },
        { q: 0, r: 1, type: 'empty', owner: 'player', exits: ['NW'] },
      ],
    })
    const soul = injectEntity(state, at(0, 0))
    state = runTick(state)
    expect(key(entity(state, soul.id).space)).toBe('1,0')
    state = runTick(state)
    expect(key(entity(state, soul.id).space)).toBe('0,1')
    expect(entity(state, soul.id).visited).toEqual(['0,0', '1,0', '0,1'])

    state = runTick(state) // elle repasserait par (0,0) : détruite avant d'entrer
    expect(state.entities).toHaveLength(0)
    expect(state.spent.player.backtrack).toBe(1)
    expect(state.spent.player.blocked).toBe(0)
  })

  it('ne compte pas un séjour de plusieurs Ticks comme un retour (D17)', () => {
    let state = buildGame({
      board: { radius: 2 },
      soulBudget: 1,
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stonecutter', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'empty', owner: 'player', exits: [] },
      ],
    })
    state = runTick(state)
    state.tiles[key(at(1, 0))]!.input.rawBasalt = 1
    state = runTick(state) // production 2 Ticks : elle reste sur place
    state = runTick(state)
    expect(state.spent.player.backtrack).toBe(0)
    expect(key(entity(state, 1).space)).toBe('2,0')
  })
})
