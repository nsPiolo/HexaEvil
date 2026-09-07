import { describe, expect, it } from 'vitest'
import { hexKey } from '../hex/hexCoord'
import { neighbors } from '../hex/hexCoord'
import { viewBoard } from '../rules/derived'
import { freeSpaceKeys, handOf, legalMoves, passReason, playMove, playPass, setupGame } from '../rules/game'
import type { GameState } from '../rules/types'
import { defaultConfig, traceConfig } from './helpers'

describe('montage de la partie', () => {
  const config = defaultConfig()

  it('B1/B11 — rayon 2 : 19 Espaces, 2 bloqués, 17 libres', () => {
    const state = setupGame(config)
    expect(config.radius).toBe(2)
    expect(state.spaces).toHaveLength(19)
    expect(state.spaces.filter((s) => s.blocked)).toHaveLength(2)
    expect(state.spaces.filter((s) => !s.blocked)).toHaveLength(17)
  })

  it('C3 — un Espace bloqué n’a pas de Couleur, un Espace libre en a toujours une', () => {
    const state = setupGame(config)
    for (const s of state.spaces) {
      if (s.blocked) expect(s.color).toBeNull()
      else expect(s.color).not.toBeNull()
    }
  })

  it('W3 — 9 places posables au départ (17 libres − 8 Tuiles pré-posées)', () => {
    const state = setupGame(config)
    expect(state.tiles).toHaveLength(8)
    expect(freeSpaceKeys(state)).toHaveLength(9)
  })

  it('B5/B7b — chaque Roi garde 2 créneaux d’attaque, chacun au contact d’une Tour', () => {
    const state = setupGame(config)
    const occupied = new Set(state.tiles.map((t) => hexKey(t.at)))
    const blocked = new Set(state.spaces.filter((s) => s.blocked).map((s) => hexKey(s.at)))
    const view = viewBoard(config, state.tiles)
    for (const side of ['player', 'demon'] as const) {
      const king = state.tiles.find((t) => t.side === side && view.defOf(t).role === 'king')
      expect(king).toBeDefined()
      const slots = neighbors(king!.at).filter(
        (n) => state.spaces.some((s) => hexKey(s.at) === hexKey(n)) && !blocked.has(hexKey(n)) && !occupied.has(hexKey(n)),
      )
      expect(slots).toHaveLength(2)
      // F8 : depuis un créneau, on frappe le Roi ET une Tour pour une seule riposte.
      for (const slot of slots) {
        const towers = neighbors(slot).filter((n) => {
          const t = view.byKey.get(hexKey(n))
          return t !== undefined && t.side === side && view.defOf(t).role === 'tower'
        })
        expect(towers.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('G4 — même seed, même partie', () => {
    const a = setupGame(config)
    const b = setupGame(config)
    expect(a.spaces.map((s) => s.color)).toEqual(b.spaces.map((s) => s.color))
    expect(a.decks).toEqual(b.decks)
  })

  it('C5 — les Couleurs sont miroir par rotation de 180°', () => {
    const state = setupGame(config)
    const byKey = new Map(state.spaces.map((s) => [hexKey(s.at), s]))
    let compared = 0
    for (const s of state.spaces) {
      if (s.blocked) continue
      const mirror = byKey.get(hexKey({ q: -s.at.q, r: -s.at.r }))
      if (!mirror || mirror.blocked) continue
      expect(mirror.color).toBe(s.color)
      compared += 1
    }
    expect(compared).toBeGreaterThan(12)
  })

  /**
   * Le montage doit être strictement miroir : c'est le prérequis pour qu'une
   * mesure d'équilibrage (M4) mesure la mécanique et non le terrain.
   */
  it('B11/C5 — le montage entier est miroir par rotation de 180°', () => {
    const state = setupGame(config)
    const spaceByKey = new Map(state.spaces.map((s) => [hexKey(s.at), s]))
    const tileByKey = new Map(state.tiles.map((t) => [hexKey(t.at), t]))
    const flip = (side: string): string => (side === 'player' ? 'demon' : side === 'demon' ? 'player' : 'neutral')
    for (const s of state.spaces) {
      const mirrorAt = { q: -s.at.q, r: -s.at.r }
      const mirror = spaceByKey.get(hexKey(mirrorAt))
      expect(mirror).toBeDefined()
      expect(mirror?.blocked).toBe(s.blocked)
      if (!s.blocked) expect(mirror?.color).toBe(s.color)
      const here = tileByKey.get(hexKey(s.at))
      const there = tileByKey.get(hexKey(mirrorAt))
      expect(there === undefined).toBe(here === undefined)
      if (here && there) {
        expect(there.typeId).toBe(here.typeId)
        expect(there.side).toBe(flip(here.side))
      }
    }
  })

  it('D1/D6 — les Decks sont partitionnés par Couleur', () => {
    const state = setupGame(config)
    const d = state.decks.player
    expect(d.red).toHaveLength(10)
    expect(d.blue).toHaveLength(8)
    expect(d.green).toHaveLength(8)
    expect(d.black).toHaveLength(5)
    expect(d.yellow).toHaveLength(6)
  })
})

describe('D3 — modèle de main', () => {
  const config = defaultConfig()

  it('la main est le sommet du Deck de la Couleur imposée', () => {
    const base = setupGame(config)
    const state: GameState = { ...base, imposedColor: 'black' }
    const hand = handOf(config, state, 'player')
    expect(hand).toHaveLength(3)
    expect(hand.every((id) => id.startsWith('N'))).toBe(true)
    expect(hand).toEqual(state.decks.player.black.slice(0, 3))
  })

  it('C9 — au premier tour la main montre le sommet de chaque Couleur active', () => {
    const state = setupGame(config)
    expect(state.imposedColor).toBeNull()
    expect(handOf(config, state, 'player')).toHaveLength(15)
  })

  it('D4 — la Tuile jouée quitte le Deck, les autres restent au sommet dans l’ordre', () => {
    const base = setupGame(config)
    const state: GameState = { ...base, imposedColor: 'black' }
    const before = [...state.decks.player.black]
    const played = before[1] as string
    const after = playMove(config, state, { typeId: played, at: { q: 0, r: 0 } })
    const expected = before.filter((_, i) => i !== 1)
    expect(after.decks.player.black).toEqual(expected)
  })
})

describe('A3/A4 — pose et contrainte de couleur', () => {
  const config = defaultConfig()

  it('A4 — toute case vide est posable, sans contrainte d’adjacence', () => {
    const state = setupGame(config)
    const moves = legalMoves(config, state, 'player')
    const distinctSpaces = new Set(moves.map((m) => hexKey(m.at)))
    expect(distinctSpaces.size).toBe(9)
  })

  it('refuse une Tuile qui ne respecte pas la Couleur imposée', () => {
    const base = setupGame(config)
    const state: GameState = { ...base, imposedColor: 'black' }
    expect(() => playMove(config, state, { typeId: 'R01', at: { q: 0, r: 0 } })).toThrow(/Couleur imposée/)
  })

  it('refuse une pose sur un Espace bloqué ou occupé', () => {
    const state = setupGame(config)
    const king = state.tiles.find((t) => t.side === 'player' && t.typeId === 'N00')
    expect(() => playMove(config, state, { typeId: 'R01', at: { q: 0, r: 1 } })).toThrow(/bloqué/)
    expect(() => playMove(config, state, { typeId: 'R01', at: king!.at })).toThrow(/occupé/)
  })

  it('C7 — la Couleur de l’Espace occupé devient la Couleur imposée à l’adversaire', () => {
    const state = setupGame(config)
    const target = { q: 0, r: 0 }
    const spaceColor = state.spaces.find((s) => hexKey(s.at) === hexKey(target))?.color
    const hand = handOf(config, state, 'player')
    const after = playMove(config, state, { typeId: hand[0] as string, at: target })
    expect(after.imposedColor).toBe(spaceColor)
    expect(after.activeSide).toBe('demon')
  })

  it('B3 — une Tuile détruite libère son Espace, qui garde sa Couleur', () => {
    const config2 = traceConfig()
    const state = setupGame(config2)
    const target = { q: 3, r: -1 }
    const before = state.spaces.find((s) => hexKey(s.at) === hexKey(target))?.color
    const after = playMove(config2, state, { typeId: 'R01', at: target })
    // R01 meurt de la riposte du Roi : l'Espace redevient libre, même Couleur.
    expect(after.tiles.some((t) => hexKey(t.at) === hexKey(target))).toBe(false)
    expect(after.spaces.find((s) => hexKey(s.at) === hexKey(target))?.color).toBe(before)
    expect(freeSpaceKeys(after)).toContain(hexKey(target))
  })
})

describe('C10/C12 — famine de Couleur et passe', () => {
  const config = defaultConfig()

  it('C10 — Deck de la Couleur imposée vide ⇒ le camp doit passer', () => {
    const base = setupGame(config)
    const decks = { ...base.decks, player: { ...base.decks.player, black: [] } }
    const state: GameState = { ...base, imposedColor: 'black', decks }
    expect(handOf(config, state, 'player')).toHaveLength(0)
    expect(legalMoves(config, state, 'player')).toHaveLength(0)
    expect(passReason(config, state, 'player')).toBe('noColorTile')
  })

  it('C12 — la Couleur imposée PERSISTE à travers la passe', () => {
    const base = setupGame(config)
    const decks = { ...base.decks, player: { ...base.decks.player, black: [] } }
    const state: GameState = { ...base, imposedColor: 'black', decks }
    const after = playPass(config, state, 'noColorTile')
    expect(after.imposedColor).toBe('black')
    expect(after.activeSide).toBe('demon')
    expect(after.consecutivePasses).toBe(1)
  })

  it('W2 — deux passes consécutives terminent la partie, départage sur le Roi (W4)', () => {
    const base = setupGame(config)
    const decks = {
      player: { ...base.decks.player, black: [] },
      demon: { ...base.decks.demon, black: [] },
    }
    let state: GameState = { ...base, imposedColor: 'black', decks }
    // On blesse le Roi du joueur pour que le départage soit tranché.
    state = {
      ...state,
      tiles: state.tiles.map((t) => (t.typeId === 'N00' && t.side === 'player' ? { ...t, damage: 5 } : t)),
    }
    state = playPass(config, state, 'noColorTile')
    expect(state.outcome).toBeNull()
    state = playPass(config, state, 'noColorTile')
    expect(state.outcome).toEqual({ cause: 'twoPasses', winner: 'demon' })
  })

  it('une pose remet le compteur de passes à zéro', () => {
    const base = setupGame(config)
    const decks = { ...base.decks, player: { ...base.decks.player, black: [] } }
    let state: GameState = { ...base, imposedColor: 'black', decks }
    state = playPass(config, state, 'noColorTile')
    expect(state.consecutivePasses).toBe(1)
    const hand = handOf(config, state, 'demon')
    state = playMove(config, state, { typeId: hand[0] as string, at: { q: 0, r: 0 } })
    expect(state.consecutivePasses).toBe(0)
  })
})

describe('W1/W5 — fin par destruction du Roi', () => {
  it('W1 — tuer le Roi adverse donne la victoire immédiate', () => {
    const config = traceConfig({ decks: { player: ['R01'], demon: ['V01'] } })
    const base = setupGame(config)
    // Roi demon à 4 force restante : R01 (7 − 2 boucliers = 5) le tue.
    const state: GameState = {
      ...base,
      tiles: base.tiles.map((t) => (t.typeId === 'N00' && t.side === 'demon' ? { ...t, damage: 16 } : t)),
    }
    const after = playMove(config, state, { typeId: 'R01', at: { q: 3, r: -1 } })
    expect(after.outcome).toEqual({ cause: 'kingDestroyed', winner: 'player' })
  })

  it('W5/E9 — N03 peut achever son propre Roi ; si les deux tombent, le camp actif gagne', () => {
    const config = traceConfig({
      decks: { player: ['N03'], demon: ['V01'] },
      setup: [
        { side: 'player', type: 'N00', q: 0, r: 0 },
        { side: 'demon', type: 'N00', q: 2, r: 0 },
      ],
    })
    const base = setupGame(config)
    // Les deux Rois à 1 force : N03 posé entre les deux les tue tous les deux
    // (son effet frappe « alliées comprises » et ignore les boucliers).
    const state: GameState = {
      ...base,
      tiles: base.tiles.map((t) => ({ ...t, damage: 19 })),
    }
    const after = playMove(config, state, { typeId: 'N03', at: { q: 1, r: 0 } })
    expect(after.outcome).toEqual({ cause: 'kingDestroyed', winner: 'player' })
  })
})
