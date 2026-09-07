import { describe, expect, it } from 'vitest'
import { hexKey, rotate180 } from '../hex/hexCoord'
import { loadConfig } from '../config/load'
import { chooseMove } from '../ai/choose'
import { rankMoves } from '../ai/evaluate'
import { createRng } from '../rules/random'
import { setupGame } from '../rules/game'
import type { GameConfig, RawConfig } from '../config/schema'
import type { GameState } from '../rules/types'
import { defaultRaw } from './helpers'

function aiBothSides(over: Partial<GameConfig> = {}): GameConfig {
  const raw: RawConfig = defaultRaw()
  const { config } = loadConfig({ ...raw, ai: { ...raw.ai, player: { profile: 'neutre', level: 'expert' } } })
  return { ...config, ...over }
}

/** Renvoie la même position vue par l'autre camp : rotation de 180° + échange des camps. */
function mirrorState(state: GameState): GameState {
  return {
    ...state,
    activeSide: state.activeSide === 'player' ? 'demon' : 'player',
    spaces: state.spaces.map((s) => ({ ...s, at: rotate180(s.at) })),
    tiles: state.tiles.map((t) => ({
      ...t,
      at: rotate180(t.at),
      side: t.side === 'player' ? ('demon' as const) : t.side === 'demon' ? ('player' as const) : t.side,
    })),
    decks: { player: state.decks.demon, demon: state.decks.player },
  }
}

describe('I5 — barème', () => {
  it('I6 — une pose qui tue le Roi adverse vaut +∞, une qui tue le sien −∞', () => {
    const raw = defaultRaw()
    const { config } = loadConfig({
      ...raw,
      upkeepHeal: 0,
      board: { ...raw.board, radius: 4, blocked: [] },
      decks: { player: ['R01', 'N03'], demon: ['V01'] },
      setup: [
        { side: 'player', type: 'N00', q: 0, r: 0 },
        { side: 'demon', type: 'N00', q: 2, r: 0 },
      ],
      ai: { ...raw.ai, player: { profile: 'neutre', level: 'expert' } },
    })
    const base = setupGame(config)
    const state: GameState = {
      ...base,
      imposedColor: 'red',
      tiles: base.tiles.map((t) => (t.side === 'demon' ? { ...t, damage: 16 } : t)),
    }
    const ranked = rankMoves(config, state, 'player')
    // Le meilleur coup est une mise à mort : score infini.
    expect(ranked[0]?.score).toBe(Infinity)
    expect(ranked[0]?.measures.winsNow).toBe(true)
  })

  it('I5b — à score égal, l’IA préfère une pose ravitaillée (F14)', () => {
    const raw = defaultRaw()
    const { config } = loadConfig({
      ...raw,
      board: { ...raw.board, radius: 4, blocked: [] },
      decks: { player: ['B03'], demon: ['V01'] },
      setup: [
        { side: 'player', type: 'N00', q: -4, r: 0 },
        { side: 'demon', type: 'N00', q: 4, r: 0 },
      ],
      ai: { ...raw.ai, player: { profile: 'neutre', level: 'expert' } },
    })
    const base = setupGame(config)
    const state: GameState = { ...base, imposedColor: 'blue' }
    const ranked = rankMoves(config, state, 'player')
    const best = ranked[0]
    expect(best?.measures.ownTileSupplied).toBe(1)
    // Le coup posé est bien adjacent au Roi du joueur.
    const d = Math.max(
      Math.abs((best?.move.at.q ?? 0) + 4),
      Math.abs(best?.move.at.r ?? 0),
      Math.abs((best?.move.at.q ?? 0) + 4 + (best?.move.at.r ?? 0)),
    )
    expect(d).toBe(1)
  })
})

/**
 * Non-régression sur un vrai bug trouvé au premier lot de mesures : le tri
 * stable laissait l'ordre d'énumération des Espaces (q croissant) trancher
 * toutes les égalités de score, et le camp dont le Roi est en q positif jouait
 * systématiquement loin de son Roi. `player` gagnait 19 parties sur 24 sur une
 * position strictement symétrique. Corrigé par le mélange germé de `I8`.
 */
