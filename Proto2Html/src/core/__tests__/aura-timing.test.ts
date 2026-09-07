import { describe, expect, it } from 'vitest'
import { hexKey } from '../hex/hexCoord'
import { viewBoard } from '../rules/derived'
import { playMove, setupGame } from '../rules/game'
import type { GameState, PlacedTile } from '../rules/types'
import { traceConfig } from './helpers'

function at(state: GameState, q: number, r: number): PlacedTile | undefined {
  return state.tiles.find((t) => hexKey(t.at) === hexKey({ q, r }))
}

/**
 * E4 — une aura est vivante **dès l'instant de la pose** : elle est déjà prise en
 * compte par l'instantané de `F5` étape 1, donc *avant* le calcul des dégâts.
 */
describe('E4 — l’aura s’applique dès la pose', () => {
  const config = traceConfig({
    upkeepHeal: 0,
    firstPlayer: 'player',
    startingColor: 'yellow',
    decks: { player: ['J01'], demon: ['V01'] },
    setup: [
      { side: 'player', type: 'N00', q: -4, r: 0 },
      { side: 'demon', type: 'N00', q: 4, r: 0 },
      // Deux alliés pour donner +2 de bonus de pose à la J01 (F3).
      { side: 'player', type: 'V04', q: 1, r: 0 },
      { side: 'player', type: 'V04', q: 0, r: -1 },
      // La cible : une V02 adverse, comme si elle avait gagné ses 3 boucliers.
      { side: 'demon', type: 'V02', q: -1, r: 0 },
    ],
  })

  /** V02 à 3 boucliers, blessée à 1 force : elle ne meurt que si l'aura mord. */
  function ready(): GameState {
    const base = setupGame(config)
    return {
      ...base,
      tiles: base.tiles.map((t) =>
        t.typeId === 'V02' ? { ...t, grantedShields: 3, damage: 1 } : t,
      ),
    }
  }

  it('le montage est bien celui du cas : V02 à 1 force et 3 boucliers', () => {
    const state = ready()
    const view = viewBoard(config, state.tiles)
    const v02 = at(state, -1, 0) as PlacedTile
    expect(view.forceOf(v02)).toBe(1)
    expect(view.shieldsOf(v02)).toBe(3)
  })

  it('la J01 posée réduit les boucliers adverses AVANT de calculer ses dégâts', () => {
    let state = ready()
    state = playMove(config, state, { typeId: 'J01', at: { q: 0, r: 0 } })

    // J01 : 1 de base + 2 d'alliés adjacents = 3 de force (F3).
    // Son aura ramène les boucliers de la V02 de 3 à 1 (E8), donc l'attaque
    // inflige max(0, 3 − 1) = 2, et la V02 (1 force) tombe.
    // Si l'aura ne s'appliquait qu'après la résolution, l'attaque aurait fait
    // max(0, 3 − 3) = 0 et la V02 aurait survécu.
    expect(at(state, -1, 0)).toBeUndefined()
    const attack = state.log.find((e) => e.kind === 'attack')
    expect(attack && 'text' in attack ? attack.text : '').toContain('3 − 1 bouclier(s) = 2')
  })
})

/**
 * E7 — `N01` annule l'aura de **toutes** les Tuiles adjacentes, y compris une
 * Tuile neutre : le sanctuaire du `B01` neutre (`Q17`) s'éteint.
 */
describe('E7 — N01 annule l’aura d’un B01 neutre', () => {
  const config = traceConfig({
    upkeepHeal: 0,
    setup: [
      { side: 'player', type: 'N00', q: -4, r: 0 },
      { side: 'demon', type: 'N00', q: 4, r: 0 },
      { side: 'neutral', type: 'B01', q: 0, r: 0 },
      { side: 'player', type: 'V04', q: 1, r: 0 },
    ],
  })

  it('sans N01, le sanctuaire donne +1 bouclier à la Tuile adjacente', () => {
    const state = setupGame(config)
    const view = viewBoard(config, state.tiles)
    const v04 = at(state, 1, 0) as PlacedTile
    expect(view.shieldsOf(v04)).toBe(1)
  })

  it('une N01 adjacente au B01 neutre éteint son aura, des deux camps', () => {
    for (const side of ['player', 'demon'] as const) {
      const base = setupGame(config)
      const withN01: GameState = {
        ...base,
        tiles: [
          ...base.tiles,
          {
            uid: base.nextUid,
            typeId: 'N01',
            side,
            at: { q: 0, r: 1 },
            placementBonus: 0,
            damage: 0,
            grantedShields: 0,
          },
        ],
      }
      const view = viewBoard(config, withN01.tiles)
      const b01 = at(withN01, 0, 0) as PlacedTile
      const v04 = at(withN01, 1, 0) as PlacedTile
      expect(view.isSilenced(b01)).toBe(true)
      expect(view.shieldsOf(v04)).toBe(0)
    }
  })
})
