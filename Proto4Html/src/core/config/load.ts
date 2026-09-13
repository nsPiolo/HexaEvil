/**
 * Chargement et validation de la configuration.
 * Une erreur désigne toujours le champ fautif, pour qu'un réglage cassé se voie au premier écran.
 */
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

  const animation = obj(root.animation, 'animation')
  const stepMs = int(animation.stepMs, 'animation.stepMs', 0)
  const diceMs = int(animation.diceMs, 'animation.diceMs', 0)
  const pauseMs = int(animation.pauseMs, 'animation.pauseMs', 0)

  return {
    souls: { count, names },
    track: { columns, cellsAfterFinish, betThresholdRatio },
    dice: { distanceFaces, distanceDice, soulDice },
    opponent: { rollsPerTurn },
    animation: { stepMs, diceMs, pauseMs },
  }
}
