import { describe, expect, it } from 'vitest'
import { loadConfig } from '../config/load'
import rawConfig from '../../../config/race.json'
import { BET_TYPES, betRefusal, betUnlocked, bettingClosed, cancelBet, currentMultiplier, effectiveBase, isSameBet, evaluateBet, potentialPayout, raceProgress, settleBets, slotCount, unlockedBetTypes, type Bet } from '../rules/bets'
import { createRace, ranking, type RaceState } from '../rules/race'

const cfg = loadConfig(rawConfig)

function withPositions(positions: number[], finishOrders: (number | null)[] = []): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: positions.length } })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: positions[i] ?? 0, finishOrder: finishOrders[i] ?? null })) }
}

// Classement : 2 (1er), 0 (2e), 4 (3e), 1 (4e), 3 (5e)
const ranked = ranking(withPositions([12, 5, 15, 1, 8], [null, null, 1, null, null]))
const bet = (type: Bet['type'], souls: number[]) => ({ type, souls })

describe('évaluation des dix paris', () => {
  it('paris simples', () => {
    expect(evaluateBet(bet('winner', [2]), ranked)).toBe(true)
    expect(evaluateBet(bet('winner', [0]), ranked)).toBe(false)
    expect(evaluateBet(bet('top3', [4]), ranked)).toBe(true)
    expect(evaluateBet(bet('top3', [1]), ranked)).toBe(false)
    expect(evaluateBet(bet('notTop3', [1]), ranked)).toBe(true)
    expect(evaluateBet(bet('notTop3', [2]), ranked)).toBe(false)
    expect(evaluateBet(bet('last', [3]), ranked)).toBe(true)
    expect(evaluateBet(bet('last', [1]), ranked)).toBe(false)
  })
  it('paris intermédiaires', () => {
    expect(evaluateBet(bet('podiumAnyOrder', [4, 2, 0]), ranked)).toBe(true)
    expect(evaluateBet(bet('podiumAnyOrder', [4, 2, 1]), ranked)).toBe(false)
    expect(evaluateBet(bet('twoInTop3', [0, 4]), ranked)).toBe(true)
    expect(evaluateBet(bet('twoInTop3', [0, 3]), ranked)).toBe(false)
    expect(evaluateBet(bet('duel', [0, 4]), ranked)).toBe(true)
    expect(evaluateBet(bet('duel', [4, 0]), ranked)).toBe(false)
  })
  it('paris avancés', () => {
    expect(evaluateBet(bet('podiumExact', [2, 0, 4]), ranked)).toBe(true)
    expect(evaluateBet(bet('podiumExact', [2, 4, 0]), ranked)).toBe(false)
    expect(evaluateBet(bet('fullRankingExact', [2, 0, 4, 1, 3]), ranked)).toBe(true)
    expect(evaluateBet(bet('fullRankingExact', [2, 0, 4, 3, 1]), ranked)).toBe(false)
    expect(evaluateBet(bet('winnerAndLast', [2, 3]), ranked)).toBe(true)
    expect(evaluateBet(bet('winnerAndLast', [2, 1]), ranked)).toBe(false)
  })
  it("les ex æquo font échouer les paris exacts mais pas les paris de place", () => {
    const tied = ranking(withPositions([10, 10, 3]))
    expect(tied.map((r) => r.rank)).toEqual([1, 1, 3])
    expect(evaluateBet(bet('winner', [0]), tied)).toBe(true)
    expect(evaluateBet(bet('winner', [1]), tied)).toBe(true)
    expect(evaluateBet(bet('podiumExact', [0, 1, 2]), tied)).toBe(false)
    expect(evaluateBet(bet('duel', [0, 1]), tied)).toBe(false)
  })
})

