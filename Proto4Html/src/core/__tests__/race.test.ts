import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../config/load'
import type { RaceConfig } from '../config/schema'
import rawConfig from '../../../config/race.json'
import {
  applyMove,
  buildMoves,
  createRace,
  endTurn,
  isPairingComplete,
  naturalCombinations,
  ranking,
  rollOpponentPair,
  rollPlayerDice,
  type Move,
  type RaceState,
} from '../rules/race'
import { seededRng } from '../rules/rng'
import { defaultDice, plainFace } from '../rules/dice'

const cfg: RaceConfig = loadConfig(rawConfig)
const dice = defaultDice(cfg)
const roll = (distance: number[], soul: number[]) => ({ distance, faces: distance.map(plainFace), soul })

function withPositions(positions: number[]): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: positions.length } })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: positions[i] ?? 0 })) }
}

function move(soul: number, distance: number): Move {
  return { source: 'player', soul, distance, parts: [{ soulDie: 0, distanceDie: 0, distance }], notes: [] }
}

describe('config', () => {
  it('charge le fichier livré', () => {
    expect(cfg.souls.count).toBe(5)
    expect(cfg.track.columns).toBeGreaterThan(0)
  })
  it('désigne le champ fautif', () => {
    expect(() => loadConfig({ ...rawConfig, souls: { count: 9, names: ['a'] } })).toThrow(ConfigError)
    expect(() => loadConfig({ ...rawConfig, souls: { count: 9, names: ['a'] } })).toThrow(/souls\.names/)
    expect(() => loadConfig({ ...rawConfig, dice: { ...rawConfig.dice, distanceFaces: [-1, -2] } })).toThrow(/distanceFaces/)
    expect(() => loadConfig({ ...rawConfig, dice: { ...rawConfig.dice, soulDice: 1, distanceDice: 2 } })).toThrow(/soulDice/)
  })
})

describe('plateau', () => {
  it('place toutes les âmes sur la ligne de départ', () => {
    const race = createRace(cfg)
    expect(race.souls).toHaveLength(5)
    expect(race.souls.every((s) => s.position === 0)).toBe(true)
    expect(race.track.totalCells).toBe(cfg.track.columns + cfg.track.cellsAfterFinish)
    expect(race.track.betThresholdColumn).toBe(Math.ceil(cfg.track.columns * 0.6))
  })
})

describe('dés', () => {
  it('lance autant de dés que la config le demande, dans les faces autorisées', () => {
    const roll = rollPlayerDice(cfg, 5, seededRng(1), dice)
    expect(roll.distance).toHaveLength(cfg.dice.distanceDice)
    expect(roll.soul).toHaveLength(cfg.dice.soulDice)
    roll.distance.forEach((d) => expect(cfg.dice.distanceFaces).toContain(d))
    roll.soul.forEach((s) => expect(s).toBeGreaterThanOrEqual(0))
    roll.soul.forEach((s) => expect(s).toBeLessThan(5))
  })
  it("l'adversaire lance une paire", () => {
    const pair = rollOpponentPair(cfg, 5, seededRng(2))
    expect(pair.distance).toHaveLength(1)
    expect(pair.soul).toHaveLength(1)
  })
  it('est déterministe à graine égale', () => {
    expect(rollPlayerDice(cfg, 5, seededRng(42), dice)).toEqual(rollPlayerDice(cfg, 5, seededRng(42), dice))
  })
})

describe('combinaisons', () => {
  it("respecte l'ordre choisi par le joueur", () => {
    const r = roll([3, -1], [0, 1])
    const moves = buildMoves(r, [{ soulDie: 1, distanceDie: 0 }, { soulDie: 0, distanceDie: 1 }], 'player')
    expect(moves.map((m) => [m.soul, m.distance])).toEqual([[1, 3], [0, -1]])
  })
  it("laisse un dé Âme inutilisé quand il y en a plus que de dés Distance", () => {
    const r = roll([3, -1], [0, 1, 2])
    expect(isPairingComplete(r, [{ soulDie: 2, distanceDie: 0 }])).toBe(false)
    const combos = [{ soulDie: 2, distanceDie: 0 }, { soulDie: 0, distanceDie: 1 }]
    expect(isPairingComplete(r, combos)).toBe(true)
    const moves = buildMoves(r, combos, 'player')
    expect(moves.map((m) => [m.soul, m.distance])).toEqual([[2, 3], [0, -1]])
    expect(naturalCombinations(r)).toHaveLength(2)
  })
  it('cumule les distances quand deux dés désignent la même âme', () => {
    const r = roll([3, -1], [2, 2, 4])
    const moves = buildMoves(r, naturalCombinations(r), 'player')
    expect(moves).toHaveLength(1)
    expect(moves[0]?.distance).toBe(2)
    expect(moves[0]?.parts).toHaveLength(2)
  })
})

