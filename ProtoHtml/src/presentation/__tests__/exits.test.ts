/**
 * Désignation des Sorties au clic (`U9`). C'est une affordance d'interface, pas
 * une règle : la contrainte de fond reste `T4` (nombre de Sorties par type).
 */
import { describe, expect, it } from 'vitest'
import { directionBetween, directionIndex, hex } from '../../core/hex/hexCoord'
import { exitChangeRefusal, placeTile, runTick, setExits } from '../../core/rules/encounter'
import { buildConfig, buildGame } from '../../core/__tests__/helpers'
import {
  PLACEMENT_EXITS,
  canEditExits,
  editRefusalAt,
  nextExitsOnClick,
  resolveClick,
} from '../useGame'

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

  it('conserve une Sortie déjà désignée au lieu de la retirer (U13)', () => {
    // Le clic vaut confirmation : la Sortie reste, et l'appelant ferme le mode.
    expect(nextExitsOnClick([2], 2, 1)).toEqual([2])
    expect(nextExitsOnClick([0, 2], 0, 3)).toEqual([0, 2])
    expect(nextExitsOnClick([0, 1, 2], 1, 3)).toEqual([0, 1, 2])
  })

  it('accumule jusqu’au maximum, puis remplace la plus ancienne', () => {
    expect(nextExitsOnClick([0], 1, 3)).toEqual([0, 1])
    expect(nextExitsOnClick([0, 1], 2, 3)).toEqual([0, 1, 2])
    expect(nextExitsOnClick([0, 1, 2], 3, 3)).toEqual([1, 2, 3])
  })

  it('ne désigne rien sur une Tuile qui n’autorise aucune Sortie (l’Escalier)', () => {
    expect(nextExitsOnClick([], 0, 0)).toEqual([])
  })

  it('ne réduit jamais le nombre de Sorties d’une Tuile (U13)', () => {
    // Conséquence assumée : une Sortie se remplace, elle ne se supprime pas.
    for (const [current, direction, max] of [
      [[0], 0, 1],
      [[0], 3, 1],
      [[0, 1], 1, 3],
      [[0, 1], 4, 3],
      [[0, 1, 2], 5, 3],
    ] as const) {
      expect(nextExitsOnClick(current, direction, max).length).toBeGreaterThanOrEqual(
        Math.min(current.length, max),
      )
    }
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

  it('sélectionne une Tuile sans ouvrir l’édition (U12)', () => {
    // La sélection sert à inspecter ; l'édition est un geste explicite.
    expect(resolveClick(game(), undefined, hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
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
    // Chaîne Puits(0,0) → Carrière(1,0), édition sur la Carrière. (0,-1) touche
    // le Puits mais pas la Carrière : c'est une pose, pas un câblage (B12 le
    // rend constructible).
    const state = buildGame({
      board: { radius: 2 },
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'quarry', owner: 'player', exits: [] },
      ],
    })
    expect(resolveClick(state, hex(1, 0), hex(0, -1), 'quarry')).toEqual({
      kind: 'place',
      coord: hex(0, -1),
    })
  })

  it('traite un clic sur la Tuile éditée comme une simple sélection', () => {
    expect(resolveClick(game(), hex(0, 0), hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
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
    // Cadence constante à 5 Ticks : sinon la première Manche ne dure qu'un Tick
    // (C1b) et on repasse aussitôt en phase de pose.
    const running = runTick(
      buildGame({
        board: { radius: 2 },
        ticksPerRound: 5,
        initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
      }),
    )
    expect(running.phase).toBe('running')
    const action = resolveClick(running, hex(0, 0), hex(1, 0), 'quarry')
    expect(action.kind).not.toBe('wire')
    expect(action.kind).toBe('refused')
  })

  it('sélectionne aussi pendant le déroulé des Ticks, pour observer', () => {
    const running = runTick(game())
    void running
    expect(resolveClick(running, undefined, hex(0, 0), 'quarry')).toEqual({
      kind: 'select',
      coord: hex(0, 0),
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

    // Ré-ouvrir l'édition passe par le bouton, pas par un clic sur la Tuile.
    expect(canEditExits(state, hex(1, 0))).toBe(true)
    const third = resolveClick(state, hex(1, 0), hex(1, -1), 'quarry')
    expect(third).toEqual({ kind: 'wire', coord: hex(1, 0), direction: directionIndex('NW') })
    expect(nextExitsOnClick(state.tiles['1,0']!.exits, directionIndex('NW'), 1)).toEqual([
      directionIndex('NW'),
    ])
  })
})

describe('Ouverture du mode d’édition (U12, T8)', () => {
  const state = () =>
    buildGame({
      board: { radius: 2 },
      ticksPerRound: 5, // cadence constante : la phase « running » doit durer
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
        { q: -1, r: 0, type: 'chasm', owner: 'demon', exits: [] },
        { q: 0, r: -1, type: 'quarry', owner: 'player', exits: [] },
      ],
    })

  it('s’ouvre sur une Tuile ordinaire du joueur, en phase de pose', () => {
    expect(canEditExits(state(), hex(0, -1))).toBe(true)
  })

  it('reste fermé sur une Tuile dont les Sorties sont figées par la config (T8)', () => {
    // Le Puits appartient au joueur, mais son orientation fait partie du terrain.
    expect(canEditExits(state(), hex(0, 0))).toBe(false)
    expect(editRefusalAt(state(), hex(0, 0))).toMatch(/fixées par la configuration \(T8\)/)
  })

  it('reste fermé sur une Tuile adverse ou neutre', () => {
    expect(canEditExits(state(), hex(-1, 0))).toBe(false)
    expect(canEditExits(state(), hex(1, 0))).toBe(false) // l'Escalier n'admet aucune Sortie (T4)
  })

  it('reste fermé sur un Espace vide ou sans sélection', () => {
    expect(canEditExits(state(), hex(0, 1))).toBe(false)
    expect(canEditExits(state(), undefined)).toBe(false)
  })

  it('reste fermé pendant le déroulé des Ticks (T5)', () => {
    expect(canEditExits(runTick(state()), hex(0, -1))).toBe(false)
  })
})

describe('Sorties figées par la configuration (T8)', () => {
  const withWell = () =>
    buildGame({
      board: { radius: 2 },
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
    })

  it('le Core refuse la reconfiguration, pas seulement l’interface', () => {
    const state = withWell()
    expect(exitChangeRefusal(state, hex(0, 0), [directionIndex('NW')])).toMatch(/T8/)
    // Et la commande est sans effet : l'état ne bouge pas.
    expect(setExits(state, hex(0, 0), [directionIndex('NW')])).toBe(state)
    expect(state.tiles['0,0']!.exits).toEqual([directionIndex('E')])
  })

  it('refuse au chargement un type figé mis au catalogue', () => {
    // Une Tuile posable qu'on ne pourrait jamais orienter serait inutilisable.
    expect(() =>
      buildConfig({
        catalog: ['soulWell'],
        initialTiles: [],
      }),
    ).toThrow(/Sorties sont figées/)
  })
})
