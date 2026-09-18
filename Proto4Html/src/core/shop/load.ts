import { ConfigError } from '../config/load'
import { IMPACTS, IMPACT_OF_RARITY, RANK_OF_RARITY, isArtefactId, isForgeId, type Impact, type Rarity, type ShopConfig, type ShopItem } from './items'

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
  const impact = o.impact === undefined ? IMPACT_OF_RARITY[rarity as Rarity] : str(o.impact, `${field}.impact`)
  if (!IMPACTS.includes(impact as Impact)) fail(`${field}.impact`, `parmi ${IMPACTS.join(', ')}`)
  const warning = o.warning === undefined || o.warning === null ? null : str(o.warning, `${field}.warning`)
  const base = {
    name: str(o.name, `${field}.name`),
    description: str(o.description, `${field}.description`),
    rarity: rarity as Rarity,
    price: int(o.price, `${field}.price`, 0),
    params: params(o.params, `${field}.params`),
    impact: impact as Impact,
    warning,
    minRank: o.minRank === undefined ? RANK_OF_RARITY[rarity as Rarity] : int(o.minRank, `${field}.minRank`, 0),
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
      const mode = o.mode === undefined ? 'replace' : str(o.mode, `${field}.mode`)
      if (mode !== 'replace' && mode !== 'add') fail(`${field}.mode`, 'replace ou add attendu')
      const wildFace = o.wildFace === undefined ? null : int(o.wildFace, `${field}.wildFace`, 0)
      if (wildFace !== null && wildFace >= faces.length) fail(`${field}.wildFace`, `index de face hors du dé (${faces.length} faces)`)
      return { ...base, kind, id, faces, costPerUse, mode, wildFace }
    }
    default:
      return fail(`${field}.kind`, 'artefact, die ou forge attendu')
  }
}

/**
 * Socle débloqué au premier lancement. Il doit remplir une vitrine entière (`slots`), sinon
 * la boutique ouvrirait à moitié vide tant qu'aucun cercle n'a été payé (`shop/unlocks.ts`).
 */
function startIds(raw: unknown, known: ReadonlySet<string>, items: readonly ShopItem[], slots: number): string[] {
  const field = 'shop.unlockedAtStart'
  if (!Array.isArray(raw)) fail(field, 'tableau d’identifiants attendu')
  const out: string[] = []
  raw.forEach((v, i) => {
    const id = str(v, `${field}[${i}]`)
    if (!known.has(id)) fail(`${field}[${i}]`, `objet « ${id} » absent de shop.items`)
    if (out.includes(id)) fail(`${field}[${i}]`, `id « ${id} » en double`)
    out.push(id)
  })
  if (out.length < slots) fail(field, `au moins ${slots} objets attendus (shop.slots)`)
  // La vitrine se filtre aussi par grade : il faut assez d'objets ouverts au grade 0, sinon la
  // toute première boutique s'ouvrirait à moitié vide.
  const atRankZero = out.filter((id) => items.find((it) => it.id === id)?.minRank === 0).length
  if (atRankZero < slots) fail(field, `au moins ${slots} objets de minRank 0 attendus (${atRankZero} trouvés) : la première vitrine serait incomplète`)
  return out
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
  const confirmThreshold = root.confirmThreshold === undefined ? 60 : int(root.confirmThreshold, 'shop.confirmThreshold', 0)
  const forgeRaw = root.forge === undefined ? {} : obj(root.forge, 'shop.forge')
  const forge = {
    maxAltered: forgeRaw.maxAltered === undefined ? 2 : int(forgeRaw.maxAltered, 'shop.forge.maxAltered', 1),
    advancedLevel: forgeRaw.advancedLevel === undefined ? 2 : int(forgeRaw.advancedLevel, 'shop.forge.advancedLevel', 0),
    maxAlteredAdvanced: forgeRaw.maxAlteredAdvanced === undefined ? 3 : int(forgeRaw.maxAlteredAdvanced, 'shop.forge.maxAlteredAdvanced', 1),
    decapCost: forgeRaw.decapCost === undefined ? 10 : int(forgeRaw.decapCost, 'shop.forge.decapCost', 0),
  }
  if (forge.maxAlteredAdvanced < forge.maxAltered) fail('shop.forge.maxAlteredAdvanced', `au moins shop.forge.maxAltered (${forge.maxAltered})`)
  const slotLevelsRaw = root.artefactSlotLevels
  if (slotLevelsRaw !== undefined && !Array.isArray(slotLevelsRaw)) fail('shop.artefactSlotLevels', 'tableau de grades attendu')
  const artefactSlotLevels = ((slotLevelsRaw as unknown[]) ?? [2, 4]).map((v, i) => int(v, `shop.artefactSlotLevels[${i}]`, 1))
  const resaleRatio = root.resaleRatio === undefined ? 0.4 : num(root.resaleRatio, 'shop.resaleRatio')
  if (resaleRatio < 0 || resaleRatio > 1) fail('shop.resaleRatio', 'entre 0 et 1')
  const confirmResetMs = root.confirmResetMs === undefined ? 3000 : int(root.confirmResetMs, 'shop.confirmResetMs', 0)
  if (!Array.isArray(root.items) || root.items.length < slots) fail('shop.items', `au moins ${slots} objets attendus (shop.slots)`)
  const items = root.items.map((it, i) => item(it, `shop.items[${i}]`))
  const ids = new Set<string>()
  for (const it of items) {
    if (ids.has(it.id)) fail('shop.items', `id « ${it.id} » en double`)
    ids.add(it.id)
  }
  const unlockedAtStart = startIds(root.unlockedAtStart, ids, items, slots)
  return { slots, rerollCost, priceGrowthPerCircle, artefactSlots, rarityWeights, confirmThreshold, confirmResetMs, forge, artefactSlotLevels, resaleRatio, unlockedAtStart, items }
}
