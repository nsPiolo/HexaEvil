import { describe, expect, it } from 'vitest'
import { settingsFor } from '../ai/ai'
import { createStartingDeck } from '../cards/deck'
import { createDie, upgradeDie } from '../dice/dice'
import { autoPlay } from '../rules/autoplay'
import { MatchDriver, type MatchParticipant } from '../rules/match'
import { createRng } from '../rules/random'
import type { TraceStep } from '../rules/trace'
import { config } from './helpers'

const cfg = config()

function play(seed: number, circleIndex = 0, count = 2) {
  const circle = cfg.circles[circleIndex]!
  const dice = (n: number) =>
    Array.from({ length: n }, () => upgradeDie(createDie(cfg.dice.startingFaces), circle.dieFaces))
  const participants: MatchParticipant[] = [
    {
      index: 0,
      name: 'Vous',
      isHuman: true,
      deck: createStartingDeck(cfg.cards),
      dice: dice(cfg.dice.playerDice),
      ai: null,
    },
  ]
  for (let d = 0; d < count - 1; d++) {
    participants.push({
      index: d + 1,
      name: cfg.ai.demons[d]?.name ?? `Démon ${d}`,
      isHuman: false,
      deck: createStartingDeck(cfg.cards),
      dice: dice(cfg.dice.demonDice),
      ai: settingsFor(cfg.ai, d, circleIndex),
    })
  }
  const rng = createRng(seed)
  const driver = new MatchDriver({ cfg, circleIndex, participants, rng, isCircleFinal: count > 2 })
  driver.advance()
  const { steps, result } = autoPlay(driver, { cfg, circleIndex, participants, rng })
  return { steps, result: result!, participants, circle }
}

const seeds = [1, 2, 3, 7, 11, 42, 99]

describe('S1 — séquence d’une partie', () => {
  it('déroule 3 batailles, la répartition, 2 batailles, le don', () => {
    const { steps } = play(1)
    const shape = steps
      .filter((s) => s.kind === 'duelStart' || s.kind === 'phaseStart' || s.kind === 'rewardsDrawn')
      .map((s) => (s.kind === 'phaseStart' ? `phase:${s.phase}` : s.kind === 'duelStart' ? `duel${s.series}` : `tirage${s.series}`))
    expect(shape).toEqual([
      'tirage0', 'duel0', 'duel0', 'duel0',
      'phase:charge',
      'tirage1', 'duel1', 'duel1',
      'phase:discharge',
    ])
  })

  it('B2 — n batailles, n + 1 récompenses tirées', () => {
    const { steps } = play(3)
    const draws = steps.filter((s) => s.kind === 'rewardsDrawn')
    expect(draws[0]!.offered).toHaveLength(cfg.battleSeries[0]!.duels + 1)
    expect(draws[1]!.offered).toHaveLength(cfg.battleSeries[1]!.duels + 1)
  })

  it('B3b — le 2e tirage exclut les 4 récompenses proposées à la 1re série', () => {
    for (const seed of seeds) {
      const { steps } = play(seed)
      const draws = steps.filter((s) => s.kind === 'rewardsDrawn')
      const first = new Set(draws[0]!.offered)
      for (const id of draws[1]!.offered) expect(first.has(id)).toBe(false)
    }
  })

  it('B5/B6 — un don s’applique à la sélection, pas plus tard', () => {
    for (const seed of seeds) {
      const { steps } = play(seed)
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i]!
        if (s.kind !== 'rewardApplied') continue
        // L'étape juste avant est forcément la prise, ou le choix de cible.
        const before = steps[i - 1]!
        expect(before.kind).toBe('rewardTaken')
        expect(s.amount).toBe(s.fromPot + s.fromOwner)
      }
    }
  })
})

