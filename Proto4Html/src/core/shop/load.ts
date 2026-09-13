import { ConfigError } from '../config/load'
import { isArtefactId, isForgeId, type Rarity, type ShopConfig, type ShopItem } from './items'

function fail(field: string, detail: string): never {
  throw new ConfigError(field, detail)
}

type Json = Record<string, unknown>
const RARITIES: readonly Rarity[] = ['common', 'rare', 'legendary']

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
  if (!Number.isInteger(v) || v < min) fail(field, `entier ≥ ${min} attendu`)
  return v
}
function str(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || raw.trim() === '') fail(field, 'chaîne non vide attendue')
  return raw
}

function params(raw: unknown, field: string): Record<string, number> {
  if (raw === undefined) return {}
  const o = obj(raw, field)
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(o)) out[k] = num(v, `${field}.${k}`)
  return out
}

function item(raw: unknown, field: string): ShopItem {
  const o = obj(raw, field)
  const id = str(o.id, `${field}.id`)
  const kind = str(o.kind, `${field}.kind`)
  const rarity = str(o.rarity, `${field}.rarity`)
  if (!RARITIES.includes(rarity as Rarity)) fail(`${field}.rarity`, `parmi ${RARITIES.join(', ')}`)
  const base = {
    name: str(o.name, `${field}.name`),
    description: str(o.description, `${field}.description`),
    rarity: rarity as Rarity,
    price: int(o.price, `${field}.price`, 0),
    params: params(o.params, `${field}.params`),
  }
  switch (kind) {
    case 'artefact':
      if (!isArtefactId(id)) fail(`${field}.id`, `artefact « ${id} » sans implémentation`)
      return { ...base, kind, id }
    case 'forge':
      if (!isForgeId(id)) fail(`${field}.id`, `altération « ${id} » sans implémentation`)
      return { ...base, kind, id, target: int(o.target, `${field}.target`, Number.NEGATIVE_INFINITY) }
    case 'die': {
      if (!Array.isArray(o.faces) || o.faces.length === 0) fail(`${field}.faces`, 'tableau non vide attendu')
      const faces = o.faces.map((f, i) => int(f, `${field}.faces[${i}]`, Number.NEGATIVE_INFINITY))
      if (!faces.some((f) => f > 0)) fail(`${field}.faces`, 'au moins une face positive')
      const costPerUse = o.costPerUse === undefined ? 0 : int(o.costPerUse, `${field}.costPerUse`, 0)
      return { ...base, kind, id, faces, costPerUse }
    }
    default:
      return fail(`${field}.kind`, 'artefact, die ou forge attendu')
  }
}

export function loadShopConfig(raw: unknown): ShopConfig {
  const root = obj(raw, 'shop')
  const slots = int(root.slots, 'shop.slots', 1)
  const rerollCost = int(root.rerollCost, 'shop.rerollCost', 0)
  const priceGrowthPerCircle = num(root.priceGrowthPerCircle, 'shop.priceGrowthPerCircle')
  if (priceGrowthPerCircle < 0) fail('shop.priceGrowthPerCircle', 'doit être ≥ 0')
  const artefactSlots = int(root.artefactSlots, 'shop.artefactSlots', 1)
  const w = obj(root.rarityWeights, 'shop.rarityWeights')
  const rarityWeights = {} as Record<Rarity, number>
  for (const r of RARITIES) rarityWeights[r] = num(w[r], `shop.rarityWeights.${r}`)
  if (!Array.isArray(root.items) || root.items.length < slots) fail('shop.items', `au moins ${slots} objets attendus (shop.slots)`)
  const items = root.items.map((it, i) => item(it, `shop.items[${i}]`))
  const ids = new Set<string>()
  for (const it of items) {
    if (ids.has(it.id)) fail('shop.items', `id « ${it.id} » en double`)
    ids.add(it.id)
  }
  return { slots, rerollCost, priceGrowthPerCircle, artefactSlots, rarityWeights, items }
}
