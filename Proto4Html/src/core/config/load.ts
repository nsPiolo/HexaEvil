/**
 * Chargement et validation de la configuration.
 * Une erreur désigne toujours le champ fautif, pour qu'un réglage cassé se voie au premier écran.
 */
import { BET_TYPE_IDS, type BetTypeId } from '../rules/betTypes'
import type { RaceConfig } from './schema'

export class ConfigError extends Error {
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

function num(raw: unknown, field: string): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) fail(field, 'nombre attendu')
  return raw
}

function int(raw: unknown, field: string, min: number): number {
  const v = num(raw, field)
  if (!Number.isInteger(v)) fail(field, 'entier attendu')
  if (v < min) fail(field, `doit valoir au moins ${min}`)
  return v
}

function intArray(raw: unknown, field: string): number[] {
  if (!Array.isArray(raw) || raw.length === 0) fail(field, 'tableau non vide attendu')
  return raw.map((v, i) => int(v, `${field}[${i}]`, Number.NEGATIVE_INFINITY))
}

function str(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || raw.trim() === '') fail(field, 'chaîne non vide attendue')
  return raw
}

function strArray(raw: unknown, field: string): string[] {
  if (!Array.isArray(raw)) fail(field, 'tableau attendu')
  return raw.map((v, i) => {
    if (typeof v !== 'string' || v.trim() === '') fail(`${field}[${i}]`, 'chaîne non vide attendue')
    return v
  })
}

export function loadConfig(raw: unknown): RaceConfig {
  const root = obj(raw, 'racine')

  const souls = obj(root.souls, 'souls')
  const count = int(souls.count, 'souls.count', 2)
  const names = strArray(souls.names, 'souls.names')
  if (names.length < count) fail('souls.names', `il faut au moins ${count} noms (souls.count)`)

  const track = obj(root.track, 'track')
  const columns = int(track.columns, 'track.columns', 3)
  const cellsAfterFinish = int(track.cellsAfterFinish, 'track.cellsAfterFinish', 1)
  const betThresholdRatio = num(track.betThresholdRatio, 'track.betThresholdRatio')
  if (betThresholdRatio <= 0 || betThresholdRatio >= 1) fail('track.betThresholdRatio', 'doit être strictement entre 0 et 1')

  const dice = obj(root.dice, 'dice')
  const distanceFaces = intArray(dice.distanceFaces, 'dice.distanceFaces')
  if (!distanceFaces.some((f) => f > 0)) fail('dice.distanceFaces', 'au moins une face doit être positive, sinon la course ne finit jamais')
  const distanceDice = int(dice.distanceDice, 'dice.distanceDice', 1)
  const soulDice = int(dice.soulDice, 'dice.soulDice', 1)
  if (soulDice < distanceDice) fail('dice.soulDice', 'doit valoir au moins dice.distanceDice (chaque dé Distance doit trouver une âme)')

  const opponent = obj(root.opponent, 'opponent')
  const rollsPerTurn = int(opponent.rollsPerTurn, 'opponent.rollsPerTurn', 0)

  const economy = obj(root.economy, 'economy')
  const startingMoney = int(economy.startingMoney, 'economy.startingMoney', 0)
  const stakes = intArray(economy.stakes, 'economy.stakes')
  if (stakes.some((v) => v <= 0)) fail('economy.stakes', 'mises strictement positives attendues')
  const mults = obj(economy.multipliers, 'economy.multipliers')
  const multipliers = {} as Record<BetTypeId, number>
  for (const id of BET_TYPE_IDS) {
    const m = num(mults[id], `economy.multipliers.${id}`)
    if (m <= 1) fail(`economy.multipliers.${id}`, 'doit être supérieur à 1, sinon un pari gagné fait perdre de l\'argent')
    multipliers[id] = m
  }

  const unlockRaw = obj(economy.betUnlockLevel, 'economy.betUnlockLevel')
  const betUnlockLevel = {} as Record<BetTypeId, number>
  for (const id of BET_TYPE_IDS) betUnlockLevel[id] = int(unlockRaw[id], `economy.betUnlockLevel.${id}`, 0)
  if (!BET_TYPE_IDS.some((id) => betUnlockLevel[id] === 0)) fail('economy.betUnlockLevel', 'au moins un type de pari doit être ouvert au niveau 0, sinon aucune course ne peut démarrer')

  const decayRaw = obj(economy.decay, 'economy.decay')
  const exponent = num(decayRaw.exponent, 'economy.decay.exponent')
  if (exponent <= 0) fail('economy.decay.exponent', 'doit être strictement positif')
  const minMultiplier = num(decayRaw.minMultiplier, 'economy.decay.minMultiplier')
  if (minMultiplier <= 1) fail('economy.decay.minMultiplier', 'doit être supérieur à 1')
  for (const id of BET_TYPE_IDS) {
    if (multipliers[id] < minMultiplier) fail(`economy.multipliers.${id}`, `doit valoir au moins economy.decay.minMultiplier (${minMultiplier})`)
  }

  const run = obj(root.run, 'run')
  const racesPerCircle = int(run.racesPerCircle, 'run.racesPerCircle', 1)
  if (!Array.isArray(run.circles) || run.circles.length === 0) fail('run.circles', 'tableau non vide attendu')
  const circles = run.circles.map((c, i) => {
    const o = obj(c, `run.circles[${i}]`)
    return {
      name: str(o.name, `run.circles[${i}].name`),
      price: int(o.price, `run.circles[${i}].price`, 0),
      souls: int(o.souls, `run.circles[${i}].souls`, 2),
      boss: str(o.boss, `run.circles[${i}].boss`),
      power: str(o.power, `run.circles[${i}].power`),
    }
  })
  const maxSouls = Math.max(...circles.map((c) => c.souls))
  if (names.length < maxSouls) fail('souls.names', `il faut au moins ${maxSouls} noms (cercle le plus peuplé)`)

  const artefacts = obj(root.artefacts, 'artefacts')
  const lateBet = obj(artefacts.lateBet, 'artefacts.lateBet')
  const chargesPerCircle = int(lateBet.chargesPerCircle, 'artefacts.lateBet.chargesPerCircle', 1)
  const sablier = obj(artefacts.sablier, 'artefacts.sablier')
  const sablierRatio = num(sablier.betThresholdRatio, 'artefacts.sablier.betThresholdRatio')
  if (sablierRatio <= betThresholdRatio || sablierRatio >= 1) fail('artefacts.sablier.betThresholdRatio', `doit être entre track.betThresholdRatio (${betThresholdRatio}) exclu et 1 exclu`)

  const animation = obj(root.animation, 'animation')
  const stepMs = int(animation.stepMs, 'animation.stepMs', 0)
  const diceMs = int(animation.diceMs, 'animation.diceMs', 0)
  const pauseMs = int(animation.pauseMs, 'animation.pauseMs', 0)

  return {
    souls: { count, names },
    track: { columns, cellsAfterFinish, betThresholdRatio },
    dice: { distanceFaces, distanceDice, soulDice },
    opponent: { rollsPerTurn },
    economy: { startingMoney, stakes, multipliers, betUnlockLevel, decay: { exponent, minMultiplier } },
    run: { racesPerCircle, circles },
    artefacts: { lateBet: { chargesPerCircle }, sablier: { betThresholdRatio: sablierRatio } },
    animation: { stepMs, diceMs, pauseMs },
  }
}
