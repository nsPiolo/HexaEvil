/**
 * Le tour du joueur : **une** action par Manche parmi poser, piocher, déplacer,
 * passer (`A1`), et la réorganisation des Sorties qui reste gratuite (`A6`).
 */
import { describe, expect, it } from 'vitest'
import { directionIndex, hex } from '../hex/hexCoord'
import {
  availableActions,
  drawRefusal,
  drawTile,
  moveRefusal,
  moveTile,
  passTurn,
  placeTile,
  placementRefusal,
  runRound,
  runTick,
  setExits,
} from '../rules/encounter'
import { buildConfig, buildGame } from './helpers'

const E = directionIndex('E')

/**
 * Puits(0,0) seul, sac de 5 Tuiles, 2 distribuées + 1 piochée automatiquement
 * (`A7`). Germe fixée : le tirage est aléatoire mais rejouable (`A8`), donc les
 * tests portent sur les **quantités**, pas sur un ordre.
 */
const turn = (overrides: Record<string, unknown> = {}) =>
  buildGame({
    board: { radius: 3 },
    seed: 7,
    handMax: 3,
    handStart: 2,
    deck: ['quarry', 'empty', 'stonecutter', 'splitter', 'empty'],
    initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
    ...overrides,
  })

/** Sac de 5 Tuiles identiques : les assertions d'ordre deviennent inutiles. */
const uniform = (overrides: Record<string, unknown> = {}) =>
  turn({ deck: ['empty', 'empty', 'empty', 'empty', 'empty'], ...overrides })

/** Le contenu d'une main, trié, pour comparer sans dépendre du tirage. */
const sorted = (tiles: readonly string[]): string[] => [...tiles].sort()

describe('Main et pioche (A2, A3)', () => {
  it('distribue la main de départ et laisse le reste dans le sac', () => {
    // Main de départ égale au plafond : la pioche automatique est sautée (`A7`),
    // ce qui isole ce que `handStart` distribue.
    const state = turn({ handMax: 2, handStart: 2 })
    expect(state.hand).toHaveLength(2)
    expect(state.deck).toHaveLength(3)
    // Rien n'est perdu ni dupliqué : main + sac = le sac de configuration.
    expect(sorted([...state.hand, ...state.deck])).toEqual(
      sorted(['quarry', 'empty', 'stonecutter', 'splitter', 'empty']),
    )
  })

  it('pioche une Tuile du sac', () => {
    const before = turn({ handMax: 5 })
    const state = drawTile(before)
    expect(state.hand).toHaveLength(before.hand.length + 1)
    expect(state.deck).toHaveLength(before.deck.length - 1)
    expect(sorted([...state.hand, ...state.deck])).toEqual(sorted([...before.hand, ...before.deck]))
    expect(state.action).toBe('draw')
  })

  it('refuse de piocher quand la main est pleine (A3)', () => {
    const full = turn() // 2 distribuées + 1 automatique = 3 = handMax
    expect(full.hand).toHaveLength(3)
    expect(drawRefusal(full)).toMatch(/main pleine : 3 Tuiles/)
    expect(drawTile(full)).toBe(full)
  })

  it('refuse de piocher quand la pioche est vide (A2)', () => {
    let state = turn({ handMax: 9, handStart: 1, deck: ['quarry', 'empty'] })
    state = runRound(drawTile(state)) // il ne reste rien
    expect(state.deck).toEqual([])
    expect(drawRefusal(state)).toMatch(/pioche est vide/)
  })

  it('refuse au chargement une main de départ plus grande que le plafond ou la pioche', () => {
    expect(() => buildConfig({ handMax: 2, handStart: 3, deck: ['quarry'] })).toThrow(/dépasse handMax/)
    expect(() => buildConfig({ handMax: 5, handStart: 3, deck: ['quarry'] })).toThrow(
      /dépasse la taille de la pioche/,
    )
  })
})

describe('Pioche automatique au tour du joueur (A7)', () => {
  it('pioche une carte à l’ouverture de la Rencontre, en plus de la main de départ', () => {
    const state = turn()
    expect(state.hand).toHaveLength(3) // 2 distribuées + 1 automatique
    expect(state.deck).toHaveLength(2)
  })

  it('pioche à l’ouverture de chaque Manche', () => {
    // Poser libère une place : la Manche suivante repioche.
    const placed = placeTile(uniform(), hex(1, 0), 'empty', [])
    expect(placed.hand).toHaveLength(2)
    const next = runRound(placed)
    expect(next.hand).toHaveLength(3)
    expect(next.deck).toHaveLength(1)
    expect(next.round).toBe(2)
  })

  it('ne dépense pas l’action de la Manche (A1)', () => {
    const next = runRound(passTurn(turn({ handMax: 9 })))
    expect(next.action).toBeUndefined()
    expect(availableActions(next)).toContain('place')
  })

  it('est sautée quand la main est pleine (A3)', () => {
    // handMax = 3 et main déjà à 3 : le tour suivant ne pioche pas.
    const full = turn()
    expect(full.hand).toHaveLength(3)
    const next = runRound(passTurn(full))
    expect(next.hand).toHaveLength(3)
    expect(next.deck).toHaveLength(2)
  })

  it('est sautée quand la pioche est vide (A2)', () => {
    let state = turn({ handMax: 9, handStart: 1, deck: ['quarry', 'empty'] })
    expect(state.hand).toHaveLength(2) // 1 de départ + 1 automatique
    expect(state.deck).toEqual([])
    state = runRound(passTurn(state))
    expect(state.hand).toHaveLength(2)
  })
})

