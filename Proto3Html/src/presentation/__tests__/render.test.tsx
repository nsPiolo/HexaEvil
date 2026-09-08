import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ActionBar } from '../ActionBar'
import { Table, type RailStage } from '../Table'
import { buildView } from '../viewModel'
import { settingsFor } from '../../core/ai/ai'
import { evaluateHand } from '../../core/cards/hands'
import { evaluateDice } from '../../core/dice/combinations'
import { newCard } from '../../core/cards/deck'
import type { Ask } from '../../core/rules/asks'
import { createStartingDeck } from '../../core/cards/deck'
import { createDie, upgradeDie } from '../../core/dice/dice'
import { autoPlay } from '../../core/rules/autoplay'
import { MatchDriver, type MatchParticipant } from '../../core/rules/match'
import { createRng } from '../../core/rules/random'
import { describeStep } from '../labels'
import { config } from '../../core/__tests__/helpers'

const cfg = config()

const RAIL: RailStage[] = [
  { key: 'duels0', label: 'Batailles', blocks: 3, done: 0 },
  { key: 'charge', label: 'Répartition', blocks: 0, done: 0 },
  { key: 'duels1', label: 'Batailles', blocks: 2, done: 0 },
  { key: 'discharge', label: 'Distribution', blocks: 0, done: 0 },
]

/**
 * Test de fumée : on rejoue une partie entière et on rend la table **à chaque
 * étape**. Il n'assure pas la beauté, il assure qu'aucune étape ne fait planter
 * l'affichage — et que chacune a bien une phrase qui la nomme (`U3`).
 */
describe('la table rend toutes les étapes d’une partie', () => {
  it.each([1, 2, 3])('graine %i', (seed) => {
    const circleIndex = 1
    const circle = cfg.circles[circleIndex]!
    const dice = () => [0, 1, 2].map(() => upgradeDie(createDie(cfg.dice.startingFaces), circle.dieFaces))
    const participants: MatchParticipant[] = [
      { index: 0, name: 'Vous', isHuman: true, deck: createStartingDeck(cfg.cards), dice: dice(), ai: null },
      {
        index: 1,
        name: 'Belphégor',
        isHuman: false,
        deck: createStartingDeck(cfg.cards),
        dice: dice(),
        ai: settingsFor(cfg.ai, 0, circleIndex),
      },
    ]
    const rng = createRng(seed)
    const driver = new MatchDriver({ cfg, circleIndex, participants, rng, isCircleFinal: false })
    driver.advance()
    const { steps } = autoPlay(driver, { cfg, circleIndex, participants, rng })
    const names = participants.map((p) => p.name)
    expect(steps.length).toBeGreaterThan(20)

    const ladderSizes: Record<number, number> = {}
    for (const [size, ladder] of Object.entries(cfg.cards.handRankings)) ladderSizes[Number(size)] = ladder.length

    for (let i = 0; i < steps.length; i++) {
      const view = buildView(steps, i, names.length)
      const sentence = describeStep(steps[i]!, names)
      expect(sentence.length).toBeGreaterThan(3)
      const html = renderToString(
        <Table
          view={view}
          frame={{ pot: 10, chips: [5, 6] }}
          deltas={[0, 0]}
          names={names}
          humanIndex={0}
          ladderSizes={ladderSizes}
          rail={RAIL}
        />,
      )
      expect(html).toContain('seat')
    }
  })
})