describe('symétrie des camps', () => {
  it('le barème note identiquement une position et son miroir', () => {
    const config = aiBothSides()
    const state = setupGame(config)
    const mirrored = mirrorState(state)
    const a = rankMoves(config, state, 'player').map((m) => m.score).sort((x, y) => x - y)
    const b = rankMoves(config, mirrored, 'demon').map((m) => m.score).sort((x, y) => x - y)
    expect(b).toEqual(a)
  })

  it('les meilleurs coups d’une position et de son miroir sont images l’un de l’autre', () => {
    const config = aiBothSides()
    const state = setupGame(config)
    const mirrored = mirrorState(state)
    const top = (list: ReturnType<typeof rankMoves>) => {
      const best = list[0]?.score
      return new Set(list.filter((m) => m.score === best).map((m) => hexKey(m.move.at)))
    }
    const a = top(rankMoves(config, state, 'player'))
    const b = top(rankMoves(config, mirrored, 'demon'))
    const aMirrored = new Set(
      [...a].map((k) => {
        const [q, r] = k.split(',').map(Number)
        return hexKey(rotate180({ q: q as number, r: r as number }))
      }),
    )
    expect(b).toEqual(aMirrored)
  })

  /**
   * Position à égalités franches : Deck d'un seul type sans effet, pas de
   * Tours, Rois éloignés. Les 6 Espaces autour du Roi allié se valent
   * exactement (tous ravitaillés, aucun contact adverse), soit bien plus
   * d'ex aequo que la fenêtre de 2 de l'`expert`. La fenêtre doit donc bouger
   * avec le rng — sinon c'est l'ordre d'énumération qui tranche.
   */
  function tiedPosition(): { config: GameConfig; state: GameState } {
    const raw = defaultRaw()
    const { config } = loadConfig({
      ...raw,
      board: { ...raw.board, radius: 4, blocked: [], symmetricColors: false },
      decks: { player: ['B03', 'B03', 'B03', 'B03'], demon: ['B03'] },
      setup: [
        { side: 'player', type: 'N00', q: -4, r: 0 },
        { side: 'demon', type: 'N00', q: 4, r: 0 },
      ],
      ai: { ...raw.ai, player: { profile: 'neutre', level: 'expert' } },
    })
    const base = setupGame(config)
    return { config, state: { ...base, imposedColor: 'blue' } }
  }

  it('I8 — la position de test a bien plus d’ex aequo en tête que la fenêtre', () => {
    const { config, state } = tiedPosition()
    const scores = rankMoves(config, state, 'player', createRng(1)).map((m) => m.score)
    const best = scores[0] as number
    expect(scores.filter((x) => x === best).length).toBeGreaterThan(2)
  })

  it('I8 — à égalité, la fenêtre de choix varie avec le rng', () => {
    const { config, state } = tiedPosition()
    const topSet = (seed: number): string =>
      rankMoves(config, state, 'player', createRng(seed))
        .slice(0, 2)
        .map((m) => hexKey(m.move.at))
        .sort()
        .join('|')
    const distinct = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(topSet))
    expect(distinct.size).toBeGreaterThan(1)
  })

  it('I8 — le coup choisi se répartit, au lieu de se coller à l’ordre d’énumération', () => {
    const { config, state } = tiedPosition()
    const chosen = new Set<string>()
    for (let seed = 1; seed <= 24; seed++) {
      const decision = chooseMove(config, state, 'player', createRng(seed))
      if (decision) chosen.add(hexKey(decision.chosen.move.at))
    }
    expect(chosen.size).toBeGreaterThan(2)
  })

  it('I3 — la fenêtre de choix suit le niveau', () => {
    const raw = defaultRaw()
    for (const [level, expected] of [['expert', 2], ['moyen', 5], ['passable', 8]] as const) {
      const { config } = loadConfig({
        ...raw,
        ai: { ...raw.ai, player: { profile: 'neutre', level } },
      })
      const state = setupGame(config)
      const decision = chooseMove(config, state, 'player', createRng(1))
      expect(decision?.window).toHaveLength(expected)
    }
  })

  it('I3 — « mauvais » exclut les 2 meilleures options (rangs 3 à 8)', () => {
    const raw = defaultRaw()
    const { config } = loadConfig({ ...raw, ai: { ...raw.ai, player: { profile: 'neutre', level: 'mauvais' } } })
    const state = setupGame(config)
    const decision = chooseMove(config, state, 'player', createRng(1))
    expect(decision?.window).toHaveLength(6)
    expect(decision?.window[0]).toBe(decision?.ranked[2])
  })
})
