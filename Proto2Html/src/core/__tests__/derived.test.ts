import { describe, expect, it } from 'vitest'
import { viewBoard } from '../rules/derived'
import { setupGame } from '../rules/game'
import type { GameConfig } from '../config/schema'
import type { PlacedTile, Side } from '../rules/types'
import { defaultConfig, traceConfig } from './helpers'

/** Construit un Plateau de Tuiles à la main, sans passer par les tours de jeu. */
function board(
  entries: { id: string; side: Side; q: number; r: number; damage?: number; bonus?: number; shields?: number }[],
) {
  const config = traceConfig()
  const tiles: PlacedTile[] = entries.map((e, i) => ({
    uid: i + 1,
    typeId: e.id,
    side: e.side,
    at: { q: e.q, r: e.r },
    placementBonus: e.bonus ?? 0,
    damage: e.damage ?? 0,
    grantedShields: e.shields ?? config.tileTypes.get(e.id)?.shields ?? 0,
  }))
  return { config, tiles, view: viewBoard(config, tiles) }
}

function stat(config: GameConfig, tiles: PlacedTile[], id: string) {
  const view = viewBoard(config, tiles)
  const tile = tiles.find((t) => t.typeId === id)
  if (!tile) throw new Error(`Tuile ${id} absente`)
  return { force: view.forceOf(tile), shields: view.shieldsOf(tile), silenced: view.isSilenced(tile) }
}

describe('F1 — état stocké et valeurs dérivées', () => {
  it('force = base + bonus de pose + auras − dégâts', () => {
    const { config, tiles } = board([{ id: 'R01', side: 'player', q: 0, r: 0, bonus: 2, damage: 3 }])
    expect(stat(config, tiles, 'R01').force).toBe(7 + 2 - 3)
  })

  it('les boucliers sont bornés à 0 même sous une aura négative', () => {
    // J01 adverse : −2 boucliers. R04 n'en a qu'1 (via son effet, ici 0 au montage).
    const { config, tiles } = board([
      { id: 'V02', side: 'player', q: 0, r: 0, shields: 1 },
      { id: 'J01', side: 'demon', q: 1, r: 0 },
    ])
    expect(stat(config, tiles, 'V02').shields).toBe(0)
  })
})

describe('E4 — auras, recalculées en continu', () => {
  it('J02 donne +2 force aux alliées adjacentes, et rien aux adverses', () => {
    const { config, tiles } = board([
      { id: 'J02', side: 'player', q: 0, r: 0 },
      { id: 'V04', side: 'player', q: 1, r: 0 },
      { id: 'R03', side: 'demon', q: 0, r: 1 },
    ])
    expect(stat(config, tiles, 'V04').force).toBe(4 + 2)
    expect(stat(config, tiles, 'R03').force).toBe(4)
  })

  it('B01 donne +1 bouclier aux alliées adjacentes', () => {
    const { config, tiles } = board([
      { id: 'B01', side: 'player', q: 0, r: 0 },
      { id: 'V04', side: 'player', q: 1, r: 0 },
    ])
    expect(stat(config, tiles, 'V04').shields).toBe(1)
  })

  it('E8 — J01 ne vise que les adverses ADJACENTES, pas tout le Plateau', () => {
    const { config, tiles } = board([
      { id: 'J01', side: 'player', q: 0, r: 0 },
      { id: 'V02', side: 'demon', q: 1, r: 0, shields: 3 },
      { id: 'V03', side: 'demon', q: 4, r: 0, shields: 3 },
    ])
    expect(stat(config, tiles, 'V02').shields).toBe(1)
    expect(stat(config, tiles, 'V03').shields).toBe(3)
  })

  it('F11 — retirer une J02 fait baisser la force de sa voisine (cascade possible)', () => {
    const { config, tiles } = board([
      { id: 'J02', side: 'player', q: 0, r: 0 },
      { id: 'B03', side: 'player', q: 1, r: 0, damage: 2 },
    ])
    // B03 : 1 base + 2 aura − 2 dégâts = 1, vivante.
    expect(stat(config, tiles, 'B03').force).toBe(1)
    const without = tiles.filter((t) => t.typeId !== 'J02')
    // Sans l'aura : 1 − 2 = −1, donc condamnée.
    expect(stat(config, without, 'B03').force).toBe(-1)
  })
})

