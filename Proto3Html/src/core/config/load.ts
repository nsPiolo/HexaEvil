/**
 * Chargement et validation de la configuration — règles G1, G2.
 * Un message d'erreur explicite désigne toujours le champ fautif.
 */

import { ALL_SUITS, type CombinationId, type HandCategory, type RewardId } from '../rules/types'
import type { CombinationsConfig, GameConfig } from './schema'

class ConfigError extends Error {
  constructor(field: string, detail: string) {
    super(`Configuration invalide — « ${field} » : ${detail}`)
    this.name = 'ConfigError'
  }
}

function fail(field: string, detail: string): never {
  throw new ConfigError(field, detail)
}

type Json = Record<string, unknown>

function obj(raw: unknown, field: string): Json {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(field, 'objet attendu')
  return raw as Json
}

function arr(raw: unknown, field: string): unknown[] {
  if (!Array.isArray(raw)) fail(field, 'tableau attendu')
  return raw
}

function num(raw: unknown, field: string): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) fail(field, 'nombre attendu')
  return raw
}

function int(raw: unknown, field: string, min = Number.NEGATIVE_INFINITY): number {
  const v = num(raw, field)
  if (!Number.isInteger(v)) fail(field, 'entier attendu')
  if (v < min) fail(field, `doit valoir au moins ${min}`)
  return v
}

function bool(raw: unknown, field: string): boolean {
  if (typeof raw !== 'boolean') fail(field, 'booléen attendu')
  return raw
}

function str(raw: unknown, field: string): string {
  if (typeof raw !== 'string') fail(field, 'chaîne attendue')
  return raw
}

const COMBINATION_IDS: readonly CombinationId[] = [
  '421',
  'triple1',
  'triple',
  'pairOfOnes',
  'straight',
  'junk',
  'nenette',
]

const CATEGORIES: readonly HandCategory[] = [
  'cinqIdentiques',
  'quinteFlush',
  'carre',
  'full',
  'couleur',
  'suite',
  'brelan',
  'doublePaire',
  'paire',
  'carteHaute',
]

const REWARD_IDS: readonly RewardId[] = [
  'give3',
  'give5',
  'setRerolls',
  'reroll421',
  'splitGive',
  'takeLess',
  'nenetteGift',
  'flipDie',
  'extraDie',
  'set42',
  'valuePlus1',
]

function loadCombinations(raw: unknown): CombinationsConfig {
  const src = obj(raw, 'diceCombinations')
  const out: Record<string, unknown> = {}
  for (const id of COMBINATION_IDS) {
    const field = `diceCombinations.${id}`
    const spec = obj(src[id], field)
    const value = spec['value']
    let parsed: unknown
    if (typeof value === 'number') parsed = value
    else if (value === 'dieValue' || value === 'thirdDie') parsed = value
    else if (typeof value === 'object' && value !== null && 'facesPlus' in value) {
      parsed = { facesPlus: int((value as Json)['facesPlus'], `${field}.value.facesPlus`) }
    } else {
      fail(`${field}.value`, "nombre, 'dieValue', 'thirdDie' ou { facesPlus }")
    }
    out[id] = {
      rank: int(spec['rank'], `${field}.rank`, 1),
      tieBreak: int(spec['tieBreak'], `${field}.tieBreak`, 0),
      value: parsed,
    }
  }
  return out as CombinationsConfig
}

