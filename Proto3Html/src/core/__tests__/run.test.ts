import { describe, expect, it } from 'vitest'
import { engrave, values } from '../dice/dice'
import {
  applyEngrave,
  applyShopCards,
  createRun,
  currentCircle,
  finishMatch,
  isCircleFinal,
  openShopOption,
  participantCount,
  shopBlockedReason,
  yieldsForgePoint,
} from '../rules/run'
import { createRng } from '../rules/random'
import type { MatchResult } from '../rules/match'
import { config } from './helpers'

const cfg = config()
const zero = { bonusMoney: [0, 0], bonusForge: [0, 0] }
const win: MatchResult = {
  ranking: [0, 1],
  money: [7, 0],
  ...zero,
  rounds: 10,
  throws: 40,
  humanWon: true,
  humanFirst: true,
  humanPlace: 0,
}
const loss: MatchResult = {
  ranking: [1, 0],
  money: [3, 0],
  ...zero,
  rounds: 10,
  throws: 40,
  humanWon: false,
  humanFirst: false,
  humanPlace: 1,
}

describe('R6 — une défaite termine le run', () => {
  it('tue le run et n’efface pas l’argent déjà gagné de la partie', () => {
    const run = createRun(cfg)
    finishMatch(run, win)
    expect(run.status).toBe('playing')
    const out = finishMatch(run, loss)
    expect(out.status).toBe('dead')
    expect(run.status).toBe('dead')
    // 7 + la prime de victoire, puis 3 sans prime : la défaite ne prime pas.
    expect(run.money).toBe(7 + cfg.winBonusMoney + 3)
  })
})

describe('J9 — la rencontre gagnée paie une prime fixe', () => {
  it('ajoute la prime à ce que les jetons ont rapporté, et seulement en gagnant', () => {
    const run = createRun(cfg)
    const won = finishMatch(run, win)
    expect(won.winBonus).toBe(cfg.winBonusMoney)
    expect(won.money).toBe(7 + cfg.winBonusMoney)

    const lost = finishMatch(run, loss)
    expect(lost.winBonus).toBe(0)
    expect(lost.money).toBe(3)
  })
})

describe('J7 — le point de forge est annoncé avant d’être joué', () => {
  it('la rencontre qui le rapporte est connue d’avance', () => {
    const run = createRun(cfg)
    const n = cfg.forgePointEveryNMatches
    for (let i = 0; i < n * 3; i++) {
      // Ce que la table annonce doit être ce que la rencontre paie.
      const announced = yieldsForgePoint(run)
      const out = finishMatch(run, win)
      expect(out.forgeGained > 0).toBe(announced)
    }
  })
})

describe('R6c — 59 victoires consécutives', () => {
  it('descend les 9 Cercles et gagne', () => {
    const run = createRun(cfg)
    let matches = 0
    while (run.status === 'playing') {
      finishMatch(run, win)
      matches++
      expect(matches).toBeLessThan(200)
    }
    expect(run.status).toBe('won')
    expect(matches).toBe(cfg.circles.reduce((n, c) => n + c.winsRequired, 0))
    expect(matches).toBe(59)
  })
})

describe('R12 — participants', () => {
  it('duel partout, sauf la dernière partie du Cercle', () => {
    const run = createRun(cfg)
    const required = currentCircle(run).winsRequired
    for (let w = 0; w < required - 1; w++) {
      expect(isCircleFinal(run)).toBe(false)
      expect(participantCount(run)).toBe(cfg.participants.default)
      finishMatch(run, win)
    }
    expect(isCircleFinal(run)).toBe(true)
    expect(participantCount(run)).toBe(cfg.participants.circleFinal)
  })
})

describe('J7 — points de forge', () => {
  it('un point toutes les 2 parties, sans discontinuité au changement de Cercle', () => {
    const run = createRun(cfg)
    const gains: number[] = []
    for (let i = 0; i < 10; i++) gains.push(finishMatch(run, win).forgeGained)
    expect(gains).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
    expect(run.forgePoints).toBe(5)
  })
})