describe('validité d’un pari', () => {
  const race = withPositions([0, 0, 5, 0, 0])
  it('accepte un pari valide', () => {
    expect(betRefusal(race, 'winner', [0], 10, 100)).toBeNull()
  })
  it("ferme tous les paris dès qu'une âme atteint le seuil, quelle que soit l'âme visée", () => {
    const closedRace = withPositions([0, 0, 9, 0, 0]) // seuil à 9 pour 14 cases
    expect(bettingClosed(race)).toBe(false)
    expect(bettingClosed(closedRace)).toBe(true)
    expect(betRefusal(closedRace, 'winner', [0], 10, 100)).toMatch(/seuil/)
    expect(betRefusal(closedRace, 'winner', [2], 10, 100)).toMatch(/seuil/)
  })
  it('le Sablier repousse le seuil à 70 %', () => {
    const sablier = createRace({ ...cfg, souls: { ...cfg.souls, count: 5 } }, { betThresholdRatio: 0.7 })
    expect(sablier.track.betThresholdColumn).toBe(Math.ceil(cfg.track.columns * 0.7))
    const soul9 = { ...sablier, souls: sablier.souls.map((s) => (s.id === 2 ? { ...s, position: 9 } : s)) }
    expect(bettingClosed(soul9)).toBe(false)
  })
  it('refuse un pari identique déjà posé', () => {
    const existing = [{ type: 'winner' as const, souls: [0] }, { type: 'twoInTop3' as const, souls: [1, 3] }, { type: 'duel' as const, souls: [0, 1] }]
    expect(betRefusal(race, 'winner', [0], 5, 100, existing)).toMatch(/déjà/)
    expect(betRefusal(race, 'winner', [1], 5, 100, existing)).toBeNull()
    // Non ordonné : l'ordre des âmes ne compte pas.
    expect(betRefusal(race, 'twoInTop3', [3, 1], 5, 100, existing)).toMatch(/déjà/)
    // Ordonné : l'ordre inverse est un autre pari.
    expect(betRefusal(race, 'duel', [1, 0], 5, 100, existing)).toBeNull()
    expect(isSameBet({ type: 'duel', souls: [0, 1] }, { type: 'duel', souls: [0, 1] })).toBe(true)
    expect(isSameBet({ type: 'winner', souls: [0] }, { type: 'last', souls: [0] })).toBe(false)
  })
  it('refuse sans argent, sans mise, avec doublons ou nombre d’âmes incorrect', () => {
    expect(betRefusal(race, 'winner', [0], 10, 5)).toMatch(/argent/)
    expect(betRefusal(race, 'winner', [0], 0, 100)).toMatch(/mise/)
    expect(betRefusal(race, 'duel', [0, 0], 10, 100)).toMatch(/une fois/)
    expect(betRefusal(race, 'duel', [0], 10, 100)).toMatch(/1\/2/)
    expect(betRefusal(race, 'fullRankingExact', [0, 1, 3, 4], 10, 100)).toMatch(/4\/5/)
  })
  it('refuse une course terminée', () => {
    expect(betRefusal({ ...race, finished: true }, 'winner', [0], 10, 100)).toMatch(/terminée/)
  })
  it('le classement complet exige toutes les âmes', () => {
    const def = BET_TYPES.find((t) => t.id === 'fullRankingExact')!
    expect(slotCount(def, 5)).toBe(5)
    expect(slotCount(def, 7)).toBe(7)
  })
})

describe('déblocage des paris par niveau du stagiaire', () => {
  const unlock = cfg.economy.betUnlockLevel
  it('au niveau 0, seuls les paris simples et le duel sont ouverts', () => {
    const open = unlockedBetTypes(0, unlock).map((t) => t.id)
    expect(open).toEqual(['winner', 'top3', 'notTop3', 'last', 'duel'])
  })
  it('les gros multiplicateurs arrivent avec les grades', () => {
    expect(betUnlocked('fullRankingExact', 3, unlock)).toBe(false)
    expect(betUnlocked('fullRankingExact', 4, unlock)).toBe(true)
    expect(betUnlocked('podiumExact', 2, unlock)).toBe(false)
    expect(betUnlocked('podiumExact', 3, unlock)).toBe(true)
    expect(unlockedBetTypes(99, unlock)).toHaveLength(BET_TYPES.length)
  })
  it('la plus grosse cote accessible croît avec le niveau, le ×80 en dernier', () => {
    const maxAt = (level: number): number => Math.max(...unlockedBetTypes(level, unlock).map((t) => cfg.economy.multipliers[t.id]))
    const levels = Math.max(...Object.values(unlock))
    for (let l = 1; l <= levels; l++) expect(maxAt(l)).toBeGreaterThanOrEqual(maxAt(l - 1))
    expect(maxAt(0)).toBeLessThan(10)
    expect(unlock.fullRankingExact).toBe(levels)
  })
  it('la config refuse un jeu sans pari au niveau 0', () => {
    const raw = JSON.parse(JSON.stringify(rawConfig)) as { economy: { betUnlockLevel: Record<string, number> } }
    for (const k of Object.keys(raw.economy.betUnlockLevel)) if (k !== '_comment') raw.economy.betUnlockLevel[k] = 1
    expect(() => loadConfig(raw)).toThrow(/betUnlockLevel/)
  })
})

describe('décote selon l’avancement', () => {
  const decay = { exponent: 1.5, minMultiplier: 1.2 }
  it('vaut la cote de base au départ et plancher au seuil', () => {
    expect(currentMultiplier(3.5, 0, decay)).toBe(3.5)
    expect(currentMultiplier(3.5, 1, decay)).toBe(1.2)
    expect(currentMultiplier(80, 1, decay)).toBe(1.2)
  })
  it('décroît avec l’avancement', () => {
    const steps = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => currentMultiplier(7, p, decay))
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeLessThan(steps[i - 1]!)
    expect(currentMultiplier(7, 0.5, { exponent: 1, minMultiplier: 1.2 })).toBe(4)
  })
  it("l'avancement suit l'âme de tête jusqu'au seuil", () => {
    const race = withPositions([0, 0, 0])
    expect(raceProgress(race)).toBe(0)
    const half = race.track.betThresholdColumn / 2
    expect(raceProgress(withPositions([0, half, 0]))).toBeCloseTo(0.5)
    expect(raceProgress(withPositions([0, race.track.betThresholdColumn + 3, 0]))).toBe(1)
  })
})

