import { describe, expect, it } from 'vitest'
import { hexKey } from '../hex/hexCoord'
import { viewBoard } from '../rules/derived'
import { applyUpkeep, playMove, setupGame } from '../rules/game'
import type { GameConfig } from '../config/schema'
import type { GameState } from '../rules/types'
import { traceConfig } from './helpers'

function at(state: GameState, q: number, r: number) {
  return state.tiles.find((t) => hexKey(t.at) === hexKey({ q, r }))
}

function stats(config: GameConfig, state: GameState, q: number, r: number) {
  const view = viewBoard(config, state.tiles)
  const tile = at(state, q, r)
  return tile ? { force: view.forceOf(tile), shields: view.shieldsOf(tile) } : null
}

function lastText(state: GameState, kind: 'riposte' | 'attack'): string {
  const entry = state.log.filter((e) => e.kind === kind).at(-1)
  return entry && 'text' in entry ? entry.text : ''
}

/**
 * GDD §13 — trace de référence. C'est LE test d'acceptation du moteur : si ces
 * nombres ne sortent pas exactement, une règle est mal implémentée.
 *
 * Montage propre à la trace : relief vide, `upkeepHeal: 0` pour isoler le
 * combat, Decks minimaux. La contrainte de Couleur n'est pas l'objet ici (elle
 * est testée dans game.test.ts) : on impose la Couleur directement.
 */
