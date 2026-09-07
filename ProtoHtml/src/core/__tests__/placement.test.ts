/**
 * Où et quand le joueur peut poser : relief non constructible (`B11`),
 * croissance depuis la source (`B12`), et cadence des Manches (`C1b`).
 */
import { describe, expect, it } from 'vitest'
import { hex, key } from '../hex/hexCoord'
import { parseConfig } from '../config/load'
import {
  buildableSpaces,
  connectedToSource,
  createGame,
  isBlocked,
  placeTile,
  placementRefusal,
  runRound,
  runTick,
  ticksForRound,
} from '../rules/encounter'
import { buildConfig, buildGame, rawGameplay, withHand } from './helpers'

/** Puits(0,0) seul, un relief en (1,0). */
const terrain = (overrides: Record<string, unknown> = {}) =>
  buildGame({
    ...withHand(['quarry', 'quarry']),
    board: { radius: 3, blocked: [{ q: 1, r: 0 }] },
    initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] }],
    ...overrides,
  })

describe('Espaces non constructibles (B11)', () => {
  it('refuse la pose sur un Espace de relief, avec la raison', () => {
    const state = terrain()
    expect(isBlocked(state, hex(1, 0))).toBe(true)
    expect(placementRefusal(state, hex(1, 0), 'quarry', [])).toMatch(/n’est pas constructible \(B11\)/)
    expect(placeTile(state, hex(1, 0), 'quarry', [])).toBe(state)
  })

  it('les exclut des Espaces posables', () => {
    const buildable = buildableSpaces(terrain()).map(key)
    expect(buildable).not.toContain('1,0')
    expect(buildable).toContain('0,-1') // un autre voisin du Puits, lui, est posable
  })

  it('reste infranchissable : rien ne s’y pose, donc rien ne le traverse (D5)', () => {
    // Le Puits pointe vers le relief : les Âmes meurent en sortant.
    const state = runTick(terrain())
    expect(state.spent.player.blocked).toBe(1)
  })

  it('refuse au chargement un relief hors Plateau ou sous une Tuile', () => {
    expect(() => buildConfig({ board: { radius: 2, blocked: [{ q: 9, r: 0 }] } })).toThrow(
      /hors du Plateau/,
    )
    expect(() =>
      buildConfig({
        board: { radius: 2, blocked: [{ q: 0, r: 0 }] },
        initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
      }),
    ).toThrow(/occupe un Espace non constructible/)
  })

  it('accepte un Plateau sans relief', () => {
    const config = buildConfig({
      board: { radius: 2 },
      initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
    })
    expect(config.board.blocked).toEqual([])
  })
})

describe('Croissance depuis le Puits (B12)', () => {
  const open = () =>
    buildGame({
      ...withHand(['quarry', 'quarry']),
      board: { radius: 3 },
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 3, r: 0, type: 'chasm', owner: 'demon', exits: ['W'] },
      ],
    })

  it('n’autorise que les voisins de la chaîne au départ', () => {
    const buildable = buildableSpaces(open()).map(key)
    expect(buildable).toHaveLength(6) // les 6 voisins du Puits
    expect(buildable).toContain('1,0')
    expect(buildable).not.toContain('2,0') // deux Espaces plus loin
  })

  it('étend la zone posable à mesure que la chaîne pousse', () => {
    const state = placeTile(open(), hex(1, 0), 'quarry', [])
    const buildable = buildableSpaces(state).map(key)
    expect(buildable).toContain('2,0')
    expect(buildable).not.toContain('1,0') // désormais occupé
    expect(connectedToSource(state).has('1,0')).toBe(true)
  })

  it('refuse une pose isolée, avec la raison', () => {
    expect(placementRefusal(open(), hex(2, 0), 'quarry', [])).toMatch(/aucune chaîne de Tuiles \(B12\)/)
  })

  it('ne laisse pas le réseau du démon servir de relais', () => {
    // Le Gouffre est en (3,0) : ses voisins ne deviennent pas posables pour autant.
    expect(buildableSpaces(open()).map(key)).not.toContain('3,-1')
    expect(connectedToSource(open()).has('3,0')).toBe(false)
  })

  it('la chaîne suit l’adjacence, pas les Sorties : on peut préparer avant de brancher', () => {
    // La Carrière est posée sans aucune Sortie, elle prolonge quand même la chaîne.
    const state = placeTile(open(), hex(1, 0), 'quarry', [])
    expect(state.tiles['1,0']!.exits).toEqual([])
    expect(buildableSpaces(state).map(key)).toContain('2,0')
  })
})

describe('Cadence des Manches (C1b)', () => {
  const ramp = { start: 1, max: 5, step: 1, delay: 2 }

  it('gagne un palier toutes les `delay` Manches, jusqu’au plafond', () => {
    const config = buildConfig({ ticksPerRound: ramp })
    const cadence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((r) => ticksForRound(config, r))
    expect(cadence).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5])
  })

  it('monte d’un cran par Manche quand delay vaut 1', () => {
    const config = buildConfig({ ticksPerRound: { start: 1, max: 3, step: 1, delay: 1 } })
    expect([1, 2, 3, 4].map((r) => ticksForRound(config, r))).toEqual([1, 2, 3, 3])
  })

  it('accepte encore une cadence constante', () => {
    const config = buildConfig({ ticksPerRound: 3 })
    expect([1, 2, 9].map((r) => ticksForRound(config, r))).toEqual([3, 3, 3])
  })

  it('refuse un plafond inférieur au départ, ou un delay nul', () => {
    expect(() => buildConfig({ ticksPerRound: { start: 4, max: 2, step: 1, delay: 1 } })).toThrow(
      /inférieur à start/,
    )
    expect(() => buildConfig({ ticksPerRound: { start: 1, max: 5, step: 1, delay: 0 } })).toThrow(
      /delay doit être un entier >= 1/,
    )
  })

  it('fait vraiment durer les Manches ce que dit la cadence', () => {
    let state = createGame(
      parseConfig({
        ...rawGameplay(),
        ticksPerRound: ramp,
        board: { radius: 3 },
        initialTiles: [{ q: 0, r: 0, type: 'soulWell', owner: 'player', exits: [] }],
      }),
    )
    for (const [round, elapsed] of [
      [2, 1], // Manche 1 : 1 Tick
      [3, 2], // Manche 2 : 1 Tick
      [4, 4], // Manche 3 : 2 Ticks
      [5, 6], // Manche 4 : 2 Ticks
      [6, 9], // Manche 5 : 3 Ticks
    ] as const) {
      state = runRound(state)
      expect(state.round).toBe(round)
      expect(state.tick).toBe(elapsed)
    }
  })
})