describe('F6 — montée de dé au changement de Cercle', () => {
  it('passe en D8 et conserve la gravure', () => {
    const run = createRun(cfg)
    run.dice[0] = engrave(run.dice[0]!, 2, 4)
    expect(values(run.dice[0]!)).toEqual([1, 2, 4, 4, 5, 6])
    for (let w = 0; w < currentCircle(run).winsRequired; w++) finishMatch(run, win)
    expect(currentCircle(run).n).toBe(2)
    expect(run.dice[0]!.faces).toHaveLength(6) // le Cercle 2 est encore en D6
    for (let w = 0; w < currentCircle(run).winsRequired; w++) finishMatch(run, win)
    expect(currentCircle(run).n).toBe(3)
    expect(values(run.dice[0]!)).toEqual([7, 1, 2, 4, 4, 5, 6, 8])
  })
})

describe('boutique', () => {
  it('K4 — refuse de descendre sous le plancher de deck', () => {
    const run = createRun(cfg)
    run.money = 999
    run.deck = run.deck.slice(0, cfg.cards.minDeckSize)
    expect(shopBlockedReason(run, 'removeOne')).toContain('plancher')
    expect(shopBlockedReason(run, 'clone')).toBeNull()
  })

  it('refuse une option qu’on ne peut pas payer', () => {
    const run = createRun(cfg)
    expect(shopBlockedReason(run, 'clone')).toContain("d'argent")
    expect(shopBlockedReason(run, 'engraveOne')).toContain('forge')
  })

  it('C13 — on ne peut pas augmenter un As', () => {
    const run = createRun(cfg)
    run.money = 50
    const rng = createRng(4)
    const session = openShopOption(run, 'plusOneTwo', rng)
    const as = run.deck.find((c) => c.value === 14)!
    const autre = session.cards.find((c) => c.value < 14)!
    const withAs = { option: session.option, cards: [as, autre] }
    expect(() => applyShopCards(run, withAs, { uids: [as.uid, autre.uid] })).toThrow(/As/)
  })

  it('clone ajoute une carte et coûte son prix', () => {
    const run = createRun(cfg)
    run.money = 20
    const session = openShopOption(run, 'clone', createRng(9))
    const target = session.cards[0]!
    applyShopCards(run, session, { uids: [target.uid] })
    expect(run.deck).toHaveLength(53)
    expect(run.money).toBe(15)
    expect(run.deck.filter((c) => c.value === target.value && c.suit === target.suit)).toHaveLength(2)
  })

  it('recolor repeint les 5 cartes tirées', () => {
    const run = createRun(cfg)
    run.money = 20
    const session = openShopOption(run, 'recolor', createRng(3))
    applyShopCards(run, session, { uids: [], suit: 'spades' })
    for (const c of session.cards) {
      expect(run.deck.find((d) => d.value === c.value && d.suit === 'spades')).toBeDefined()
    }
    expect(run.money).toBe(10)
  })

  it('graver un effet laisse la valeur, graver une valeur laisse l’effet (F11)', () => {
    const run = createRun(cfg)
    run.forgePoints = 10
    const avant = run.dice[0]!.faces[0]!.value
    applyEngrave(run, 'engraveOne', [
      { dieIndex: 0, faceIndex: 0, option: { kind: 'effect', effect: 'money' } },
    ])
    expect(run.dice[0]!.faces[0]).toEqual({ value: avant, effect: 'money' })
    applyEngrave(run, 'engraveOne', [
      { dieIndex: 0, faceIndex: 0, option: { kind: 'value', value: 5 } },
    ])
    expect(run.dice[0]!.faces[0]).toEqual({ value: 5, effect: 'money' })
    expect(run.forgePoints).toBe(8)
  })

  it('plus aucun plafond de faces identiques (A7 retiré)', () => {
    const run = createRun(cfg)
    run.forgePoints = 20
    for (let f = 0; f < 6; f++) {
      applyEngrave(run, 'engraveOne', [
        { dieIndex: 0, faceIndex: f, option: { kind: 'value', value: 4 } },
      ])
    }
    expect(values(run.dice[0]!)).toEqual([4, 4, 4, 4, 4, 4])
  })

  it('engraveAll grave une face sur chacun des dés du joueur', () => {
    const run = createRun(cfg)
    run.forgePoints = 2
    expect(run.dice).toHaveLength(cfg.dice.playerDice)
    applyEngrave(
      run,
      'engraveAll',
      run.dice.map((_, i) => ({
        dieIndex: i,
        faceIndex: 0,
        option: { kind: 'effect' as const, effect: 'wild' as const },
      })),
    )
    expect(run.forgePoints).toBe(0)
    for (const die of run.dice) expect(die.faces[0]?.effect).toBe('wild')
  })
})