describe('§13 trace de référence', () => {
  describe('Cas 1 — attaque en aire, riposte plafonnée, boucliers du Roi', () => {
    const config = traceConfig()

    it('le montage est bien celui de la trace', () => {
      const state = setupGame(config)
      expect(stats(config, state, 4, -2)).toEqual({ force: 20, shields: 2 })
      expect(stats(config, state, 4, -1)).toEqual({ force: 10, shields: 0 })
    })

    it('R01 fait 5 au Roi et 7 à la Tour — l’attaque est en aire (F8)', () => {
      let state = setupGame(config)
      state = playMove(config, state, { typeId: 'R01', at: { q: 3, r: -1 } })
      // Roi : 20 − max(0, 7 − 2 boucliers) = 15. Tour : 10 − max(0, 7 − 0) = 3.
      expect(stats(config, state, 4, -2)?.force).toBe(15)
      expect(stats(config, state, 4, -1)?.force).toBe(3)
    })

    it('R01 encaisse le MAXIMUM (20) et non la somme (30), et meurt', () => {
      let state = setupGame(config)
      state = playMove(config, state, { typeId: 'R01', at: { q: 3, r: -1 } })
      expect(lastText(state, 'riposte')).toContain('= 20')
      expect(at(state, 3, -1)).toBeUndefined()
      expect(state.log.filter((e) => e.kind === 'destroyed')).toHaveLength(1)
    })
  })

  describe('Cas 2 — boucliers, dégâts d’effet, riposte maximale', () => {
    const config = traceConfig({ firstPlayer: 'demon', startingColor: 'green' })

    it('V03 gagne +2 de bonus de pose (F3) et 3 boucliers (E1), sans combat', () => {
      let state = setupGame(config)
      state = playMove(config, state, { typeId: 'V03', at: { q: 3, r: -1 } })
      // 1 de base + 1 par allié adjacent (Roi, Tour) = 3 force ; 3 boucliers.
      expect(stats(config, state, 3, -1)).toEqual({ force: 3, shields: 3 })
      expect(state.log.some((e) => e.kind === 'attack')).toBe(false)
    })

    it('l’effet de R05 traverse les boucliers (E6), son attaque non (F9)', () => {
      let state = setupGame(config)
      state = playMove(config, state, { typeId: 'V03', at: { q: 3, r: -1 } })
      state = { ...state, imposedColor: 'red' }
      state = playMove(config, state, { typeId: 'R05', at: { q: 3, r: -2 } })

      // Effet : −2 à V03 (3 → 1) ET au Roi (20 → 18), boucliers ignorés.
      // Attaque : V03 += max(0, 2 − 3) = 0 ; Roi += max(0, 2 − 2) = 0.
      expect(stats(config, state, 3, -1)?.force).toBe(1)
      expect(stats(config, state, 4, -2)?.force).toBe(18)
    })

    it('la riposte prend le max des forces adverses (18), pas la plus faible ni la somme', () => {
      let state = setupGame(config)
      state = playMove(config, state, { typeId: 'V03', at: { q: 3, r: -1 } })
      state = { ...state, imposedColor: 'red' }
      state = playMove(config, state, { typeId: 'R05', at: { q: 3, r: -2 } })
      expect(lastText(state, 'riposte')).toContain('= 18')
      expect(at(state, 3, -2)).toBeUndefined()
    })
  })

  describe('Cas 3 — soin et ravitaillement (F13, F14)', () => {
    // Valeurs épinglées pour que la trace reste lisible et indépendante du
    // réglage livré : soin de 2, et Roi exclu du soin (règle F13).
    const config = traceConfig({
      upkeepHeal: 2,
      upkeepHealsKing: false,
      firstPlayer: 'player',
      setup: [
        { side: 'player', type: 'N00', q: -4, r: 2 },
        { side: 'player', type: 'V04', q: -3, r: 2 },
        { side: 'player', type: 'V04', q: 0, r: 0 },
        { side: 'demon', type: 'N00', q: 4, r: -2 },
      ],
    })

    /** Les deux V04 blessées de 3 : l'une adjacente au Roi, l'autre isolée. */
    function wounded(): GameState {
      const base = setupGame(config)
      return { ...base, tiles: base.tiles.map((t) => (t.typeId === 'V04' ? { ...t, damage: 3 } : t)) }
    }

    it('la Tuile reliée au Roi se soigne, la Tuile isolée jamais', () => {
      let state = wounded()
      expect(stats(config, state, -3, 2)?.force).toBe(1)
      expect(stats(config, state, 0, 0)?.force).toBe(1)

      state = applyUpkeep(config, state)
      expect(stats(config, state, -3, 2)?.force).toBe(3)
      expect(stats(config, state, 0, 0)?.force).toBe(1)
    })

    it('le soin est borné : une Tuile ne dépasse jamais sa force nominale (F1)', () => {
      let state = wounded()
      state = applyUpkeep(config, state)
      state = applyUpkeep(config, state)
      expect(stats(config, state, -3, 2)?.force).toBe(4)
      state = applyUpkeep(config, state)
      expect(stats(config, state, -3, 2)?.force).toBe(4)
      // Et l'isolée reste à 1, indéfiniment.
      expect(stats(config, state, 0, 0)?.force).toBe(1)
    })

    it('F13 — le Roi est EXCLU du soin, même s’il est ravitaillé', () => {
      const base = setupGame(config)
      let state: GameState = {
        ...base,
        tiles: base.tiles.map((t) => (t.typeId === 'N00' && t.side === 'player' ? { ...t, damage: 6 } : t)),
      }
      expect(stats(config, state, -4, 2)?.force).toBe(14)
      state = applyUpkeep(config, state)
      // Le Roi ne récupère rien : c'est ce qui rend le duel concluable (§14).
      expect(stats(config, state, -4, 2)?.force).toBe(14)
      // …alors que la Tuile ravitaillée du même camp se soigne bien.
      expect(stats(config, state, -3, 2)?.force).toBe(4)
    })

    it('F13 — le soin exclut le Roi mais pas ses Tours ni ses relais', () => {
      const base = setupGame(config)
      const state: GameState = {
        ...base,
        tiles: base.tiles.map((t) =>
          t.typeId === 'N00' && t.side === 'player' ? { ...t, damage: 6 } : t.typeId === 'V04' ? { ...t, damage: 3 } : t,
        ),
      }
      const after = applyUpkeep(config, state)
      const healed = after.log.filter((e) => e.kind === 'upkeep')
      expect(healed).toHaveLength(1)
      const entry = healed[0]
      const ids = entry && 'healed' in entry ? entry.healed.map((h) => h.typeId) : []
      expect(ids).not.toContain('N00')
      expect(ids).toContain('V04')
    })

    it('le soin ne touche que le camp actif (F13, Q16)', () => {
      const base = setupGame(config)
      const state: GameState = {
        ...base,
        activeSide: 'demon',
        tiles: base.tiles.map((t) => (t.typeId === 'V04' ? { ...t, damage: 3 } : t)),
      }
      const after = applyUpkeep(config, state)
      // C'est au demon de jouer : les V04 du joueur ne se soignent pas.
      expect(stats(config, after, -3, 2)?.force).toBe(1)
    })
  })
})