describe('Pose depuis la main (A2)', () => {
  it('retire la Tuile posée de la main', () => {
    const start = uniform()
    expect(start.hand).toEqual(['empty', 'empty', 'empty'])
    const state = placeTile(start, hex(1, 0), 'empty', [])
    expect(state.hand).toEqual(['empty', 'empty'])
    expect(state.deck).toHaveLength(2)
    expect(state.tiles['1,0']!.typeId).toBe('empty')
    expect(state.action).toBe('place')
  })

  it('refuse de poser une Tuile qu’on n’a pas en main', () => {
    expect(placementRefusal(turn(), hex(1, 0), 'sculptor', [])).toMatch(/n’est pas dans ta main/)
  })

  it('ne retire qu’un exemplaire quand la main en contient plusieurs', () => {
    // Sac de 2 « empty » + 1 « quarry » : la main les contient toutes les trois.
    const start = turn({ handMax: 3, handStart: 2, deck: ['empty', 'empty', 'quarry'] })
    expect(sorted(start.hand)).toEqual(['empty', 'empty', 'quarry'])
    const state = placeTile(start, hex(1, 0), 'empty', [])
    expect(sorted(state.hand)).toEqual(['empty', 'quarry'])
  })
})

describe('Une seule action par Manche (A1)', () => {
  it('interdit une seconde action, quelle qu’elle soit', () => {
    const played = drawTile(turn({ handMax: 5 }))
    expect(placementRefusal(played, hex(1, 0), 'quarry', [])).toMatch(/déjà dépensée/)
    expect(drawRefusal(played)).toMatch(/déjà dépensée/)
    expect(moveRefusal(played, hex(0, 0), hex(1, 0))).toMatch(/déjà dépensée/)
    expect(passTurn(played)).toBe(played)
  })

  it('rend l’action à la Manche suivante', () => {
    const next = runRound(drawTile(turn()))
    expect(next.action).toBeUndefined()
    expect(availableActions(next)).toContain('place')
  })

  it('compte « passer » comme l’action de la Manche (A5)', () => {
    const passed = passTurn(turn())
    expect(passed.action).toBe('pass')
    expect(availableActions(passed)).toEqual([])
  })

  it('laisse réorganiser les Sorties sans dépenser l’action (A6)', () => {
    // Pose, puis deux réorientations dans la même Manche : toujours permis.
    let state = placeTile(turn(), hex(1, 0), 'quarry', [])
    state = setExits(state, hex(1, 0), [E])
    expect(state.tiles['1,0']!.exits).toEqual([E])
    state = setExits(state, hex(1, 0), [directionIndex('NE')])
    expect(state.tiles['1,0']!.exits).toEqual([directionIndex('NE')])
    expect(state.action).toBe('place') // l'action reste celle de la pose
  })
})

