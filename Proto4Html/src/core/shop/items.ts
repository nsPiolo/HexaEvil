/** Types des objets de boutique. Les données (noms, prix, textes) vivent dans config/shop.json. */
export const ARTEFACT_IDS = ['lateBet', 'sablier', 'boussole', 'clepsydre', 'ferACheval', 'boursePercee', 'livreDesComptes'] as const
export type ArtefactId = (typeof ARTEFACT_IDS)[number]

export const FORGE_IDS = ['limee', 'doree', 'retournee', 'sceau'] as const
export type ForgeId = (typeof FORGE_IDS)[number]

export type Rarity = 'common' | 'rare' | 'legendary'
export type ItemKind = 'artefact' | 'die' | 'forge'

interface ItemBase {
  name: string
  description: string
  rarity: Rarity
  /** Prix au cercle 1. */
  price: number
  params: Readonly<Record<string, number>>
}

export interface ArtefactItem extends ItemBase {
  kind: 'artefact'
  id: ArtefactId
}

export interface DieItem extends ItemBase {
  kind: 'die'
  id: string
  faces: readonly number[]
  costPerUse: number
}

export interface ForgeItem extends ItemBase {
  kind: 'forge'
  id: ForgeId
  /** Valeur de face conseillée comme cible. */
  target: number
}

export type ShopItem = ArtefactItem | DieItem | ForgeItem

export interface ShopConfig {
  slots: number
  rerollCost: number
  priceGrowthPerCircle: number
  artefactSlots: number
  rarityWeights: Readonly<Record<Rarity, number>>
  items: readonly ShopItem[]
}

export function isArtefactId(id: string): id is ArtefactId {
  return (ARTEFACT_IDS as readonly string[]).includes(id)
}

export function isForgeId(id: string): id is ForgeId {
  return (FORGE_IDS as readonly string[]).includes(id)
}
