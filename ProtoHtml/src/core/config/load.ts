/**
 * Chargement et validation du fichier de configuration unique (`G1`-`G3`).
 *
 * Le code ne contient aucune valeur de gameplay : tout vient d'ici, et une
 * configuration incohérente est **refusée avec un message explicite** plutôt
 * que de produire une simulation silencieusement fausse.
 */
import {
  DIRECTION_NAMES,
  directionIndex,
  hex,
  isDirectionName,
  key,
  neighbor,
  range,
  type DirectionName,
  type HexCoord,
} from '../hex/hexCoord'
import type {
  GameConfig,
  InitialTileDef,
  Owner,
  RecipeDef,
  ResourceDef,
  Side,
  TileTypeDef,
} from '../rules/types'

export class ConfigError extends Error {
  constructor(message: string) {
    super(`Configuration invalide : ${message}`)
    this.name = 'ConfigError'
  }
}

function fail(message: string): never {
  throw new ConfigError(message)
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${what} doit être un objet`)
  return value as Record<string, unknown>
}

function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) fail(`${what} doit être un tableau`)
  return value
}

function asInt(value: unknown, what: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    fail(`${what} doit être un entier >= ${min} (reçu ${JSON.stringify(value)})`)
  }
  return value
}

function asSignedInt(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) fail(`${what} doit être un entier`)
  return value
}

function asString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${what} doit être une chaîne non vide`)
  return value
}

function asBoolean(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') fail(`${what} doit être un booléen`)
  return value
}

function asSide(value: unknown, what: string): Side {
  const s = asString(value, what)
  if (s !== 'player' && s !== 'demon') fail(`${what} doit valoir "player" ou "demon" (reçu « ${s} »)`)
  return s
}

function asOwner(value: unknown, what: string): Owner {
  const s = asString(value, what)
  if (s !== 'player' && s !== 'demon' && s !== 'neutral') {
    fail(`${what} doit valoir "player", "demon" ou "neutral" (reçu « ${s} »)`)
  }
  return s
}

function asDirection(value: unknown, what: string): DirectionName {
  const s = asString(value, what)
  if (!isDirectionName(s)) {
    fail(
      `${what} contient « ${s} » : attendu ${DIRECTION_NAMES.join(', ')}. ` +
        `Les hexagones sont en pointy-top (B7) — ils ont deux côtés horizontaux (E, W) et quatre ` +
        `diagonaux (NE, NW, SE, SW), donc pas de face N ni S.`,
    )
  }
  return s
}

function asStock(value: unknown, what: string, resourceIds: Set<string>): Record<string, number> {
  const raw = asRecord(value, what)
  const out: Record<string, number> = {}
  for (const [id, qty] of Object.entries(raw)) {
    if (!resourceIds.has(id)) fail(`${what} référence la Ressource inconnue « ${id} »`)
    out[id] = asInt(qty, `${what}.${id}`, 1)
  }
  if (Object.keys(out).length === 0) fail(`${what} est vide`)
  return out
}

function parseRecipe(raw: unknown, what: string, resourceIds: Set<string>): RecipeDef {
  const r = asRecord(raw, what)
  const recipe: {
    side?: Side
    in?: Record<string, number>
    out?: Record<string, number>
    progress?: number
    consumesSelf?: boolean
    ticks: number
  } = { ticks: asInt(r.ticks, `${what}.ticks`, 1) }

  if (r.side !== undefined) recipe.side = asSide(r.side, `${what}.side`)
  if (r.in !== undefined) recipe.in = asStock(r.in, `${what}.in`, resourceIds)
  if (r.out !== undefined) recipe.out = asStock(r.out, `${what}.out`, resourceIds)
  if (r.progress !== undefined) recipe.progress = asSignedInt(r.progress, `${what}.progress`)
  if (r.consumesSelf !== undefined) recipe.consumesSelf = asBoolean(r.consumesSelf, `${what}.consumesSelf`)

  if (recipe.out === undefined && recipe.progress === undefined) {
    fail(`${what} ne produit rien : il faut "out" ou "progress"`)
  }
  return recipe
}

function parseTileType(raw: unknown, index: number, resourceIds: Set<string>): TileTypeDef {
  const t = asRecord(raw, `tileTypes[${index}]`)
  const id = asString(t.id, `tileTypes[${index}].id`)
  const maxExits = asInt(t.maxExits, `tileTypes.${id}.maxExits`, 0)
  if (maxExits > 6) fail(`tileTypes.${id}.maxExits ne peut dépasser 6 : une Tuile a 6 Accès (D1)`)

  const def: {
    id: string
    name: string
    glyph: string
    side: Owner
    maxExits: number
    spawns?: Side
    recipes?: RecipeDef[]
  } = {
    id,
    name: asString(t.name, `tileTypes.${id}.name`),
    glyph: asString(t.glyph, `tileTypes.${id}.glyph`),
    side: asOwner(t.side, `tileTypes.${id}.side`),
    maxExits,
  }

  if (t.spawns !== undefined) def.spawns = asSide(t.spawns, `tileTypes.${id}.spawns`)
  if (t.recipes !== undefined) {
    def.recipes = asArray(t.recipes, `tileTypes.${id}.recipes`).map((r, i) =>
      parseRecipe(r, `tileTypes.${id}.recipes[${i}]`, resourceIds),
    )
  }
  return def
}

