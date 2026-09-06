/**
 * Désignation des Sorties au clic (`U9`). C'est une affordance d'interface, pas
 * une règle : la contrainte de fond reste `T4` (nombre de Sorties par type).
 */
import { describe, expect, it } from 'vitest'
import { directionBetween, directionIndex, hex } from '../../core/hex/hexCoord'
import { placeTile, runTick, setExits } from '../../core/rules/encounter'
import { buildGame } from '../../core/__tests__/helpers'
import { PLACEMENT_EXITS, nextExitsOnClick, resolveClick } from '../useGame'

describe('Direction entre deux Espaces', () => {
  it('reconnaît les 6 voisins', () => {
    const center = hex(2, -1)
    for (const [name, target] of [
      ['E', hex(3, -1)],
      ['NE', hex(3, -2)],
      ['NW', hex(2, -2)],
      ['W', hex(1, -1)],
      ['SW', hex(1, 0)],
      ['SE', hex(2, 0)],
    ] as const) {
      expect(directionBetween(center, target)).toBe(directionIndex(name))
    }
  })

  it('rend undefined pour un Espace non voisin', () => {
    expect(directionBetween(hex(0, 0), hex(2, 0))).toBeUndefined()
    expect(directionBetween(hex(0, 0), hex(0, 0))).toBeUndefined()
  })
})

describe('Bascule des Sorties au clic (U9)', () => {
  it('désigne une Sortie sur une Tuile qui n’en a pas', () => {
    expect(nextExitsOnClick([], 0, 1)).toEqual([0])
  })

  it('remplace la Sortie unique quand on clique une autre direction', () => {
    // C'est le comportement attendu : sur une Tuile à Sortie unique, ça switche.
    expect(nextExitsOnClick([0], 3, 1)).toEqual([3])
    expect(nextExitsOnClick([3], 1, 1)).toEqual([1])
  })

  it('retire la Sortie quand on re-clique la même direction', () => {
    expect(nextExitsOnClick([2], 2, 1)).toEqual([])
    expect(nextExitsOnClick([0, 2], 0, 3)).toEqual([2])
  })

  it('accumule jusqu’au maximum, puis remplace la plus ancienne', () => {
    expect(nextExitsOnClick([0], 1, 3)).toEqual([0, 1])
    expect(nextExitsOnClick([0, 1], 2, 3)).toEqual([0, 1, 2])
    expect(nextExitsOnClick([0, 1, 2], 3, 3)).toEqual([1, 2, 3])
  })

  it('ne désigne rien sur une Tuile qui n’autorise aucune Sortie (l’Escalier)', () => {
    expect(nextExitsOnClick([], 0, 0)).toEqual([])
  })
})

describe('Pose d’une Tuile (U9)', () => {
  it('pose sans aucune Sortie : la direction est le second clic', () => {
    // Une Sortie par défaut obligerait à corriger l'orientation après coup.
    expect(PLACEMENT_EXITS).toEqual([])
  })

  it('une Tuile posée nue n’a effectivement aucune Sortie', () => {
    const state = placeTile(
      buildGame({
        board: { radius: 2 },
        initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
      }),
      hex(1, 0),
      'quarry',
      PLACEMENT_EXITS,
    )
    expect(state.tiles['1,0']!.exits).toEqual([])
    expect(state.tiles['1,0']!.typeId).toBe('quarry')
  })
})