export function loadConfig(raw: unknown): GameConfig {
  const root = obj(raw, 'racine')

  const participants = obj(root['participants'], 'participants')
  const battleSeries = arr(root['battleSeries'], 'battleSeries').map((entry, i) => {
    const e = obj(entry, `battleSeries[${i}]`)
    const phase = str(e['phase'], `battleSeries[${i}].phase`)
    if (phase !== 'charge' && phase !== 'discharge') {
      fail(`battleSeries[${i}].phase`, "'charge' ou 'discharge'")
    }
    return { phase: phase as 'charge' | 'discharge', duels: int(e['duels'], `battleSeries[${i}].duels`, 1) }
  })
  if (battleSeries.length !== 2) fail('battleSeries', 'deux séries attendues (S1)')

  const circles = arr(root['circles'], 'circles').map((entry, i) => {
    const c = obj(entry, `circles[${i}]`)
    const dieFaces = int(c['dieFaces'], `circles[${i}].dieFaces`, 2)
    const pot = int(c['pot'], `circles[${i}].pot`, 1)
    // `R3` : le pot suit 3 × (faces + 1). On n'impose pas, on signale.
    if (pot !== 3 * (dieFaces + 1)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[config] circles[${i}] : pot ${pot} ≠ 3 × (${dieFaces} + 1) = ${3 * (dieFaces + 1)} — R3 non respectée`,
      )
    }
    return {
      n: int(c['n'], `circles[${i}].n`, 1),
      cards: int(c['cards'], `circles[${i}].cards`, 1),
      dieFaces,
      pot,
      winsRequired: int(c['winsRequired'], `circles[${i}].winsRequired`, 1),
    }
  })
  if (circles.length === 0) fail('circles', 'au moins un Cercle')

  const cardsRaw = obj(root['cards'], 'cards')
  const suits = arr(cardsRaw['suits'], 'cards.suits').map((s, i) => {
    const v = str(s, `cards.suits[${i}]`)
    if (!(ALL_SUITS as readonly string[]).includes(v)) fail(`cards.suits[${i}]`, `couleur inconnue « ${v} »`)
    return v as (typeof ALL_SUITS)[number]
  })
  const rankingsRaw = obj(cardsRaw['handRankings'], 'cards.handRankings')
  const handRankings: Record<number, HandCategory[]> = {}
  for (const [key, value] of Object.entries(rankingsRaw)) {
    const size = Number(key)
    if (!Number.isInteger(size) || size < 1) fail('cards.handRankings', `clé « ${key} » : taille de main invalide`)
    handRankings[size] = arr(value, `cards.handRankings.${key}`).map((c, i) => {
      const v = str(c, `cards.handRankings.${key}[${i}]`)
      if (!(CATEGORIES as readonly string[]).includes(v)) {
        fail(`cards.handRankings.${key}[${i}]`, `catégorie inconnue « ${v} »`)
      }
      return v as HandCategory
    })
  }

  const diceRaw = obj(root['dice'], 'dice')
  const startingFaces = arr(diceRaw['startingFaces'], 'dice.startingFaces').map((v, i) =>
    int(v, `dice.startingFaces[${i}]`, 1),
  )
  if (startingFaces.length % 2 !== 0) fail('dice.startingFaces', 'nombre de faces pair attendu (F2)')

  const rewards = arr(root['rewards'], 'rewards').map((entry, i) => {
    const r = obj(entry, `rewards[${i}]`)
    const id = str(r['id'], `rewards[${i}].id`)
    if (!(REWARD_IDS as readonly string[]).includes(id)) fail(`rewards[${i}].id`, `récompense inconnue « ${id} »`)
    const spec: Record<string, unknown> = { id }
    if (r['amount'] !== undefined) spec['amount'] = int(r['amount'], `rewards[${i}].amount`, 1)
    if (r['source'] !== undefined) spec['source'] = str(r['source'], `rewards[${i}].source`)
    if (r['scope'] !== undefined) spec['scope'] = str(r['scope'], `rewards[${i}].scope`)
    if (r['uses'] !== undefined) spec['uses'] = str(r['uses'], `rewards[${i}].uses`)
    if (r['needsThree'] !== undefined) spec['needsThree'] = bool(r['needsThree'], `rewards[${i}].needsThree`)
    return spec as unknown as GameConfig['rewards'][number]
  })
  const seen = new Set(rewards.map((r) => r.id))
  if (seen.size !== rewards.length) fail('rewards', 'deux récompenses portent le même id')

  const shopRaw = obj(root['shop'], 'shop')
  const shop: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(shopRaw)) {
    const e = obj(value, `shop.${key}`)
    const currency = str(e['currency'], `shop.${key}.currency`)
    if (currency !== 'money' && currency !== 'forge') fail(`shop.${key}.currency`, "'money' ou 'forge'")
    const entry: Record<string, unknown> = { cost: int(e['cost'], `shop.${key}.cost`, 0), currency }
    if (e['pool'] !== undefined) entry['pool'] = int(e['pool'], `shop.${key}.pool`, 1)
    shop[key] = entry
  }

  const rulesRaw = obj(root['rules'], 'rules')
  const carryRaw = obj(rulesRaw['carryOverBetweenRuns'], 'rules.carryOverBetweenRuns')
  const firstLeader = str(rulesRaw['firstLeader'], 'rules.firstLeader')
  if (firstLeader !== 'lastCardDuelWinner' && firstLeader !== 'player') {
    fail('rules.firstLeader', "'lastCardDuelWinner' ou 'player'")
  }

  const aiRaw = obj(root['ai'], 'ai')
  const uiRaw = obj(root['ui'], 'ui')
  const debugRaw = obj(root['debugStart'], 'debugStart')

  const cfg: GameConfig = {
    seed: int(root['seed'], 'seed'),
    participants: {
      default: int(participants['default'], 'participants.default', 2),
      circleFinal: int(participants['circleFinal'], 'participants.circleFinal', 2),
    },
    battleSeries,
    circles,
    combinations: loadCombinations(root['diceCombinations']),
    dice: {
      startingFaces,
      playerDice: int(diceRaw['playerDice'], 'dice.playerDice', 3),
      demonDice: int(diceRaw['demonDice'], 'dice.demonDice', 3),
      maxSameFace: int(diceRaw['maxSameFace'], 'dice.maxSameFace', 0),
      defaultMaxRerolls: int(diceRaw['defaultMaxRerolls'], 'dice.defaultMaxRerolls', 0),
    },
    cards: {
      values: arr(cardsRaw['values'], 'cards.values').map((v, i) => int(v, `cards.values[${i}]`, 1)),
      suits,
      minDeckSize: int(cardsRaw['minDeckSize'], 'cards.minDeckSize', 1),
      minValue: int(cardsRaw['minValue'], 'cards.minValue', 1),
      maxValue: int(cardsRaw['maxValue'], 'cards.maxValue', 1),
      mulligans: int(cardsRaw['mulligans'], 'cards.mulligans', 0),
      flushMinSize: int(cardsRaw['flushMinSize'], 'cards.flushMinSize', 1),
      straightMinSize: int(cardsRaw['straightMinSize'], 'cards.straightMinSize', 1),
      handRankings,
    },
    rewards,
    shop: shop as GameConfig['shop'],
    forgePointEveryNMatches: int(root['forgePointEveryNMatches'], 'forgePointEveryNMatches', 1),
    rules: {
      leaderCapsThrows: bool(rulesRaw['leaderCapsThrows'], 'rules.leaderCapsThrows'),
      leaderRotates: bool(rulesRaw['leaderRotates'], 'rules.leaderRotates'),
      firstLeader,
      runEndsOnLoss: bool(rulesRaw['runEndsOnLoss'], 'rules.runEndsOnLoss'),
      carryOverBetweenRuns: {
        money: int(carryRaw['money'], 'rules.carryOverBetweenRuns.money', 0),
        forgePoints: int(carryRaw['forgePoints'], 'rules.carryOverBetweenRuns.forgePoints', 0),
        deck: bool(carryRaw['deck'], 'rules.carryOverBetweenRuns.deck'),
        dice: bool(carryRaw['dice'], 'rules.carryOverBetweenRuns.dice'),
      },
      maxDeadRounds: int(rulesRaw['maxDeadRounds'], 'rules.maxDeadRounds', 1),
    },
    debugStart: {
      circle: int(debugRaw['circle'], 'debugStart.circle', 1),
      money: int(debugRaw['money'], 'debugStart.money', 0),
      forgePoints: int(debugRaw['forgePoints'], 'debugStart.forgePoints', 0),
    },
    ai: aiRaw as unknown as GameConfig['ai'],
    ui: {
      animationSpeed: num(uiRaw['animationSpeed'], 'ui.animationSpeed'),
      batchMode: bool(uiRaw['batchMode'], 'ui.batchMode'),
    },
  }

  // Cohérences croisées, celles qui cassent silencieusement le jeu.
  const maxCards = Math.max(...cfg.circles.map((c) => c.cards))
  for (let size = 1; size <= maxCards; size++) {
    if (!cfg.cards.handRankings[size]) {
      fail('cards.handRankings', `il manque le classement des mains de ${size} cartes (C12c)`)
    }
  }
  if (cfg.cards.minDeckSize < maxCards) {
    fail('cards.minDeckSize', `doit valoir au moins ${maxCards}, la plus grande main du run (K5)`)
  }
  if (cfg.ai.demons.length < cfg.participants.circleFinal - 1) {
    fail('ai.demons', `il faut ${cfg.participants.circleFinal - 1} démons pour la dernière partie d'un Cercle`)
  }
  if (cfg.ai.levelByCircle.length !== cfg.circles.length) {
    fail('ai.levelByCircle', `${cfg.circles.length} entrées attendues, une par Cercle (S5)`)
  }
  return cfg
}