describe('E7 — annulation par N01', () => {
  it('rend muettes les Tuiles adjacentes des DEUX camps', () => {
    const { config, tiles } = board([
      { id: 'N01', side: 'player', q: 0, r: 0 },
      { id: 'J02', side: 'player', q: 1, r: 0 },
      { id: 'B01', side: 'demon', q: 0, r: 1 },
    ])
    expect(stat(config, tiles, 'J02').silenced).toBe(true)
    expect(stat(config, tiles, 'B01').silenced).toBe(true)
  })

  it('une aura muette ne produit plus rien', () => {
    const { config, tiles } = board([
      { id: 'N01', side: 'player', q: 0, r: 0 },
      { id: 'J02', side: 'player', q: 1, r: 0 },
      { id: 'V04', side: 'player', q: 2, r: 0 },
    ])
    // V04 est voisine de J02 (muette) : elle ne reçoit pas le +2.
    expect(stat(config, tiles, 'V04').force).toBe(4)
  })

  /** Q6 — sans cette clause, la résolution n'aurait pas de point fixe. */
  it('Q6 — N01 ignore l’annulation d’une autre N01 : les deux continuent d’annuler', () => {
    const config = traceConfig()
    const tiles: PlacedTile[] = [
      { uid: 1, typeId: 'N01', side: 'player', at: { q: 0, r: 0 }, placementBonus: 0, damage: 0, grantedShields: 0 },
      { uid: 2, typeId: 'N01', side: 'demon', at: { q: 1, r: 0 }, placementBonus: 0, damage: 0, grantedShields: 0 },
      { uid: 3, typeId: 'J02', side: 'player', at: { q: 0, r: 1 }, placementBonus: 0, damage: 0, grantedShields: 0 },
      { uid: 4, typeId: 'V04', side: 'player', at: { q: -1, r: 2 }, placementBonus: 0, damage: 0, grantedShields: 0 },
    ]
    const view = viewBoard(config, tiles)
    // Aucune des deux N01 n'est muette…
    expect(view.isSilenced(tiles[0] as PlacedTile)).toBe(false)
    expect(view.isSilenced(tiles[1] as PlacedTile)).toBe(false)
    // …et elles annulent bien la J02 voisine.
    expect(view.isSilenced(tiles[2] as PlacedTile)).toBe(true)
  })

  it('E7 — les boucliers déjà acquis survivent au silence (état stocké, pas effet)', () => {
    const { config, tiles } = board([
      { id: 'V02', side: 'player', q: 0, r: 0, shields: 3 },
      { id: 'N01', side: 'demon', q: 1, r: 0 },
    ])
    expect(stat(config, tiles, 'V02').silenced).toBe(true)
    expect(stat(config, tiles, 'V02').shields).toBe(3)
  })
})

describe('T6/T7 — Tuiles neutres', () => {
  it('Q17 — un B01 neutre donne +1 bouclier à TOUT LE MONDE (sanctuaire)', () => {
    const { config, tiles } = board([
      { id: 'B01', side: 'neutral', q: 0, r: 0 },
      { id: 'V04', side: 'player', q: 1, r: 0 },
      { id: 'R03', side: 'demon', q: 0, r: 1 },
    ])
    expect(stat(config, tiles, 'V04').shields).toBe(1)
    expect(stat(config, tiles, 'R03').shields).toBe(1)
  })

  it('T7 — la réciproque est fausse : un B01 de camp n’aide pas une neutre', () => {
    const { config, tiles } = board([
      { id: 'B01', side: 'player', q: 0, r: 0 },
      { id: 'N02', side: 'neutral', q: 1, r: 0 },
    ])
    expect(stat(config, tiles, 'N02').shields).toBe(0)
  })

  it('un N01 neutre rend muettes les Tuiles des deux camps', () => {
    const { config, tiles } = board([
      { id: 'N01', side: 'neutral', q: 0, r: 0 },
      { id: 'J02', side: 'player', q: 1, r: 0 },
      { id: 'B01', side: 'demon', q: 0, r: 1 },
    ])
    expect(stat(config, tiles, 'J02').silenced).toBe(true)
    expect(stat(config, tiles, 'B01').silenced).toBe(true)
  })

  it('le montage par défaut pose 2 B01 neutres, et aucune N01 (T6)', () => {
    const state = setupGame(defaultConfig())
    const neutrals = state.tiles.filter((t) => t.side === 'neutral')
    expect(neutrals).toHaveLength(2)
    expect(neutrals.every((t) => t.typeId === 'B01')).toBe(true)
  })
})
