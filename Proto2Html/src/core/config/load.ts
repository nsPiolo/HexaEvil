/**
 * Chargement et validation de la configuration — règles G1, G2.
 * Un message d'erreur explicite désigne toujours le champ fautif.
 */

import { hexKey, isInRadius, neighbors, rotate180 } from '../hex/hexCoord'
import { ALL_COLORS, type ColorId, type TileDefinition } from '../rules/types'
import type { GameConfig, LoadReport, RawConfig, RawCoord, RawTileType } from './schema'

class ConfigError extends Error {
  constructor(field: string, detail: string) {
    super(`Configuration invalide — « ${field} » : ${detail}`)
    this.name = 'ConfigError'
  }
}

function fail(field: string, detail: string): never {
  throw new ConfigError(field, detail)
}

function isColorId(value: string): value is ColorId {
  return (ALL_COLORS as readonly string[]).includes(value)
}

/** Table préfixe d'ID → Couleur (§1). Seule autorité, elle vient de la configuration. */
function buildPrefixMap(cfg: RawConfig): Map<string, ColorId> {
  const map = new Map<string, ColorId>()
  for (const c of cfg.colors) {
    if (!isColorId(c.id)) fail('colors', `« ${c.id} » n'est pas une Couleur connue (${ALL_COLORS.join(', ')})`)
    if (c.prefix.length !== 1) fail('colors', `le préfixe de « ${c.id} » doit faire 1 caractère, reçu « ${c.prefix} »`)
    if (map.has(c.prefix)) fail('colors', `préfixe « ${c.prefix} » utilisé deux fois`)
    map.set(c.prefix, c.id)
  }
  return map
}

function colorOfId(tileId: string, prefixes: Map<string, ColorId>, field: string): ColorId {
  const color = prefixes.get(tileId.charAt(0))
  if (!color) fail(field, `l'ID « ${tileId} » commence par un préfixe inconnu (« ${tileId.charAt(0)} »)`)
  return color
}

function normalizeTileType(raw: RawTileType, prefixes: Map<string, ColorId>): TileDefinition {
  if (!/^[A-Z]\d{2}$/.test(raw.id)) {
    fail('tileTypes', `l'ID « ${raw.id} » ne suit pas la convention T1 (une lettre + 2 chiffres)`)
  }
  if (!Number.isInteger(raw.force) || raw.force <= 0) {
    fail('tileTypes', `« ${raw.id} » doit avoir une force entière > 0, reçu ${raw.force}`)
  }
  return {
    id: raw.id,
    color: colorOfId(raw.id, prefixes, 'tileTypes'),
    force: raw.force,
    shields: raw.shields ?? 0,
    role: raw.role ?? 'normal',
    immuneToSilence: raw.immuneToSilence ?? false,
    onPlace: raw.onPlace ?? [],
    aura: raw.aura ?? [],
    // T2 : convention `00` — pré-posée uniquement.
    preplacedOnly: raw.id.endsWith('00'),
  }
}