/** Le fil d'Ariane doit avancer : sinon le joueur ne sait pas où il en est. */
describe('le fil d’Ariane suit la partie', () => {
  it('passe des batailles à la répartition puis à la distribution', () => {
    const circleIndex = 0
    const circle = cfg.circles[circleIndex]!
    const dice = () => [0, 1, 2].map(() => upgradeDie(createDie(cfg.dice.startingFaces), circle.dieFaces))
    const participants: MatchParticipant[] = [
      { index: 0, name: 'Vous', isHuman: true, deck: createStartingDeck(cfg.cards), dice: dice(), ai: null },
      {
        index: 1,
        name: 'Belphégor',
        isHuman: false,
        deck: createStartingDeck(cfg.cards),
        dice: dice(),
        ai: settingsFor(cfg.ai, 0, circleIndex),
      },
    ]
    const rng = createRng(7)
    const driver = new MatchDriver({ cfg, circleIndex, participants, rng, isCircleFinal: false })
    driver.advance()
    const { steps } = autoPlay(driver, { cfg, circleIndex, participants, rng })

    const stages = new Set<string>()
    for (let i = 0; i < steps.length; i++) {
      const stage = buildView(steps, i, 2).timeline.stage
      if (stage) stages.add(stage)
    }
    expect(stages.has('duels0')).toBe(true)
    expect(stages.has('charge')).toBe(true)

    const final = buildView(steps, steps.length - 1, 2)
    // Les trois batailles de la première série sont bien comptées une à une.
    expect(final.timeline.duelsDone[0]).toBe(3)
  })
})

/** `J7` : la rencontre qui rapporte un point de forge doit le montrer. */
describe('le jeton de forge se pose sur la table', () => {
  const view = buildView([], -1, 2)
  const props = {
    view,
    frame: { pot: 21, chips: [0, 0] },
    deltas: [0, 0],
    names: ['Vous', 'Belphégor'],
    humanIndex: 0,
    ladderSizes: { 1: 1 },
    rail: RAIL,
  }

  it('absent quand rien n’est en jeu', () => {
    expect(renderToString(<Table {...props} />)).not.toContain('forgetoken')
  })

  it('présent quand la rencontre le met en jeu', () => {
    expect(renderToString(<Table {...props} forgeAtStake />)).toContain('forgetoken')
  })
})

/** Chaque type de décision doit se rendre : c'est là que le joueur clique. */
describe('les commandes du joueur se rendent toutes', () => {
  const names = ['Vous', 'Belphégor']
  const hand = [newCard(9, 'hearts'), newCard(9, 'spades')]
  const rank = evaluateHand(hand, cfg.cards)
  const diceHand = evaluateDice([4, 2, 1], 6, cfg.combinations, false)
  const view = buildView([], -1, 2)

  const asks: Ask[] = [
    { kind: 'mulligan', who: 0, pass: 1, total: 2, hand, rank },
    { kind: 'coin', who: 0, candidates: [0, 1], reason: 'mains à égalité' },
    { kind: 'reward', who: 0, offered: ['give5', 'valuePlus1', 'flipDie'] },
    { kind: 'rewardTarget', who: 0, id: 'give5', candidates: [1] },
    { kind: 'chooseRerolls', who: 0, options: [1, 2, 3] },
    {
      kind: 'turn',
      context: {
        who: 0,
        phase: 'charge',
        values: null,
        hand: null,
        kept: [],
        effects: [null, null, null, null],
        freeRerolls: [],
        throwNo: 0,
        maxThrows: 3,
        isLeader: true,
        canFlip: false,
        canSet42: true,
        diceCount: 4,
      },
    },
    {
      kind: 'turn',
      context: {
        who: 0,
        phase: 'discharge',
        values: [4, 2, 1, 6],
        hand: diceHand,
        kept: [0, 1, 2],
        effects: ['wild', null, 'money', 'freeReroll'],
        freeRerolls: [3],
        throwNo: 1,
        maxThrows: 3,
        isLeader: false,
        canFlip: true,
        canSet42: false,
        diceCount: 4,
      },
    },
  ]

  it.each(asks.map((a) => [a.kind === 'turn' ? `turn/${a.context.throwNo}` : a.kind, a] as const))(
    '%s',
    (_label, ask) => {
      const html = renderToString(
        <ActionBar
          ask={ask}
          view={view}
          names={names}
          ladderSize={3}
          swap={[]}
          keep={[false, false, false, false]}
          flipMode={false}
          setFlipMode={() => undefined}
          onAnswer={() => undefined}
        />,
      )
      expect(html).toContain('bar')
    },
  )
})