describe('règlement', () => {
  it('rend mise × multiplicateur sur les gagnants, rien sur les perdants', () => {
    const bets: Bet[] = [
      { id: 1, type: 'winner', souls: [2], stake: 10, multiplier: 3.5, turn: 0, status: 'open', payout: 0 },
      { id: 2, type: 'last', souls: [0], stake: 20, multiplier: 2, turn: 3, status: 'open', payout: 0 },
    ]
    const s = settleBets(bets, ranked)
    expect(s.staked).toBe(30)
    expect(s.returned).toBe(potentialPayout(10, 3.5))
    expect(s.bets.map((b) => b.status)).toEqual(['won', 'lost'])
    expect(s.bets[1]?.payout).toBe(0)
    expect(s.refund).toBe(0)
  })
  it('le Livre des comptes rembourse la moitié d’un pari perdu tiré au sort', () => {
    // Les deux paris sont perdus (vainqueur = 2, dernier = 3).
    const bets: Bet[] = [
      { id: 1, type: 'winner', souls: [0], stake: 10, multiplier: 3.5, turn: 0, status: 'open', payout: 0 },
      { id: 2, type: 'last', souls: [2], stake: 20, multiplier: 2, turn: 3, status: 'open', payout: 0 },
    ]
    const first = settleBets(bets, ranked, { refundRatio: 0.5, pickLost: () => 0 })
    expect(first.refund).toBe(5)
    expect(first.returned).toBe(5)
    const second = settleBets(bets, ranked, { refundRatio: 0.5, pickLost: (n) => n - 1 })
    expect(second.refund).toBe(10)
    // Le tirage ne porte que sur les perdants : avec un seul pari perdu, c'est lui.
    const won: Bet = { id: 3, type: 'winner', souls: [2], stake: 50, multiplier: 3.5, turn: 0, status: 'open', payout: 0 }
    const mixed = settleBets([won, bets[0]!], ranked, { refundRatio: 0.5, pickLost: () => 0 })
    expect(mixed.refund).toBe(5)
    // Sans pari perdu, rien à rembourser.
    expect(settleBets([won], ranked, { refundRatio: 0.5, pickLost: () => 0 }).refund).toBe(0)
  })
  it('le Fer à cheval modifie la cote de base du Vainqueur et du Dernier seulement', () => {
    const mods = { winnerFactor: 1.5, lastFactor: 0.5 }
    expect(effectiveBase('winner', 3.5, mods)).toBe(5.25)
    expect(effectiveBase('last', 3.5, mods)).toBe(1.75)
    expect(effectiveBase('duel', 1.8, mods)).toBe(1.8)
    expect(effectiveBase('winner', 3.5, {})).toBe(3.5)
  })
  it('la config impose des multiplicateurs supérieurs à 1', () => {
    const raw = JSON.parse(JSON.stringify(rawConfig))
    raw.economy.multipliers.winner = 1
    expect(() => loadConfig(raw)).toThrow(/multipliers\.winner/)
  })
})

describe('retrait d’un pari en préparation (cancelBet)', () => {
  const bets: Bet[] = [
    { id: 1, type: 'winner', souls: [2], stake: 10, multiplier: 3.5, turn: 0, status: 'open', payout: 0 },
    { id: 2, type: 'duel', souls: [0, 1], stake: 20, multiplier: 1.8, turn: 0, status: 'open', payout: 0 },
  ]
  it('rembourse exactement la mise et supprime le pari', () => {
    const r = cancelBet(bets, 2, true)
    expect(typeof r).toBe('object')
    if (typeof r === 'string') throw new Error(r)
    expect(r.refund).toBe(20)
    expect(r.bets.map((b) => b.id)).toEqual([1])
    // Le tableau d'origine n'est pas touché.
    expect(bets).toHaveLength(2)
  })
  it('refuse dès que la course est lancée', () => {
    expect(cancelBet(bets, 1, false)).toMatch(/lancée/)
  })
  it('refuse un pari inconnu ou déjà réglé', () => {
    expect(cancelBet(bets, 99, true)).toMatch(/introuvable/)
    const settled: Bet[] = [{ ...bets[0]!, status: 'won', payout: 35 }]
    expect(cancelBet(settled, 1, true)).toMatch(/réglé/)
  })
})