function parseInitialTile(raw: unknown, index: number, types: Map<string, TileTypeDef>): InitialTileDef {
  const t = asRecord(raw, `initialTiles[${index}]`)
  const q = asSignedInt(t.q, `initialTiles[${index}].q`)
  const r = asSignedInt(t.r, `initialTiles[${index}].r`)
  const at = `initialTiles (${q},${r})`
  const typeId = asString(t.type, `${at}.type`)
  const type = types.get(typeId)
  if (!type) fail(`${at} référence le type de Tuile inconnu « ${typeId} »`)

  const exits = asArray(t.exits, `${at}.exits`).map((e) => asDirection(e, `${at}.exits`))
  if (new Set(exits).size !== exits.length) fail(`${at}.exits contient un doublon`)
  if (exits.length > type.maxExits) {
    fail(`${at} a ${exits.length} Sortie(s) alors que « ${typeId} » en autorise ${type.maxExits} (T4)`)
  }
  return { q, r, type: typeId, owner: asOwner(t.owner, `${at}.owner`), exits }
}

function parseResource(raw: unknown, index: number): ResourceDef {
  const res = asRecord(raw, `resources[${index}]`)
  return {
    id: asString(res.id, `resources[${index}].id`),
    name: asString(res.name, `resources[${index}].name`),
    glyph: asString(res.glyph, `resources[${index}].glyph`),
  }
}

/** Parse et valide une configuration brute (objet issu du JSON). */
export const parseConfig = (raw: unknown): GameConfig => {
  const c = asRecord(raw, 'la configuration')

  const resources = asArray(c.resources, 'resources').map(parseResource)
  if (resources.length === 0) fail('resources est vide')
  const resourceIds = new Set(resources.map((r) => r.id))
  if (resourceIds.size !== resources.length) fail('resources contient deux fois le même id')

  const tileTypes = asArray(c.tileTypes, 'tileTypes').map((t, i) => parseTileType(t, i, resourceIds))
  const types = new Map(tileTypes.map((t) => [t.id, t]))
  if (types.size !== tileTypes.length) fail('tileTypes contient deux fois le même id')

  const board = asRecord(c.board, 'board')
  const radius = asInt(board.radius, 'board.radius', 1)
  const spaceKeys = new Set(range(hex(0, 0), radius).map(key))

  const initialTiles = asArray(c.initialTiles, 'initialTiles').map((t, i) => parseInitialTile(t, i, types))
  const seen = new Set<string>()
  for (const t of initialTiles) {
    const k = key(hex(t.q, t.r))
    if (!spaceKeys.has(k)) fail(`initialTiles (${t.q},${t.r}) est hors du Plateau de rayon ${radius}`)
    if (seen.has(k)) fail(`deux Tuiles pré-posées en (${t.q},${t.r}) — un Espace n'en porte qu'une (B4)`)
    seen.add(k)
  }

  const catalog = asArray(c.catalog, 'catalog').map((id, i) => {
    const typeId = asString(id, `catalog[${i}]`)
    if (!types.has(typeId)) fail(`catalog référence le type de Tuile inconnu « ${typeId} »`)
    return typeId
  })

  const carry = asRecord(c.carryCapacity, 'carryCapacity')
  const config: GameConfig = {
    ticksPerRound: asInt(c.ticksPerRound, 'ticksPerRound', 1),
    soulBudget: asInt(c.soulBudget, 'soulBudget', 1),
    minionBudget: asInt(c.minionBudget, 'minionBudget', 0),
    stairwayTarget: asInt(c.stairwayTarget, 'stairwayTarget', 1),
    carryCapacity: {
      player: asInt(carry.player, 'carryCapacity.player', 1),
      demon: asInt(carry.demon, 'carryCapacity.demon', 1),
    },
    resources,
    tileTypes,
    board: { radius },
    initialTiles,
    catalog,
  }

  validateNoCrossing(config)
  return config
}

/** Vrai si une Sortie d'une Tuile `from` vers une Tuile `to` croiserait les camps (`B8`). */
export const isCrossing = (from: Owner, to: Owner): boolean =>
  from !== 'neutral' && to !== 'neutral' && from !== to

/**
 * `B8`/`B9` — les deux réseaux ne se croisent jamais. Concrètement : une Sortie
 * d'une Tuile appartenant à un camp ne peut pas déboucher sur une Tuile de
 * l'autre camp. Une Tuile neutre (l'`Escalier`) reste accessible aux deux.
 */
const validateNoCrossing = (config: GameConfig): void => {
  const owners = new Map<string, Owner>(config.initialTiles.map((t) => [key(hex(t.q, t.r)), t.owner]))
  for (const tile of config.initialTiles) {
    const from: HexCoord = hex(tile.q, tile.r)
    for (const name of tile.exits) {
      const targetOwner = owners.get(key(neighbor(from, directionIndex(name))))
      if (targetOwner !== undefined && isCrossing(tile.owner, targetOwner)) {
        fail(
          `la Tuile « ${tile.type} » (${tile.q},${tile.r}) [${tile.owner}] a une Sortie ${name} vers une ` +
            `Tuile [${targetOwner}] : les deux réseaux ne doivent jamais se croiser (B8)`,
        )
      }
    }
  }
}
