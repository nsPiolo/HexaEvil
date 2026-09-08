import { describe, expect, it } from 'vitest'
import { engrave } from '../dice/dice'
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
} from '../rules/run'
import { createRng } from '../rules/random'
import type { MatchResult } from '../rules/match'
import { config } from './helpers'

const cfg = config()
const win: MatchResult = { ranking: [0, 1], money: [7, 0], rounds: 10, throws: 40, humanWon: true }
const loss: MatchResult = { ranking: [1, 0], money: [3, 0], rounds: 10, throws: 40, humanWon: false }

describe('R6 — une défaite termine le run', () => {
  it('tue le run et n’efface pas l’argent déjà gagné de la partie', () => {
    const run = createRun(cfg)
    finishMatch(run, win)
    expect(run.status).toBe('playing')
    const out = finishMatch(run, loss)
    expect(out.status).toBe('dead')
    expect(run.status).toBe('dead')
    expect(run.money).toBe(10)
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
    expect(run.dice[0]!.faces).toEqual([1, 2, 4, 4, 5, 6])
    for (let w = 0; w < currentCircle(run).winsRequired; w++) finishMatch(run, win)
    expect(currentCircle(run).n).toBe(2)
    expect(run.dice[0]!.faces).toHaveLength(6) // le Cercle 2 est encore en D6
    for (let w = 0; w < currentCircle(run).winsRequired; w++) finishMatch(run, win)
    expect(currentCircle(run).n).toBe(3)
    expect(run.dice[0]!.faces).toEqual([7, 1, 2, 4, 4, 5, 6, 8])
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

  it('A7 — la gravure refuse une cinquième face identique', () => {
    const run = createRun(cfg)
    run.forgePoints = 10
    applyEngrave(run, 'engraveOne', [{ dieIndex: 0, faceIndex: 0, value: 4 }])
    applyEngrave(run, 'engraveOne', [{ dieIndex: 0, faceIndex: 1, value: 4 }])
    applyEngrave(run, 'engraveOne', [{ dieIndex: 0, faceIndex: 2, value: 4 }])
    expect(run.dice[0]!.faces.filter((f) => f === 4)).toHaveLength(4)
    expect(() => applyEngrave(run, 'engraveOne', [{ dieIndex: 0, faceIndex: 4, value: 4 }])).toThrow(/A7/)
    expect(run.forgePoints).toBe(7)
  })

  it('engraveAll grave les trois dés pour 2 points', () => {
    const run = createRun(cfg)
    run.forgePoints = 2
    // `A2` : « une face de chacun de ses dés » — le joueur en a 4 (`D3b`).
    expect(run.dice).toHaveLength(cfg.dice.playerDice)
    applyEngrave(
      run,
      'engraveAll',
      run.dice.map((_, i) => ({ dieIndex: i, faceIndex: 0, value: 4 })),
    )
    expect(run.forgePoints).toBe(0)
    for (const die of run.dice) expect(die.faces[0]).toBe(4)
  })
})