export function loadConfig(raw: RawConfig): LoadReport {
  const warnings: string[] = []
  const prefixes = buildPrefixMap(raw)

  // --- Types de Tuiles (T3, T4) ---
  const tileTypes = new Map<string, TileDefinition>()
  for (const t of raw.tileTypes) {
    if (tileTypes.has(t.id)) fail('tileTypes', `le type « ${t.id} » est déclaré deux fois`)
    tileTypes.set(t.id, normalizeTileType(t, prefixes))
  }

  // --- Couleurs actives (C1) : les clés à pourcentage > 0 ---
  const dist = raw.board.colorDistribution
  for (const key of Object.keys(dist)) {
    if (!isColorId(key)) fail('board.colorDistribution', `« ${key} » n'est pas une Couleur connue`)
  }
  const activeColors = ALL_COLORS.filter((c) => (dist[c] ?? 0) > 0)
  if (activeColors.length === 0) fail('board.colorDistribution', 'aucune Couleur active (tous les pourcentages sont à 0)')
  const total = activeColors.reduce((sum, c) => sum + (dist[c] ?? 0), 0)
  if (Math.abs(total - 100) > 1e-6) {
    fail('board.colorDistribution', `les pourcentages des Couleurs actives doivent sommer à 100, reçu ${total}`)
  }
  const inactive = ALL_COLORS.filter((c) => !activeColors.includes(c))
  if (inactive.length > 0) warnings.push(`Couleurs désactivées (C1) : ${inactive.join(', ')}.`)

  // --- Relief (B1, B2) ---
  const radius = raw.board.radius
  if (!Number.isInteger(radius) || radius < 1) fail('board.radius', `rayon entier ≥ 1 attendu, reçu ${radius}`)
  const blocked = raw.board.blocked ?? []
  const blockedKeys = new Set<string>()
  for (const b of blocked) {
    if (!isInRadius(b, radius)) fail('board.blocked', `l'Espace (${b.q},${b.r}) est hors du Plateau de rayon ${radius}`)
    const key = hexKey(b)
    if (blockedKeys.has(key)) fail('board.blocked', `l'Espace (${b.q},${b.r}) est bloqué deux fois`)
    blockedKeys.add(key)
  }

  // B12 : on avertit sans refuser (B10 — l'asymétrie n'est pas un problème en soi).
  const asymmetric = blocked.filter((b) => !blockedKeys.has(hexKey(rotate180(b))))
  if (asymmetric.length > 0) {
    warnings.push(
      `Relief non centralement symétrique (B12) : ${asymmetric.length} Espace(s) bloqué(s) sans image par rotation de 180°. ` +
        `Acceptable (B10), mais à ne pas utiliser comme base d'une mesure d'équilibrage (M4).`,
    )
  }

  // --- Montage (B4, B5, B7, T6) ---
  const occupied = new Map<string, string>()
  const kings: Record<string, RawCoord[]> = { player: [], demon: [] }
  for (const entry of raw.setup) {
    const def = tileTypes.get(entry.type)
    if (!def) fail('setup', `le type « ${entry.type} » n'existe pas dans tileTypes`)
    if (!isInRadius(entry, radius)) fail('setup', `(${entry.q},${entry.r}) est hors du Plateau de rayon ${radius}`)
    const key = hexKey(entry)
    if (blockedKeys.has(key)) fail('setup', `« ${entry.type} » est posé sur l'Espace bloqué (${entry.q},${entry.r})`)
    const clash = occupied.get(key)
    if (clash) fail('setup', `(${entry.q},${entry.r}) porte déjà « ${clash} », deux Tuiles s'y superposent`)
    occupied.set(key, entry.type)
    if (def.role === 'king') {
      if (entry.side === 'neutral') fail('setup', `un Roi ne peut pas être neutre (${entry.q},${entry.r})`)
      kings[entry.side]?.push(entry)
    }
  }
  for (const side of ['player', 'demon'] as const) {
    const found = kings[side] ?? []
    if (found.length !== 1) fail('setup', `le camp « ${side} » doit avoir exactement un Roi, il en a ${found.length}`)
  }

  // B7b : un Roi sans Espace libre adjacent est inatteignable — la partie ne pourrait
  // se terminer que par W2/W3. Cas réel rencontré avec le relief « bouchons » + 2 Tours.
  for (const side of ['player', 'demon'] as const) {
    const king = kings[side]?.[0]
    if (!king) continue
    const slots = neighbors(king).filter(
      (n) => isInRadius(n, radius) && !blockedKeys.has(hexKey(n)) && !occupied.has(hexKey(n)),
    )
    if (slots.length === 0) {
      fail(
        'setup',
        `le Roi de « ${side} » en (${king.q},${king.r}) n'a aucun Espace libre adjacent (B7b) : ` +
          `il est inatteignable, la partie ne pourrait se terminer que par W2/W3. ` +
          `Libère un voisin (relief ou Tour).`,
      )
    }
  }

  // --- Decks (D1, D6) : filtrage aux Couleurs actives (C1) ---
  const rawDemon = raw.decks.demon === 'sameAsPlayer' ? raw.decks.player : raw.decks.demon
  const decks: Record<'player' | 'demon', string[]> = { player: [], demon: [] }
  for (const [side, list] of [
    ['player', raw.decks.player],
    ['demon', rawDemon],
  ] as const) {
    const dropped: string[] = []
    for (const id of list) {
      const def = tileTypes.get(id)
      if (!def) fail(`decks.${side}`, `le type « ${id} » n'existe pas dans tileTypes`)
      if (def.preplacedOnly) fail(`decks.${side}`, `« ${id} » est une Tuile pré-posée (T2) et ne peut pas être dans un Deck`)
      if (!activeColors.includes(def.color)) {
        dropped.push(id)
        continue
      }
      decks[side].push(id)
    }
    if (dropped.length > 0) {
      warnings.push(`Deck « ${side} » : ${dropped.length} Tuile(s) retirée(s) faute de Couleur active (C1) — ${dropped.join(', ')}.`)
    }
    if (decks[side].length === 0) fail(`decks.${side}`, 'le Deck est vide après filtrage aux Couleurs actives')
  }

  // --- Divers ---
  if (!Number.isInteger(raw.handSize) || raw.handSize < 1) fail('handSize', `entier ≥ 1 attendu, reçu ${raw.handSize}`)
  if (!Number.isInteger(raw.upkeepHeal) || raw.upkeepHeal < 0) fail('upkeepHeal', `entier ≥ 0 attendu, reçu ${raw.upkeepHeal}`)
  if (raw.firstPlayer !== 'player' && raw.firstPlayer !== 'demon') fail('firstPlayer', `« player » ou « demon » attendu`)

  let startingColor: ColorId | null = null
  if (raw.startingColor !== null && raw.startingColor !== undefined) {
    if (!isColorId(raw.startingColor)) fail('startingColor', `« ${raw.startingColor} » n'est pas une Couleur connue`)
    if (!activeColors.includes(raw.startingColor)) fail('startingColor', `« ${raw.startingColor} » n'est pas une Couleur active`)
    startingColor = raw.startingColor
  }

  for (const side of ['player', 'demon'] as const) {
    const ai = raw.ai[side]
    if (!ai) continue
    if (!raw.ai.profiles[ai.profile]) fail(`ai.${side}.profile`, `profil inconnu « ${ai.profile} »`)
    if (!raw.ai.levels[ai.level]) fail(`ai.${side}.level`, `niveau inconnu « ${ai.level} »`)
  }

  const config: GameConfig = {
    seed: raw.seed,
    firstPlayer: raw.firstPlayer,
    handSize: raw.handSize,
    startingColor,
    upkeepHeal: raw.upkeepHeal,
    upkeepHealsKing: raw.upkeepHealsKing ?? true,
    colors: raw.colors,
    activeColors,
    colorDistribution: dist,
    radius,
    blocked,
    symmetricColors: raw.board.symmetricColors ?? false,
    setup: raw.setup,
    tileTypes,
    decks,
    ai: raw.ai,
  }
  return { config, warnings }
}

export { ConfigError }