describe('déplacements et collisions', () => {
  it('avance simplement sur une case libre', () => {
    const { state, result } = applyMove(withPositions([0, 5]), move(0, 3))
    expect(result.from).toBe(0)
    expect(result.to).toBe(3)
    expect(result.collision).toBeNull()
    expect(state.souls[0]?.position).toBe(3)
  })
  it('ne recule pas depuis la ligne de départ', () => {
    const { state, result } = applyMove(withPositions([0, 0]), move(0, -1))
    expect(result.blockedAtStart).toBe(true)
    expect(result.to).toBe(0)
    expect(state.souls[0]?.position).toBe(0)
  })
  it("saute devant l'âme percutée en avançant", () => {
    const { state, result } = applyMove(withPositions([2, 5]), move(0, 3))
    expect(result.collision).toEqual({ kind: 'jump', over: [1] })
    expect(state.souls[0]?.position).toBe(6)
    expect(state.souls[1]?.position).toBe(5)
  })
  it('saute en cascade si la case devant est aussi occupée', () => {
    const { state, result } = applyMove(withPositions([2, 5, 6]), move(0, 3))
    expect(result.collision).toEqual({ kind: 'jump', over: [1, 2] })
    expect(state.souls[0]?.position).toBe(7)
  })
  it('échange sa place en reculant sur une âme', () => {
    const { state, result } = applyMove(withPositions([6, 5]), move(0, -1))
    expect(result.collision).toEqual({ kind: 'swap', with: 1, otherFrom: 5, otherTo: 6 })
    expect(state.souls[0]?.position).toBe(5)
    expect(state.souls[1]?.position).toBe(6)
  })
  it('reculer sur la ligne de départ ne provoque pas d\'échange', () => {
    const { state, result } = applyMove(withPositions([1, 0]), move(0, -1))
    expect(result.collision).toBeNull()
    expect(state.souls[0]?.position).toBe(0)
    expect(state.souls[1]?.position).toBe(0)
  })
  it("s'arrête sur la dernière case, partagée", () => {
    const last = cfg.track.columns + cfg.track.cellsAfterFinish - 1
    const { state, result } = applyMove(withPositions([last - 1, last]), move(0, 3))
    expect(result.to).toBe(last)
    expect(state.souls[0]?.position).toBe(last)
    expect(state.souls[1]?.position).toBe(last)
  })
  it("note l'ordre de franchissement de l'arrivée", () => {
    const race = withPositions([cfg.track.columns - 1, cfg.track.columns - 2])
    const a = applyMove(race, move(0, 1))
    expect(a.result.crossedFinish).toBe(true)
    expect(a.state.souls[0]?.finishOrder).toBe(1)
    const b = applyMove(a.state, move(1, 3))
    expect(b.state.souls[1]?.finishOrder).toBe(2)
    expect(b.state.nextFinishOrder).toBe(3)
  })
})

describe('fin de course et classement', () => {
  it("la course continue tant que personne n'a franchi l'arrivée", () => {
    const s = endTurn(withPositions([cfg.track.columns - 1, 0]))
    expect(s.finished).toBe(false)
    expect(s.turn).toBe(2)
  })
  it("la course s'arrête en fin de tour dès qu'une âme a franchi l'arrivée", () => {
    const s = endTurn(withPositions([cfg.track.columns, 0]))
    expect(s.finished).toBe(true)
    expect(s.turn).toBe(1)
  })
  it('classe par position puis par ordre de franchissement, avec ex æquo', () => {
    const race = withPositions([10, 12, 12, 3, 10])
    const souls = race.souls.map((s) => (s.id === 1 ? { ...s, finishOrder: 2 } : s.id === 2 ? { ...s, finishOrder: 1 } : s))
    const ranked = ranking({ ...race, souls })
    expect(ranked.map((r) => [r.soul.id, r.rank])).toEqual([[2, 1], [1, 2], [0, 3], [4, 3], [3, 5]])
  })
})

describe('course complète simulée', () => {
  it('se termine toujours, avec un classement complet', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed)
      let state = createRace(cfg)
      let guard = 0
      while (!state.finished && guard++ < 1000) {
        const r = rollPlayerDice(cfg, state.souls.length, rng, dice)
        for (const m of buildMoves(r, naturalCombinations(r), 'player')) state = applyMove(state, m).state
        for (let i = 0; i < cfg.opponent.rollsPerTurn; i++) {
          const pair = rollOpponentPair(cfg, state.souls.length, rng)
          for (const m of buildMoves(pair, naturalCombinations(pair), 'opponent')) state = applyMove(state, m).state
        }
        state = endTurn(state)
      }
      expect(state.finished).toBe(true)
      const ranked = ranking(state)
      expect(ranked).toHaveLength(cfg.souls.count)
      expect(ranked[0]?.rank).toBe(1)
      // Aucune occupation multiple hors ligne de départ et dernière case.
      const inner = state.souls.filter((s) => s.position > 0 && s.position < state.track.totalCells - 1).map((s) => s.position)
      expect(new Set(inner).size).toBe(inner.length)
    }
  })
})