describe('D9/D10 — sens et montant des transferts', () => {
  it.each(seeds)('graine %i : chaque manche respecte le barème', (seed) => {
    const { steps } = play(seed)
    let pot = 0
    let chips: number[] = []
    let potBefore = 0
    let chipsBefore: number[] = []

    for (const s of steps as TraceStep[]) {
      if (s.kind === 'phaseStart' || s.kind === 'rewardApplied') {
        pot = s.pot
        chips = [...s.chips]
      }
      if (s.kind === 'roundStart') {
        potBefore = pot
        chipsBefore = [...chips]
      }
      if (s.kind === 'roundResult') {
        const best = s.hands[s.best]!
        if (s.phase === 'charge') {
          // `D9a`/`D9b` : la pire main prend la valeur de la meilleure, plafonnée par le pot.
          expect(s.amount).toBe(Math.min(best.chipValue, potBefore))
          expect(s.pot).toBe(potBefore - s.amount)
          expect(s.chips[s.worst]).toBe(chipsBefore[s.worst]! + s.amount)
        } else if (s.best !== s.worst) {
          // `D10a`/`D10b` : la meilleure donne à la pire, plafonné par ce qu'elle a.
          expect(s.amount).toBe(Math.min(best.chipValue, chipsBefore[s.best]!))
          expect(s.chips[s.best]).toBe(chipsBefore[s.best]! - s.amount)
          expect(s.chips[s.worst]).toBe(chipsBefore[s.worst]! + s.amount)
        }
        pot = s.pot
        chips = [...s.chips]
      }
    }
  })

  it.each(seeds)('graine %i : J2 — les jetons sont conservés', (seed) => {
    const { steps, circle } = play(seed)
    for (const s of steps as TraceStep[]) {
      if (s.kind === 'roundResult' || s.kind === 'phaseStart' || s.kind === 'rewardApplied') {
        const total = s.pot + s.chips.reduce((a, b) => a + b, 0)
        expect(total).toBe(circle.pot)
      }
    }
  })

  it.each(seeds)('graine %i : la répartition se termine pot vide', (seed) => {
    const { steps } = play(seed)
    const end = steps.find((s) => s.kind === 'phaseEnd' && s.phase === 'charge')
    expect(end).toBeDefined()
    expect(end!.kind === 'phaseEnd' && end!.pot).toBe(0)
  })
})

describe('D10d/J5 — victoire et argent', () => {
  it.each(seeds)('graine %i : le premier à 0 gagne, l’argent est ce qu’on a donné', (seed) => {
    const { steps, result, participants } = play(seed)
    const firstOut = steps.find((s) => s.kind === 'out')
    expect(firstOut).toBeDefined()
    expect(result.ranking[0]).toBe(firstOut!.kind === 'out' && firstOut!.who)
    expect(result.ranking).toHaveLength(participants.length)
    expect(new Set(result.ranking).size).toBe(participants.length)

    const given = participants.map(() => 0)
    for (const s of steps as TraceStep[]) {
      if (s.kind === 'roundResult' && s.phase === 'discharge' && s.best !== s.worst) {
        given[s.best] = given[s.best]! + s.amount
      }
    }
    expect(result.money).toEqual(given)
  })

  it('une partie à 3 se termine aussi, et classe les trois', () => {
    for (const seed of seeds) {
      const { result } = play(seed, 0, 3)
      expect(result.ranking).toHaveLength(3)
      expect(new Set(result.ranking).size).toBe(3)
    }
  })
})

describe('D4 — le meneur plafonne les autres', () => {
  it.each(seeds)('graine %i : personne ne lance plus que le meneur', (seed) => {
    const { steps } = play(seed)
    let leader: number | null = null
    let leaderThrows = 0
    const throwsByPlayer = new Map<number, number>()
    for (const s of steps as TraceStep[]) {
      if (s.kind === 'roundStart') {
        leader = s.leader
        leaderThrows = 0
        throwsByPlayer.clear()
      }
      if (s.kind === 'turnEnd') {
        if (s.who === leader) leaderThrows = s.throws
        else expect(s.throws).toBeLessThanOrEqual(leaderThrows)
        throwsByPlayer.set(s.who, s.throws)
      }
    }
  })
})

describe('tous les Cercles tournent', () => {
  it.each(cfg.circles.map((c, i) => [c.n, i] as const))('Cercle %i', (_n, i) => {
    const { result, circle } = play(5, i, 2)
    expect(result.ranking).toHaveLength(2)
    expect(circle.pot).toBeGreaterThan(0)
  })
})

describe('B8/B12b — « Un dé en plus »', () => {
  it('n’ajoute un dé qu’au premier jet de chaque phase, puis en écarte un', () => {
    // On force la récompense sur le joueur en jouant assez de graines pour la
    // voir tomber, puis on vérifie la forme de la trace.
    let seen = 0
    for (let seed = 1; seed <= 60 && seen < 3; seed++) {
      const { steps } = play(seed)
      const owner = steps.find((s) => s.kind === 'rewardTaken' && s.id === 'extraDie')
      if (!owner || owner.kind !== 'rewardTaken') continue
      seen++
      const who = owner.who
      let phaseThrow = 0
      for (const s of steps) {
        if (s.kind === 'phaseStart') phaseThrow = 0
        if (s.kind === 'throw' && s.who === who) {
          phaseThrow++
          // Le dé en plus n'existe qu'au premier jet de la phase.
          if (phaseThrow === 1) expect(s.values.length).toBeLessThanOrEqual(5)
          else expect(s.values.length).toBeLessThanOrEqual(4)
        }
        if (s.kind === 'dropDie') {
          expect(s.who).toBe(who)
          expect(s.values).toHaveLength(s.before.length - 1)
          // On n'écarte jamais un dé retenu : la main du jet est préservée.
          expect(s.hand.chipValue).toBeGreaterThan(0)
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
