import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../config/load'
import type { RaceConfig } from '../config/schema'
import rawConfig from '../../../config/race.json'
import {
  applyMove,
  buildMoves,
  chooseCell,
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

/** Piste à `lanes` couloirs ; chaque âme est donnée par [colonne, couloir]. */
function withLanes(cells: [number, number][], lanes: number, blocked: { column: number; lane: number }[] = []): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: cells.length } }, { lanes, blocked })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: cells[i]![0], lane: cells[i]![1] })) }
}

describe('couloirs : choix de la case (GDD §2.6)', () => {
  const blocked = [{ column: 4, lane: 1 }]
  it('un seul couloir : tout le monde en couloir 0, règles d’origine', () => {
    const race = createRace(cfg)
    expect(race.track.lanes).toBe(1)
    expect(race.souls.every((s) => s.lane === 0)).toBe(true)
  })
  it('au départ, les âmes se répartissent sur les couloirs en commençant par le bas', () => {
    const race = createRace(cfg, { soulCount: 6, lanes: 2 })
    expect(race.souls.map((s) => s.lane)).toEqual([0, 1, 0, 1, 0, 1])
  })
  it('atterrit dans son couloir quand la case est vide', () => {
    const race = withLanes([[2, 1], [5, 0]], 2)
    const { state, result } = applyMove(race, move(0, 3))
    expect(result.to).toBe(5)
    expect(result.toLane).toBe(1)
    expect(result.detour).toBeNull()
    expect(result.collision).toBeNull()
    expect(state.souls[0]?.lane).toBe(1)
  })
  it('case occupée : se décale sur une case vide de la colonne, la plus en bas', () => {
    const race = withLanes([[2, 1], [5, 1], [0, 2]], 3)
    const { result } = applyMove(race, move(0, 3))
    expect(result.to).toBe(5)
    expect(result.toLane).toBe(0)
    expect(result.detour).toBe('occupied')
    expect(result.collision).toBeNull()
  })
  it('case bloquée : se décale sur la case vide la plus en bas', () => {
    const race = withLanes([[1, 1], [0, 0]], 2, blocked)
    const { result } = applyMove(race, move(0, 3))
    expect(result.to).toBe(4)
    expect(result.toLane).toBe(0)
    expect(result.detour).toBe('blocked')
  })
  it('case bloquée et colonne pleine : percute l’occupante de la case la plus en bas', () => {
    const race = withLanes([[1, 1], [4, 0]], 2, blocked)
    const { state, result } = applyMove(race, move(0, 3))
    expect(result.collision).toEqual({ kind: 'jump', over: [1] })
    expect(result.to).toBe(5)
    // Après le saut, elle rechoisit sa case : son couloir (1) est libre en colonne 5.
    expect(state.souls[0]?.lane).toBe(1)
    expect(state.souls[1]?.position).toBe(4)
  })
  it('colonne pleine sans case bloquée : percute dans son couloir et saute devant', () => {
    const race = withLanes([[2, 0], [5, 0], [5, 1]], 2)
    const { state, result } = applyMove(race, move(0, 3))
    expect(result.collision).toEqual({ kind: 'jump', over: [1] })
    expect(state.souls[0]?.position).toBe(6)
    expect(state.souls[0]?.lane).toBe(0)
  })
  it('cascade : la colonne suivante est pleine aussi', () => {
    const race = withLanes([[2, 0], [5, 0], [5, 1], [6, 0], [6, 1]], 2)
    const { state, result } = applyMove(race, move(0, 3))
    expect(result.collision).toEqual({ kind: 'jump', over: [1, 3] })
    expect(state.souls[0]?.position).toBe(7)
  })
  it('reculer sur une colonne avec une case vide : pas d’échange', () => {
    const race = withLanes([[6, 0], [5, 0]], 2)
    const { state, result } = applyMove(race, move(0, -1))
    expect(result.collision).toBeNull()
    expect(state.souls[0]?.position).toBe(5)
    expect(state.souls[0]?.lane).toBe(1)
    expect(result.detour).toBe('occupied')
  })
  it('reculer sur une colonne pleine : échange de place, couloirs compris', () => {
    const race = withLanes([[6, 1], [5, 0], [5, 1]], 2)
    const { state, result } = applyMove(race, move(0, -1))
    expect(result.collision).toEqual({ kind: 'swap', with: 2, otherFrom: 5, otherTo: 6 })
    expect(state.souls[0]).toMatchObject({ position: 5, lane: 1 })
    expect(state.souls[2]).toMatchObject({ position: 6, lane: 1 })
  })
  it('chooseCell : plusieurs cases vides, on prend la plus en bas', () => {
    const race = withLanes([[3, 2]], 3, [{ column: 5, lane: 2 }])
    expect(chooseCell(race.track, race.souls, 5, 2, 0)).toEqual({ lane: 0, occupant: null, detour: 'blocked' })
    expect(chooseCell(race.track, race.souls, 4, 2, 0)).toEqual({ lane: 2, occupant: null, detour: null })
  })
  it('dans une colonne, l’âme la plus en bas est devant ; plus d’ex æquo hors cases partagées', () => {
    const race = withLanes([[10, 1], [10, 0], [12, 1], [3, 0]], 2)
    const ranked = ranking(race)
    expect(ranked.map((r) => [r.soul.id, r.rank])).toEqual([[2, 1], [1, 2], [0, 3], [3, 4]])
  })
  it('course complète au cercle 3 : jamais sur une case bloquée, une âme par case hors départ et dernière case', () => {
    const circle = cfg.run.circles[2]!
    expect(circle.lanes).toBe(2)
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed)
      let state = createRace(cfg, { soulCount: circle.souls, lanes: circle.lanes, blocked: circle.blocked })
      let guard = 0
      while (!state.finished && guard++ < 1000) {
        const r = rollPlayerDice(cfg, state.souls.length, rng, dice)
        for (const m of buildMoves(r, naturalCombinations(r), 'player')) state = applyMove(state, m).state
        const pair = rollOpponentPair(cfg, state.souls.length, rng)
        for (const m of buildMoves(pair, naturalCombinations(pair), 'opponent')) state = applyMove(state, m).state
        state = endTurn(state)
        for (const s of state.souls) {
          expect(circle.blocked.some((b) => b.column === s.position && b.lane === s.lane)).toBe(false)
          expect(s.lane).toBeLessThan(circle.lanes)
        }
        const inner = state.souls.filter((s) => s.position > 0 && s.position < state.track.totalCells - 1).map((s) => `${s.position}:${s.lane}`)
        expect(new Set(inner).size).toBe(inner.length)
      }
      expect(state.finished).toBe(true)
      expect(ranking(state)).toHaveLength(circle.souls)
    }
  })
})

