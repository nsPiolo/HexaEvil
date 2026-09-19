/**
 * Chargement et validation de la configuration.
 * Une erreur désigne toujours le champ fautif, pour qu'un réglage cassé se voie au premier écran.
 */
import { BET_TYPE_IDS, type BetTypeId } from '../rules/betTypes'
import { BOSS_EFFECT_FALLBACK, isBossEffectId, type BossEffect } from '../rules/boss'
import type { BlockedCell, RaceConfig, SpecialCell, SpecialCellKind, Terrain } from './schema'

const SPECIAL_KINDS: readonly SpecialCellKind[] = ['trap', 'boost', 'gold']

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

/**
 * Effets typés du pouvoir de boss (`rules/boss.ts`). Absent = boss sans effet mécanique : le
 * texte `power` reste affiché, la course se joue aux règles normales.
 */
function bossPowers(raw: unknown, field: string): BossEffect[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail(field, 'tableau attendu')
  return raw.map((e, i) => {
    const o = obj(e, `${field}[${i}]`)
    const id = str(o.id, `${field}[${i}].id`)
    if (!isBossEffectId(id)) fail(`${field}[${i}].id`, `effet inconnu « ${id} » (voir BOSS_EFFECT_IDS)`)
    const value = o.value === undefined ? BOSS_EFFECT_FALLBACK[id] : num(o.value, `${field}[${i}].value`)
    return { id, value }
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
  const raceAllowance = int(economy.raceAllowance, 'economy.raceAllowance', 0)
  const allowanceGrowthPerCircle = num(economy.allowanceGrowthPerCircle, 'economy.allowanceGrowthPerCircle')
  if (allowanceGrowthPerCircle < 0) fail('economy.allowanceGrowthPerCircle', 'doit être ≥ 0')
  const stakes = intArray(economy.stakes, 'economy.stakes')
  if (stakes.some((v) => v <= 0)) fail('economy.stakes', 'mises strictement positives attendues')
  if (stakes.some((v, i) => i > 0 && v <= stakes[i - 1]!)) fail('economy.stakes', 'mises strictement croissantes attendues')
  if (stakes[0]! > raceAllowance) fail('economy.stakes', `la plus petite mise (${stakes[0]}) dépasse l'avance de course (${raceAllowance}) : l'avance doit toujours permettre le pari minimum`)
  const stakeGrowthPerCircle = num(economy.stakeGrowthPerCircle, 'economy.stakeGrowthPerCircle')
  if (stakeGrowthPerCircle < 0) fail('economy.stakeGrowthPerCircle', 'doit être ≥ 0')
  // Sous 1, les jetons rétréciraient de cercle en cercle au-delà des écrits, là où le prix de
  // sortie, lui, continue de composer : le mode démon deviendrait injouable sans prévenir.
  const beyondStakeGrowth = num(economy.beyondStakeGrowth, 'economy.beyondStakeGrowth')
  if (beyondStakeGrowth < 1) fail('economy.beyondStakeGrowth', 'doit être ≥ 1')
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
  const beyondPriceGrowth = num(run.beyondPriceGrowth, 'run.beyondPriceGrowth')
  if (beyondPriceGrowth < 1) fail('run.beyondPriceGrowth', 'au moins 1 (le prix ne redescend pas au-delà du dernier cercle)')
  if (!Array.isArray(run.circles) || run.circles.length === 0) fail('run.circles', 'tableau non vide attendu')
  const circles = run.circles.map((c, i) => {
    const f = `run.circles[${i}]`
    const o = obj(c, f)
    const soulsInCircle = int(o.souls, `${f}.souls`, 2)
    const lanes = int(o.lanes, `${f}.lanes`, 1)
    if (lanes > soulsInCircle) fail(`${f}.lanes`, `plus de couloirs (${lanes}) que d'âmes (${soulsInCircle})`)
    if (!Array.isArray(o.terrains) || o.terrains.length === 0) fail(`${f}.terrains`, 'tableau non vide attendu (au moins une variante de terrain)')
    const terrains: Terrain[] = o.terrains.map((t, ti) => {
      const g = `${f}.terrains[${ti}]`
      const to = obj(t, g)
      if (!Array.isArray(to.blocked)) fail(`${g}.blocked`, 'tableau attendu (vide si aucune case bloquée)')
      // Chaque case est une paire [colonne, couloir] : le fichier de configuration se relit à l'œil.
      const blocked: BlockedCell[] = to.blocked.map((b, k) => {
        if (!Array.isArray(b) || b.length !== 2) fail(`${g}.blocked[${k}]`, 'paire [colonne, couloir] attendue')
        const column = int(b[0], `${g}.blocked[${k}][0]`, 1)
        if (column > columns) fail(`${g}.blocked[${k}][0]`, `au plus track.columns (${columns})`)
        const lane = int(b[1], `${g}.blocked[${k}][1]`, 0)
        if (lane >= lanes) fail(`${g}.blocked[${k}][1]`, `au plus lanes − 1 (${lanes - 1})`)
        return { column, lane }
      })
      if (new Set(blocked.map((b) => `${b.column}:${b.lane}`)).size !== blocked.length) fail(`${g}.blocked`, 'case bloquée en double')
      const perColumn = new Map<number, number>()
      for (const b of blocked) perColumn.set(b.column, (perColumn.get(b.column) ?? 0) + 1)
      for (const [column, n] of perColumn) {
        if (n >= lanes) fail(`${g}.blocked`, `colonne ${column} entièrement bloquée : il faut au moins une case libre par colonne`)
      }
      // Cases spéciales : [colonne, couloir, type, valeur], même écriture à l'œil que `blocked`.
      const specials: SpecialCell[] = !Array.isArray(to.specials)
        ? []
        : to.specials.map((c, k) => {
            const h = `${g}.specials[${k}]`
            if (!Array.isArray(c) || c.length !== 4) fail(h, 'quadruplet [colonne, couloir, type, valeur] attendu')
            const column = int(c[0], `${h}[0]`, 1)
            if (column >= columns) fail(`${h}[0]`, `avant l'arrivée (moins de ${columns})`)
            const lane = int(c[1], `${h}[1]`, 0)
            if (lane >= lanes) fail(`${h}[1]`, `au plus lanes − 1 (${lanes - 1})`)
            const kind = str(c[2], `${h}[2]`)
            if (!SPECIAL_KINDS.includes(kind as SpecialCellKind)) fail(`${h}[2]`, `parmi ${SPECIAL_KINDS.join(', ')}`)
            const value = int(c[3], `${h}[3]`, 1)
            if (blocked.some((b) => b.column === column && b.lane === lane)) fail(h, `la case (${column}, ${lane}) est bloquée : rien ne peut s'y arrêter`)
            return { column, lane, kind: kind as SpecialCellKind, value }
          })
      if (new Set(specials.map((c) => `${c.column}:${c.lane}`)).size !== specials.length) fail(`${g}.specials`, 'case spéciale en double')
      return { name: str(to.name, `${g}.name`), blocked, specials }
    })
    if (new Set(terrains.map((t) => t.name)).size !== terrains.length) fail(`${f}.terrains`, 'nom de terrain en double')
    return {
      name: str(o.name, `${f}.name`),
      price: int(o.price, `${f}.price`, 0),
      souls: soulsInCircle,
      lanes,
      terrains,
      boss: str(o.boss, `${f}.boss`),
      power: str(o.power, `${f}.power`),
      powers: bossPowers(o.powers, `${f}.powers`),
    }
  })
  const escapeCircle = int(run.escapeCircle, 'run.escapeCircle', 1)
  if (escapeCircle > circles.length) fail('run.escapeCircle', `au plus le nombre de cercles écrits (${circles.length})`)
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
  const betRevealMs = int(animation.betRevealMs, 'animation.betRevealMs', 0)
  const idlePulseMs = int(animation.idlePulseMs, 'animation.idlePulseMs', 0)
  const gaugeMs = int(animation.gaugeMs, 'animation.gaugeMs', 0)
  const betConfirmMs = int(animation.betConfirmMs, 'animation.betConfirmMs', 0)

  return {
    souls: { count, names },
    track: { columns, cellsAfterFinish, betThresholdRatio },
    dice: { distanceFaces, distanceDice, soulDice },
    opponent: { rollsPerTurn },
    economy: { startingMoney, raceAllowance, allowanceGrowthPerCircle, stakes, stakeGrowthPerCircle, beyondStakeGrowth, multipliers, betUnlockLevel, decay: { exponent, minMultiplier } },
    run: { racesPerCircle, escapeCircle, beyondPriceGrowth, circles },
    artefacts: { lateBet: { chargesPerCircle }, sablier: { betThresholdRatio: sablierRatio } },
    animation: { stepMs, diceMs, pauseMs, betRevealMs, idlePulseMs, gaugeMs, betConfirmMs },
  }
}