describe('Interprétation d’un clic sur le Plateau (U9)', () => {
  /** Puits(0,0) déjà posé, le reste du Plateau libre. */
  const game = () =>
    buildGame({
      board: { radius: 2 },
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
    })

  it('pose sur un Espace libre hors mode câblage', () => {
    expect(resolveClick(game(), undefined, hex(1, 0), 'quarry')).toEqual({
      kind: 'place',
      coord: hex(1, 0),
    })
  })

  it('sélectionne une Tuile et arme son câblage si elle est au joueur', () => {
    expect(resolveClick(game(), undefined, hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
      arm: true,
    })
  })

  it('n’arme pas le câblage sur une Tuile du démon', () => {
    const state = buildGame({
      board: { radius: 2 },
      initialTiles: [{ q: 0, r: 0, type: 'chasm', owner: 'demon', exits: [] }],
    })
    expect(resolveClick(state, undefined, hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
      arm: false,
    })
  })

  it('câble quand on clique un voisin de la Tuile en mode câblage', () => {
    const state = game()
    expect(resolveClick(state, hex(0, 0), hex(1, 0), 'quarry')).toEqual({
      kind: 'wire',
      coord: hex(0, 0),
      direction: directionIndex('E'),
    })
    expect(resolveClick(state, hex(0, 0), hex(0, -1), 'quarry')).toEqual({
      kind: 'wire',
      coord: hex(0, 0),
      direction: directionIndex('NW'),
    })
  })

  it('pose quand l’Espace cliqué n’est pas voisin de la Tuile câblée', () => {
    expect(resolveClick(game(), hex(0, 0), hex(2, 0), 'quarry')).toEqual({
      kind: 'place',
      coord: hex(2, 0),
    })
  })

  it('quitte le mode câblage en re-cliquant la Tuile câblée, sans la désélectionner', () => {
    expect(resolveClick(game(), hex(0, 0), hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
      arm: false,
    })
  })

  it('une fois le mode quitté, le clic sur un voisin repose une Tuile', () => {
    // C'est le comportement attendu au retour en phase de pose : sans ça, le
    // premier clic de la Manche suivante réorienterait une Sortie.
    const state = game()
    expect(resolveClick(state, undefined, hex(1, 0), 'quarry').kind).toBe('place')
  })

  it('refuse une seconde pose dans la même Manche, avec la raison (C1)', () => {
    const state = placeTile(game(), hex(1, 0), 'quarry', [])
    const action = resolveClick(state, undefined, hex(2, 0), 'quarry')
    expect(action.kind).toBe('refused')
    expect(action.kind === 'refused' && action.reason).toMatch(/une seule Tuile par Manche/)
  })

  it('ne câble plus pendant le déroulé des Ticks (T5)', () => {
    const running = runTick(game())
    expect(running.phase).toBe('running')
    const action = resolveClick(running, hex(0, 0), hex(1, 0), 'quarry')
    expect(action.kind).not.toBe('wire')
    expect(action.kind).toBe('refused')
  })

  it('n’arme pas le câblage hors phase de pose (T5)', () => {
    const running = runTick(game())
    expect(resolveClick(running, undefined, hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
      arm: false,
    })
  })

  it('enchaîne pose puis orientation en deux clics', () => {
    let state = game()
    // 1er clic : pose de la Carrière en (1,0), sans Sortie. Le câblage s'arme.
    expect(resolveClick(state, undefined, hex(1, 0), 'quarry').kind).toBe('place')
    state = placeTile(state, hex(1, 0), 'quarry', [])
    expect(state.tiles['1,0']!.exits).toEqual([]) // aucune Sortie par défaut

    // 2e clic : sur le voisin (2,0), qui devient la Sortie — puis le mode se referme.
    const second = resolveClick(state, hex(1, 0), hex(2, 0), 'quarry')
    expect(second).toEqual({ kind: 'wire', coord: hex(1, 0), direction: directionIndex('E') })
    state = setExits(state, hex(1, 0), [directionIndex('E')])
    expect(state.tiles['1,0']!.exits).toEqual([directionIndex('E')])

    // Ré-armer par un clic sur la Tuile, puis basculer vers une autre direction :
    // la Carrière n'autorise qu'une Sortie.
    expect(resolveClick(state, undefined, hex(1, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(1, 0),
      arm: true,
    })
    const third = resolveClick(state, hex(1, 0), hex(1, -1), 'quarry')
    expect(third).toEqual({ kind: 'wire', coord: hex(1, 0), direction: directionIndex('NW') })
    expect(nextExitsOnClick(state.tiles['1,0']!.exits, directionIndex('NW'), 1)).toEqual([
      directionIndex('NW'),
    ])
  })
})