describe('couloirs et cases bloquées : config', () => {
  type Raw = { run: { circles: { souls: number; lanes: number; blocked: { column: number; lane: number }[] }[] }; track: { columns: number } }
  const clone = (): Raw => JSON.parse(JSON.stringify(rawConfig)) as Raw
  it('la config du proto suit le GDD : 1 couloir au cercle 1, 2 au cercle 2, 4 cases bloquées au cercle 3', () => {
    const c = loadConfig(rawConfig).run.circles
    expect(c[0]!.lanes).toBe(1)
    expect(c[1]!.lanes).toBe(2)
    expect(c[2]!.lanes).toBe(2)
    expect(c[2]!.blocked.map((b) => b.column)).toEqual([4, 5, 8, 9])
    for (const circle of c) expect(circle.lanes).toBe(Math.max(1, circle.souls - 4))
  })
  it('refuse un couloir hors piste, une colonne entièrement bloquée ou un doublon', () => {
    const lane = clone()
    lane.run.circles[2]!.blocked[0]!.lane = 2
    expect(() => loadConfig(lane)).toThrow(/lane/)
    const column = clone()
    column.run.circles[2]!.blocked[0]!.column = column.track.columns + 1
    expect(() => loadConfig(column)).toThrow(/column/)
    const full = clone()
    full.run.circles[2]!.blocked.push({ column: 4, lane: 0 })
    expect(() => loadConfig(full)).toThrow(/entièrement bloquée/)
    const dup = clone()
    dup.run.circles[2]!.blocked.push({ column: 4, lane: 1 })
    expect(() => loadConfig(dup)).toThrow(/double/)
    const tooMany = clone()
    tooMany.run.circles[0]!.lanes = 6
    expect(() => loadConfig(tooMany)).toThrow(/couloirs/)
  })
})
