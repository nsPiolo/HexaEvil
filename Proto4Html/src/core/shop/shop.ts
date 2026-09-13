/**
 * Boutique — GDD §6.1. Accessible après les paris initiaux, avant la course.
 * Vitrine tirée au sort parmi le catalogue, achats débités de l'argent des paris.
 */
import type { RaceConfig } from '../config/schema'
import { baseDie, type DistanceDie, type Face } from '../rules/dice'
import type { Rng } from '../rules/rng'
import type { ArtefactId, DieItem, ForgeId, ShopConfig, ShopItem } from './items'

/** Ce que le joueur emporte de course en course. */
export interface Inventory {
  artefacts: ArtefactId[]
  dice: DistanceDie[]
}

export function priceAtCircle(base: number, circle: number, growth: number): number {
  return Math.round((base * (1 + growth * (circle - 1))) / 5) * 5
}

export function findItem(shop: ShopConfig, id: string): ShopItem {
  const it = shop.items.find((i) => i.id === id)
  if (!it) throw new Error(`objet de boutique inconnu : ${id}`)
  return it
}

/** Tirage pondéré par rareté, sans remise, en excluant les artefacts déjà possédés. */
export function generateVitrine(shop: ShopConfig, inventory: Inventory, rng: Rng): ShopItem[] {
  let pool = shop.items.filter((it) => !(it.kind === 'artefact' && inventory.artefacts.includes(it.id)))
  // Plus d'emplacement d'artefact : on n'en propose plus.
  if (inventory.artefacts.length >= shop.artefactSlots) pool = pool.filter((it) => it.kind !== 'artefact')
  const out: ShopItem[] = []
  while (out.length < shop.slots && pool.length > 0) {
    const total = pool.reduce((s, it) => s + shop.rarityWeights[it.rarity], 0)
    let r = rng.next() * total
    let pick = pool[pool.length - 1]!
    for (const it of pool) {
      r -= shop.rarityWeights[it.rarity]
      if (r < 0) {
        pick = it
        break
      }
    }
    out.push(pick)
    pool = pool.filter((it) => it !== pick)
  }
  return out
}

/** Applique une altération de forge à une face. */
export function forgeFace(id: ForgeId, face: Face): Face {
  switch (id) {
    case 'limee':
      return { value: 0, effect: null, altered: id }
    case 'doree':
      return { value: 1, effect: 'gold', altered: id }
    case 'retournee':
      return { value: 1, effect: null, altered: id }
    case 'sceau':
      return { value: 1, effect: 'betSeal', altered: id }
  }
  return face
}

export function specialDie(item: DieItem): DistanceDie {
  return {
    kind: item.id,
    name: item.name,
    faces: item.faces.map((v) => ({ value: v, effect: null, altered: null })),
    costPerUse: item.costPerUse,
  }
}

/** Contrepartie de la Face retournée : dérivée des dés, pas stockée. */
export function opponentNegativesFlipped(inventory: Inventory): boolean {
  return inventory.dice.some((d) => d.faces.some((f) => f.altered === 'retournee'))
}

export type PurchaseTarget = { dieIndex: number; faceIndex?: number }

export interface PurchaseResult {
  inventory: Inventory
  /** Message pour le journal. */
  text: string
}

/**
 * Applique un achat déjà payé. Lance si la cible manque ou si l'objet ne peut pas
 * être appliqué ; l'appelant vérifie l'argent et les emplacements avant.
 */
export function applyPurchase(item: ShopItem, inventory: Inventory, target: PurchaseTarget | null): PurchaseResult {
  switch (item.kind) {
    case 'artefact':
      if (inventory.artefacts.includes(item.id)) throw new Error('artefact déjà possédé')
      return { inventory: { ...inventory, artefacts: [...inventory.artefacts, item.id] }, text: `Artefact acquis : ${item.name}.` }
    case 'die': {
      if (!target) throw new Error('choisissez le dé à remplacer')
      const old = inventory.dice[target.dieIndex]
      if (!old) throw new Error('dé introuvable')
      const dice = inventory.dice.map((d, i) => (i === target.dieIndex ? specialDie(item) : d))
      return { inventory: { ...inventory, dice }, text: `${item.name} remplace le ${old.name} n°${target.dieIndex + 1}.` }
    }
    case 'forge': {
      if (!target || target.faceIndex === undefined) throw new Error('choisissez la face à forger')
      const die = inventory.dice[target.dieIndex]
      const face = die?.faces[target.faceIndex]
      if (!die || !face) throw new Error('face introuvable')
      if (face.altered) throw new Error('cette face est déjà forgée')
      const faces = die.faces.map((f, i) => (i === target.faceIndex ? forgeFace(item.id, f) : f))
      if (!faces.some((f) => f.value > 0)) throw new Error('un dé doit garder une face positive')
      const dice = inventory.dice.map((d, i) => (i === target.dieIndex ? { ...d, faces } : d))
      return { inventory: { ...inventory, dice }, text: `${item.name} gravée sur le ${die.name} n°${target.dieIndex + 1}, face ${face.value > 0 ? '+' : ''}${face.value}.` }
    }
  }
}

export function defaultInventory(config: RaceConfig): Inventory {
  return { artefacts: [], dice: Array.from({ length: config.dice.distanceDice }, () => baseDie(config)) }
}