describe('Déplacer une Tuile posée (A4)', () => {
  const withChain = () => placeTile(turn(), hex(1, 0), 'quarry', [E])

  it('déplace la Tuile avec ses réserves et remet le tourniquet à zéro', () => {
    let state = runRound(withChain())
    state.tiles['1,0']!.output.rawBasalt = 4
    state.tiles['1,0']!.roundRobin = 3
    const moved = moveTile(state, hex(1, 0), hex(0, -1))
    expect(moved.tiles['1,0']).toBeUndefined()
    expect(moved.tiles['0,-1']!.typeId).toBe('quarry')
    expect(moved.tiles['0,-1']!.output).toEqual({ rawBasalt: 4 })
    expect(moved.tiles['0,-1']!.exits).toEqual([E]) // ses Sorties la suivent
    expect(moved.tiles['0,-1']!.roundRobin).toBe(0)
    expect(moved.action).toBe('move')
  })

  it('détruit les entités qui s’y trouvaient', () => {
    const state = runRound(withChain()) // une Âme a rejoint la Carrière
    const onTile = state.entities.filter((e) => e.space.q === 1 && e.space.r === 0)
    expect(onTile.length).toBeGreaterThan(0)
    const moved = moveTile(state, hex(1, 0), hex(0, -1))
    expect(moved.entities.filter((e) => e.space.q === 1 && e.space.r === 0)).toHaveLength(0)
    expect(moved.spent.player.blocked).toBe(state.spent.player.blocked + onTile.length)
  })

  it('refuse de déplacer le terrain : Puits, Escalier, Tuiles du démon', () => {
    const state = buildGame({
      board: { radius: 3 },
      handStart: 0,
      deck: ['quarry'],
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
        { q: 2, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      ],
    })
    expect(moveRefusal(state, hex(0, 0), hex(0, -1))).toMatch(/terrain \(T8\)/)
    expect(moveRefusal(state, hex(1, 0), hex(0, -1))).toMatch(/Tuiles du joueur/)
    expect(moveRefusal(state, hex(2, 0), hex(2, -1))).toMatch(/Tuiles du joueur/)
  })

  it('évalue la destination sur un Plateau privé de la Tuile déplacée (B12)', () => {
    // La Carrière en (1,0) est le seul relais vers (2,0). La reprendre en main
    // coupe la chaîne : (2,0) n'est donc plus une destination valable.
    const state = runRound(withChain())
    expect(moveRefusal(state, hex(1, 0), hex(2, 0))).toMatch(/aucune chaîne de Tuiles \(B12\)/)
    // En revanche un voisin du Puits reste atteignable.
    expect(moveRefusal(state, hex(1, 0), hex(0, -1))).toBeUndefined()
  })

  it('refuse une destination occupée, hors Plateau ou non constructible', () => {
    const state = runRound(withChain())
    expect(moveRefusal(state, hex(1, 0), hex(0, 0))).toMatch(/déjà occupé/)
    expect(moveRefusal(state, hex(1, 0), hex(9, 0))).toMatch(/hors du Plateau/)
  })
})

describe('Actions disponibles (A1)', () => {
  it('liste les quatre actions au début d’une Manche', () => {
    // handMax large : la pioche automatique (`A7`) laisse de la place pour
    // piocher encore.
    expect(availableActions(turn({ handMax: 5 })).sort()).toEqual(['draw', 'move', 'pass', 'place'])
  })

  it('retire la pose quand la main est vide, et la pioche quand elle est épuisée', () => {
    const state = buildGame({
      board: { radius: 3 },
      handMax: 3,
      handStart: 0,
      deck: [],
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
    })
    expect(availableActions(state).sort()).toEqual(['move', 'pass'])
  })

  it('n’en laisse aucune pendant le déroulé des Ticks (C1)', () => {
    // Cadence constante à 5 Ticks : un seul Tick laisse la Manche en cours.
    const midRound = runTick(
      buildGame({
        ticksPerRound: 5,
        board: { radius: 3 },
        handMax: 3,
        handStart: 1,
        deck: ['quarry', 'empty'],
        initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
      }),
    )
    expect(midRound.phase).toBe('running')
    expect(availableActions(midRound)).toEqual([])
    expect(drawRefusal(midRound)).toMatch(/pendant la phase de pose/)
  })
})

describe('Tirage aléatoire mais rejouable (A8)', () => {
  const bag = ['quarry', 'empty', 'stonecutter', 'splitter', 'workshop', 'sculptor']

  const handOf = (seed: number | null) =>
    buildGame({
      board: { radius: 3 },
      seed,
      handMax: 6,
      handStart: 3,
      deck: bag,
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
    })

  it('donne exactement la même partie à germe égale', () => {
    expect(handOf(42).hand).toEqual(handOf(42).hand)
    expect(handOf(42).seed).toBe(42)
  })

  it('donne des mains différentes à germes différentes', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => handOf(s).hand.join(','))
    expect(new Set(seeds).size).toBeGreaterThan(1)
  })

  it('ne tire pas dans l’ordre du sac', () => {
    // Au moins une germe parmi ces huit doit produire un autre ordre que le sac.
    const inOrder = bag.slice(0, 4).join(',')
    const hands = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => handOf(s).hand.join(','))
    expect(hands.some((h) => h !== inOrder)).toBe(true)
  })

  it('tire une germe fraîche quand la configuration n’en fixe pas', () => {
    const a = handOf(null)
    const b = handOf(null)
    expect(a.seed).not.toBe(b.seed) // germe consignée dans l'état, pour rejouer
  })

  it('ne perd ni ne duplique aucune Tuile du sac', () => {
    let state = handOf(11)
    while (state.deck.length > 0) state = runRound(passTurn(state))
    expect(sorted(state.hand)).toEqual(sorted(bag))
  })
})
